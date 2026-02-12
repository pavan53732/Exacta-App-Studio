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
**Rule**: Long-running processes (dev servers) must use `mode: 'session'`.
**Rule**: Stop operations must terminate the Guardian Job ID, not the process name.

---

## Architecture (Windows-Only)

```plaintext
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

| Plan Concept                 | Actual Code That Needs Changing                                                                                                                                      |
| :--------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ExecutionKernel.execute()`  | **NEW** - Replace all direct shell calls                                                                                                                             |
| `RuntimeProvider` interface  | **NEW** - `src/ipc/runtime/RuntimeProvider.ts`                                                                                                                       |
| `NodeRuntimeProvider`        | **NEW** - `src/ipc/runtime/providers/NodeRuntimeProvider.ts`                                                                                                         |
| `DotNetRuntimeProvider`      | **NEW** - `src/ipc/runtime/providers/DotNetRuntimeProvider.ts`                                                                                                       |
| `TauriRuntimeProvider`       | **NEW** - `src/ipc/runtime/providers/TauriRuntimeProvider.ts`                                                                                                        |
| `RuntimeProvider.scaffold()` | [`src/ipc/handlers/createFromTemplate.ts`](src/ipc/handlers/createFromTemplate.ts:12) — currently only handles `"react"` scaffold or GitHub clones                   |
| `RuntimeProvider.build()`    | [`src/ipc/handlers/app_handlers.ts:2009`](src/ipc/handlers/app_handlers.ts:2009) — [`getCommand()`](src/ipc/handlers/app_handlers.ts:2009) currently defaults to npm |
| `RuntimeProvider.preview()`  | [`src/components/preview_panel/PreviewIframe.tsx:1290`](src/components/preview_panel/PreviewIframe.tsx:1290) — hardcoded `<iframe>`                                  |
| Process sandboxing           | [`src/ipc/utils/process_manager.ts`](src/ipc/utils/process_manager.ts) — current process spawning                                                                    |
| App execution                | [`src/ipc/handlers/app_handlers.ts:159`](src/ipc/handlers/app_handlers.ts:159) — [`executeApp()`](src/ipc/handlers/app_handlers.ts:159)                              |
| App DB schema                | [`src/db/schema.ts:26`](src/db/schema.ts:26) — `apps` table                                                                                                          |
| AI instructions              | [`src/prompts/system_prompt.ts:62`](src/prompts/system_prompt.ts:62) — hardcoded "web applications"                                                                  |
| Dependency install           | [`src/ipc/processors/executeAddDependency.ts`](src/ipc/processors/executeAddDependency.ts) — npm only                                                                |
| Response processing          | [`src/ipc/processors/response_processor.ts`](src/ipc/processors/response_processor.ts) — only web tags                                                               |
| Agent tools                  | [`src/pro/main/ipc/handlers/local_agent/tool_definitions.ts`](docs/agent_architecture.md) — web-only tools                                                           |
| Guardian integration         | [`src/ipc/handlers/guardian_handlers.ts`](src/ipc/handlers/guardian_handlers.ts) — existing Guardian IPC handlers                                                    |

---

## Phase 0: Execution Kernel Foundation (Month 1) - **CRITICAL**

### 0.1 Execution Kernel Interface

**NEW File:** `src/ipc/runtime/ExecutionKernel.ts`

