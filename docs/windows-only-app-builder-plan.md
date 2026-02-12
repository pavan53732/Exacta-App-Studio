# Dyad Windows-Only App Builder - Implementation Plan

## Vision
Transform Dyad into a Windows-focused universal app builder:
- **Web Apps**: React, Next.js, Vue, Angular (current)
- **Windows Native Apps**: WPF, WinUI 3, WinForms, UWP, Console
- **Windows Desktop**: .NET MAUI (Windows-only mode), Tauri (Windows output)

**Scope:** Windows 10/11 only. No macOS or Linux support needed.

---

## Critical Architecture Decision: Execution Kernel First

**⚠️ BEFORE ANY RUNTIME IMPLEMENTATION**, we must establish the Execution Kernel abstraction.

The current codebase has scattered `execPromise()` calls that bypass security. This plan introduces:

1. **ExecutionKernel** - Centralized, policy-enforced command execution
2. **RuntimeProvider Interface** - Abstracted runtime implementations
3. **Capability-Based Security** - All operations validated before execution

**Rule**: No raw `exec()`, `spawn()`, or `execPromise()` in runtime logic. All commands go through `ExecutionKernel.execute()`.

---

## Architecture (Windows-Only)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Dyad Electron App                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    UI Layer (React + TanStack)                        │   │
│  │   PreviewPanel │ Chat │ FileTree │ Settings │ Agent Tools            │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────────┤
│                          Runtime Abstraction Layer                           │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │              RuntimeProviderRegistry                                 │   │
│  │   NodeRuntimeProvider │ DotNetRuntimeProvider │ TauriRuntimeProvider │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────────┤
│                        Execution Kernel (NEW)                                │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  ExecutionKernel.execute()                                           │   │
│  │    → validateAction()      → Command allowlist, path validation      │   │
│  │    → classifyRisk()        → low/medium/high risk assessment         │   │
│  │    → requestCapability()   → JWT token from Guardian                 │   │
│  │    → createGuardianJob()   → Sandbox for high-risk ops               │   │
│  │    → spawnControlled()     → Guardian or tracked spawn               │   │
│  │    → monitorProcess()      → Timeout, stdout/stderr, events          │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────────┤
│                     Windows Guardian Service (Existing)                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │  Job Object │ │  WFP Rules  │ │   ACL       │ │ Capability Engine   │   │
│  │  Manager    │ │  (Network)  │ │  (Files)    │ │ (JWT Tokens)        │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────────┤
│                        Windows Toolchains                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐    │
│  │ Node/npm │ │  .NET    │ │  Rust/   │ │  MSBuild │ │  Code Sign     │    │
│  │  pnpm    │ │  SDK     │ │  Cargo   │ │          │ │  signtool      │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key Architecture Principle:** No direct shell execution. All commands flow through the Execution Kernel.

---

## Codebase Mapping: Plan Concepts to Actual Files

| Plan Concept | Actual Code That Needs Changing |
|---|---|
| `ExecutionKernel.execute()` | **NEW** - Replace all direct shell calls |
| `RuntimeProvider` interface | **NEW** - `src/ipc/runtime/RuntimeProvider.ts` |
| `NodeRuntimeProvider` | **NEW** - `src/ipc/runtime/providers/NodeRuntimeProvider.ts` |
| `DotNetRuntimeProvider` | **NEW** - `src/ipc/runtime/providers/DotNetRuntimeProvider.ts` |
| `TauriRuntimeProvider` | **NEW** - `src/ipc/runtime/providers/TauriRuntimeProvider.ts` |
| `RuntimeProvider.scaffold()` | [`src/ipc/handlers/createFromTemplate.ts`](src/ipc/handlers/createFromTemplate.ts:12) — currently only handles `"react"` scaffold or GitHub clones |
| `RuntimeProvider.build()` | [`src/ipc/handlers/app_handlers.ts:2009`](src/ipc/handlers/app_handlers.ts:2009) — [`getCommand()`](src/ipc/handlers/app_handlers.ts:2009) currently defaults to npm |
| `RuntimeProvider.preview()` | [`src/components/preview_panel/PreviewIframe.tsx:1290`](src/components/preview_panel/PreviewIframe.tsx:1290) — hardcoded `<iframe>` |
| Process sandboxing | [`src/ipc/utils/process_manager.ts`](src/ipc/utils/process_manager.ts) — current process spawning |
| App execution | [`src/ipc/handlers/app_handlers.ts:159`](src/ipc/handlers/app_handlers.ts:159) — [`executeApp()`](src/ipc/handlers/app_handlers.ts:159) |
| App DB schema | [`src/db/schema.ts:26`](src/db/schema.ts:26) — `apps` table |
| AI instructions | [`src/prompts/system_prompt.ts:62`](src/prompts/system_prompt.ts:62) — hardcoded "web applications" |
| Dependency install | [`src/ipc/processors/executeAddDependency.ts`](src/ipc/processors/executeAddDependency.ts) — npm only |
| Response processing | [`src/ipc/processors/response_processor.ts`](src/ipc/processors/response_processor.ts) — only web tags |
| Agent tools | [`src/pro/main/ipc/handlers/local_agent/tool_definitions.ts`](docs/agent_architecture.md) — web-only tools |
| Guardian integration | [`src/ipc/handlers/guardian_handlers.ts`](src/ipc/handlers/guardian_handlers.ts) — existing Guardian IPC handlers |

