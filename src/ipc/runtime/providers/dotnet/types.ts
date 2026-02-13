/**
 * TypeScript interfaces for .NET Runtime Provider
 * Defines project configuration, build results, and error responses
 */

export interface ProjectConfiguration {
  name: string;
  framework: "WPF" | "WinUI3" | "WinForms" | "Console" | "MAUI";
  targetFramework: string; // e.g., 'net8.0-windows', 'net7.0-windows'
  outputType: "WinExe" | "Exe";
  useWPF?: boolean;
  useWindowsForms?: boolean;
  useWinUI?: boolean;
  packageReferences: PackageReference[];
  files: ProjectFile[];
}

export interface PackageReference {
  name: string;
  version: string;
}

export interface ProjectFile {
  path: string;
  type: "xaml" | "csharp" | "resource" | "config" | "project";
  dependentUpon?: string; // For code-behind files
}

export interface ProjectState {
  projectPath: string;
  projectName: string;
  framework: "WPF" | "WinUI3" | "WinForms" | "Console" | "MAUI";
  targetFramework: string;
  executablePath?: string;
  processHandle?: ProcessHandle;
  files: Map<string, FileMetadata>;
}

export interface ProcessHandle {
  pid: number;
  startTime: Date;
  executablePath: string;
  jobId?: string;
}

export interface FileMetadata {
  path: string;
  type: "xaml" | "csharp" | "resource" | "config" | "project";
  lastModified: Date;
  dependentUpon?: string;
}

export interface CompilerError {
  code: string; // e.g., 'CS0103', 'MSB3644'
  message: string;
  file: string;
  line: number;
  column: number;
  severity: "error" | "warning";
}

export interface ErrorResponse {
  category: "scaffold" | "dependency" | "build" | "runtime";
  code: string;
  message: string;
  details: ErrorDetails;
  timestamp: Date;
}

export interface ErrorDetails {
  file?: string;
  line?: number;
  column?: number;
  stackTrace?: string;
  innerError?: ErrorResponse;
}

export interface DependencyResult {
  success: boolean;
  packagesRestored?: string[];
  errors?: ErrorResponse[];
  warnings?: string[];
}

export interface ProcessOutput {
  stdout: string[];
  stderr: string[];
  exitCode?: number;
}