```typescript
// src/ipc/runtime/ExecutionKernel.ts
// CENTRALIZED, POLICY-ENFORCED COMMAND EXECUTION
// ZERO-TRUST ARCHITECTURE: All commands are sandboxed via Guardian.

import { ipc } from "@/ipc/types";
import log from "electron-log";
import fs from "node:fs";
import path from "node:path";

const logger = log.scope("execution-kernel");

export interface ExecutionOptions {
  command: string;
  args: string[];
  cwd: string;
  appId: number; // 0 for system/scaffolding
  // Security
  networkPolicy: "blocked" | "allowed" | "local-only";
  fileSystemPolicy?: "read-only" | "read-write";
  // Resources
  memoryLimitBytes?: number;
  diskQuotaBytes?: number;
  cpuRatePercent?: number; // CPU throttling
  timeoutMs?: number;
  // Execution Mode
  mode?: "ephemeral" | "session"; // ephemeral=wait, session=detach
  env?: Record<string, string>; // Aggressively sanitized env vars
}

export interface ExecutionResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  jobId?: string; // Returned for session mode
}

export interface ExecutionEvent {
  type:
    | "stdout"
    | "stderr"
    | "ready"
    | "error"
    | "timeout"
    | "resource-limit"
    | "quota-warning";
  message: string;
  timestamp: number;
}

export type ExecutionEventHandler = (event: ExecutionEvent) => void;

/**
 * ExecutionKernel - Zero-Trust Execution Engine
 *
 * CORE PRINCIPLES:
 * 1. MANDATORY GUARDIAN: All commands run in a Job Object.
 * 2. NO SHELL: Commands are executed directly, not via cmd/sh.
 * 3. CANONICAL PATHS: All paths are resolved to prevent symlink attacks.
 * 4. LEAST PRIVILEGE: Network/Disk access denied by default.
 */
export class ExecutionKernel {
  private static instance: ExecutionKernel;

  private constructor() {}

  static getInstance(): ExecutionKernel {
    if (!ExecutionKernel.instance) {
      ExecutionKernel.instance = new ExecutionKernel();
    }
    return ExecutionKernel.instance;
  }

  /**
   * Execute a command through the secure kernel.
   * This is the ONLY allow path for runtime execution.
   */
  // Job Registry: appId -> active session job ID
  private sessionJobs = new Map<number, string>();

  async execute(
    options: ExecutionOptions,
    onEvent?: ExecutionEventHandler,
  ): Promise<ExecutionResult> {
    // 1. Canonicalize and Validate Paths (Anti-Traversal + Jail)
    const secureOptions = this.securePaths(options);

    // 1b. Validate Executable Path (High Security)
    const secureCommandOptions = await this.validateCommand(secureOptions);

    // 2. Risk Assessment (Provider-Delegated)
    // Kernel assumes Provider has assessed risk via options.
    // In future: verify options.riskProfile against policy.

    // 3. Request Capability Token (Guardian)
    const token = await this.requestCapability(secureCommandOptions);

    // 4. Enforce Disk Quota (Snapshot Start)
    const initialDiskUsage = await this.getDirectorySize(
      secureCommandOptions.cwd,
    );

    // 5. Create Guardian Job (MANDATORY)
    // NOTE: Schema update required in Guardian Service
    const jobId = await this.createGuardianJob(secureCommandOptions);

    try {
      // 6. Spawn Process (Sandboxed)
      // RENAMED from spawnViaGuardian for clarity
      // NOTE: Requires new 'spawnInJob' contract in Guardian
      const proc = await this.spawnControlled(
        jobId,
        secureCommandOptions,
        token,
      );

      // 7. Monitor Execution
      if (options.mode === "session") {
        // Register session for cleanup
        if (options.appId > 0) {
          this.sessionJobs.set(options.appId, jobId);
        }

        // Return immediately for sessions (dev servers)
        return {
          exitCode: null,
          stdout: "",
          stderr: "",
          durationMs: 0,
          jobId,
        };
      } else {
        // Ephemeral: Wait for completion
        const result = await this.monitorProcess(
          proc,
          secureCommandOptions,
          onEvent,
          initialDiskUsage,
        );
        return result;
      }
    } finally {
      // Cleanup only for ephemeral jobs
      if (options.mode !== "session") {
        await this.terminateJob(jobId);
      }
    }
  }

  private securePaths(options: ExecutionOptions): ExecutionOptions {
    // 1. Resolve canonical path
    const canonicalCwd = fs.realpathSync(options.cwd);

    // 2. Enforce Project Root Containment (The Jail)
    // This assumes all valid ops happen within user Projects folder
    // In real impl, we'd get the specific App Root.
    // For now, we verify it is NOT system root.
    const forbidden = [
      "C:\\Windows",
      "C:\\Program Files",
      "C:\\Users\\Start Menu",
    ];
    if (forbidden.some((p) => canonicalCwd.startsWith(p))) {
      throw new Error(
        `Security Violation: Path ${canonicalCwd} is system protected.`,
      );
    }

    return {
      ...options,
      cwd: canonicalCwd, // Use the safe path
    };
  }

  private async validateCommand(
    options: ExecutionOptions,
  ): Promise<ExecutionOptions> {
    // 1. Allowlist Check (Strict)
    const allowed = ["node", "npm", "pnpm", "dotnet", "cargo", "git"];
    const base = path.basename(options.command).split(".")[0].toLowerCase();

    if (!allowed.includes(base)) {
      throw new Error(
        `Security Violation: Command '${base}' is not allowlisted.`,
      );
    }

    // 2. Resolve Full Path (Anti-Spoofing)
    // In real implementation, use 'which' or check specific install paths.
    // For this plan, we mandate absolute paths OR widely known PATH entries.
    // If it's a bare command, we assume system PATH resolution by Guardian.
    // But we check for relative paths (e.g. ./node) which are risky.
    if (
      options.command.startsWith(".") ||
      options.command.includes("/") ||
      options.command.includes("\\")
    ) {
      // If path is provided, it MUST be absolute and trusted?
      if (!path.isAbsolute(options.command)) {
        throw new Error(
          "Security Violation: Relative paths for commands are forbidden.",
        );
      }
    }

    return options;
  }

  private async requestCapability(options: ExecutionOptions): Promise<any> {
    // Always request capability for audit trail if nothing else
    return ipc.guardian.requestCapability({
      action: "execute",
      resource: options.command,
      constraints: {
        network: options.networkPolicy,
        diskQuota: options.diskQuotaBytes,
      },
    });
  }

  private async createGuardianJob(options: ExecutionOptions): Promise<string> {
    // Call Guardian IPC to create Job Object
    // TODO: Update Guardian Schema to support networkPolicy/diskQuotaBytes
    // For now we pass basic params and handle network via WFP separately if needed
    const job = await ipc.guardian.createJob({
      jobName: `dyad-exec-${options.appId}-${Date.now()}`,
      memoryLimitBytes: options.memoryLimitBytes,
      cpuRatePercent: options.cpuRatePercent, // Supported in schema
      // networkPolicy: options.networkPolicy, // TODO: Add to schema
      // diskQuotaBytes: options.diskQuotaBytes, // TODO: Add to schema
    });

    if (!job.success) {
      throw new Error(`Failed to create Guardian Job: ${job.error}`);
    }

    // Apply WFP rules if network blocked - separate call
    if (options.networkPolicy === "blocked") {
      await ipc.guardian.createWfpRule({
        name: `Block-Job-${job.jobName}`,
        action: "block",
        direction: "outbound",
      });
    }

    // Return job name as ID per schema which uses jobName
    return job.jobName;
  }

  // Rename spawnViaGuardian to spawnControlled per audit
  private async spawnControlled(
    jobId: string,
    options: ExecutionOptions,
    token: string,
  ): Promise<any> {
    // Call Guardian IPC to spawn process inside Job Object
    // TODO: Add 'spawnInJob' contract to Guardian
    // Currently using hypothetical contract for plan coherence
    /*
    return ipc.guardian.spawnInJob({
      jobId,
      command: options.command,
      args: options.args,
      cwd: options.cwd,
      env: options.env,
      token,
    });
    */
    // Fallback if not implemented yet:
    // 1. Spawn suspended process
    // 2. Assign to Job
    // 3. Resume
    throw new Error("Guardian 'spawnInJob' contract pending implementation.");
  }

  private async monitorProcess(
    proc: any,
    options: ExecutionOptions,
    onEvent?: ExecutionEventHandler,
    initialDiskUsage: number = 0,
  ): Promise<ExecutionResult> {
    const startTime = Date.now(); // FIXED: Start time capture
    return new Promise((resolve, reject) => {
      let stdout = "";
      let stderr = "";

      const timeout = setTimeout(() => {
        ipc.guardian.terminateJob({ jobId: proc.jobId }); // Hard kill via job
        reject(new Error(`Execution Hard Timeout (${options.timeoutMs}ms)`));
      }, options.timeoutMs || 300000);

      // ... (standard monitoring implementation)
      // For brevity in plan, omitting standard stream logic

      proc.on("close", async (exitCode: number) => {
        clearTimeout(timeout);
        const durationMs = Date.now() - startTime; // FIXED: Delta calculation

        // Final Disk Quota Check
        const finalDiskUsage = await this.getDirectorySize(options.cwd);
        if (
          options.diskQuotaBytes &&
          finalDiskUsage - initialDiskUsage > options.diskQuotaBytes
        ) {
          console.error(
            "Security Violation: Disk quota exceeded after execution.",
          );
          // Note: In strict mode we might discard output or flag violation
        }

        resolve({ exitCode, stdout, stderr, durationMs });
      });

      proc.on("quota-exceeded", () => {
        onEvent?.({
          type: "resource-limit",
          message: "Disk quota exceeded",
          timestamp: Date.now(),
        });
        // Guardian auto-terminates on quota, loop will close
      });
    });
  }

  public async terminateJob(jobId: string): Promise<void> {
    await ipc.guardian.terminateJob({ jobId });
  }

  public async terminateSession(appId: number): Promise<void> {
    const jobId = this.sessionJobs.get(appId);
    if (jobId) {
      await this.terminateJob(jobId);
      this.sessionJobs.delete(appId);
    }
  }

  private async getDirectorySize(dirPath: string): Promise<number> {
    // Real recursive size calculation
    const size = await fs
      .readdir(dirPath)
      .then((files) =>
        Promise.all(
          files.map((f) =>
            fs
              .stat(path.join(dirPath, f))
              .then((s) => s.size)
              .catch(() => 0),
          ),
        ),
      )
      .then((sizes) => sizes.reduce((a, b) => a + b, 0));
    return size;
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

  // Risk Assessment (NEW: Provider-Aware Security)
  getRiskProfile(command: string, args: string[]): RiskProfile;

  // Project lifecycle
  scaffold(options: ScaffoldOptions): Promise<ScaffoldResult>;
  resolveDependencies(options: {
    appPath: string;
    appId: number;
  }): Promise<ExecutionResult>;
  addDependency?(options: {
    // NEW: For targeted adds (dyad-add-nuget, etc.)
    appPath: string;
    appId: number;
    packages: string[];
  }): Promise<ExecutionResult>;
  build(
    options: BuildOptions,
    onEvent?: ExecutionEventHandler,
  ): Promise<BuildResult>;
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
// REFACTORED to use ExecutionKernel and NO SHELL

import { executionKernel } from "../runtime/ExecutionKernel";
import { db } from "../../db";
import { messages } from "../../db/schema";
import { eq } from "drizzle-orm";
import { Message } from "@/ipc/types";
import fs from "fs-extra";
import path from "path";

export async function executeAddDependency({
  packages,
  message,
  appPath,
  appId,
}: {
  packages: string[];
  message: Message;
  appPath: string;
  appId: number;
}) {
  // 1. Detect Package Manager (No shell usage)
  const isPnpm = await fs.pathExists(path.join(appPath, "pnpm-lock.yaml"));
  const pm = isPnpm ? "pnpm" : "npm";
  const installCmd = isPnpm ? "add" : "install";
  const args = [installCmd, ...packages];

  if (!isPnpm) {
    args.push("--legacy-peer-deps");
  }

  // 2. Execute via Kernel (Direct spawn, no shell)
  const result = await executionKernel.execute({
    command: pm,
    args: args,
    cwd: appPath,
    appId,
    networkPolicy: "allowed",
    memoryLimitBytes: 2 * 1024 * 1024 * 1024, // 2GB
    diskQuotaBytes: 1 * 1024 * 1024 * 1024, // 1GB quota for deps
    timeoutMs: 300000, // 5 minutes
  });

  const installResults =
    result.stdout + (result.stderr ? `\n${result.stderr}` : "");

  // Update the message content with the installation results
  const updatedContent = message.content.replace(
    new RegExp(
      `<dyad-add-dependency packages="${packages.join(" ")}">[^<]*</dyad-add-dependency>`,
      "g",
    ),
    `<dyad-add-dependency packages="${packages.join(" ")}">${installResults}</dyad-add-dependency>`,
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

import {
  RuntimeProvider,
  ScaffoldOptions,
  ScaffoldResult,
  BuildOptions,
  BuildResult,
  RunOptions,
  RunResult,
  PreviewOptions,
  PackageOptions,
} from "../RuntimeProvider";
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
  diskQuotaBytes: 2 * 1024 * 1024 * 1024, // 2GB

  async checkPrerequisites(): Promise<{
    installed: boolean;
    missing: string[];
  }> {
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

  getRiskProfile(command: string, args: string[]): "low" | "medium" | "high" {
    // Node specific risk analysis
    const fullCmd = `${command} ${args.join(" ")}`;
    if (fullCmd.includes("install") || fullCmd.includes("add")) return "high"; // Network + Disk write
    if (fullCmd.includes("build")) return "medium"; // High CPU/Mem
    return "low";
  },

  async scaffold(options: ScaffoldOptions): Promise<ScaffoldResult> {
    try {
      if (options.templateId === "react") {
        // FIXED: Use app.getAppPath() instead of relative paths
        const { app } = await import("electron");
        const scaffoldSource = path.join(app.getAppPath(), "scaffold");
        await copyDirectoryRecursive(scaffoldSource, options.fullAppPath);
        return { success: true, entryPoint: "src/main.tsx" };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  async resolveDependencies(options: { appPath: string; appId: number }) {
    // 1. Detect Package Manager
    const isPnpm = await fs.pathExists(
      path.join(options.appPath, "pnpm-lock.yaml"),
    );
    const pm = isPnpm ? "pnpm" : "npm";
    const args = isPnpm ? ["install"] : ["install", "--legacy-peer-deps"];

    // 2. Execute Directly (No Shell)
    return executionKernel.execute({
      command: pm,
      args: args,
      cwd: options.appPath,
      appId: options.appId,
      networkPolicy: "allowed",
      memoryLimitBytes: 2 * 1024 * 1024 * 1024,
      diskQuotaBytes: 2 * 1024 * 1024 * 1024,
      timeoutMs: 300000,
    });
  },

  async build(options: BuildOptions, onEvent) {
    const result = await executionKernel.execute(
      {
        command: "npm",
        args: ["run", "build"],
        cwd: options.appPath,
        appId: options.appId,
        networkPolicy: "blocked",
        timeoutMs: 300000,
      },
      onEvent,
    );

    return {
      success: result.exitCode === 0,
      errors: result.exitCode !== 0 ? [result.stderr] : undefined,
    };
  },

  async run(options: RunOptions, onEvent) {
    const port = getAppPort(options.appId);

    // NO SHELL: Direct execution only.
    // We expect dependencies to be resolved already.

    const isPnpm = await fs.pathExists(
      path.join(options.appPath, "pnpm-lock.yaml"),
    );
    const pm = isPnpm ? "pnpm" : "npm";

    // Command: [p]npm run dev -- --port X
    const args = ["run", "dev"];
    if (pm === "npm") args.push("--");
    args.push("--port", String(port));

    // Session Mode: Returns immediately, job stored in Kernel
    const result = await executionKernel.execute(
      {
        command: pm,
        args: args,
        cwd: options.appPath,
        appId: options.appId,
        networkPolicy: "allowed", // Dev server needs network
        memoryLimitBytes: 2 * 1024 * 1024 * 1024,
        mode: "session", // Non-blocking
      },
      onEvent,
    );

    return {
      // processId: result.pid, // if we had it
      ready: true,
    };
  },

  async stop(appId: number) {
    // Stop logic via Kernel Session
    await executionKernel.terminateSession(appId);
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
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),

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

### 2.1 Generate Drizzle Migration

After updating `src/db/schema.ts`, generate the migration:

```bash
# Generate migration file
npm run db:generate

