/**
 * Shared types for Runtime Providers that can be safely imported by renderer code.
 * This file MUST NOT import any Node.js modules or execution_kernel.
 */

export type PreviewStrategy =
  | "iframe"
  | "external-window"
  | "console-output"
  | "hybrid";

export type RiskProfile = "low" | "medium" | "high" | "critical";

export interface ScaffoldOptions {
  projectName: string;
  fullAppPath: string;
  templateId?: string;
}

export interface ScaffoldResult {
  success: boolean;
  entryPoint?: string;
  error?: string;
  warning?: string;
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
