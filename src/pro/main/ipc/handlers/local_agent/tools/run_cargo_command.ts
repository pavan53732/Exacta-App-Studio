/**
 * run_cargo_command tool for executing Cargo CLI commands through ExecutionKernel
 * Supports: build, run, fetch, tauri dev, tauri build, etc.
 * Windows-only app builder integration for Tauri apps.
 */

import { z } from "zod";
import {
  ToolDefinition,
  AgentContext,
  escapeXmlAttr,
  escapeXmlContent,
} from "./types";
import { executionKernel } from "@/ipc/security/execution_kernel";

const logger = require("electron-log").scope("run_cargo_command");

// Schema for cargo command arguments
const runCargoCommandSchema = z.object({
  command: z
    .enum([
      "build",
      "run",
      "test",
      "check",
      "clean",
      "fetch",
      "update",
      "add",
      "remove",
      "tree",
      "clippy",
      "fmt",
      "doc",
      "tauri",
    ])
    .describe("The cargo CLI command to execute"),
  subcommand: z
    .string()
    .optional()
    .describe("Subcommand for commands like 'tauri' (e.g., 'dev', 'build')"),
  args: z
    .array(z.string())
    .optional()
    .describe("Additional arguments for the command"),
  release: z
    .boolean()
    .optional()
    .describe("Build in release mode (optimized)"),
  target: z
    .string()
    .optional()
    .describe("Target triple (e.g., 'x86_64-pc-windows-msvc')"),
  features: z
    .array(z.string())
    .optional()
    .describe("Features to enable"),
  allFeatures: z
    .boolean()
    .optional()
    .describe("Enable all features"),
  noDefaultFeatures: z
    .boolean()
    .optional()
    .describe("Disable default features"),
  verbosity: z
    .enum(["quiet", "verbose"])
    .optional()
    .describe("Output verbosity level"),
  description: z
    .string()
    .optional()
    .describe("Brief description of what this command does"),
});

type CargoCommandArgs = z.infer<typeof runCargoCommandSchema>;

/**
 * Determine network access policy based on command type.
 * Commands like fetch, update, add, and tauri need network access.
 */
function getNetworkAccess(command: string, subcommand?: string): boolean {
  if (command === "fetch" || command === "update" || command === "add") {
    return true;
  }
  // Tauri dev needs network for dev server
  if (command === "tauri" && subcommand === "dev") {
    return true;
  }
  return false;
}

/**
 * Determine memory limit based on command type.
 * Build operations need more memory (Rust compilation is memory-intensive).
 */
function getMemoryLimit(command: string, subcommand?: string): number {
  const isBuildCommand =
    command === "build" ||
    (command === "tauri" && subcommand === "build") ||
    command === "test";

  return isBuildCommand ? 4096 : 2048; // 4GB for builds, 2GB for others
}

/**
 * Determine timeout based on command type.
 * Rust compilation can be slow, especially for Tauri builds.
 */
function getTimeout(command: string, subcommand?: string): number {
  if (command === "tauri") {
    return subcommand === "build" ? 1200000 : 600000; // 20 min for tauri build, 10 min for dev
  }

  switch (command) {
    case "build":
    case "test":
      return 600000; // 10 minutes
    case "fetch":
    case "update":
    case "add":
      return 300000; // 5 minutes
    case "doc":
      return 600000; // 10 minutes
    default:
      return 120000; // 2 minutes
  }
}

/**
 * Determine if command should use session mode (long-running processes).
 */
function useSessionMode(command: string, subcommand?: string): boolean {
  return (
    command === "run" ||
    (command === "tauri" && subcommand === "dev") ||
    command === "test"
  );
}

/**
 * Build the cargo CLI arguments from the tool input.
 */