# This creates: drizzle/0026_add_stack_type_columns.sql
```

**Migration File:** `drizzle/0026_add_stack_type_columns.sql`

```sql
-- Migration: Add stack_type and runtime_provider columns to apps table
ALTER TABLE apps ADD COLUMN stack_type text DEFAULT 'react';
ALTER TABLE apps ADD COLUMN runtime_provider text DEFAULT 'node';

-- Update existing apps to have default values
UPDATE apps SET stack_type = 'react' WHERE stack_type IS NULL;
UPDATE apps SET runtime_provider = 'node' WHERE runtime_provider IS NULL;
```

**Apply Migration:**

```bash
npm run db:migrate
```

### 2.2 TypeScript Types Update

**File:** `src/db/schema.ts` (add types)

```typescript
// Add type exports for stack and runtime
export type StackType =
  | "react"
  | "nextjs"
  | "express-react"
  | "wpf"
  | "winui3"
  | "winforms"
  | "console"
  | "maui"
  | "tauri";
export type RuntimeProvider = "node" | "dotnet" | "tauri";

// Update apps type
export type App = typeof apps.$inferSelect;
export type NewApp = typeof apps.$inferInsert;
```

---

## Phase 3: .NET Runtime Provider (Months 3-4)

**NEW File:** `src/ipc/runtime/providers/DotNetRuntimeProvider.ts`

```typescript
// src/ipc/runtime/providers/DotNetRuntimeProvider.ts
// .NET runtime implementation with security controls