---

## Phase 0: Execution Kernel Foundation (Month 1) - **CRITICAL**

### 0.1 Execution Kernel Interface

**NEW File:** `src/ipc/runtime/ExecutionKernel.ts`

```typescript
// src/ipc/runtime/ExecutionKernel.ts
// CENTRALIZED, POLICY-ENFORCED COMMAND EXECUTION
// NO raw exec(), spawn(), or execPromise() anywhere else in runtime logic

import { ipc } from "@/ipc/types";
import log from "electron-log";

const logger = log.scope("execution-kernel");

export interface ExecutionOptions {
  command: string;
  args: string[];
  cwd: string;
  appId: number;
  
  // Security policies
  networkPolicy: "allowed" | "blocked" | "restricted";
  memoryLimitBytes?: number;
  cpuRatePercent?: number;
  timeoutMs?: number;
  
  // Environment isolation
  env?: Record<string, string>;
  readOnlyPaths?: string[];
  writePaths?: string[];
}

export interface ExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  jobId?: string;
}

export interface ExecutionEvent {
  type: "stdout" | "stderr" | "ready" | "error" | "timeout" | "resource-limit";
  message: string;
  timestamp: number;
}

export type ExecutionEventHandler = (event: ExecutionEvent) => void;

/**
 * ExecutionKernel - Single entry point for ALL command execution
 * 
 * Architecture:
 *   ExecutionKernel.execute(action)
 *     → ValidateAction
 *     → ClassifyRisk
 *     → RequestCapability (JWT token)
 *     → CreateGuardianJob (if needed)
 *     → SpawnViaGuardian
 *     → TrackResourceUsage
 *     → EmitStructuredEvents
 *     → CommitCheckpoint
 * 
 * NO direct shell execution bypasses this layer.
 */
export class ExecutionKernel {
  private static instance: ExecutionKernel;
  private useGuardian: boolean = true;
  
  private constructor() {}
  
  static getInstance(): ExecutionKernel {
    if (!ExecutionKernel.instance) {
      ExecutionKernel.instance = new ExecutionKernel();
    }
    return ExecutionKernel.instance;
  }
  
  /**
   * Execute a command through the kernel
   * ALL runtime commands must go through this method
   */
  async execute(options: ExecutionOptions, onEvent?: ExecutionEventHandler): Promise<ExecutionResult> {
    // 1. Validate action against policy
    await this.validateAction(options);
    
    // 2. Classify risk level
    const riskLevel = this.classifyRisk(options);
    
    // 3. Request capability token
    const capability = await this.requestCapability(options, riskLevel);
    
    // 4. Create Guardian job for sandboxing (if enabled)
    let jobId: string | undefined;
    if (this.useGuardian && riskLevel !== "low") {
      jobId = await this.createGuardianJob(options);
    }
    
    // 5. Execute via Guardian or direct (controlled) spawn
    const result = await this.spawnControlled(options, jobId, onEvent);
    
    // 6. Cleanup Guardian job
    if (jobId) {
      await this.cleanupGuardianJob(jobId);
    }
    
    return result;
  }
  
  private async validateAction(options: ExecutionOptions): Promise<void> {
    // Validate command against allowlist
    const allowedCommands = ["npm", "pnpm", "dotnet", "cargo", "node", "git"];
    const baseCommand = options.command.split("/").pop()?.split("\\").pop();
    
    if (!baseCommand || !allowedCommands.includes(baseCommand)) {
      throw new Error(`Command not allowed: ${options.command}`);
    }
    
    // Validate paths are within app directory
    if (!options.cwd.includes(`dyad-app-${options.appId}`) && !options.cwd.includes("templates")) {
      throw new Error(`Invalid working directory: ${options.cwd}`);
    }
  }
  
  private classifyRisk(options: ExecutionOptions): "low" | "medium" | "high" {
    const cmd = options.command.toLowerCase();
    const args = options.args.join(" ").toLowerCase();
    
    // High risk: network access + package installation
    if (options.networkPolicy === "allowed" && 
        (args.includes("install") || args.includes("add") || args.includes("restore"))) {
      return "high";
    }
    
    // Medium risk: network access or build
    if (options.networkPolicy === "allowed" || args.includes("build")) {
      return "medium";
    }
    
    return "low";
  }
  
  private async requestCapability(options: ExecutionOptions, riskLevel: string): Promise<any> {
    // Request capability token from Guardian
    if (riskLevel === "high") {
      return await ipc.guardian.requestCapability({
        action: "execute",
        resource: options.command,
        constraints: {
          network: options.networkPolicy,
          memory: options.memoryLimitBytes,
          cpu: options.cpuRatePercent,
        },
      });
    }
    return null;
  }
  
  private async createGuardianJob(options: ExecutionOptions): Promise<string> {
    const job = await ipc.guardian.createJob({
      jobName: `dyad-app-${options.appId}-${Date.now()}`,
      memoryLimitBytes: options.memoryLimitBytes || 2 * 1024 * 1024 * 1024,
      cpuRatePercent: options.cpuRatePercent || 50,
      networkPolicy: options.networkPolicy,
    });
    return job.id;
  }
  
  private async spawnControlled(
    options: ExecutionOptions,
    jobId: string | undefined,
    onEvent?: ExecutionEventHandler
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    if (jobId) {
      // Spawn via Guardian
      return this.spawnViaGuardian(options, jobId, onEvent);
    } else {
      // Low-risk: controlled direct spawn (still tracked)
      return this.spawnTracked(options, onEvent);
    }
  }
  
  private async spawnViaGuardian(
    options: ExecutionOptions,
    jobId: string,
    onEvent?: ExecutionEventHandler
  ): Promise<ExecutionResult> {
    // Use Guardian for sandboxed execution
    const proc = await ipc.guardian.spawnInJob(
      options.command,
      options.args,
      jobId,
      { cwd: options.cwd, env: options.env }
    );
    
    return this.monitorProcess(proc, options, onEvent);
  }
  
  private async spawnTracked(
    options: ExecutionOptions,
    onEvent?: ExecutionEventHandler
  ): Promise<ExecutionResult> {
    // Even "direct" spawns are tracked and limited
    const { spawn } = await import("node:child_process");
    
    const proc = spawn(options.command, options.args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      shell: false, // NO shell interpretation
    });
    
    return this.monitorProcess(proc, options, onEvent);
  }
  
  private async monitorProcess(
    proc: any,
    options: ExecutionOptions,
    onEvent?: ExecutionEventHandler
  ): Promise<ExecutionResult> {
    return new Promise((resolve, reject) => {
      let stdout = "";
      let stderr = "";
      const startTime = Date.now();
      
      // Set timeout
      const timeout = setTimeout(() => {
        proc.kill();
        reject(new Error(`Execution timeout after ${options.timeoutMs}ms`));
      }, options.timeoutMs || 300000); // 5 min default
      
      proc.stdout?.on("data", (data: Buffer) => {
        const chunk = data.toString();
        stdout += chunk;
        onEvent?.({ type: "stdout", message: chunk, timestamp: Date.now() });
      });
      
      proc.stderr?.on("data", (data: Buffer) => {
        const chunk = data.toString();
        stderr += chunk;
        onEvent?.({ type: "stderr", message: chunk, timestamp: Date.now() });
      });
      
      proc.on("close", (exitCode: number) => {
        clearTimeout(timeout);
        resolve({
          exitCode,
          stdout,
          stderr,
          durationMs: Date.now() - startTime,
        });
      });
      
      proc.on("error", (err: Error) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }
  
  private async cleanupGuardianJob(jobId: string): Promise<void> {
    try {
      await ipc.guardian.terminateJob({ jobId });
    } catch (error) {
      logger.warn(`Failed to cleanup Guardian job ${jobId}:`, error);
    }
  }
}

// Singleton export
export const executionKernel = ExecutionKernel.getInstance();
```

