# Runtime Provider Architecture

## Problem Statement

Dyad currently supports web app building (Node.js/React). To support Windows native apps, we need a **unified execution kernel** that can safely build, package, and validate applications across multiple runtimes (Node, .NET, Rust).

The challenge isn't UI technology selection (WPF vs MAUI vs Tauri) - it's **execution architecture**:

- Toolchain containment
- Process isolation  
- Shell execution safety
- Multi-runtime orchestration
- Packaging guarantees
- Crash recovery
- Deterministic policy enforcement
- Resource governance

## Current State

### Guardian Service (Windows-Specific)
The Guardian Service we built provides:
- ✅ Sandboxed Process Spawning (Windows Job Objects)
- ✅ Capability-Based Security (JWT tokens)
- ✅ Resource Governance (CPU/Memory limits)
- ✅ Network Isolation (WFP)

**Gap:** It's Windows-only and not abstracted into a cross-platform runtime provider interface.

## Proposed Architecture

```
┌─────────────────────────────────────────┐
│         RuntimeProvider Interface       │
│  (Abstract contract for all runtimes)   │
├─────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │Node      │ │DotNet    │ │Rust     │ │
│  │Provider  │ │Provider  │ │Provider │ │
│  └────┬─────┘ └────┬─────┘ └────┬────┘ │
│       └─────────────┴─────────────┘     │
│              Execution Kernel           │
│  ┌───────────────────────────────────┐  │
│  │ • Sandboxed Process Spawner       │  │
│  │ • Capability-Gated Shell Exec     │  │
│  │ • Resource Governance (CPU/Mem)   │  │
│  │ • Project Root Jail Enforcement   │  │
│  │ • Atomic State Commits            │  │
│  │ • Crash Recovery                  │  │
│  │ • Policy Engine                   │  │
│  └───────────────────────────────────┘  │
├─────────────────────────────────────────┤
│     Platform-Specific Implementations   │
│  ┌─────────────┐ ┌─────────────────┐   │
│  │Windows      │ │macOS/Linux      │   │
│  │(Job Objects)│ │(cgroups/seccomp)│   │
│  └─────────────┘ └─────────────────┘   │
└─────────────────────────────────────────┘
```

## RuntimeProvider Interface

```typescript
interface RuntimeProvider {
  // Identification
  readonly runtimeId: string;  // 'node', 'dotnet', 'rust'
  readonly supportedPlatforms: Platform[];
  
  // Lifecycle
  scaffold(options: ScaffoldOptions): Promise<ScaffoldResult>;
  resolveDependencies(options: ResolveOptions): Promise<ResolveResult>;
  build(options: BuildOptions): Promise<BuildResult>;
  preview(options: PreviewOptions): Promise<PreviewResult>;
  package(options: PackageOptions): Promise<PackageResult>;
  validate(options: ValidateOptions): Promise<ValidateResult>;
  
  // Cleanup
  destroy(): Promise<void>;
}

interface ExecutionContext {
  // Security
  capabilities: Capability[];  // What this build can access
  projectRoot: string;         // Jail root
  allowedPaths: string[];      // Read/write whitelist
  networkPolicy: NetworkPolicy; // Block/Allow/Restricted
  
  // Resources
  maxMemoryBytes: number;
  maxCpuPercent: number;
  timeoutSeconds: number;
  
  // Observability
  onProgress: (event: BuildEvent) => void;
  onLog: (log: LogEntry) => void;
}
```

## Execution Kernel Components

### 1. Sandboxed Process Spawner
```typescript
interface ProcessSpawner {
  spawn(
    command: string,
    args: string[],
    context: ExecutionContext
  ): Promise<SandboxedProcess>;
}

// Windows: Job Objects (existing Guardian)
// macOS/Linux: cgroups + namespaces
```

### 2. Capability-Gated Shell Execution
```typescript
interface ShellExecutor {
  // All shell commands go through this gate
  execute(
    command: string,
    requiredCapabilities: Capability[]
  ): Promise<ExecutionResult>;
}

// Enforces: "Does this process have CAP_FILE_WRITE for this path?"
```