function buildCargoArgs(input: CargoCommandArgs): string[] {
  const args: string[] = [];

  // Add main command
  args.push(input.command);

  // Add subcommand for tauri
  if (input.command === "tauri" && input.subcommand) {
    args.push(input.subcommand);
  }

  // Add release flag
  if (input.release) {
    args.push("--release");
  }

  // Add target
  if (input.target) {
    args.push("--target", input.target);
  }

  // Add features
  if (input.features && input.features.length > 0) {
    args.push("--features", input.features.join(","));
  }

  // Add all-features flag
  if (input.allFeatures) {
    args.push("--all-features");
  }

  // Add no-default-features flag
  if (input.noDefaultFeatures) {
    args.push("--no-default-features");
  }

  // Add verbosity
  if (input.verbosity === "quiet") {
    args.push("--quiet");
  } else if (input.verbosity === "verbose") {
    args.push("--verbose");
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
  subcommand: string | undefined,
  result: { stdout: string; stderr: string; exitCode: number; duration: number },
): string {
  const lines: string[] = [];

  const cmdStr = subcommand
    ? `cargo ${command} ${subcommand}`
    : `cargo ${command}`;

  lines.push(`Command: ${cmdStr}`);
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

export const runCargoCommandTool: ToolDefinition<CargoCommandArgs> = {
  name: "run_cargo_command",
  description: `Execute Cargo CLI commands for building and managing Rust/Tauri projects.

Supported commands:
- build: Compile the project
- run: Build and run the project
- test: Run tests
- check: Check for compilation errors (faster than build)
- clean: Remove build artifacts
- fetch: Fetch dependencies
- update: Update dependencies
- add: Add a dependency
- remove: Remove a dependency
- tree: Display dependency tree
- clippy: Run Clippy linter
- fmt: Format source code
- doc: Build documentation
- tauri: Tauri-specific commands (dev, build, etc.)

For Tauri projects, use 'tauri' command with subcommand:
- tauri dev: Start development server
- tauri build: Build production release

All commands are executed securely through the ExecutionKernel with appropriate
resource limits and network policies.`,

  inputSchema: runCargoCommandSchema,
  defaultConsent: "ask",
  modifiesState: true,

  getConsentPreview: (args) => {
    const cmdStr = args.subcommand
      ? `cargo ${args.command} ${args.subcommand}`
      : `cargo ${args.command}`;
    const argsStr = args.args ? ` ${args.args.join(" ")}` : "";
    return `Execute: ${cmdStr}${argsStr}`;
  },

  buildXml: (args, isComplete) => {
    if (!args.command) return undefined;

    const cmdStr = args.subcommand
      ? `cargo ${args.command} ${args.subcommand}`
      : `cargo ${args.command}`;
    const argsStr = args.args ? ` ${args.args.join(" ")}` : "";

    let xml = `<dyad-cargo-command command="${escapeXmlAttr(cmdStr + argsStr)}" description="${escapeXmlAttr(args.description ?? "")}">`;

    if (isComplete) {
      xml += "\n</dyad-cargo-command>";
    }

    return xml;
  },

  execute: async (args: CargoCommandArgs, ctx: AgentContext) => {
    // Stream initial status
    const cmdStr = args.subcommand
      ? `cargo ${args.command} ${args.subcommand}`
      : `cargo ${args.command}`;
    const argsStr = args.args ? ` ${args.args.join(" ")}` : "";

    const title = args.description || `Running: ${cmdStr}${argsStr}`;

    ctx.onXmlStream(
      `<dyad-status title="${escapeXmlAttr(title)}" state="in-progress"></dyad-status>`,
    );

    logger.info(`Executing cargo command: ${cmdStr}${argsStr}`);

    try {
      // Build the arguments
      const cargoArgs = buildCargoArgs(args);

      // Determine execution options
      const networkAccess = getNetworkAccess(args.command, args.subcommand);
      const memoryLimit = getMemoryLimit(args.command, args.subcommand);
      const timeout = getTimeout(args.command, args.subcommand);
      const sessionMode = useSessionMode(args.command, args.subcommand);

      // Execute through ExecutionKernel
      const result = await executionKernel.execute(
        { command: "cargo", args: cargoArgs },
        {
          appId: ctx.appId,
          cwd: ctx.appPath,
          networkAccess,
          memoryLimitMB: memoryLimit,
          timeout,
          mode: sessionMode ? "session" : "ephemeral",
        },
        "tauri", // Use tauri provider for cargo commands
      );

      // Format the result
      const formattedResult = formatResult(
        args.command,
        args.subcommand,
        result,
      );

      // Complete the XML status
      const state = result.exitCode === 0 ? "success" : "error";
      ctx.onXmlComplete(
        `<dyad-status title="${escapeXmlAttr(title)}" state="${state}">\n${escapeXmlContent(formattedResult)}\n</dyad-status>`,
      );

      if (result.exitCode !== 0) {
        logger.error(`cargo command failed with exit code ${result.exitCode}`);
        return `Command failed with exit code ${result.exitCode}:\n\n${result.stderr || result.stdout}`;
      }

      logger.info(`cargo command completed successfully in ${result.duration}ms`);
      return formattedResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error(`cargo command failed:`, errorMessage);

      ctx.onXmlComplete(
        `<dyad-status title="${escapeXmlAttr(title)}" state="error">\n${escapeXmlContent(errorMessage)}\n</dyad-status>`,
      );

      throw new Error(`Failed to execute cargo command: ${errorMessage}`);
    }
  },
};