### 0.2 Runtime Provider Interface

**NEW File:** `src/ipc/runtime/RuntimeProvider.ts`

```typescript
// src/ipc/runtime/RuntimeProvider.ts
// Abstract interface for all runtime implementations
// UI and IPC call these methods — NOT runtime strings directly

import { ExecutionResult, ExecutionEventHandler } from "./ExecutionKernel";

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
}

export type PreviewStrategy = "iframe" | "external-window" | "console-output" | "hybrid";

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
  
  // Prerequisites
  checkPrerequisites(): Promise<{ installed: boolean; missing: string[] }>;
  installPrerequisites?(): Promise<void>;
  
  // Project lifecycle
  scaffold(options: ScaffoldOptions): Promise<ScaffoldResult>;
  resolveDependencies(options: { appPath: string; appId: number }): Promise<ExecutionResult>;
  build(options: BuildOptions, onEvent?: ExecutionEventHandler): Promise<BuildResult>;
  run(options: RunOptions, onEvent?: ExecutionEventHandler): Promise<RunResult>;
  stop(appId: number): Promise<void>;
  
  // Preview
  startPreview(options: PreviewOptions): Promise<void>;
  stopPreview(appId: number): Promise<void>;
  captureScreenshot?(appId: number): Promise<string>; // Base64 data URL
  
  // Packaging
  package?(options: PackageOptions): Promise<ExecutionResult>;
  
  // Readiness detection
  isReady(message: string): boolean;
}
```

