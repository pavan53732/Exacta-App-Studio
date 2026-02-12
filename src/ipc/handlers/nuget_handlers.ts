// src/ipc/handlers/nuget_handlers.ts
// Handler for <dyad-add-nuget> tag - NuGet package management for .NET projects

import { db } from "../../db";
import { messages, apps, chats } from "../../db/schema";
import { eq } from "drizzle-orm";
import { getDyadAppPath } from "../../paths/paths";
import { executionKernel } from "../security/execution_kernel";
import { createLoggedHandler } from "./safe_handle";
import log from "electron-log";

const logger = log.scope("nuget_handlers");
const handle = createLoggedHandler(logger);

export function registerNuGetHandlers() {
  handle(
    "chat:add-nuget",
    async (
      _event,
      { chatId, packages }: { chatId: number; packages: string[] },
    ): Promise<{ success: boolean; output: string; error?: string }> => {
      // Find the chat first
      const chat = await db.query.chats.findFirst({
        where: eq(chats.id, chatId),
      });

      if (!chat) {
        throw new Error(`Chat ${chatId} not found`);
      }

      // Get the app using the appId from the chat
      const app = await db.query.apps.findFirst({
        where: eq(apps.id, chat.appId),
      });

      if (!app) {
        throw new Error(`App for chat ${chatId} not found`);
      }

      const appPath = getDyadAppPath(app.path);

      // Check if this is a .NET project
      const fs = await import("fs");
      const path = await import("path");
      const csprojFiles = fs
        .readdirSync(appPath)
        .filter((f) => f.endsWith(".csproj"));

      if (csprojFiles.length === 0) {
        throw new Error(
          "No .csproj file found. This doesn't appear to be a .NET project.",
        );
      }

      const csprojPath = path.join(appPath, csprojFiles[0]);

      logger.info(
        `Adding NuGet packages ${packages.join(", ")} to ${csprojPath}`,
      );

      // Execute dotnet add package for each package
      const results: string[] = [];
      const errors: string[] = [];

      for (const packageName of packages) {
        try {
          const result = await executionKernel.execute(
            { command: "dotnet", args: ["add", "package", packageName] },
            {
              appId: app.id,
              cwd: appPath,
              networkAccess: true, // Package restore needs network
              memoryLimitMB: 2048,
              timeout: 120000,
            },
            "dotnet",
          );

          if (result.exitCode === 0) {
            results.push(`✓ ${packageName}: Added successfully`);
            logger.info(`Added NuGet package ${packageName}`);
          } else {
            const errorMsg = `✗ ${packageName}: ${result.stderr || "Unknown error"}`;
            errors.push(errorMsg);
            logger.error(`Failed to add NuGet package ${packageName}: ${result.stderr}`);
          }
        } catch (error: any) {
          const errorMsg = `✗ ${packageName}: ${error.message}`;
          errors.push(errorMsg);
          logger.error(`Exception adding NuGet package ${packageName}:`, error);
        }
      }

      // Update the message to show results
      const foundMessages = await db.query.messages.findMany({
        where: eq(messages.chatId, chatId),
      });

      const message = [...foundMessages]
        .reverse()
        .find((m) =>
          m.content.includes(
            `<dyad-add-nuget packages="${packages.join(" ")}">`,
          ),
        );

      if (message) {
        const output = [...results, ...errors].join("\n");
        const updatedContent = message.content.replace(
          new RegExp(
            `<dyad-add-nuget packages="${packages.join(" ")}">[^<]*</dyad-add-nuget>`,
            "g",
          ),
          `<dyad-add-nuget packages="${packages.join(" ")}">${output}</dyad-add-nuget>`,
        );

        await db
          .update(messages)
          .set({ content: updatedContent })
          .where(eq(messages.id, message.id));
      }

      return {
        success: errors.length === 0,
        output: [...results, ...errors].join("\n"),
        error: errors.length > 0 ? errors.join("\n") : undefined,
      };
    },
  );
}