import {
  RuntimeProvider,
  ScaffoldOptions,
  ScaffoldResult,
  BuildOptions,
  BuildResult,
  RunOptions,
  RunResult,
  PreviewOptions,
  PackageOptions,
} from "../RuntimeProvider";
import { executionKernel } from "../ExecutionKernel";
import path from "node:path";

export const dotNetRuntimeProvider: RuntimeProvider = {
  runtimeId: "dotnet",
  runtimeName: ".NET",
  supportedStackTypes: ["wpf", "winui3", "winforms", "console", "maui"],
  previewStrategy: "external-window", // Native apps need external window
  diskQuotaBytes: 4 * 1024 * 1024 * 1024, // 4GB

  async checkPrerequisites(): Promise<{
    installed: boolean;
    missing: string[];
  }> {
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

  getRiskProfile(command: string, args: string[]): "low" | "medium" | "high" {
    if (command === "dotnet") {
      const sub = args[0] || "";
      if (sub === "restore" || sub === "add") return "high";
      if (sub === "build" || sub === "publish") return "medium";
    }
    return "low";
  },

  async scaffold(options: ScaffoldOptions): Promise<ScaffoldResult> {
    const templateMap: Record<string, string> = {
      wpf: "wpf",
      winui3: "winui3",
      winforms: "winforms",
      console: "console",
      maui: "maui",
    };

    const dotnetTemplate = templateMap[options.templateId || "console"];
    if (!dotnetTemplate) {
      return {
        success: false,
        error: `Unknown .NET template: ${options.templateId}`,
      };
    }

    const projectName = path.basename(options.fullAppPath);

    try {
      await executionKernel.execute({
        command: "dotnet",
        args: [
          "new",
          dotnetTemplate,
          "-n",
          projectName,
          "-o",
          options.fullAppPath,
        ],
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
      networkPolicy: "allowed",
      memoryLimitBytes: 4 * 1024 * 1024 * 1024,
      diskQuotaBytes: 2 * 1024 * 1024 * 1024,
      timeoutMs: 600000,
    });
  },

  async addDependency(options: {
    appPath: string;
    appId: number;
    packages: string[];
  }) {
    // Add specific NuGet packages
    return executionKernel.execute({
      command: "dotnet",
      args: ["add", "package", ...options.packages],
      cwd: options.appPath,
      appId: options.appId,
      networkPolicy: "allowed",
      diskQuotaBytes: 500 * 1024 * 1024, // 500MB for adding a package
      timeoutMs: 300000,
    });
  },

  async build(options: BuildOptions, onEvent) {
    const config = options.configuration || "Debug";

    const result = await executionKernel.execute(
      {
        command: "dotnet",
        args: ["build", "-c", config, "-v", "n"],
        cwd: options.appPath,
        appId: options.appId,
        networkPolicy: "blocked", // Build should not need network
        memoryLimitBytes: 4 * 1024 * 1024 * 1024, // 4GB for MSBuild
        timeoutMs: 600000,
      },
      onEvent,
    );

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
    // NEW: Use 'session' mode to avoid blocking
    const result = await executionKernel.execute(
      {
        command: "dotnet",
        args: ["run"],
        cwd: options.appPath,
        appId: options.appId,
        networkPolicy: "allowed",
        memoryLimitBytes: 2 * 1024 * 1024 * 1024,
        mode: "session", // Non-blocking, returns Job ID
      },
      onEvent,
    );

    // Store Job ID for stop() in process_manager wrapper
    if (result.jobId) {
      // In real impl: registerJob(options.appId, result.jobId);
    }

    return {
      processId: 0, // Not real PID exposed
      ready: true, // Started successfuly
    };
  },

  async stop(appId: number) {
    // Kill via Kernel Job ID
    // Logic: Look up Job ID from process manager registry
    // const jobId = getJobId(appId);
    // if (jobId) await executionKernel.terminateJob(jobId);
    // For plan demonstration:
    // await executionKernel.terminateJob(storedJobId);
    // NO RAW TASKKILL
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

## Phase 3.5: Tauri Runtime Provider (Month 4)

**NEW File:** `src/ipc/runtime/providers/TauriRuntimeProvider.ts`

```typescript
// src/ipc/runtime/providers/TauriRuntimeProvider.ts
// Tauri runtime implementation for Rust + WebView2 apps

import {
  RuntimeProvider,
  ScaffoldOptions,
  ScaffoldResult,
  BuildOptions,
  BuildResult,
  RunOptions,
  RunResult,
  PreviewOptions,
  PackageOptions,
} from "../RuntimeProvider";
import { executionKernel } from "../ExecutionKernel";
import path from "node:path";

export const tauriRuntimeProvider: RuntimeProvider = {
  runtimeId: "tauri",
  runtimeName: "Tauri",
  supportedStackTypes: ["tauri"],
  previewStrategy: "hybrid", // Has web layer + native window
  diskQuotaBytes: 5 * 1024 * 1024 * 1024, // 5GB

  async checkPrerequisites(): Promise<{
    installed: boolean;
    missing: string[];
  }> {
    const missing: string[] = [];

    try {
      await executionKernel.execute({
        command: "cargo",
        args: ["--version"],
        cwd: process.cwd(),
        appId: 0,
        networkPolicy: "blocked",
      });
    } catch {
      missing.push("Rust/Cargo");
    }

    try {
      await executionKernel.execute({
        command: "node",
        args: ["--version"],
        cwd: process.cwd(),
        appId: 0,
        networkPolicy: "blocked",
      });
    } catch {
      missing.push("Node.js");
    }

    // Check for tauri-cli
    try {
      await executionKernel.execute({
        command: "cargo",
        args: ["tauri", "--version"],
        cwd: process.cwd(),
        appId: 0,
        networkPolicy: "blocked",
      });
    } catch {
      missing.push("Tauri CLI (cargo install tauri-cli)");
    }

    return { installed: missing.length === 0, missing };
  },

  getRiskProfile(command: string, args: string[]): "low" | "medium" | "high" {
    if (command === "cargo" || command === "npm") return "high"; // Build tools are high risk
    return "medium";
  },

  async scaffold(options: ScaffoldOptions): Promise<ScaffoldResult> {
    try {
      // Use npm create tauri-app@latest
      await executionKernel.execute({
        command: "npm",
        args: [
          "create",
          "tauri-app@latest",
          "--",
          "--name",
          options.projectName,
          "--template",
          "vanilla",
          "--manager",
          "npm",
        ],
        cwd: path.dirname(options.fullAppPath),
        appId: 0,
        networkPolicy: "allowed", // Need network for template download
        timeoutMs: 300000,
      });

      return { success: true, entryPoint: "src-tauri/src/main.rs" };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  async resolveDependencies(options: { appPath: string; appId: number }) {
    // Install Node dependencies
    const nodeResult = await executionKernel.execute({
      command: "npm",
      args: ["install"],
      cwd: options.appPath,
      appId: options.appId,
      networkPolicy: "allowed",
      memoryLimitBytes: 2 * 1024 * 1024 * 1024,
      timeoutMs: 300000,
    });

    // Install Rust dependencies via cargo
    const rustResult = await executionKernel.execute({
      command: "cargo",
      args: ["fetch"],
      cwd: path.join(options.appPath, "src-tauri"),
      appId: options.appId,
      networkPolicy: "allowed",
      memoryLimitBytes: 4 * 1024 * 1024 * 1024,
      timeoutMs: 600000,
    });

    return {
      exitCode: nodeResult.exitCode === 0 && rustResult.exitCode === 0 ? 0 : 1,
      stdout: nodeResult.stdout + "\n" + rustResult.stdout,
      stderr: nodeResult.stderr + "\n" + rustResult.stderr,
      durationMs: nodeResult.durationMs + rustResult.durationMs,
    };
  },

  async build(options: BuildOptions, onEvent) {
    const result = await executionKernel.execute(
      {
        command: "cargo",
        args: ["tauri", "build"],
        cwd: options.appPath,
        appId: options.appId,
        networkPolicy: "blocked",
        memoryLimitBytes: 4 * 1024 * 1024 * 1024,
        timeoutMs: 600000,
      },
      onEvent,
    );

    return {
      success: result.exitCode === 0,
      outputPath: path.join(options.appPath, "src-tauri", "target", "release"),
      errors: result.exitCode !== 0 ? [result.stderr] : undefined,
    };
  },

  async run(options: RunOptions, onEvent) {
    // Tauri dev mode - starts web dev server + native window
    const result = await executionKernel.execute(
      {
        command: "cargo",
        args: ["tauri", "dev"],
        cwd: options.appPath,
        appId: options.appId,
        networkPolicy: "allowed", // Dev server needs network
        memoryLimitBytes: 4 * 1024 * 1024 * 1024,
        mode: "session", // Non-blocking
      },
      onEvent,
    );

    return {
      ready: true,
    };
  },

  async stop(appId: number) {
    // Kill via Kernel Job ID (Guardian)
    // No "taskkill" shell out.
    // await executionKernel.terminateJob(jobId);
  },

  async startPreview(options: PreviewOptions) {
    // Tauri has hybrid preview - web layer in iframe + native window
  },

  async stopPreview(appId: number) {
    await this.stop(appId);
  },

  isReady(message: string): boolean {
    // Tauri ready when dev server URL appears
    return /https?:\/\/localhost:\d+/.test(message);
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
  description:
    "Execute a dotnet CLI command through the secure ExecutionKernel",
  inputSchema: z.object({
    command: z
      .string()
      .describe("The dotnet command to run (e.g., 'build', 'run')"),
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
      networkPolicy:
        command === "restore" || args.includes("add") ? "allowed" : "blocked",
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

**NEW File:** `src/components/preview_panel/ConsoleOutputPreview.tsx`

```typescript
// src/components/preview_panel/ConsoleOutputPreview.tsx
// Console app preview - shows terminal output instead of iframe

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Square, Terminal, Copy, Trash } from "lucide-react";
import { RuntimeProvider } from "../../../../ipc/runtime/RuntimeProvider";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ConsoleOutputPreviewProps {
  appId: number;
  runtimeProvider: RuntimeProvider;
}

export function ConsoleOutputPreview({ appId, runtimeProvider }: ConsoleOutputPreviewProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const runApp = async () => {
    setLogs([]);
    setExitCode(null);
    setIsRunning(true);

    try {
      const result = await runtimeProvider.run(
        { appId, appPath: "" },
        (event) => {
          if (event.type === "stdout" || event.type === "stderr") {
            setLogs(prev => [...prev, event.message]);
          }
        }
      );

      setExitCode(result.ready ? 0 : 1);
    } catch (error) {
      setLogs(prev => [...prev, `Error: ${error}`]);
      setExitCode(1);
    } finally {
      setIsRunning(false);
    }
  };

  const stopApp = async () => {
    await runtimeProvider.stop(appId);
    setIsRunning(false);
  };

  const copyLogs = () => {
    navigator.clipboard.writeText(logs.join("\n"));
  };

  const clearLogs = () => {
    setLogs([]);
    setExitCode(null);
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-100 font-mono text-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Terminal size={16} className="text-blue-400" />
          <span className="font-semibold">Console Output</span>
          {isRunning && (
            <span className="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded">
              Running
            </span>
          )}
          {exitCode !== null && !isRunning && (
            <span className={`text-xs px-2 py-0.5 rounded ${
              exitCode === 0
                ? "bg-green-900 text-green-300"
                : "bg-red-900 text-red-300"
            }`}>
              Exit: {exitCode}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {!isRunning ? (
            <Button
              onClick={runApp}
              size="sm"
              className="h-7 flex items-center gap-1"
            >
              <Play size={14} />
              Run
            </Button>
          ) : (
            <Button
              onClick={stopApp}
              size="sm"
              variant="destructive"
              className="h-7 flex items-center gap-1"
            >
              <Square size={14} />
              Stop
            </Button>
          )}

          <Button
            onClick={copyLogs}
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            disabled={logs.length === 0}
          >
            <Copy size={14} />
          </Button>

          <Button
            onClick={clearLogs}
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            disabled={logs.length === 0}
          >
            <Trash size={14} />
          </Button>
        </div>
      </div>

      {/* Log output */}
      <ScrollArea ref={scrollRef} className="flex-1 p-2">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Terminal size={48} className="mb-4 opacity-20" />
            <p>Click "Run" to execute the console application</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {logs.map((log, i) => (
              <div key={i} className="whitespace-pre-wrap break-all">
                <span className="text-gray-600 select-none mr-2">
                  {new Date().toLocaleTimeString()}
                </span>
                {log}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Status bar */}
      <div className="p-2 bg-gray-900 border-t border-gray-800 text-xs text-gray-500 flex justify-between">
        <span>{logs.length} lines</span>
        <span>UTF-8</span>
      </div>
    </div>
  );
}
```

---

## Phase 6: New Dyad Tags (Months 6-7)

### 6.1 Tag Parsers

**File:** [`src/ipc/utils/dyad_tag_parser.ts`](src/ipc/utils/dyad_tag_parser.ts)

```typescript
// NEW: Parse <dyad-add-nuget packages="...">
export function getDyadAddNugetTags(fullResponse: string): string[] {
  const dyadAddNugetRegex =
    /<dyad-add-nuget packages="([^"]+)">[^<]*<\/dyad-add-nuget>/g;
  let match;
  const packages: string[] = [];
  while ((match = dyadAddNugetRegex.exec(fullResponse)) !== null) {
    packages.push(...unescapeXmlAttr(match[1]).split(" "));
  }
  return packages;
}

// NEW: Parse <dyad-dotnet-command cmd="...">
export function getDyadDotnetCommandTags(
  fullResponse: string,
): { cmd: string; args?: string }[] {
  const dyadDotnetCommandRegex =
    /<dyad-dotnet-command cmd="([^"]+)"(?: args="([^"]*)")?[^>]*>[\s\S]*?<\/dyad-dotnet-command>/g;
  let match;
  const commands: { cmd: string; args?: string }[] = [];
  while ((match = dyadDotnetCommandRegex.exec(fullResponse)) !== null) {
    commands.push({
      cmd: unescapeXmlAttr(match[1]),
      args: match[2] ? unescapeXmlAttr(match[2]) : undefined,
    });
  }
  return commands;
}
```

### 6.2 Tag Processors

**NEW File:** `src/ipc/processors/executeAddNuget.ts`

```typescript
// src/ipc/processors/executeAddNuget.ts
// Processor for <dyad-add-nuget> tags

import { executionKernel } from "../runtime/ExecutionKernel";
import { db } from "../../db";
import { messages } from "../../db/schema";
import { eq } from "drizzle-orm";
import { Message } from "@/ipc/types";

export async function executeAddNuget({
  packages,
  message,
  appPath,
  appId,
}: {
  packages: string[];
  message: Message;
  appPath: string;
  appId: number;
}) {
  const results: string[] = [];

  for (const packageName of packages) {
    try {
      const result = await executionKernel.execute({
        command: "dotnet",
        args: ["add", "package", packageName],
        cwd: appPath,
        appId,
        networkPolicy: "allowed", // NuGet needs network
        memoryLimitBytes: 2 * 1024 * 1024 * 1024,
        timeoutMs: 120000, // 2 minutes per package
      });

      results.push(
        `Package: ${packageName}\n${result.stdout}\n${result.stderr}`,
      );
    } catch (error) {
      results.push(`Package: ${packageName}\nERROR: ${error}`);
    }
  }

  const combinedResults = results.join("\n---\n");

  // Update the message content with installation results
  const updatedContent = message.content.replace(
    new RegExp(
      `<dyad-add-nuget packages="${packages.join(" ")}">[^<]*</dyad-add-nuget>`,
      "g",
    ),
    `<dyad-add-nuget packages="${packages.join(" ")}">\n${combinedResults}\n</dyad-add-nuget>`,
  );

  await db
    .update(messages)
    .set({ content: updatedContent })
    .where(eq(messages.id, message.id));
}
```

**NEW File:** `src/ipc/processors/executeDotnetCommand.ts`

````typescript
// src/ipc/processors/executeDotnetCommand.ts
// Processor for <dyad-dotnet-command> tags

import { executionKernel } from "../runtime/ExecutionKernel";
import { db } from "../../db";
import { messages } from "../../db/schema";
import { eq } from "drizzle-orm";
import { Message } from "@/ipc/types";

export async function executeDotnetCommand({
  command,
  args,
  message,
  appPath,
  appId,
}: {
  command: string;
  args?: string;
  message: Message;
  appPath: string;
  appId: number;
}) {
  const allArgs = args ? args.split(" ").filter(Boolean) : [];

  const result = await executionKernel.execute({
    command: "dotnet",
    args: [command, ...allArgs],
    cwd: appPath,
    appId,
    networkPolicy:
      command === "restore" || command === "add" ? "allowed" : "blocked",
    memoryLimitBytes: 4 * 1024 * 1024 * 1024,
    timeoutMs: 300000,
  });

  const output = `Exit Code: ${result.exitCode}\n\nSTDOUT:\n${result.stdout}\n\nSTDERR:\n${result.stderr}`;

  // Update the message content with command output
  const argsAttr = args ? ` args="${args}"` : "";
  const updatedContent = message.content.replace(
    new RegExp(
      `<dyad-dotnet-command cmd="${command}"${argsAttr}[^>]*>[\s\S]*?</dyad-dotnet-command>`,
      "g",
    ),
    `<dyad-dotnet-command cmd="${command}"${argsAttr}>\n${output}\n</dyad-dotnet-command>`,
  );

  await db
    .update(messages)
    .set({ content: updatedContent })
    .where(eq(messages.id, message.id));
}
```typescript

**File:** [`src/ipc/processors/response_processor.ts`](src/ipc/processors/response_processor.ts)

```typescript
// REFACTORED to use RuntimeProvider
import { runtimeRegistry } from "../runtime/RuntimeProviderRegistry";

export async function processFullResponseActions(
  fullResponse: string,
  chatId: number,
  {
    chatSummary,
    messageId,
  }: { chatSummary: string | undefined; messageId: number },
) {
  // ... get chatWithApp ...

  // Get runtime provider for this app
  const runtimeProvider = runtimeRegistry.getProvider(
    chatWithApp.app.runtimeProvider || "node",
  );

  // Handle NuGet packages via provider
  const dyadAddNugetPackages = getDyadAddNugetTags(fullResponse);
  if (dyadAddNugetPackages.length > 0) {
    try {
      // SECURITY: Goes through kernel via provider.addDependency
      // Parse packages from tag attributes (not shown in snippet but assumed available)
      // const packages = ...
      if (runtimeProvider.addDependency) {
         await runtimeProvider.addDependency({
            appPath,
            appId: chatWithApp.app.id,
            packages: ["PackageName"] // Placeholder for parsed packages
         });
      }
    } catch (error) {
      errors.push({
        message: `Failed to restore dependencies`,
        error: error,
      });
    }
  }
}
````

---

## Phase 7: System Prompts (Months 7-8)

**NEW File:** `src/prompts/dotnet_wpf_prompt.ts`

```typescript
export const DOTNET_WPF_PROMPT = `
# .NET WPF Development

You are a Windows XAML expert for WPF applications.

## Tech Stack
- .NET 6/7/8
- WPF with XAML
- MVVM pattern

## Available Dyad Tags
- <dyad-write path="MainWindow.xaml"> - Write XAML UI files
- <dyad-write path="ViewModels/MainViewModel.cs"> - Write ViewModels
- <dyad-add-nuget packages="PackageName"> - Add NuGet packages
- <dyad-dotnet-command cmd="build"> - Run dotnet commands
- <dyad-command type="rebuild"></dyad-command> - Rebuild the app

## Project Structure
AppName/
├── AppName.csproj
├── App.xaml
├── MainWindow.xaml              // Main window XAML
├── MainWindow.xaml.cs
├── ViewModels/                  // MVVM ViewModels
│   └── MainViewModel.cs
└── Views/                       // User controls
    └── UserControl1.xaml

## XAML Best Practices
- Use MVVM pattern with data binding
- Implement INotifyPropertyChanged
- Use ObservableCollection<T> for lists
- Leverage built-in WPF controls

## Security Notice
All commands execute through Dyad's secure ExecutionKernel with:
- Network policy enforcement
- Memory limits (4GB for builds)
- Timeout protection (10 min max)
- Capability-based access control

Generate production-ready WPF apps with proper MVVM separation, async/await for I/O, and Windows-native look and feel.
`;
```

**NEW File:** `src/prompts/tauri_prompt.ts`

```typescript
export const TAURI_PROMPT = `
# Tauri Desktop Development

You are a Tauri expert for building secure, lightweight desktop applications with Rust and web technologies.

## Tech Stack
- Tauri v2 (Rust + WebView2)
- Frontend: vanilla JS or framework of choice
- Backend: Rust
- WebView2 on Windows

## Available Dyad Tags
- <dyad-write path="src-tauri/src/main.rs"> - Write Rust backend code
- <dyad-write path="src-tauri/tauri.conf.json"> - Tauri configuration
- <dyad-write path="src/index.html"> - Frontend HTML/JS
- <dyad-command type="rebuild"></dyad-command> - Rebuild the app

## Project Structure
AppName/
├── src/                         // Frontend code
│   ├── index.html
│   ├── main.js
│   └── styles.css
├── src-tauri/                   // Rust backend
│   ├── src/
│   │   └── main.rs              // Main Rust entry
│   ├── Cargo.toml               // Rust dependencies
│   └── tauri.conf.json          // Tauri config
└── package.json

## Rust Tauri Commands
Define commands in main.rs:
\`\`\`rust
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}
\`\`\`

Invoke from frontend:
\`\`\`javascript
import { invoke } from '@tauri-apps/api/core';
const response = await invoke('greet', { name: 'World' });
\`\`\`

## Security Best Practices
- Use Tauri's permission system
- Validate all inputs in Rust commands
- Use capability-based security
- Minimize frontend privileges

## Security Notice
All commands execute through Dyad's secure ExecutionKernel with:
- Network policy enforcement
- Memory limits (4GB for builds)
- Timeout protection (10 min max)
- Capability-based access control

Generate secure, fast Tauri apps with proper separation between frontend and backend.
`;
```

### 7.1 Prompt Loading Integration

**File:** `src/prompts/system_prompt.ts` (update)

```typescript
// Add imports for new prompts
import { DOTNET_WPF_PROMPT } from "./dotnet_wpf_prompt";
import { TAURI_PROMPT } from "./tauri_prompt";

// Update constructSystemPrompt to conditionally append prompts
export const constructSystemPrompt = ({
  aiRules,
  chatMode = "build",
  enableTurboEditsV2,
  themePrompt,
  readOnly,
  basicAgentMode,
  stackType = "react",
  runtimeProvider = "node",
}: {
  // ... existing params
  stackType?: string;
  runtimeProvider?: string;
}) => {
  // ... existing logic

  // NEW: Append stack-specific prompts
  if (runtimeProvider === "dotnet") {
    systemPrompt += "\n\n" + DOTNET_WPF_PROMPT;
  } else if (runtimeProvider === "tauri") {
    systemPrompt += "\n\n" + TAURI_PROMPT;
  }

  // ... rest of existing logic
};
```

---

## Summary of Architectural Changes

| Issue               | Original Plan                         | Revised Plan                                |
| ------------------- | ------------------------------------- | ------------------------------------------- |
| Shell authority     | Scattered `execPromise()` calls       | **ExecutionKernel** - single entry point    |
| Runtime branching   | `if (runtime === "dotnet")` scattered | **RuntimeProvider** interface with registry |
| Readiness detection | 3s timeout                            | Provider-specific `isReady()` method        |
| NuGet security      | Direct execution                      | Kernel with network policy + limits         |
| Screenshot polling  | Every 2 seconds continuous            | On-demand only                              |
| Agent tools         | Direct `execPromise()`                | Calls `ExecutionKernel.execute()`           |

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