### 0.3 Runtime Provider Registry

**NEW File:** `src/ipc/runtime/RuntimeProviderRegistry.ts`

```typescript
// src/ipc/runtime/RuntimeProviderRegistry.ts
// Central registry for runtime providers
// NO scattered runtime branching across the codebase

import { RuntimeProvider } from "./RuntimeProvider";
import { nodeRuntimeProvider } from "./providers/NodeRuntimeProvider";
import { dotNetRuntimeProvider } from "./providers/DotNetRuntimeProvider";
import { tauriRuntimeProvider } from "./providers/TauriRuntimeProvider";

class RuntimeProviderRegistry {
  private providers: Map<string, RuntimeProvider> = new Map();
  
  constructor() {
    // Register built-in providers
    this.register(nodeRuntimeProvider);
    this.register(dotNetRuntimeProvider);
    this.register(tauriRuntimeProvider);
  }
  
  register(provider: RuntimeProvider): void {
    this.providers.set(provider.runtimeId, provider);
  }
  
  getProvider(runtimeId: string): RuntimeProvider {
    const provider = this.providers.get(runtimeId);
    if (!provider) {
      throw new Error(`Unknown runtime: ${runtimeId}`);
    }
    return provider;
  }
  
  getProviderForStack(stackType: string): RuntimeProvider {
    for (const provider of this.providers.values()) {
      if (provider.supportedStackTypes.includes(stackType)) {
        return provider;
      }
    }
    throw new Error(`No provider found for stack type: ${stackType}`);
  }
  
  listProviders(): RuntimeProvider[] {
    return Array.from(this.providers.values());
  }
}

export const runtimeRegistry = new RuntimeProviderRegistry();
```

### 0.4 Refactor Existing Code to Use Kernel

**File:** [`src/ipc/processors/executeAddDependency.ts`](src/ipc/processors/executeAddDependency.ts)

```typescript
// src/ipc/processors/executeAddDependency.ts
// REFACTORED to use ExecutionKernel

import { executionKernel } from "../runtime/ExecutionKernel";
import { db } from "../../db";
import { messages } from "../../db/schema";
import { eq } from "drizzle-orm";
import { Message } from "@/ipc/types";

export async function executeAddDependency({
  packages,
  message,
  appPath,
  appId,
}: {
  packages: string[];
  message: Message;
  appPath: string;
  appId: number;  // NEW: required for kernel
}) {
  const packageStr = packages.join(" ");

  // REFACTORED: Use ExecutionKernel instead of direct execPromise
  const result = await executionKernel.execute({
    command: "sh",
    args: ["-c", `(pnpm add ${packageStr}) || (npm install --legacy-peer-deps ${packageStr})`],
    cwd: appPath,
    appId,
    networkPolicy: "allowed",
    memoryLimitBytes: 2 * 1024 * 1024 * 1024, // 2GB
    timeoutMs: 300000, // 5 minutes
  });

  const installResults = result.stdout + (result.stderr ? `\n${result.stderr}` : "");

  // Update the message content with the installation results
  const updatedContent = message.content.replace(
    new RegExp(
      `<dyad-add-dependency packages="${packages.join(" ")}">[^<]*</dyad-add-dependency>`,
      "g"
    ),
    `<dyad-add-dependency packages="${packages.join(" ")}">${installResults}</dyad-add-dependency>`
  );

  // Save the updated message back to the database
  await db
    .update(messages)
    .set({ content: updatedContent })
    .where(eq(messages.id, message.id));
}
```

---

## Phase 1: Node Runtime Provider (Month 1-2)

Extract existing Node.js logic into a proper RuntimeProvider.

**NEW File:** `src/ipc/runtime/providers/NodeRuntimeProvider.ts`

