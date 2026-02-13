/**
 * Processor for <dyad-add-nuget> tags.
 * Handles NuGet package installation for Windows-only .NET projects.
 * Uses ExecutionKernel for secure command execution.
 */

import { db } from "../../db";
import { messages } from "../../db/schema";
import { eq } from "drizzle-orm";
import { Message } from "@/ipc/types";
import { executionKernel } from "../security/execution_kernel";
import { escapeXmlAttr } from "../../../shared/xmlEscape";
import log from "electron-log";

const logger = log.scope("executeAddNuget");

/**
 * Resource limits for NuGet package installation.
 */
const NUGET_RESOURCE_LIMITS = {
  /** 2GB memory limit for package operations */
  memoryLimitMB: 2048,
  /** 2 minutes timeout per package */
  timeout: 120000,
  /** Network access required for NuGet */
  networkAccess: true,
};

/**
 * Execute NuGet package installation for a .NET project.
 * Uses `dotnet add package` command through ExecutionKernel.
 *
 * @param packages - Array of NuGet package names to install
 * @param message - The message containing the dyad-add-nuget tag
 * @param appPath - Path to the .NET project directory
 * @param appId - Application ID for ExecutionKernel tracking
 */
export async function executeAddNuget({
  packages,
  message,
  appPath,
  appId,
}: {
  packages: string[];
  message: Message;
  appPath: string;
  appId: number;
}): Promise<void> {
  logger.info(`Installing NuGet packages: ${packages.join(", ")}`);

  const results: { package: string; success: boolean; output: string }[] = [];

  // Install each package individually for better error tracking
  for (const packageName of packages) {
    try {
      logger.info(`Installing NuGet package: ${packageName}`);

      // Execute through ExecutionKernel for security
      const result = await executionKernel.execute(
        { command: "dotnet", args: ["add", "package", packageName] },
        {
          appId,
          cwd: appPath,
          ...NUGET_RESOURCE_LIMITS,
        },
        "dotnet",
      );

      const output =
        result.stdout + (result.stderr ? `\n${result.stderr}` : "");
      const success = result.exitCode === 0;

      results.push({ package: packageName, success, output });

      if (success) {
        logger.info(`Successfully installed NuGet package: ${packageName}`);
      } else {
        logger.error(
          `Failed to install NuGet package ${packageName}: exit code ${result.exitCode}`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(
        `Error installing NuGet package ${packageName}:`,
        errorMessage,
      );
      results.push({
        package: packageName,
        success: false,
        output: errorMessage,
      });
    }
  }

  // Build the result content
  const resultContent = results
    .map((r) => {
      const status = r.success ? "✓" : "✗";
      return `[${status}] ${r.package}\n${r.output}`;
    })
    .join("\n\n");

  // Update the message content with the installation results
  const packagesAttr = packages.map((p) => escapeXmlAttr(p)).join(" ");
  const updatedContent = message.content.replace(
    new RegExp(
      `<dyad-add-nuget packages="${packagesAttr}">[^<]*</dyad-add-nuget>`,
      "g",
    ),
    `<dyad-add-nuget packages="${packagesAttr}">${resultContent}</dyad-add-nuget>`,
  );

  // Save the updated message back to the database
  await db
    .update(messages)
    .set({ content: updatedContent })
    .where(eq(messages.id, message.id));

  // Check if all packages were installed successfully
  const failedPackages = results.filter((r) => !r.success);
  if (failedPackages.length > 0) {
    throw new Error(
      `Failed to install NuGet packages: ${failedPackages.map((r) => r.package).join(", ")}`,
    );
  }
}
