// src/ipc/runtime/providers/TauriRuntimeProvider.ts
// Tauri runtime implementation for cross-platform desktop apps with web frontend
// Supports: React + Tauri, Vue + Tauri, Svelte + Tauri, etc.

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
import fs from "node:fs-extra";

// Type for event handlers
 type ExecutionEventHandler = (event: { type: "stdout" | "stderr"; message: string; timestamp: number }) => void;

export const tauriRuntimeProvider: RuntimeProvider = {
  runtimeId: "tauri",
  runtimeName: "Tauri",
  supportedStackTypes: ["tauri-react", "tauri-vue", "tauri-svelte", "tauri-solid"],
  previewStrategy: "external-window", // Tauri apps run as native desktop apps
  diskQuotaBytes: 3 * 1024 * 1024 * 1024, // 3GB for Tauri (Rust + Node builds)

  async checkPrerequisites(): Promise<{ installed: boolean; missing: string[] }> {
    const missing: string[] = [];

    // Check for Node.js
    try {
      await executionKernel.execute(
        { command: "node", args: ["--version"] },
        { appId: 0, cwd: process.cwd() },
        "tauri"
      );
    } catch {
      missing.push("Node.js");
    }

    // Check for Rust
    try {
      await executionKernel.execute(
        { command: "rustc", args: ["--version"] },
        { appId: 0, cwd: process.cwd() },
        "tauri"
      );
    } catch {
      missing.push("Rust");
    }

    // Check for Cargo (Rust package manager)
    try {
      await executionKernel.execute(
        { command: "cargo", args: ["--version"] },
        { appId: 0, cwd: process.cwd() },
        "tauri"
      );
    } catch {
      missing.push("Cargo");
    }

    return { installed: missing.length === 0, missing };
  },

  getRiskProfile(command: string, args: string[]): RiskProfile {
    const fullCmd = `${command} ${args.join(" ")}`.toLowerCase();
    
    // High risk: Network operations, native compilation
    if (fullCmd.includes("npm install") || 
        fullCmd.includes("pnpm install") ||
        fullCmd.includes("yarn") ||
        fullCmd.includes("cargo install")) {
      return "high";
    }
    
    // Medium risk: Build (compiles Rust code + web assets)
    if (fullCmd.includes("tauri build") || 
        fullCmd.includes("cargo build") ||
        fullCmd.includes("npm run build") ||
        fullCmd.includes("vite build")) {
      return "medium";
    }
    
    // Low risk: Development server, version checks
    return "low";
  },

  async scaffold(options: ScaffoldOptions): Promise<ScaffoldResult> {
    try {
      const stackType = options.templateId || "tauri-react";
      const framework = stackType.replace("tauri-", ""); // Extract "react" from "tauri-react"
      
      // Tauri projects have a specific structure:
      // - Frontend in root (React/Vue/Svelte)
      // - Rust backend in src-tauri/
      
      // First, scaffold the frontend
      const frontendTemplate = framework === "react" ? "react-ts" : 
                               framework === "vue" ? "vue-ts" :
                               framework === "svelte" ? "svelte-ts" : "react-ts";
      
      // Use npm create vite for frontend
      const frontendResult = await executionKernel.execute(
        { 
          command: "npm", 
          args: ["create", "vite@latest", ".", "--", "--template", frontendTemplate] 
        },
        {
          appId: 0,
          cwd: options.fullAppPath,
          networkAccess: true,
          timeout: 120000,
        },
        "tauri"
      );

      if (frontendResult.exitCode !== 0) {
        return { 
          success: false, 
          error: `Frontend scaffolding failed: ${frontendResult.stderr}` 
        };
      }

      // Initialize Tauri in the project
      const tauriResult = await executionKernel.execute(
        { 
          command: "npm", 
          args: ["run", "tauri", "init", "--", "--ci"] 
        },
        {
          appId: 0,
          cwd: options.fullAppPath,
          networkAccess: true,
          timeout: 120000,
        },
        "tauri"
      );

      if (tauriResult.exitCode !== 0) {
        // Tauri init might fail if not installed globally, try alternative
        return { 
          success: true, 
          entryPoint: "src-tauri/src/main.rs",
          warning: "Tauri init may need manual setup. Run: npm install @tauri-apps/cli --save-dev && npx tauri init"
        };
      }

      return { 
        success: true, 
        entryPoint: "src-tauri/src/main.rs" 
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  async resolveDependencies(options: { appPath: string; appId: number }): Promise<ExecutionResult> {
    // Tauri needs both Node.js and Rust dependencies
    const commands = [
      // Frontend dependencies
      { command: "npm", args: ["install"] },
      // Rust dependencies (cargo will handle this automatically on first build)
    ];

    // Execute npm install for frontend
    const nodeResult = await executionKernel.execute(
      { command: "npm", args: ["install"] },
      {
        appId: options.appId,
        cwd: options.appPath,
        networkAccess: true,
        memoryLimitMB: 2048,
        timeout: 300000,
      },
      "tauri"
    );

    return nodeResult;
  },

  async build(options: BuildOptions, onEvent?: ExecutionEventHandler): Promise<BuildResult> {
    const config = options.configuration || "Debug";
    const isDebug = config === "Debug";

    // Tauri build compiles both frontend and Rust backend
    const result = await executionKernel.execute(
      { 
        command: "npm", 
        args: ["run", "tauri", "build", "--", isDebug ? "--debug" : ""].filter(Boolean) 
      },
      {
        appId: options.appId,
        cwd: options.appPath,
        networkAccess: false,
        memoryLimitMB: 4096, // Rust compilation needs lots of memory
        timeout: 900000, // 15 minutes for Tauri builds
      },
      "tauri"
    );

    // Parse Tauri build output for errors
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const lines = result.stderr.split('\n');
    for (const line of lines) {
      if (line.includes("error[") || line.includes("error:") || line.includes("Compiling")) {
        errors.push(line.trim());
      } else if (line.includes("warning:")) {
        warnings.push(line.trim());
      }
    }

    return {
      success: result.exitCode === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      outputPath: path.join(options.appPath, "src-tauri", "target", isDebug ? "debug" : "release"),
    };
  },

  async run(options: RunOptions, onEvent?: ExecutionEventHandler): Promise<RunResult> {
    // Tauri dev mode - compiles Rust and starts dev server
    const result = await executionKernel.execute(
      { command: "npm", args: ["run", "tauri", "dev"] },
      {
        appId: options.appId,
        cwd: options.appPath,
        networkAccess: true, // Dev server needs network
        memoryLimitMB: 4096,
        mode: "session", // Non-blocking, returns Job ID
      },
      "tauri"
    );

    return {
      ready: result.exitCode === 0,
      jobId: result.exitCode === 0 ? `job_${options.appId}_${Date.now()}_tauri` : undefined,
    };
  },

  async stop(appId: number, jobId?: string): Promise<void> {
    if (jobId) {
      await executionKernel.terminateJob(jobId);
      return;
    }

    // Fallback: Kill Tauri/Cargo processes
    try {
      // Kill cargo processes
      await executionKernel.execute(
        { command: "taskkill", args: ["/F", "/IM", "cargo.exe"] },
        { appId, cwd: process.cwd(), timeout: 10000 },
        "tauri"
      );
    } catch {
      // Process may already be terminated
    }
  },

  async startPreview(options: PreviewOptions): Promise<void> {
    // Tauri apps run as native executables
    const buildPath = path.join(options.appPath, "src-tauri", "target", "debug");
    
    // Find the .exe file
    const files = await fs.readdir(buildPath).catch(() => []);
    const exeFile = files.find(f => f.endsWith(".exe") && !f.includes(".pdb"));
    
    if (!exeFile) {
      throw new Error("No Tauri executable found. Build the project first with 'npm run tauri build'");
    }

    // Launch the executable
    await executionKernel.execute(
      { command: path.join(buildPath, exeFile), args: [] },
      {
        appId: options.appId,
        cwd: buildPath,
        mode: "session",
      },
      "tauri"
    );
  },

  async stopPreview(appId: number): Promise<void> {
    // Stop any running preview
    await this.stop(appId);
  },

  async package(options: PackageOptions): Promise<ExecutionResult> {
    // Tauri build with bundling creates installers
    const outputPath = path.join(options.appPath, "src-tauri", "target", "release", "bundle");
    
    const args = ["run", "tauri", "build"];

    // Add bundler-specific arguments
    if (options.outputFormat === "msi") {
      // MSI is default on Windows
    } else if (options.outputFormat === "exe") {
      // NSIS installer for .exe
      process.env.TAURI_PRIVATE_KEY = ""; // Disable signing for unsigned builds
    }

    return executionKernel.execute(
      { command: "npm", args },
      {
        appId: 0,
        cwd: options.appPath,
        networkAccess: false,
        memoryLimitMB: 8192, // Packaging needs lots of memory
        timeout: 1200000, // 20 minutes for full Tauri build
      },
      "tauri"
    );
  },

  isReady(message: string): boolean {
    // Tauri dev server ready patterns
    const readyPatterns = [
      /dev server running/i,
      /localhost:\d+/i,
      /running on http/i,
      /vite.*ready/i,
      /compiled successfully/i,
    ];
    
    return readyPatterns.some(pattern => pattern.test(message));
  },
};