```typescript
// src/ipc/runtime/providers/NodeRuntimeProvider.ts
// Node.js runtime implementation

import { RuntimeProvider, ScaffoldOptions, ScaffoldResult, BuildOptions, BuildResult, RunOptions, RunResult, PreviewOptions, PackageOptions } from "../RuntimeProvider";
import { executionKernel } from "../ExecutionKernel";
import { getAppPort } from "../../../../shared/ports";
import path from "node:path";
import fs from "node:fs-extra";
import { copyDirectoryRecursive } from "../../utils/file_utils";

export const nodeRuntimeProvider: RuntimeProvider = {
  runtimeId: "node",
  runtimeName: "Node.js",
  supportedStackTypes: ["react", "nextjs", "express-react"],
  previewStrategy: "iframe",
  
  async checkPrerequisites(): Promise<{ installed: boolean; missing: string[] }> {
    try {
      await executionKernel.execute({
        command: "node",
        args: ["--version"],
        cwd: process.cwd(),
        appId: 0,
        networkPolicy: "blocked",
      });
      return { installed: true, missing: [] };
    } catch {
      return { installed: false, missing: ["Node.js"] };
    }
  },
  
  async scaffold(options: ScaffoldOptions): Promise<ScaffoldResult> {
    try {
      if (options.templateId === "react") {
        await copyDirectoryRecursive(
          path.join(__dirname, "..", "..", "..", "scaffold"),
          options.fullAppPath
        );
        return { success: true, entryPoint: "src/main.tsx" };
      }
      
      // GitHub clone logic via kernel
      // ...
      
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
  
  async resolveDependencies(options: { appPath: string; appId: number }) {
    return executionKernel.execute({
      command: "sh",
      args: ["-c", "pnpm install || npm install --legacy-peer-deps"],
      cwd: options.appPath,
      appId: options.appId,
      networkPolicy: "allowed",
      memoryLimitBytes: 2 * 1024 * 1024 * 1024,
      timeoutMs: 300000,
    });
  },
  
  async build(options: BuildOptions, onEvent) {
    const result = await executionKernel.execute({
      command: "npm",
      args: ["run", "build"],
      cwd: options.appPath,
      appId: options.appId,
      networkPolicy: "blocked",
      timeoutMs: 300000,
    }, onEvent);
    
    return {
      success: result.exitCode === 0,
      errors: result.exitCode !== 0 ? [result.stderr] : undefined,
    };
  },
  
  async run(options: RunOptions, onEvent) {
    const port = getAppPort(options.appId);
    const hasCustomCommands = !!options.installCommand?.trim() && !!options.startCommand?.trim();
    
    const command = hasCustomCommands
      ? `${options.installCommand} && ${options.startCommand}`
      : `(pnpm install && pnpm run dev --port ${port}) || (npm install --legacy-peer-deps && npm run dev -- --port ${port})`;
    
    const result = await executionKernel.execute({
      command: "sh",
      args: ["-c", command],
      cwd: options.appPath,
      appId: options.appId,
      networkPolicy: "allowed",
      memoryLimitBytes: 2 * 1024 * 1024 * 1024,
    }, onEvent);
    
    return {
      ready: result.exitCode === 0,
    };
  },
  
  async stop(appId: number) {
    // Stop logic via process_manager
    const { stopAppByInfo, runningApps } = await import("../../utils/process_manager");
    const appInfo = runningApps.get(appId);
    if (appInfo) {
      await stopAppByInfo(appId, appInfo);
    }
  },
  
  async startPreview(options: PreviewOptions) {
    // Node apps use iframe - no external window needed
  },
  
  async stopPreview(appId: number) {
    // Cleanup handled by stop()
  },
  
  isReady(message: string): boolean {
    // Node web apps ready when localhost URL detected
    return /https?:\/\/localhost:\d+/.test(message);
  },
};
```

---

## Phase 2: Database Schema (Month 2)

**File:** [`src/db/schema.ts`](src/db/schema.ts:26)

```typescript
// src/db/schema.ts
export const apps = sqliteTable("apps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  path: text("path").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  
  // EXISTING columns
  installCommand: text("install_command"),
  startCommand: text("start_command"),
  
  // NEW columns for Windows app builder
  stackType: text("stack_type").default("react"),
  runtimeProvider: text("runtime_provider").default("node"),
  
  // Existing columns...
  githubOrg: text("github_org"),
  githubRepo: text("github_repo"),
  // ... rest of existing columns
});
```

---

## Phase 3: .NET Runtime Provider (Months 3-4)

**NEW File:** `src/ipc/runtime/providers/DotNetRuntimeProvider.ts`

