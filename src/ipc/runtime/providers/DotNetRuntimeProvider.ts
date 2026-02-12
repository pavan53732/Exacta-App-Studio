// src/ipc/runtime/providers/DotNetRuntimeProvider.ts
// .NET runtime implementation for Windows desktop apps
// Supports: WPF, WinUI 3, WinForms, Console, MAUI (Windows-only)

import {
  type RuntimeProvider,
  type ScaffoldOptions,
  type ScaffoldResult,
  type BuildOptions,
  type BuildResult,
  type RunOptions,
  type RunResult,
  type PreviewOptions,
  type PackageOptions,
  type RiskProfile,
} from "../RuntimeProvider";
import { executionKernel, type ExecutionResult } from "../../security/execution_kernel";
import { getAppPort } from "../../../../shared/ports";
import path from "node:path";
import fs from "fs-extra";
import { copyDirectoryRecursive } from "../../utils/file_utils";

// Type for event handlers
type ExecutionEventHandler = (event: { type: "stdout" | "stderr"; message: string; timestamp: number }) => void;

// .NET project templates
const DOTNET_TEMPLATES: Record<string, string> = {
  wpf: "wpf",
  winui3: "winui3",
  winforms: "winforms",
  console: "console",
  maui: "maui",
};

export const dotNetRuntimeProvider: RuntimeProvider = {
  runtimeId: "dotnet",
  runtimeName: ".NET",
  supportedStackTypes: ["wpf", "winui3", "winforms", "console", "maui"],
  previewStrategy: "external-window", // .NET desktop apps run in external windows
  diskQuotaBytes: 5 * 1024 * 1024 * 1024, // 5GB for .NET (larger builds)

  async checkPrerequisites(): Promise<{ installed: boolean; missing: string[] }> {
    const missing: string[] = [];

    try {
      await executionKernel.execute(
        { command: "dotnet", args: ["--version"] },
        { appId: 0, cwd: process.cwd() },
        "dotnet"
      );
    } catch {
      missing.push(".NET SDK");
    }

    // Check for Windows SDK (required for native apps)
    try {
      await executionKernel.execute(
        { command: "where", args: ["msbuild"] },
        { appId: 0, cwd: process.cwd() },
        "dotnet"
      );
    } catch {
      missing.push("MSBuild (Windows SDK)");
    }

    return { installed: missing.length === 0, missing };
  },

  getRiskProfile(command: string, args: string[]): RiskProfile {
    const fullCmd = `${command} ${args.join(" ")}`.toLowerCase();

    // High risk: Network operations, package restore with external sources
    if (fullCmd.includes("restore") ||
      fullCmd.includes("add package") ||
      fullCmd.includes("nuget")) {
      return "high";
    }

    // Medium risk: Build/publish (high CPU/Mem, disk writes)
    if (fullCmd.includes("build") ||
      fullCmd.includes("publish") ||
      fullCmd.includes("pack")) {
      return "medium";
    }

    // Low risk: Version checks, clean, list
    return "low";
  },

  async scaffold(options: ScaffoldOptions): Promise<ScaffoldResult> {
    try {
      const stackType = options.templateId || "wpf";
      const templateName = DOTNET_TEMPLATES[stackType] || "wpf";

      // Use dotnet new to create project
      // First create the solution directory
      await fs.ensureDir(options.fullAppPath);

      // Create project using dotnet CLI template
      const result = await executionKernel.execute(
        {
          command: "dotnet",
          args: ["new", templateName, "-n", options.projectName, "-o", ".", "--force"]
        },
        {
          appId: 0,
          cwd: options.fullAppPath,
          networkAccess: true, // Template acquisition may need network
          timeout: 120000,
        },
        "dotnet"
      );

      if (result.exitCode !== 0) {
        return {
          success: false,
          error: `Template creation failed: ${result.stderr}`
        };
      }

      // Determine entry point based on template
      const entryPoint = this._getEntryPointForTemplate(stackType, options.projectName);

      return { success: true, entryPoint };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  async resolveDependencies(options: { appPath: string; appId: number }): Promise<ExecutionResult> {
    // Restore NuGet packages
    return executionKernel.execute(
      { command: "dotnet", args: ["restore"] },
      {
        appId: options.appId,
        cwd: options.appPath,
        networkAccess: true,
        memoryLimitMB: 4096, // .NET restore needs more memory
        timeout: 300000,
      },
      "dotnet"
    );
  },

  async build(options: BuildOptions, onEvent?: ExecutionEventHandler): Promise<BuildResult> {
    const config = options.configuration || "Debug";

    const result = await executionKernel.execute(
      {
        command: "dotnet",
        args: ["build", "--configuration", config, "--verbosity", "normal"]
      },
      {
        appId: options.appId,
        cwd: options.appPath,
        networkAccess: false, // Build shouldn't need network
        memoryLimitMB: 4096,
        timeout: 600000, // 10 minutes for large builds
      },
      "dotnet"
    );

    // Parse build output for errors and warnings
    const errors: string[] = [];
    const warnings: string[] = [];

    const lines = result.stderr.split('\n');
    for (const line of lines) {
      if (line.includes("error CS") || line.includes("error MSB")) {
        errors.push(line.trim());
      } else if (line.includes("warning CS") || line.includes("warning MSB")) {
        warnings.push(line.trim());
      }
    }

    return {
      success: result.exitCode === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      outputPath: path.join(options.appPath, "bin", config),
    };
  },

  async run(options: RunOptions, onEvent?: ExecutionEventHandler): Promise<RunResult> {
    // .NET apps don't use ports like Node.js, they run as native processes
    // We'll still generate a job ID for tracking

    const result = await executionKernel.execute(
      { command: "dotnet", args: ["run", "--verbosity", "normal"] },
      {
        appId: options.appId,
        cwd: options.appPath,
        networkAccess: false,
        memoryLimitMB: 4096,
        mode: "session", // Non-blocking, returns Job ID
      },
      "dotnet"
    );

    return {
      ready: result.exitCode === 0,
      jobId: result.exitCode === 0 ? `job_${options.appId}_${Date.now()}_dotnet` : undefined,
    };
  },

  async stop(appId: number, jobId?: string): Promise<void> {
    if (jobId) {
      await executionKernel.terminateJob(jobId);
      return;
    }

    // Fallback: Find and kill dotnet processes for this app
    try {
      await executionKernel.execute(
        { command: "taskkill", args: ["/F", "/IM", "dotnet.exe"] },
        { appId, cwd: process.cwd(), timeout: 10000 },
        "dotnet"
      );
    } catch {
      // Process may already be terminated
    }
  },

  async startPreview(options: PreviewOptions): Promise<void> {
    // For .NET desktop apps, "preview" means running the built executable
    // This is different from Node.js iframe preview

    const buildPath = path.join(options.appPath, "bin", "Debug");

    // Find the .exe file
    const files = await fs.readdir(buildPath);
    const exeFile = files.find(f => f.endsWith(".exe"));

    if (!exeFile) {
      throw new Error("No executable found. Build the project first.");
    }

    // Launch the executable
    await executionKernel.execute(
      { command: path.join(buildPath, exeFile), args: [] },
      {
        appId: options.appId,
        cwd: buildPath,
        mode: "session",
      },
      "dotnet"
    );
  },

  async stopPreview(appId: number): Promise<void> {
    // Stop any running preview
    await this.stop(appId);
  },

  async package(options: PackageOptions): Promise<ExecutionResult> {
    // Create deployment package using dotnet publish
    const outputPath = path.join(options.appPath, "publish");

    const args = [
      "publish",
      "--configuration", "Release",
      "--output", outputPath,
      "--self-contained", "true",
      "--runtime", "win-x64",
    ];

    // Add single-file publishing if requested
    if (options.outputFormat === "single-file") {
      args.push("-p:PublishSingleFile=true");
    }

    return executionKernel.execute(
      { command: "dotnet", args },
      {
        appId: 0,
        cwd: options.appPath,
        networkAccess: false,
        memoryLimitMB: 8192, // Packaging needs lots of memory
        timeout: 900000, // 15 minutes
      },
      "dotnet"
    );
  },

  isReady(message: string): boolean {
    // .NET apps ready when they indicate they're listening or started
    const readyPatterns = [
      /Application started/i,
      /Now listening on/i,
      /Hosting environment/i,
      /Content root path/i,
      /Build succeeded/i,
    ];

    return readyPatterns.some(pattern => pattern.test(message));
  },

  // Helper method to determine entry point
  _getEntryPointForTemplate(templateId: string, projectName: string): string {
    const extensionMap: Record<string, string> = {
      wpf: ".csproj",
      winui3: ".csproj",
      winforms: ".csproj",
      console: ".csproj",
      maui: ".csproj",
    };

    const ext = extensionMap[templateId] || ".csproj";
    return `${projectName}${ext}`;
  },
};
