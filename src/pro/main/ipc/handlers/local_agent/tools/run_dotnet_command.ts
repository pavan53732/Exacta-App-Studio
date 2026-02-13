/**
 * run_dotnet_command tool for executing .NET CLI commands through ExecutionKernel
 * Supports: build, run, restore, add package, etc.
 * Windows-only app builder integration.
 */

import { z } from "zod";
import {
  ToolDefinition,
  AgentContext,
  escapeXmlAttr,
  escapeXmlContent,
} from "./types";
import { executionKernel } from "../../../../../../ipc/security/execution_kernel";

import log from "electron-log";
const logger = log.scope("run_dotnet_command");

// Schema for dotnet command arguments
const runDotnetCommandSchema = z.object({
  command: z
    .enum([
      "build",
      "run",
      "restore",
      "clean",
      "publish",
      "test",
      "add package",
      "remove package",
      "list package",
      "new",
      "msbuild",
    ])
    .describe("The dotnet CLI command to execute"),
  args: z
    .array(z.string())
    .optional()
    .describe("Additional arguments for the command"),
  configuration: z
    .enum(["Debug", "Release"])
    .optional()
    .describe("Build configuration (default: Debug)"),
  framework: z
    .string()
    .optional()
    .describe("Target framework (e.g., 'net8.0-windows')"),
  runtime: z
    .string()
    .optional()
    .describe("Target runtime identifier (e.g., 'win-x64')"),
  verbosity: z
    .enum(["quiet", "minimal", "normal", "detailed", "diagnostic"])
    .optional()
    .describe("Output verbosity level"),
  noRestore: z
    .boolean()
    .optional()
    .describe("Skip implicit restore during build"),
  selfContained: z
    .boolean()
    .optional()
    .describe("Publish as self-contained application"),
  description: z
    .string()
    .optional()
    .describe("Brief description of what this command does"),
});

type DotnetCommandArgs = z.infer<typeof runDotnetCommandSchema>;

/**
 * Determine network access policy based on command type.
 * Commands like restore and add package need network access.
 */
function getNetworkAccess(command: string): boolean {
  const networkRequiredCommands = ["restore", "add package", "new"];
  return networkRequiredCommands.some((cmd) => command.includes(cmd));
}

/**
 * Determine memory limit based on command type.
 * Build operations need more memory.
 */
function getMemoryLimit(command: string): number {
  const highMemoryCommands = ["build", "publish", "msbuild"];
  const isHighMemory = highMemoryCommands.some((cmd) => command.includes(cmd));
  return isHighMemory ? 4096 : 2048; // 4GB for builds, 2GB for others
}

/**
 * Determine timeout based on command type.
 */
function getTimeout(command: string): number {
  switch (command) {
    case "build":
    case "publish":
    case "msbuild":
      return 600000; // 10 minutes
    case "restore":
    case "add package":
      return 300000; // 5 minutes
    case "test":
      return 600000; // 10 minutes
    default:
      return 120000; // 2 minutes
  }
}

/**
 * Build the dotnet CLI arguments from the tool input.
 */
function buildDotnetArgs(input: DotnetCommandArgs): string[] {
  const args: string[] = [];

  // Handle compound commands like "add package"
  if (input.command.includes(" ")) {
    const [mainCmd, subCmd] = input.command.split(" ");
    args.push(mainCmd, subCmd);
  } else {
    args.push(input.command);
  }

  // Add configuration
  if (input.configuration) {
    args.push("--configuration", input.configuration);
  }

  // Add framework
  if (input.framework) {
    args.push("--framework", input.framework);
  }

  // Add runtime
  if (input.runtime) {
    args.push("--runtime", input.runtime);
  }

  // Add verbosity
  if (input.verbosity) {
    args.push("--verbosity", input.verbosity);
  }

  // Add no-restore flag
  if (input.noRestore) {
    args.push("--no-restore");
  }

  // Add self-contained flag
  if (input.selfContained) {
    args.push("--self-contained");
  }

  // Add any additional arguments
  if (input.args) {
    args.push(...input.args);
  }

  return args;
}