```typescript
// src/ipc/runtime/providers/DotNetRuntimeProvider.ts
// .NET runtime implementation with security controls

import { RuntimeProvider, ScaffoldOptions, ScaffoldResult, BuildOptions, BuildResult, RunOptions, RunResult, PreviewOptions, PackageOptions } from "../RuntimeProvider";
import { executionKernel } from "../ExecutionKernel";
import path from "node:path";

export const dotNetRuntimeProvider: RuntimeProvider = {
  runtimeId: "dotnet",
  runtimeName: ".NET",
  supportedStackTypes: ["wpf", "winui3", "winforms", "console", "maui"],
  previewStrategy: "external-window", // Native apps need external window
  
  async checkPrerequisites(): Promise<{ installed: boolean; missing: string[] }> {
    const missing: string[] = [];
    
    try {
      await executionKernel.execute({
        command: "dotnet",
        args: ["--version"],
        cwd: process.cwd(),
        appId: 0,
        networkPolicy: "blocked",
      });
    } catch {
      missing.push(".NET SDK");
    }
    
    return { installed: missing.length === 0, missing };
  },
  
  async scaffold(options: ScaffoldOptions): Promise<ScaffoldResult> {
    const templateMap: Record<string, string> = {
      "wpf": "wpf",
      "winui3": "winui3",
      "winforms": "winforms",
      "console": "console",
      "maui": "maui",
    };
    
    const dotnetTemplate = templateMap[options.templateId || "console"];
    if (!dotnetTemplate) {
      return { success: false, error: `Unknown .NET template: ${options.templateId}` };
    }
    
    const projectName = path.basename(options.fullAppPath);
    
    try {
      await executionKernel.execute({
        command: "dotnet",
        args: ["new", dotnetTemplate, "-n", projectName, "-o", options.fullAppPath],
        cwd: path.dirname(options.fullAppPath),
        appId: 0, // Scaffold phase - no specific app
        networkPolicy: "blocked",
        timeoutMs: 60000,
      });
      
      return { success: true, entryPoint: `${projectName}.csproj` };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
  
  async resolveDependencies(options: { appPath: string; appId: number }) {
    // HIGH SECURITY: NuGet restore has network access but is sandboxed
    return executionKernel.execute({
      command: "dotnet",
      args: ["restore"],
      cwd: options.appPath,
      appId: options.appId,
      networkPolicy: "allowed", // NuGet needs network
      memoryLimitBytes: 4 * 1024 * 1024 * 1024, // 4GB for large restores
      timeoutMs: 600000, // 10 minutes
    });
  },
  
  async build(options: BuildOptions, onEvent) {
    const config = options.configuration || "Debug";
    
    const result = await executionKernel.execute({
      command: "dotnet",
      args: ["build", "-c", config, "-v", "n"],
      cwd: options.appPath,
      appId: options.appId,
      networkPolicy: "blocked", // Build should not need network
      memoryLimitBytes: 4 * 1024 * 1024 * 1024, // 4GB for MSBuild
      timeoutMs: 600000,
    }, onEvent);
    
    // Parse build errors/warnings from output
    const errors = result.stdout.match(/error [A-Z]+\d+:.*/g) || [];
    const warnings = result.stdout.match(/warning [A-Z]+\d+:.*/g) || [];
    
    return {
      success: result.exitCode === 0,
      outputPath: path.join(options.appPath, "bin", config),
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  },
  
  async run(options: RunOptions, onEvent) {
    // For native apps, we launch externally and monitor
    const result = await executionKernel.execute({
      command: "dotnet",
      args: ["run"],
      cwd: options.appPath,
      appId: options.appId,
      networkPolicy: "allowed",
      memoryLimitBytes: 2 * 1024 * 1024 * 1024,
    }, onEvent);
    
    return {
      ready: result.exitCode === 0 || result.exitCode === null, // null = still running
    };
  },
  
  async stop(appId: number) {
    // Kill dotnet processes for this app
    const { execPromise } = await import("../../processors/executeAddDependency");
    try {
      await execPromise(`taskkill /F /IM dotnet.exe /FI "WINDOWTITLE eq *dyad-app-${appId}*"`);
    } catch {
      // Process may already be stopped
    }
  },
  
  async startPreview(options: PreviewOptions) {
    // Native apps launch in external window
    // Preview panel shows status + logs only
  },
  
  async stopPreview(appId: number) {
    await this.stop(appId);
  },
  
  async captureScreenshot(appId: number): Promise<string> {
    // Use Windows API to capture screenshot of native window
    // Return base64 data URL
    throw new Error("Screenshot not yet implemented");
  },
  
  isReady(message: string): boolean {
    // Console apps: any stdout means ready
    // GUI apps: window creation is detected via separate mechanism
    return message.length > 0;
  },
  
  // Packaging support
  async package(options: PackageOptions) {
    const args = ["publish", "-c", "Release"];
    
    if (options.outputFormat === "single-file") {
      args.push("/p:PublishSingleFile=true", "--self-contained");
    }
    
    if (options.architecture) {
      args.push("-r", `win-${options.architecture}`);
    }
    
    return executionKernel.execute({
      command: "dotnet",
      args,
      cwd: options.appPath,
      appId: 0,
      networkPolicy: "blocked",
      memoryLimitBytes: 4 * 1024 * 1024 * 1024,
      timeoutMs: 600000,
    });
  },
};
```

---

## Phase 4: Agent Tools via Kernel (Months 4-5)

**CRITICAL**: Agent tools must NOT bypass policy. They call ExecutionKernel.

**NEW File:** `src/pro/main/ipc/handlers/local_agent/tools/run_dotnet_command.ts`

