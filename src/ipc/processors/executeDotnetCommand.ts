/**
 * Processor for <dyad-dotnet-command> tags.
 * Handles .NET CLI command execution for Windows-only .NET projects.
 * Uses ExecutionKernel for secure command execution.
 */

import { db } from "../../db";
import { messages } from "../../db/schema";
import { eq } from "drizzle-orm";
import { Message } from "@/ipc/types";
import { executionKernel } from "../security/execution_kernel";
import { escapeXmlAttr, escapeXmlContent } from "../../../shared/xmlEscape";
import log from "electron-log";

const logger = log.scope("executeDotnetCommand");

/**
 * Supported dotnet commands with their resource requirements.
 */
type DotnetCommandType =
  | "build"
  | "run"
  | "restore"
  | "clean"
  | "test"
  | "publish"
  | "msbuild";

/**
 * Resource limits configuration per command type.
 */
const _COMMAND_RESOURCE_LIMITS: Record<
  DotnetCommandType,
  { memoryLimitMB: number; timeout: number; networkAccess: boolean }
> = {
  build: {
    memoryLimitMB: 4096, // 4GB for builds
    timeout: 600000, // 10 minutes
    networkAccess: false, // Build doesn't need network
  },
  run: {
    memoryLimitMB: 2048, // 2GB
    timeout: 300000, // 5 minutes
    networkAccess: true, // App might need network
  },
  restore: {
    memoryLimitMB: 2048, // 2GB
    timeout: 300000, // 5 minutes
    networkAccess: true, // Restore needs network for NuGet
  },
  clean: {
    memoryLimitMB: 1024, // 1GB
    timeout: 60000, // 1 minute
    networkAccess: false,
  },
  test: {
    memoryLimitMB: 4096, // 4GB for test runs
    timeout: 600000, // 10 minutes
    networkAccess: true, // Tests might need network
  },
  publish: {
    memoryLimitMB: 4096, // 4GB for publish
    timeout: 600000, // 10 minutes
    networkAccess: false,
  },
  msbuild: {
    memoryLimitMB: 4096, // 4GB for MSBuild
    timeout: 600000, // 10 minutes
    networkAccess: false,
  },
};

/**
 * Determine if a command needs network access.
 */
function getNetworkAccess(cmd: string): boolean {
  const lowerCmd = cmd.toLowerCase();
  // Commands that need network access
  const networkRequiredCommands = ["restore", "run", "test"];
  return networkRequiredCommands.some((c) => lowerCmd.includes(c));
}

/**
 * Determine memory limit based on command type.
 */
function getMemoryLimit(cmd: string): number {
  const lowerCmd = cmd.toLowerCase();
  if (
    lowerCmd.includes("build") ||
    lowerCmd.includes("publish") ||
    lowerCmd.includes("msbuild")
  ) {
    return 4096; // 4GB for builds
  }
  if (lowerCmd.includes("test")) {
    return 4096; // 4GB for tests
  }
  return 2048; // 2GB default
}

/**
 * Determine timeout based on command type.
 */
function getTimeout(cmd: string): number {
  const lowerCmd = cmd.toLowerCase();
  if (
    lowerCmd.includes("build") ||
    lowerCmd.includes("publish") ||
    lowerCmd.includes("msbuild") ||
    lowerCmd.includes("test")
  ) {
    return 600000; // 10 minutes
  }
  if (lowerCmd.includes("restore")) {
    return 300000; // 5 minutes
  }
  return 120000; // 2 minutes default
}

/**
 * Parse a command string into command and arguments.
 * Handles commands like "dotnet build", "dotnet run --no-build", etc.
 */
function parseCommand(cmd: string): { command: string; args: string[] } {
  const parts = cmd.trim().split(/\s+/);

  // Check if the command starts with "dotnet"
  if (parts[0]?.toLowerCase() === "dotnet") {
    return {
      command: "dotnet",
      args: parts.slice(1),
    };
  }

  // If not starting with dotnet, assume it's a dotnet subcommand
  return {
    command: "dotnet",
    args: parts,
  };
}

/**
 * Format the command result for display.
 */
