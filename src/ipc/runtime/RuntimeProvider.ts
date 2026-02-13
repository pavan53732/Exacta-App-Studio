// src/ipc/runtime/RuntimeProvider.ts
// Abstract interface for all runtime implementations
// UI and IPC call these methods — NOT runtime strings directly

import type {
  ExecutionResult,
  ExecutionEventHandler,
} from "../security/execution_kernel";

// Re-export types that are safe for renderer
export type {
  PreviewStrategy,
  RiskProfile,
  ScaffoldOptions,
  ScaffoldResult,
  BuildOptions,
  BuildResult,
  RunOptions,
  RunResult,
  PreviewOptions,
  PackageOptions,
} from "./runtime_types";

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