```typescript
// src/pro/main/ipc/handlers/local_agent/tools/run_dotnet_command.ts
import { z } from "zod";
import type { ToolDefinition } from "../types";
import { executionKernel } from "../../../../../../ipc/runtime/ExecutionKernel";

export const runDotnetCommandTool: ToolDefinition = {
  name: "run_dotnet_command",
  description: "Execute a dotnet CLI command through the secure ExecutionKernel",
  inputSchema: z.object({
    command: z.string().describe("The dotnet command to run (e.g., 'build', 'run')"),
    args: z.array(z.string()).optional().describe("Command arguments"),
    working_dir: z.string().optional().describe("Working directory"),
  }),
  modifiesState: true,
  async execute({ command, args = [], working_dir }, ctx) {
    const cwd = working_dir || ctx.appPath;
    
    // SECURITY: All execution goes through kernel
    const result = await executionKernel.execute({
      command: "dotnet",
      args: [command, ...args],
      cwd,
      appId: ctx.appId,
      networkPolicy: command === "restore" || args.includes("add") ? "allowed" : "blocked",
      memoryLimitBytes: 4 * 1024 * 1024 * 1024,
      timeoutMs: 300000,
    });
    
    return `Exit code: ${result.exitCode}\nStdout:\n${result.stdout}\nStderr:\n${result.stderr}`;
  },
  getConsentPreview({ command, args }) {
    return `Run: dotnet ${command} ${args?.join(" ") || ""}`;
  },
};
```

---

## Phase 5: Preview Panel with Runtime Abstraction (Months 5-6)

**File:** [`src/components/preview_panel/PreviewPanel.tsx`](src/components/preview_panel/PreviewPanel.tsx:147)

```typescript
// src/components/preview_panel/PreviewPanel.tsx
// REFACTORED to use RuntimeProvider abstraction

import { runtimeRegistry } from "../../../../ipc/runtime/RuntimeProviderRegistry";

export function PreviewPanel() {
  const [previewMode] = useAtom(previewModeAtom);
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const app = useAtomValue(selectedAppAtom);
  
  // Get runtime provider based on app's runtime
  const runtimeProvider = app?.runtimeProvider 
    ? runtimeRegistry.getProvider(app.runtimeProvider)
    : null;
  
  const getPreviewComponent = () => {
    if (!runtimeProvider) {
      return <PreviewIframe key={key} loading={loading} />;
    }
    
    // Use provider's preview strategy
    switch (runtimeProvider.previewStrategy) {
      case "iframe":
        return <PreviewIframe key={key} loading={loading} />;
        
      case "external-window":
        return <NativeAppPreview 
          appId={selectedAppId} 
          stackType={app?.stackType || ""}
          runtimeProvider={runtimeProvider}
        />;
        
      case "console-output":
        return <ConsolePreview 
          appId={selectedAppId} 
          runtimeProvider={runtimeProvider}
        />;
        
      case "hybrid":
        return <HybridPreview 
          appId={selectedAppId}
          runtimeProvider={runtimeProvider}
        />;
        
      default:
        return <PreviewIframe key={key} loading={loading} />;
    }
  };
  
  // ... rest of component
}
```

**NEW File:** `src/components/preview_panel/NativeAppPreview.tsx` (Revised)

```typescript
// src/components/preview_panel/NativeAppPreview.tsx
// Revised: No continuous screenshot polling
// Launch external window, show status + logs

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Square, Camera } from "lucide-react";
import { RuntimeProvider } from "../../../../ipc/runtime/RuntimeProvider";

interface NativeAppPreviewProps {
  appId: number;
  stackType: string;
  runtimeProvider: RuntimeProvider;
}

export function NativeAppPreview({ appId, stackType, runtimeProvider }: NativeAppPreviewProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  
  const launchApp = async () => {
    setLogs([]);
    setIsRunning(true);
    
    await runtimeProvider.run(
      { appId, appPath: "" }, // appPath resolved internally
      (event) => {
        if (event.type === "stdout" || event.type === "stderr") {
          setLogs(prev => [...prev, event.message]);
        }
      }
    );
  };
  
  const stopApp = async () => {
    await runtimeProvider.stop(appId);
    setIsRunning(false);
  };
  
  // ON-DEMAND screenshot only (not continuous polling)
  const captureScreenshot = async () => {
    if (runtimeProvider.captureScreenshot) {
      const dataUrl = await runtimeProvider.captureScreenshot(appId);
      setScreenshot(dataUrl);
    }
  };
  
  return (
    <div className="flex flex-col h-full bg-gray-900 text-white p-4">
      {!isRunning ? (
        <div className="flex flex-col items-center justify-center h-full">
          <p className="mb-4 text-lg">{stackType.toUpperCase()} Application</p>
          <p className="mb-4 text-sm text-gray-400">
            Native apps launch in an external window
          </p>
          <Button onClick={launchApp} className="flex items-center gap-2">
            <Play size={16} />
            Launch App
          </Button>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center mb-4 p-2 bg-gray-800 rounded">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>App is running (external window)</span>
            </div>
            <div className="flex gap-2">
              {runtimeProvider.captureScreenshot && (
                <Button 
                  onClick={captureScreenshot} 
                  size="sm" 
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  <Camera size={14} />
                  Screenshot
                </Button>
              )}
              <Button 
                onClick={stopApp} 
                size="sm" 
                variant="destructive"
                className="flex items-center gap-1"
              >
                <Square size={14} />
                Stop
              </Button>
            </div>
          </div>
          
          {/* Logs panel */}
          <div className="flex-1 overflow-auto font-mono text-sm bg-gray-950 p-2 rounded">
            {logs.length === 0 ? (
              <p className="text-gray-500">Waiting for output...</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="whitespace-pre-wrap">{log}</div>
              ))
            )}
          </div>
          
          {/* On-demand screenshot (not continuous) */}
          {screenshot && (
            <div className="mt-4 border rounded p-2">
              <p className="text-sm text-gray-400 mb-2">Last Screenshot:</p>
              <img 
                src={screenshot} 
                alt="App Screenshot" 
                className="max-w-full max-h-48 object-contain"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Phase 6: New Dyad Tags (Months 6-7)

**File:** [`src/ipc/utils/dyad_tag_parser.ts`](src/ipc/utils/dyad_tag_parser.ts)

```typescript
// NEW: Parse <dyad-add-nuget packages="...">
export function getDyadAddNugetTags(fullResponse: string): string[] {
  const dyadAddNugetRegex = /<dyad-add-nuget packages="([^"]+)">[^<]*<\/dyad-add-nuget>/g;
  let match;
  const packages: string[] = [];
  while ((match = dyadAddNugetRegex.exec(fullResponse)) !== null) {
    packages.push(...unescapeXmlAttr(match[1]).split(" "));
  }
  return packages;
}
```

**File:** [`src/ipc/processors/response_processor.ts`](src/ipc/processors/response_processor.ts)

```typescript
// REFACTORED to use RuntimeProvider
import { runtimeRegistry } from "../runtime/RuntimeProviderRegistry";