function formatResult(
  cmd: string,
  result: {
    stdout: string;
    stderr: string;
    exitCode: number;
    duration: number;
  },
): string {
  const lines: string[] = [];

  lines.push(`Command: ${cmd}`);
  lines.push(`Exit code: ${result.exitCode}`);
  lines.push(`Duration: ${(result.duration / 1000).toFixed(2)}s`);
  lines.push("");

  if (result.stdout) {
    lines.push("=== Output ===");
    lines.push(result.stdout);
  }

  if (result.stderr) {
    lines.push("=== Errors/Warnings ===");
    lines.push(result.stderr);
  }

  return lines.join("\n");
}

/**
 * Execute a .NET CLI command through ExecutionKernel.
 *
 * @param cmd - The dotnet command to execute (e.g., "build", "run", "restore")
 * @param args - Optional additional arguments for the command
 * @param message - The message containing the dyad-dotnet-command tag
 * @param appPath - Path to the .NET project directory
 * @param appId - Application ID for ExecutionKernel tracking
 */
export async function executeDotnetCommand({
  cmd,
  args,
  message,
  appPath,
  appId,
}: {
  cmd: string;
  args?: string;
  message: Message;
  appPath: string;
  appId: number;
}): Promise<void> {
  logger.info(`Executing dotnet command: ${cmd} ${args || ""}`);

  try {
    // Parse the command
    const { command, args: parsedArgs } = parseCommand(cmd);

    // Append any additional arguments
    const finalArgs = args ? [...parsedArgs, ...args.split(" ")] : parsedArgs;

    // Determine execution options based on command type
    const networkAccess = getNetworkAccess(cmd);
    const memoryLimit = getMemoryLimit(cmd);
    const timeout = getTimeout(cmd);

    logger.info(
      `Executing: ${command} ${finalArgs.join(" ")} [Network: ${networkAccess}, Memory: ${memoryLimit}MB, Timeout: ${timeout}ms]`,
    );

    // Execute through ExecutionKernel
    const result = await executionKernel.execute(
      { command, args: finalArgs },
      {
        appId,
        cwd: appPath,
        networkAccess,
        memoryLimitMB: memoryLimit,
        timeout,
      },
      "dotnet",
    );

    // Format the result
    const formattedResult = formatResult(cmd, result);

    // Build the updated tag content
    const argsAttr = args ? ` args="${escapeXmlAttr(args)}"` : "";
    const updatedContent = message.content.replace(
      new RegExp(
        `<dyad-dotnet-command cmd="${escapeXmlAttr(cmd)}"(?: args="[^"]*")?[^>]*>[\\s\\S]*?</dyad-dotnet-command>`,
        "g",
      ),
      `<dyad-dotnet-command cmd="${escapeXmlAttr(cmd)}"${argsAttr}>\n${escapeXmlContent(formattedResult)}\n</dyad-dotnet-command>`,
    );

    // Save the updated message back to the database
    await db
      .update(messages)
      .set({ content: updatedContent })
      .where(eq(messages.id, message.id));

    if (result.exitCode !== 0) {
      logger.error(
        `dotnet command failed with exit code ${result.exitCode}: ${result.stderr || result.stdout}`,
      );
      throw new Error(
        `Command failed with exit code ${result.exitCode}: ${result.stderr || result.stdout}`,
      );
    }

    logger.info(
      `dotnet command completed successfully in ${result.duration}ms`,
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error(`dotnet command failed:`, errorMessage);

    // Update the message with the error
    const argsAttr = args ? ` args="${escapeXmlAttr(args)}"` : "";
    const updatedContent = message.content.replace(
      new RegExp(
        `<dyad-dotnet-command cmd="${escapeXmlAttr(cmd)}"(?: args="[^"]*")?[^>]*>[\\s\\S]*?</dyad-dotnet-command>`,
        "g",
      ),
      `<dyad-dotnet-command cmd="${escapeXmlAttr(cmd)}"${argsAttr}>\nError: ${escapeXmlContent(errorMessage)}\n</dyad-dotnet-command>`,
    );

    await db
      .update(messages)
      .set({ content: updatedContent })
      .where(eq(messages.id, message.id));

    throw error;
  }
}
