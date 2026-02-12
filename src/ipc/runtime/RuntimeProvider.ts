// src/ipc/runtime/RuntimeProvider.ts
// Abstract interface for all runtime implementations
// UI and IPC call these methods — NOT runtime strings directly

import type { ExecutionResult, ExecutionEventHandler } from "../security/execution_kernel";

export interface ScaffoldOptions {
  projectName: string;
  fullAppPath: string;
  templateId?: string;
}

export interface ScaffoldResult {
  success: boolean;
  entryPoint?: string;
  error?: string;
}

export interface BuildOptions {
  appId: number;
  appPath: string;
  configuration?: "Debug" | "Release";
}

export interface BuildResult {
  success: boolean;
  outputPath?: string;
  errors?: string[];
  warnings?: string[];
}

export interface RunOptions {
  appId: number;
  appPath: string;
  installCommand?: string | null;
  startCommand?: string | null;
}

export interface RunResult {
  processId?: number;
  ready: boolean;
  error?: string;
  jobId?: string; // Guardian Job ID for session mode
}

export type PreviewStrategy =
  | "iframe"
  | "external-window"
  | "console-output"
  | "hybrid";

export interface PreviewOptions {
  appId: number;
  appPath: string;
  onScreenshot?: (dataUrl: string) => void;
  onConsoleOutput?: (output: string) => void;
}

export interface PackageOptions {
  appPath: string;
  outputFormat: "exe" | "msi" | "msix" | "single-file";
  architecture?: "x64" | "x86" | "arm64";
}

export type RiskProfile = "low" | "medium" | "high" | "critical";

/**
 * RuntimeProvider - Abstract base for all runtime implementations
 *
 * Implementations:
 *   - NodeRuntimeProvider (React, Next.js, etc.)
 *   - DotNetRuntimeProvider (WPF, WinUI 3, WinForms, Console, MAUI)
 *   - TauriRuntimeProvider (Tauri)
 *
 * NO direct shell execution in implementations.
 * All commands go through ExecutionKernel.
 */
export interface RuntimeProvider {
  readonly runtimeId: string;
  readonly runtimeName: string;
  readonly supportedStackTypes: string[];
  readonly previewStrategy: PreviewStrategy;
  readonly diskQuotaBytes?: number; // Default quota for this runtime

  // Prerequisites
  checkPrerequisites(): Promise<{ installed: boolean; missing: string[] }>;
  installPrerequisites?(): Promise<void>;

  // Risk Assessment (Provider-Aware Security)
  getRiskProfile(command: string, args: string[]): RiskProfile;

  // Project lifecycle
  scaffold(options: ScaffoldOptions): Promise<ScaffoldResult>;
  resolveDependencies(options: {
    appPath: string;
    appId: number;
  }): Promise<ExecutionResult>;
  addDependency?(options: {
    // For targeted adds (dyad-add-nuget, etc.)
    appPath: string;
    appId: number;
    packages: string[];
  }): Promise<ExecutionResult>;
  build(
    options: BuildOptions,
    onEvent?: ExecutionEventHandler,
  ): Promise<BuildResult>;
  run(options: RunOptions, onEvent?: ExecutionEventHandler): Promise<RunResult>;
  stop(appId: number, jobId?: string): Promise<void>;

  // Preview
  startPreview(options: PreviewOptions): Promise<void>;
  stopPreview(appId: number): Promise<void>;
  captureScreenshot?(appId: number): Promise<string>; // Base64 data URL

  // Packaging
  package?(options: PackageOptions): Promise<ExecutionResult>;

  // Readiness detection
  isReady(message: string): boolean;
}