export async function processFullResponseActions(
  fullResponse: string,
  chatId: number,
  { chatSummary, messageId }: { chatSummary: string | undefined; messageId: number; }
) {
  // ... get chatWithApp ...
  
  // Get runtime provider for this app
  const runtimeProvider = runtimeRegistry.getProvider(
    chatWithApp.app.runtimeProvider || "node"
  );
  
  // Handle NuGet packages via provider
  const dyadAddNugetPackages = getDyadAddNugetTags(fullResponse);
  if (dyadAddNugetPackages.length > 0) {
    try {
      // SECURITY: Goes through kernel
      await runtimeProvider.resolveDependencies({
        appPath,
        appId: chatWithApp.app.id,
      });
    } catch (error) {
      errors.push({
        message: `Failed to restore dependencies`,
        error: error,
      });
    }
  }
}
```

---

## Phase 7: System Prompts (Months 7-8)

**NEW File:** `src/prompts/dotnet_wpf_prompt.ts`

```typescript
export const DOTNET_WPF_PROMPT = `
# .NET WPF Development

You are a Windows XAML expert for WPF applications.

## Available Dyad Tags
- <dyad-write path="MainWindow.xaml"> - Write XAML files
- <dyad-add-nuget packages="PackageName"> - Add NuGet packages
- <dyad-command type="rebuild"></dyad-command> - Rebuild the app

## Security Notice
All commands execute through Dyad's secure ExecutionKernel with:
- Network policy enforcement
- Memory limits (4GB for builds)
- Timeout protection (10 min max)
- Capability-based access control

Generate production-ready WPF apps with proper MVVM separation.
`;
```

---

## Summary of Architectural Changes

| Issue | Original Plan | Revised Plan |
|-------|---------------|--------------|
| Shell authority | Scattered `execPromise()` calls | **ExecutionKernel** - single entry point |
| Runtime branching | `if (runtime === "dotnet")` scattered | **RuntimeProvider** interface with registry |
| Readiness detection | 3s timeout | Provider-specific `isReady()` method |
| NuGet security | Direct execution | Kernel with network policy + limits |
| Screenshot polling | Every 2 seconds continuous | On-demand only |
| Agent tools | Direct `execPromise()` | Calls `ExecutionKernel.execute()` |

---

## Security Checklist

- [ ] NO raw `exec()`, `spawn()`, `execPromise()` in runtime logic
- [ ] ALL commands go through `ExecutionKernel.execute()`
- [ ] Network policy enforced for package restores
- [ ] Memory limits enforced (2-4GB per operation)
- [ ] Timeout protection (5-10 min max)
- [ ] Agent tools call kernel, not shell directly
- [ ] Guardian sandboxing for high-risk operations

---

## Timeline (Revised)

```
Month  1  2  3  4  5  6  7  8  9
      ├─ Execution Kernel ─┤
           ├─ Node Provider ─┤
                ├─ .NET Provider ─┤
                     ├─ UI + Agent Tools ─┤
                          ├─ Polish ─┤
```

**Total: 9 months** with proper architecture foundation.