### 3. Policy Engine
```typescript
interface PolicyEngine {
  // Deterministic enforcement
  evaluate(action: Action, context: ExecutionContext): PolicyDecision;
  
  // Example policies:
  // - "Never allow rm -rf /"
  // - "Never allow network access without CAP_NET"
  // - "Never allow write outside project root"
}
```

### 4. State Manager (Two-Phase Commit)
```typescript
interface StateManager {
  // Atomic workspace operations
  beginTransaction(): Transaction;
  commit(tx: Transaction): Promise<void>;
  rollback(tx: Transaction): Promise<void>;
  
  // Crash recovery
  recover(): Promise<WorkspaceState>;
}
```

## Implementation Roadmap

### Phase 1: Extract RuntimeProvider Interface
- Define abstract interface
- Refactor existing Node.js support into NodeProvider
- Make Guardian Service pluggable (WindowsSandboxProvider)

### Phase 2: Harden Execution Kernel
- Implement cross-platform process sandboxing
- Build capability system (extend existing JWT tokens)
- Create policy engine
- Add state management with atomic commits

### Phase 3: First Stable Runtime
- Choose: NodeProvider (already have it)
- Integrate with hardened kernel
- Full test coverage for containment

### Phase 4: Add Second Runtime
- DotNetProvider OR RustProvider
- Reuse execution kernel
- Validate multi-runtime orchestration

### Phase 5: Scale
- Add remaining runtimes
- Optimize resource sharing
- Distributed build support (future)

## Key Design Decisions

### 1. Platform Abstraction
```
ExecutionKernel (cross-platform)
    ↓
PlatformProvider (platform-specific)
    ↓
Windows: Job Objects, WFP
macOS: cgroups, sandbox-exec
Linux: cgroups, namespaces, seccomp
```

### 2. Capability System
Extend existing Guardian capability tokens:
```json
{
  "subject": "build-process-123",
  "resource": "file:/project/src",
  "action": "write",
  "constraints": {
    "maxSize": "100MB",
    "allowedExtensions": [".ts", ".tsx", ".css"]
  }
}
```

### 3. Policy as Code
```yaml
# policy.yaml
shell_execution:
  blocked_patterns:
    - "rm -rf /"
    - "curl.*| sh"
    - "wget.*| bash"
  
file_access:
  jail_root: "${PROJECT_ROOT}"
  allow_outside: false
  
network:
  default: blocked
  allowed_hosts:
    - "registry.npmjs.org"
    - "api.github.com"
```

## Migration from Current State

### Current: Guardian Service (Windows-only)
```
Electron → Guardian (named pipe) → Windows APIs
```

### Target: RuntimeProvider Architecture
```
Electron → RuntimeProvider → ExecutionKernel → PlatformProvider
                ↓
         NodeProvider/DotNetProvider/RustProvider
```

### Migration Steps
1. **Keep Guardian** as WindowsPlatformProvider
2. **Create abstraction layer** around it
3. **Refactor Node.js support** to use same abstraction
4. **Add new runtimes** via the interface

## Success Metrics

- ✅ Multiple runtimes can coexist
- ✅ Compromised build can't escape jail
- ✅ Resource exhaustion is contained
- ✅ Interrupted builds can recover
- ✅ Policy violations are blocked deterministically
- ✅ Build → Preview → Package pipeline is atomic

## Next Steps

1. **Design Review:** Review RuntimeProvider interface
2. **Proof of Concept:** Refactor Node.js support into NodeProvider
3. **Integration:** Connect Guardian Service as WindowsPlatformProvider
4. **Testing:** Fuzz testing for containment boundaries
5. **Documentation:** Runtime provider authoring guide

## Conclusion

The Guardian Service is a **proof-of-concept for the Windows security layer**. The next phase is extracting the **cross-platform execution kernel** and **RuntimeProvider abstraction** that enables safe multi-runtime orchestration.

Only after this foundation exists should we debate MAUI vs Tauri vs WPF.