/**
 * Format the command result for display.
 */
function formatResult(
  command: string,
  result: {
    stdout: string;
    stderr: string;
    exitCode: number;
    duration: number;
  },
): string {
  const lines: string[] = [];

  lines.push(`Command: dotnet ${command}`);
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

export const runDotnetCommandTool: ToolDefinition<DotnetCommandArgs> = {
  name: "run_dotnet_command",
  description: `Execute .NET CLI commands for building and managing .NET projects.

Supported commands:
- build: Compile the project
- run: Build and run the project
- restore: Restore NuGet packages
- clean: Clean build outputs
- publish: Publish the project for deployment
- test: Run unit tests
- add package: Add a NuGet package
- remove package: Remove a NuGet package
- list package: List project packages
- new: Create a new .NET project
- msbuild: Run MSBuild directly

All commands are executed securely through the ExecutionKernel with appropriate
resource limits and network policies.`,

  inputSchema: runDotnetCommandSchema,
  defaultConsent: "ask",
  modifiesState: true,

  getConsentPreview: (args) => {
    const cmdStr = args.args
      ? `dotnet ${args.command} ${args.args.join(" ")}`
      : `dotnet ${args.command}`;
    return `Execute: ${cmdStr}`;
  },

  buildXml: (args, isComplete) => {
    if (!args.command) return undefined;

    const cmdStr = args.args
      ? `dotnet ${args.command} ${args.args.join(" ")}`
      : `dotnet ${args.command}`;

    let xml = `<dyad-dotnet-command command="${escapeXmlAttr(cmdStr)}" description="${escapeXmlAttr(args.description ?? "")}">`;

    if (isComplete) {
      xml += "\n</dyad-dotnet-command>";
    }

    return xml;
  },

  execute: async (args: DotnetCommandArgs, ctx: AgentContext) => {
    // Stream initial status
    const cmdStr = args.args
      ? `dotnet ${args.command} ${args.args.join(" ")}`
      : `dotnet ${args.command}`;

    const title = args.description || `Running: ${cmdStr}`;

    ctx.onXmlStream(
      `<dyad-status title="${escapeXmlAttr(title)}" state="in-progress"></dyad-status>`,
    );

    logger.info(`Executing dotnet command: ${cmdStr}`);

    try {
      // Build the arguments
      const dotnetArgs = buildDotnetArgs(args);

      // Determine execution options
      const networkAccess = getNetworkAccess(args.command);
      const memoryLimit = getMemoryLimit(args.command);
      const timeout = getTimeout(args.command);

      // Execute through ExecutionKernel
      const result = await executionKernel.execute(
        { command: "dotnet", args: dotnetArgs },
        {
          appId: ctx.appId,
          cwd: ctx.appPath,
          networkAccess,
          memoryLimitMB: memoryLimit,
          timeout,
        },
        "dotnet",
      );

      // Format the result
      const formattedResult = formatResult(args.command, result);

      // Complete the XML status
      const state = result.exitCode === 0 ? "success" : "error";
      ctx.onXmlComplete(
        `<dyad-status title="${escapeXmlAttr(title)}" state="${state}">\n${escapeXmlContent(formattedResult)}\n</dyad-status>`,
      );

      if (result.exitCode !== 0) {
        logger.error(`dotnet command failed with exit code ${result.exitCode}`);
        return `Command failed with exit code ${result.exitCode}:\n\n${result.stderr || result.stdout}`;
      }

      logger.info(
        `dotnet command completed successfully in ${result.duration}ms`,
      );
      return formattedResult;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.error(`dotnet command failed:`, errorMessage);

      ctx.onXmlComplete(
        `<dyad-status title="${escapeXmlAttr(title)}" state="error">\n${escapeXmlContent(errorMessage)}\n</dyad-status>`,
      );

      throw new Error(`Failed to execute dotnet command: ${errorMessage}`);
    }
  },
};
