Exacta App Studio is a **local, autonomous, flow-first application builder** for Windows desktop apps.

It is designed to feel invisible: you describe what you want, and the system continuously changes the project until it works.

There are no visible context windows, no dependency controls, no diff staging, and no undo buttons â€” only goals, progress, and results.

**Behavioral focus:** Exacta prioritizes fast, intent-driven editing loops that apply changes to the workspace as they are produced (auto-apply by default). Responsibility for long-term recovery and full auditability is shifted toward background snapshots and external VCS (recommended), not per-action review UIs. 

**Determinism & Guarantees:** Exacta operates in a *best-effort, iterative* mode. The system does **not** guarantee deterministic execution ordering, strict checkpoint determinism, or replay equivalence of AI outputs. Execution focuses on fast iteration: changes are applied immediately and the system attempts to self-correct over subsequent cycles rather than block for strict, pre-apply verification.  
Exacta **DOES NOT guarantee deterministic AI outputs, compiler outputs, package resolution, timestamps, or network-fetched artifacts.**

> **âš ï¸ Flow vs. Formal Guarantees Tradeoff**
> 
> Exacta prioritizes **developer flow** and **immediate productivity** over formal auditability and deterministic guarantees. This design choice means:
> 
> - **Fast iteration** with auto-apply changes instead of per-step approvals
> - **Hidden recovery mechanisms** instead of visible rollback UIs  
> - **Best-effort execution** instead of guaranteed deterministic outcomes
> - **Background snapshots** instead of explicit checkpoint management
> 
> **For applications requiring strict auditability, deterministic execution, or formal compliance guarantees, consider traditional development workflows with manual code review and explicit version control practices.**

## Product Operating Mode (Default)

Exacta App Studio operates as a **flow-first, autonomous builder**.

There are no user-selectable system profiles in the standard product experience.

All features, UI behavior, and guarantees in this document describe the **default autonomous mode**, which prioritizes:

- Immediate change application
- Minimal UI surface
- Hidden system internals
- Forward progress over formal rollback
- Conversational recovery instead of transactional control

**Context Handling (Implicit & Non-Visible)**

Exacta manages AI context automatically and invisibly.

The user interface does NOT expose:
- Token counts
- File inclusion lists
- Dependency graphs
- Coverage maps
- Context size or limits

**Execution Model (Best-Effort Convergence)**

Exacta does not guarantee formal convergence, semantic coverage, or dependency completeness.

The system iterates forward until:
- The goal is satisfied
- The budget is exhausted
- The operator halts execution

Validation occurs through build success, runtime behavior, and observed outcomes â€” not through formal file coverage or dependency proofs.

It is a Windows desktop application that builds complete desktop applications (output: **.exe** and **.msi** installers) through fully autonomous, goal-driven execution loops.

## ðŸ“š Terminology Glossary

| Term | Definition | Also Called |
|------|------------|-------------|
| **Operator** | Human user with administrative privileges | User, Administrator |
| **Core** | Exacta App Studio runtime (immutable execution engine) | Core Runtime, System |
| **Guardian** | Elevated security process enforcing policy and sandbox | Security Guardian, Policy Engine |
| **AI Agent** | Untrusted decision proposer (generates plans/code) | AI, Agent |
| **Goal** | User-defined objective with success criteria | Task, Objective |
| **Cycle** | One complete Perceiveâ†’Decideâ†’Actâ†’Observeâ†’Checkpoint loop | Loop, Iteration |
| **Checkpoint** | Restorable system state snapshot | Snapshot, Restore Point |
| **Scope Root** | Project directory jail boundary | Project Root, Jail |
| **Capability Token** | Permission grant for specific actions | Token, Permission |
| **Progressive Context Mode** | Multi-cycle execution for large codebases | Context Sharding |
| **World Model** | AI's understanding of project state | Context Model |
| **Blast Radius** | Potential scope of change impact across codebase | Impact Scope |
| **Safe Mode** | Restricted execution mode with network disabled | Restricted Mode, Offline Mode |
| **Evidence Preservation** | Automatic retention of forensic data during incidents | Forensic Mode |
| **Legal Hold** | Operator-initiated evidence lockdown for compliance | Evidence Lockdown |
| **Shard** | Subset of dependency graph processed in one cycle | Context Partition |
| **Coverage Map** | Record of which files have been semantically validated | Semantic Coverage Tracker |
| **Diff Staging** | UI area for reviewing changes before commit | Change Preview |
| **Progress Digest** | Core-generated summary of goal execution status | Execution Summary |

**What makes it unique:**

- Runs entirely locally on your PC (no Docker, no hosted backend, no cloud dependencies)
- Uses **your AI providers** via API keys or local CLIs (OpenAI-compatible APIs, OpenRouter, Gemini CLI, local models, or any future provider)
- **Autonomous execution model:** You set a goal, the system runs continuous loops until the goal is satisfied or budget is exhausted
- **Runtime scope:** The runtime is designed to resist casual modification, but the product prioritizes iterative workspace edits. The system does not surface mechanisms to edit the runtime during normal use. Note: core hardening remains an engineering goal, but auto-apply behavior means operator-visible immutability claims are reduced compared to a policy-first system.
- **Structured semantic indexing:** Context selection and refactoring safety are driven by AST + dependency graph indexing, not embedding-based memory

**Autonomous Workflow (Lovable-Style)**

Goal (user intent)
  â†“
AI proposes changes
  â†“
System applies changes automatically
  â†“
Build / Preview updates
  â†“
User refines goal
  â†“
Loop continues

Designed for developers who demand full control, complete auditability, and reversible execution.

> **Core Immutability Guarantee:** Exacta App Studio's core runtime, policy engine, and safety mechanisms are immutable at runtime. The agent may modify project artifacts but may not alter its own binary, enforcement logic, or audit system.
> 

### **What It Builds**

Exacta App Studio creates **complete Windows desktop applications** from natural language goals:

**Input:** "Build a WPF todo application with SQLite persistence"

**Output:**

- Full source code (.cs, .xaml, .csproj, configuration files)
- Compiled executable (.exe)
- Installation package (.msi)
- All build artifacts (ready to distribute)

**Supported Application Types (Hard Constraints):**

- âœ… **WPF (.NET)** â€” Windows Presentation Foundation
- âœ… **WinUI 3 (.NET)** â€” Modern Windows UI Library
- âœ… **WinForms** â€” Classic Windows Forms
- âœ… **C++ (Win32)** â€” Supported as advanced/limited templates only (to control complexity)
- âœ… **Console applications** â€” Command-line tools
- âŒ **Rust (Tauri-style)** â€” Not supported
- âŒ **WebView-based desktop** â€” Not supported

**C++ Default Risk Classification:**

- C++ goals SHOULD default to `risk_class: HIGH` due to toolchain and debugging complexity.
- Any SYSTEM-class shell commands still require `risk_class: CRITICAL` per shell policy.
- Operators MAY lower risk_class for narrowly scoped template edits, but the system SHOULD require explicit confirmation when enabling `SHELL_EXEC` for C++ goals.

**Supported Packaging Formats:**

- .msi (Windows Installer via WiX, Inno Setup)
- .exe installers (via NSIS)
- Portable .exe (no installer required)

**Target Frameworks:** .NET Framework 4.8, .NET 6/7/8, C++17/20

**Installer Signing:**

- **Optional** â€” Unsigned installers are allowed but clearly warned
- **User-provided certificates** â€” Bring your own code signing cert for signed output
- **Default behavior** â€” Generates unsigned installers with security warnings visible to end users

**Optional Signing Orchestration (External Toolchain):**

- Exacta MAY orchestrate Windows signing tools (e.g., `signtool.exe`) as a sandboxed subprocess after packaging.
- Signing MUST require an explicit capability token and MUST NOT embed private keys in project files, diffs, or checkpoints.

## Core Principles

**Bounded Autonomy** â€” System runs self-directed loops within strict capability tokens, budget limits, and policy constraints. User approves goals, system auto-executes steps, Guardian enforces boundaries.

**Policy-Deterministic by Design** â€” Every execution follows the autonomous loop: Goal â†’ Perceive â†’ Decide â†’ Act â†’ Observe â†’ Checkpoint. Repeats until goal satisfied, budget exhausted, or user halts.

**Determinism Scope (Internal System Function â€” Not Exposed in UI):** Deterministic guarantees apply only when the system is running in advanced modes. In default mode, execution ordering and context coverage are best-effort and may vary between runs.

**Determinism Exclusions (Hard Limits):**

The following components are explicitly NON-deterministic and excluded from determinism guarantees:

- External compilers and build systems (msbuild, dotnet, cl, link)
- Package managers (NuGet, npm, pip)
- Timestamped file generation
- Network-fetched dependencies
- Antivirus and endpoint protection interference

**Operator Visibility:** If subprocess execution appears blocked by antivirus/EDR, the UI SHOULD surface a warning banner suggesting the Operator review local logs and allowlists.

**Antivirus Detection Heuristics:**
- Process creation fails with ERROR_ACCESS_DENIED (0x5)
- Binary files are quarantined or deleted immediately after creation
- Subprocess terminates within 100ms of startup (typical EDR injection time)
- Windows Event Log shows antivirus events (Event ID 1006-1008 for Windows Defender)
- File access patterns show characteristic EDR scanning delays (>50ms per file operation)
- Network connections blocked despite NET_* capability being granted

Determinism guarantees apply only to:

- Policy decisions
- Capability enforcement
- Execution ordering
- Budget enforcement
- Checkpoint creation and rollback behavior

**Sandboxed Execution** â€” All operations run in a hardened sandbox: project root jail (no path traversal), capability token enforcement (no raw system access), shell command classification (parsed before execution), subprocess isolation, Guardian-enforced boundaries.

**Local-First Architecture** â€” All project data, **persistent state**, execution logs, checkpoints, and indexes are stored on your machine. AI context windows are ephemeral. No cloud dependencies for core functionality.

**Fail-Closed Security** â€” When in doubt, the system stops. AI cannot escalate privileges, bypass safety boundaries, or exceed budget caps.

**Complete Audit Trail** â€” Every goal, decision, action, and file modification is correlated and logged with causal chain traceability.

**Guardian-Enforced Authority** â€” A cryptographically isolated Guardian component (separate process with elevated privileges) enforces all security boundaries. Guardian owns policy storage, issues capability tokens, and manages system upgrades. Core runtime and AI agent cannot grant themselves additional permissions.

**User as Governor** â€” You set goals, budgets, and capabilities. System supervises execution. Emergency stop always available.

## Memory Model (Product-Level View)

Exacta does not expose memory systems, execution history, or internal state to users.

The AI operates on ephemeral context.
The system maintains internal state for stability and recovery.

There is no user-accessible memory, recall, timeline, or historical reasoning surface in the UI.

## ðŸ—ï¸ Architecture Overview

### **Autonomous Execution Model**

Exacta App Studio runs continuous **Goal â†’ Perceive â†’ Decide â†’ Act â†’ Observe â†’ Checkpoint** loops until goal is satisfied, budget is exhausted, policy is violated, or user halts.

Every cycle:

- Creates a checkpoint before execution
- Validates capability tokens before actions
- Enforces budget limits (hard caps)
- Logs causal chain (goal_id â†’ cycle_id â†’ decision_id â†’ actions â†’ results)
- Detects runaway patterns (same file 3x in 5 loops, consecutive build failures)

### **Trust Boundary Separation (Immutable Core Architecture)**

Exacta App Studio uses a **three-layer authority model** with an **immutable trust anchor**:

```jsx
+---------------------------+
|   GUARDIAN (LOCKED)       |  â† Separate elevated process
|  - Policy Storage         |
|  - Capability Authority   |
|  - Upgrade Manager        |
|  - Certification State    |
+---------------------------+
           â†‘ Advanced API
           â†“ (IPC boundary)
+---------------------------+
|   CORE RUNTIME (LOCKED)   |  â† Immutable at runtime
|  - Orchestrator           |
|  - Budget Enforcer        |
|  - Checkpoint System      |
|  - Audit Log              |
|  - File Gateway           |
+---------------------------+
           â†‘ Execution API
           â†“
+---------------------------+
|       AI AGENT            |  â† Untrusted proposer
+---------------------------+
           â†“
+---------------------------+
|     PROJECT SPACE         |  â† Fully mutable
+---------------------------+
```

**Guardian (Highest Authority, Separate Process)** â€” Enforces policy, manages upgrades, controls system paths, signs certification state, issues capability tokens. Runs in a separate process with just-in-time elevated privileges granted only for:

- Upgrade installation
- Certificate validation
- Policy storage access
- Windows Job Object enforcement

Guardian does NOT maintain persistent administrator privileges. **Cannot be modified by Core or AI.**

**Core Runtime (Middle Authority, User Process)** â€” Orchestrates AI interactions, manages project files within jail, executes within capability tokens, enforces budgets. Communicates with Guardian via IPC. **Cannot touch Guardian paths, policy storage, or self-upgrade.**

**IPC Security Model:**

- **Transport** â€” Named pipes with Windows ACLs (Guardian process SID only)
- **Authentication** â€” HMAC-SHA256 message authentication with per-session key (derived from Guardian_Secret via HKDF)
- **Authorization** â€” Every IPC request includes capability token; Guardian validates before processing
- **Replay protection** â€” Nonce + timestamp in every message (5-second validity window)
- **Nonce validity logic**: max(5 seconds, 2x observed IPC round-trip time); clock skew tolerance Â±30 seconds with warning on detection
- **Encryption** â€” AES-256-GCM for all IPC payloads (defends against non-privileged local process inspection; does not defend against kernel or administrator-level compromise)
- **Sequence enforcement** â€” Messages include sequence numbers; out-of-order messages rejected

**Guardian_Secret Management:**

- **Storage**: Guardian_Secret is generated on first run, stored encrypted via Windows DPAPI (bound to user account + machine).
- **Rotation**: Automatic rotation every 7 days or on system upgrade; old secrets retained for 7 days for decryption.
- **Migration**: On machine migration, secrets are lost; user must re-enter API keys and re-initialize Guardian.

**IPC Threat Model:**

- **Defends against:** Compromised Core process, local privilege escalation, IPC injection
- **Does NOT defend against:** Kernel-level compromise, physical access, firmware attacks

**Invariant:**

**INV-IPC-1: Authenticated IPC Only** â€” Guardian SHALL reject any IPC message lacking valid HMAC, current nonce, or valid capability token.

**AI Agent (Lowest Authority, Untrusted)** â€” Decision proposer only. Generates goals, plans, diffs, and decisions. **Cannot execute, modify files, access system resources, self-authorize, or alter its own binary.**

### Context Handling (Hidden)

Exacta assembles AI context internally.

There are no user-visible:
- Context windows
- Context modes
- File inclusion lists
- Coverage indicators
- Capacity warnings
- Semantic safety banners

Context management is an implementation detail, not a product feature.




- Checkpoints are created between every cycle
- The **full semantic closure MUST be covered across cycles**
- Dependency edges MAY NOT be violated between cycles

**MAY-CTX-FAST: Throughput Mode (Operator-Controlled)**

**Shard Computation Algorithm:**
- Use topological sort on the dependency graph to identify safe execution order
- Circular dependencies detected via Strongly Connected Components (SCC) analysis: if SCC size > 1, treat entire component as single shard with warning
- Each shard MUST be < 80% of the provider's context capacity to allow headroom
- If a single file + its immediate dependencies > capacity â†’ HALT with "Unsupported: file too large for context window"
- Cross-shard dependencies are validated at cycle boundaries to prevent violations

The Operator MAY enable Throughput Mode, allowing relevance-ranked context selection instead of strict dependency closure.

When enabled:
- Semantic coverage guarantees are DISABLED
- Determinism guarantees are SUSPENDED
- Audit logs SHALL record `context_mode=FAST`

**INV-CTX-FAST-1: Risk Escalation**

When FAST mode is enabled:
- Goal risk_class SHALL be automatically elevated to HIGH
- SYSTEM-class shell commands SHALL be forcibly disabled
- Package installation SHALL require explicit user confirmation

### Memory Injection Firewall

Before any data is injected into an AI context window, Core SHALL apply a memory firewall that:

- Strips all policy decisions, audit metadata, capability tokens, and Guardian state
- Removes timestamps, operator identifiers, and execution hashes
- Redacts file paths outside dependency-closed scope
- Normalizes injected context ordering to reduce inference of execution history. This does NOT prevent historical inference from file contents themselves.

**Invariant:**  
**INV-MEM-CTX-1: Forensic Non-Observability** â€” AI context SHALL NOT allow reconstruction of system state, policy behavior, user identity, or prior execution history beyond the last N redacted outcomes.

**INV-MEM-FW-2: Semantic Neutralization**
All injected content SHALL be normalized to prevent:
- Implicit execution order inference
- File hierarchy reconstruction
- Change chronology reconstruction
- Goal lineage reconstruction

**INV-MEM-9: No Forensic Perception** â€” AI SHALL NOT perceive, infer from, or receive execution logs, checkpoints, policy decisions, or causal traces. Only redacted outcome summaries produced by Core MAY be provided.

**INV-MEM-15: No Execution Trace in Context** â€” Execution traces, causal records, and audit logs SHALL NOT be exposed to the AI Agent during PERCEIVE under any condition.

### Redacted Outcome Schema (AI-Visible)

Each outcome summary injected into context MUST conform to:

```tsx
OutcomeSummary {
  step_id: UUID
  status: 'SUCCESS' | 'FAILURE'
  high_level_effect: string      // e.g. "Build failed due to missing NuGet package"
  files_touched_count: number
}
```

**Explicitly forbidden fields:**

* Timestamps
* File paths
* Command strings
* Capability tokens
* Policy results
* Budget values
* Error codes
* Stack traces
* Hashes or IDs from forensic systems

### **Goal Progress Digest (LOVABLE Default)**

In LOVABLE mode, the digest is simplified and non-forensic:

```tsx
GoalProgressDigest {
  cycles_completed: number
  status: 'BUILDING' | 'ERROR' | 'FIXING' | 'DONE'
  last_outcome: string
  health: 'HEALTHY' | 'WARNING' | 'CRITICAL'
}
```

**Advanced Fields (Internal System Function â€” Not Exposed in UI):**

* coverage_progress
* token counts
* file counts
* budget breakdowns
* semantic closure metrics

### **Core Autonomous Components**

- **Context Planner (Non-AI, Core-Owned)**

A deterministic system component responsible for:

- Computing dependency-closed file sets from the Project Index
- Estimating provider context capacity (model metadata + configured max_tokens)
- Partitioning large dependency graphs into **cycle-safe dependency shards**
- Scheduling shard execution order
- Enforcing cross-cycle dependency integrity
- Marking semantic coverage progress in checkpoint metadata

**Note:** Semantic understanding is provided by the AI agent. The Context Planner operates purely on structural dependency graphs and symbol relationships.

The Context Planner SHALL NOT use embeddings, vector databases, or AI ranking.
All decisions are graph-based and deterministic.

## Formal Definitions â€” Memory vs State vs Context

### Global Memory Invariants (Non-Overridable)

**INV-MEM-G1: System-Owned Memory**
All persistent memory layers SHALL be owned and written only by Core or Guardian.

**INV-MEM-G2: AI Ephemerality**
AI context and reasoning state SHALL be ephemeral and SHALL NOT persist across cycles or restarts.

**INV-MEM-G3: No Cross-Goal Recall**
Memory artifacts from one Goal SHALL NOT be visible, injectable, or inferable in another Goal.

**INV-MEM-G4: Guardian Final Authority**
In any memory conflict, corruption, or ambiguity, Guardianâ€™s state SHALL be treated as ground truth.

## Memory Lifecycle State Machine

Persistent memory objects SHALL follow this lifecycle:

CREATED â†’ VERIFIED â†’ ACTIVE â†’ [ARCHIVED | EVIDENCE]
â†“
CORRUPT

### Rules

- **CREATED** â€” Written during PHASE 1 (PREPARE)
- **VERIFIED** â€” Hash + schema + Guardian signature validated
- **ACTIVE** â€” Eligible for rollback, replay, and audit reference
- **ARCHIVED** â€” Retained but excluded from active rollback window
- **EVIDENCE** â€” Legal Hold or incident-linked, immutable, non-prunable
- **CORRUPT** â€” Validation failure â†’ Safe Mode enforced

**INV-MEM-L1:** Only Guardian may transition objects into or out of EVIDENCE  
**INV-MEM-L2:** CORRUPT state SHALL be terminal until Operator intervention

**Persistent State**  
Durable, system-owned data (filesystem, project index, goal state, checkpoints, execution logs). Survives restarts and drives rollback and audit.

**Context Window**  
Ephemeral subset of project data injected into an AI request. Lost after the response. NOT a memory system.

**Semantic Index**  
Structured retrieval system (AST graph, dependency graph, symbol map) used to select files and enforce refactoring safety.

**Execution Memory**  
System-owned, append-only forensic record consisting of execution logs, checkpoints, causal traces, and policy decisions. Execution Memory is write-once, tamper-evident, and Guardian-verifiable. AI SHALL NOT read, write, reference, summarize, or infer from this layer.

**AI Output Archive (Forensic Only)**

Raw AI outputs MAY be stored in Execution Memory strictly as immutable forensic artifacts.

They:
- SHALL NOT be reinjected into AI context
- SHALL NOT be summarized or transformed into system memory
- SHALL be readable only by Guardian during replay or audit

**Invariant:**  
Exacta provides **Persistent State, Structured Semantic Indexing, and Execution Memory**.  
The AI agent receives only **Context Windows and redacted Project Index views**.

- **Goal Manager**

Persistent, versioned goal tracking with success criteria, scope roots, allowed capabilities, and budget references

- **Autonomy Policy Engine**

System authority that evaluates action type, target scope, capability tokens, budget state, and risk level. Outputs ALLOW, ALLOW_WITH_LIMITS, or DENY

### **Policy Engine Minimal Formalism (V1)**

This is the minimal formal description of how policy decisions are made.

**Decision:** `DENY` | `ALLOW_WITH_LIMITS` | `ALLOW`

**Inputs (immutable at evaluation time):**

- `goal` (id, risk_class, allowed_capabilities, scope_root)
- `action` (type, target paths/URLs, requested_capabilities, estimated_cost, command_class)
- `state` (budget_remaining, safety_mode, offline_mode, current_profile)
- `policy` (ordered rule sets + allowlists/blocklists)

**Policy language (simple, declarative rules):**

Rules are evaluated as *pure predicates* over the input snapshot.

```tsx
Rule {
  id: string
  description: string
  when: Predicate   // boolean over (goal, action, state)
  effect: 'DENY' | 'ALLOW_WITH_LIMITS' | 'ALLOW'
  limits?: {
    max_files?: number
    max_lines?: number
    timeout_seconds?: number
    network?: 'DENY' | 'AI_ONLY' | 'DOCS_ONLY' | 'ALLOW'
  }
}
```

**Evaluation order (fail-closed):**

1. **Global hard invariants** (non-overridable): if any match â†’ `DENY`.
2. **Safety Mode / Offline mode** gates: enforced before any allow.
3. **Scope + path jail checks**: outside `scope_root` or system paths â†’ `DENY`.
4. **Capability requirements**: missing required capability token â†’ `DENY`.
5. **Command classification** (READ/BUILD/FS_MUTATE/SYSTEM/NETWORK): apply class policy; unknown â†’ `DENY`.
6. **Budget checks**: if would exceed any cap â†’ `DENY`.
7. **Ordered policy rules**: first matching rule with `DENY` wins; otherwise accumulate the most restrictive allow (`ALLOW_WITH_LIMITS` beats `ALLOW`).
8. Default: `DENY`.

**Override precedence:**

- **Non-overridable:** global invariants, sandbox boundary, system path protection, and capability enforcement.
- **Operator overrides (allowed):** only by switching to a pre-defined, signed *policy profile* (e.g., â€œMore permissive shell allowlistâ€), never by ad-hoc runtime editing.
- **Most restrictive wins:** When multiple rules apply, the final decision is the minimum in this order: `DENY` > `ALLOW_WITH_LIMITS` > `ALLOW`.

**Determinism requirement:** Policy evaluation is deterministic for a given `(goal, action, state, policy_version)` snapshot, and the snapshot is logged with the decision.

- **Capability Authority**

Issues and validates per-action capability tokens: FS_READ, FS_WRITE, BUILD_EXEC, PACKAGE_EXEC, SIGN_EXEC, NET_AI_ONLY, NET_DOCS_ONLY, SHELL_EXEC (optional, high risk), PROCESS_KILL

- **Budget Enforcer**

Hard runtime governor enforcing caps: files modified/cycle (50), lines changed/cycle (2000), build runs/goal (5), tokens/goal (500k), time/goal (30 min), network calls/goal (200)

## Background Recovery (Hidden)

Exacta maintains internal background snapshots strictly for:
- Crash recovery
- Data corruption protection
- Forensic export (advanced use only)

The standard UI does NOT expose:
- Undo buttons
- Rollback timelines
- Restore point selectors
- File history panels

Recovery is system-driven, not user-operated.
Operators are expected to use external version control (Git) for manual history and rollback.



### Environment Snapshot Schema (Determinism Anchor)

EnvironmentSnapshot {
  os_version: string
  exacta_version: string
  toolchain_versions: {
    dotnet?: string
    msbuild?: string
    cl?: string
    linker?: string
    wix?: string
    nsis?: string
  }
  environment_variables_hash: SHA256
  installed_cli_fingerprints: Map<string, SHA256> // path + binary hash
  locale: string
  timezone: string
}

**Invariant:**  
**INV-DET-1: Snapshot Completeness** â€” A checkpoint SHALL NOT be considered deterministic unless a valid EnvironmentSnapshot is present and hash-anchored.

### **Transactional State Commit Protocol (Internal System Function â€” Not Exposed in UI)**

All **persistent state layers** SHALL be modified only through a **two-phase atomic commit protocol**.

**Persistent Layers Covered:**

* Filesystem (project artifacts)
* Project Index snapshot
* Goal Memory
* Budget Counters
* Execution Log pointer
* Checkpoint metadata

**Protocol:**

```
PHASE 1 â€” PREPARE
- Write file diffs to a temporary workspace (.exacta/staging/)
- Build new Project Index snapshot in memory
- Write checkpoint record with status=PENDING
- Validate schema versions for all memory objects
- Verify sufficient disk space and write permissions

PHASE 2 â€” COMMIT
- Atomically move staged files into scope_root
- Atomically promote index snapshot
- Commit goal state and budget counters
- Mark checkpoint status=COMMITTED
- Append execution log anchor
```

**Crash Recovery Rule:**

* On startup, any checkpoint with `status=PENDING` SHALL trigger **automatic rollback** to the last `COMMITTED` checkpoint before any execution resumes.

### Memory Corruption Rule

If any persistent memory object fails validation, signature check, or hash-chain verification:

System SHALL:
1. Enter Safe Mode
2. Freeze autonomous execution
3. Preserve all memory artifacts
4. Require Operator forensic review

**Invariant:**  
**INV-MEM-7: Corruption Fails Closed** â€” System SHALL NEVER attempt auto-repair or regeneration of corrupted memory.

**Invariant:**

**INV-MEM-1: Atomic State Commit** â€” Filesystem, index, goal state, budget counters, and checkpoint metadata SHALL be committed as a single atomic unit. Partial state visibility is forbidden.

### Persistent Memory Quotas

**Default Limits:**
- Execution Logs: 500MB
- Project Index Cache: 200MB
- Goal State Store: 50MB
- Checkpoint Metadata: 100MB (excluding file blobs)

**Invariant:**  
**INV-MEM-10: Quota Enforcement** â€” If any memory class exceeds its quota, system SHALL:
1. Halt autonomous execution
2. Notify Operator
3. Require explicit approval to expand quota or prune non-evidence data

**Evidence Classification Rule:** If a checkpoint is referenced by an audit log, security incident, or forensic export, it is reclassified as EVIDENCE and becomes subject to Evidence Retention and Legal Hold rules. Such checkpoints MUST NOT be auto-deleted.

**"Referenced by" Criteria:**
- **Audit Log Reference:** Checkpoint ID appears in any audit log entry as rollback source, comparison baseline, or state restoration point
- **Security Incident Reference:** Checkpoint is mentioned in incident report, breach analysis, or forensic timeline as relevant system state
- **Forensic Export Reference:** Checkpoint is included in any exported evidence package, compliance report, or legal discovery response
- **Transitive Reference:** If checkpoint A references checkpoint B in its metadata chain, and A is evidence, then B is also evidence

- **Agent Supervisor (Non-AI)**

Watchdog monitoring action velocity, repeated failures, loop patterns, scope expansion. Can forcibly freeze agent, revoke capabilities, roll back system

- **5-Layer Persistent State & Execution Memory Architecture**
- **Project Index (Structured State Cache)** â€” Dependency graph, symbol map, file fingerprints. Cache only; filesystem is ground truth.
- **Goal State (Persistent State)** â€” Objectives, constraints, budgets, and policy bindings.
- **Plan Trace (Execution State)** â€” Proposed actions, approvals, and decision lineage.
- **Execution Log (Forensic State)** â€” What actually ran, timestamps, exit codes, capability grants.
- **World Model (Volatile Advisory State)** â€” AI assumptions; non-authoritative; never persisted.

### **Persistent State Object Schema Authority**

All persistent memory objects MUST include the following fields:

```tsx
MemoryHeader {
  schema_version: string        // SemVer format (e.g., "1.0.0")
  producer_version: string      // Exacta build ID
  created_at: timestamp
}
```

**Applies To:**

* Project Index
* Goal Memory
* Budget State
* Checkpoints
* Execution Logs
* Policy Snapshots

**Failure Rule:**

**INV-MEM-2: Schema Mismatch HALT** â€” If any memory objectâ€™s `schema_version` or `producer_version` is incompatible with the running system, execution MUST HALT and require Operator review.

### Memory Migration Rule

Memory schema upgrades SHALL only occur via signed system upgrade packages.

AI SHALL NOT generate, modify, or apply memory migration logic.

All migrations MUST:
- Preserve prior versions in read-only form
- Be reversible
- Be logged as CRITICAL audit events

**World Model Containment:**

The World Model is explicitly excluded from execution, policy evaluation, capability decisions, and audit authority. It is treated as volatile advisory state only and is discarded on system restart.

The World Model SHALL NOT be checkpointed, versioned, exported, or referenced by any persistent state layer.

Guardian SHALL NOT accept any policy-relevant fields originating from the World Model.

Only Core-generated state may influence policy evaluation.

### **Memory Visibility Rules (Read Authority Matrix)**

| Memory Layer   | AI Agent | Core Runtime | Guardian |
|---------------|----------|--------------|----------|
| Project Index | âœ… Read-only | âœ… Full | âš ï¸ Verify |
| Goal Memory   | âš ï¸ Redacted | âœ… Full | âœ… Full |
| Plan Trace   | âš ï¸ Summary only | âœ… Full | âœ… Full |
| Execution Log| âŒ None | âŒ None | âœ… Full |
| Checkpoints  | âŒ None | âš ï¸ Restore only | âœ… Full |
| Secrets/Keys | âŒ None | âŒ None | âœ… Full |

### Memory Write Authority Matrix

| Memory Layer   | AI Agent | Core Runtime | Guardian |
|---------------|----------|--------------|----------|
| Project Index | âŒ None  | âœ… Full       | âš ï¸ Verify |
| Goal Memory   | âŒ None  | âœ… Full       | âœ… Full |
| Plan Trace    | âŒ None  | âœ… Full       | âœ… Full |
| Execution Log | âŒ None  | âŒ None      | âœ… Full |
| Checkpoints   | âŒ None  | âŒ None      | âœ… Full |
| Secrets/Keys  | âŒ None  | âŒ None      | âœ… Full |

**Invariant:**  
**INV-MEM-3B: No AI Write Authority** â€” AI SHALL NOT write to any persistent or forensic memory layer under any condition.

**Invariant:**
**INV-MEM-3: No Forensic Leakage to AI** â€” AI SHALL NOT read audit logs, checkpoints, secrets, or Guardian-owned memory layers under any condition.

### **World Model Hard Containment Rule**

The World Model SHALL be isolated from all policy, execution, and audit functions. 

The World Model MAY be used internally by the AI Agent for reasoning,
but SHALL NOT be persisted, exported, logged, checkpointed, or treated
as authoritative input to Core, Guardian, Policy Engine, or Capability Authority.

It SHALL NOT be used for:

- Policy evaluation or capability decisions
- Audit logging or forensic analysis
- State persistence across sessions

**Invariant:**

**INV-MEM-4: World Model Isolation** â€” Any attempt to use World Model data for policy or execution SHALL trigger immediate Guardian intervention and system halt.

### AI Memory Prohibition Rule (Hard)

The AI Agent SHALL NOT:

- Persist embeddings, summaries, vector indexes, or compressed representations of project data
- Maintain cross-session recall
- Store prior goal context in any external system
- Use provider-side â€œmemoryâ€ or â€œconversation historyâ€ features

Any detection of persistent AI memory behavior SHALL be classified as a **SANDBOX-BREACH** event.

## âœ¨ Features

### **Goal-Based Autonomous Execution**

- Set persistent goals with explicit success criteria
- System runs continuous loops until goal satisfied or budget exhausted
- Real-time supervision with live action stream
- Capability toggles and budget meters visible during execution
- Emergency stop at any time

### **Goal Types**

While the system is fully autonomous, goals can be categorized by intent:

- **CreateProject** â€” Scaffold new project structure from templates
- **AddFeature** â€” Add new functionality with continuous refinement
- **FixBug** â€” Debug and repair defects iteratively
- **BuildPackage** â€” Compile, test, and package application
- **Custom Goals** â€” Any software engineering objective with defined success criteria

### **Goal Evaluation**

Goals are evaluated for success/failure at the end of each cycle using a combination of automated checks and AI assessment:

**Automated Checks:**
- Build success (msbuild/dotnet returns 0 exit code)
- Test execution (if tests exist, all pass)
- File existence (required output files present)
- Process completion (no hanging processes)

**AI Assessment:**
- Code quality review (linting, style compliance)
- Feature completeness (against goal description)
- Error absence (no runtime exceptions in logs)
- User criteria matching (natural language evaluation)

**Success Criteria:**
- Goal is marked SUCCESS if all automated checks pass AND AI assessment scores >80% confidence
- Goal is marked FAILURE if budget exhausted, 3 consecutive build failures, or critical errors detected
- Goal continues if partial progress detected but not complete

**Evaluation Process:**
1. Run automated checks on project state
2. AI reviews changes against original goal
3. System computes success probability (0-100%)
4. If >80%, mark SUCCESS and halt
5. If <20%, mark FAILURE and halt
6. Otherwise, continue loop with refined plan

**Budget Enforcement (Non-Visual)**

Budgets are enforced silently by the system.

The UI does NOT display:
- Token usage
- File limits
- Time meters
- Network counters
- Forecasts or projections

When a budget is exceeded, execution halts and the user is notified conversationally with a high-level reason.

### **Change Application Model**

Exacta applies changes automatically as they are produced.

There is no staging area, diff review panel, or per-file approval workflow.

The system optimizes for:
- Speed of iteration
- Continuous forward progress
- Live build and preview feedback

### **Immediate Change Application (Lovable-Style)**

**Lovable Pattern:** Single "Apply Changes" button â†’ instant application
**Exacta Enhancement:** Background recovery mechanisms (invisible to user)

**Single-Step Flow:**

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  ðŸ¤– Exacta is typing...                              â”‚
â”‚                                                      â”‚
â”‚  I'll add SQLite persistence with these changes:    â”‚
â”‚                                                      â”‚
â”‚  ðŸ“„ src/models/TodoContext.cs (NEW FILE)            â”‚
â”‚     +45 lines | Creating EF Core context            â”‚
â”‚                                                      â”‚
â”‚  ðŸ“„ src/models/Todo.cs (MODIFIED)                   â”‚
â”‚     +12 lines, -3 lines | Adding Id property        â”‚
â”‚                                                      â”‚
â”‚  ðŸ“„ Program.cs (MODIFIED)                           â”‚
â”‚     +8 lines | Registering DbContext                â”‚
â”‚                                                      â”‚
â”‚  [Apply Changes]                                    â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Key Behavior:**
- **One Button Only:** "Apply Changes" immediately executes all proposed modifications
- **No Staging UI:** Changes apply directly without intermediate review steps
- **Background Recovery:** Automatic snapshots created silently before each application
- **Seamless Flow:** User continues working while changes are applied in background

**Recovery (Hidden from UI):**
- Automatic pre-apply snapshots (not visible to user)
- Background rollback capability for critical failures
- Recovery only triggered by system-detected issues, never user-initiated

**Implementation:** Changes are applied immediately with background validation. Recovery mechanisms operate transparently without user awareness or control.

### **Background Execution Model**

- Plans execute in background workers with smart retry (up to 3 attempts)
- **Safe interruption boundaries** â€” User can pause/cancel at step boundaries only
- **Step boundary definition** â€” After checkpoint commit, before next AI call (ensures atomic state)
- **Notification policy** â€” Risk-based toasts vs. modals
- **Correlation tracking** â€” Full lineage from intent to file change

## Security Model

### **Hard Invariants**

**INV-MEM-0: System-Owned Memory Authority** â€” All persistent memory, execution state, checkpoints, and audit artifacts are owned by Core and Guardian. AI SHALL NOT create, modify, delete, version, or influence any persistent memory layer.

**INV-MEM-13: Goal Isolation** â€” Persistent State, Index views, and Outcome Summaries SHALL be goal-scoped. Data from Goal A SHALL NOT be injected into AI context for Goal B under any condition.

**INV-MEM-DIGEST-1: Core-Only Digest Authority** â€” Goal progress digests SHALL be generated only by Core from persistent state. AI SHALL NOT summarize, compress, or transform execution history. Digest injection into AI context SHALL follow the same redaction rules as OutcomeSummary.

**INV-A1: System Authority Supremacy** â€” Only Guardian and Core Runtime have execution authority. AI is untrusted decision proposer.

**INV-A2: Capability-Scoped Actions Only** â€” Every action must present valid capability token (FS_READ, FS_WRITE, BUILD_EXEC, etc.). No raw system access.

**INV-A3: System Resource Protection**

Exacta enforces internal safeguards to prevent runaway execution and system instability.

Resource management is fully automatic and not visible or configurable in the UI.

**INV-A4: Checkpoint Before Action (Internal System Function â€” Not Exposed in UI)** â€” Advanced modes create restore points before execution. Default mode uses lightweight state snapshots for system recovery.

**INV-A5: System Recovery (Internal System Function â€” Not Exposed in UI)** â€” Advanced modes provide checkpoint-backed rollback. Default mode focuses on forward progress with system recovery on critical failures.

**INV-A6: Local-Only Execution** â€” All processing occurs on the user's machine. External network communication is restricted to user-authorized AI providers and explicitly allowlisted documentation endpoints via NET_* capability tokens.

**INV-A7: No External Telemetry** â€” No usage data, error reports, or analytics transmitted externally.

**INV-A8: Human Kill Switch Always Available** â€” User can emergency stop at any time. System honors halt immediately.

**INV-GLOBAL-14: External Toolchain Orchestration Only** â€” Exacta App Studio SHALL NOT implement or embed any compiler, linker, or packaging logic. It may only orchestrate external toolchain binaries as sandboxed subprocesses.

**INV-ITC-3: No Upward Authority Flow** â€” Core components SHALL NOT grant AI agents or lower-trust components access to file system, network, shell, build, signing, packaging, or binary staging authority.

**INV-CORE-1: Immutable Core Runtime** â€” The Exacta App Studio binary, Guardian, Policy Engine, Capability Authority, Budget Enforcer, Checkpoint System, and Audit Log are immutable at runtime. No code path shall allow the AI agent to modify these components.

**INV-CORE-2: Controlled Upgrade Only** â€” System upgrades require human approval, cryptographic signature verification, and execution by Guardian updater. AI may propose upgrades but cannot apply them.

### **Unified Sandbox Boundary (Canonical)**

**INV-SANDBOX-1: Guardian-Owned Sandbox Boundary**

Exacta App Studio enforces a **single, unified sandbox boundary** that governs all interaction between the system and the host environment.

This boundary includes:

- **Filesystem access** (project root jail with MAX_PATH=260 chars, symlink rules, atomic writes, system-path denylist, no UNC paths, no device paths)
- **Process execution** (shell containment, **Windows Job Object enforcement** with CPU/memory limits, no breakaway flag, resource limits)
- **Network access** (token-gated endpoints only, Safe Mode full network kill, **execution disabled by default** during autonomous execution)
- **Memory & data flow** (Never-Send rules, redaction, provider boundary)

**Default Isolation Mechanism:** All subprocesses (builds, shell commands, packaging tools) run inside a Windows Job Object with:

- No breakaway allowed (JOB_OBJECT_LIMIT_BREAKAWAY_OK disabled)
- CPU affinity restricted to non-critical cores (cores 1+ on multi-core systems, avoiding core 0)
- Memory limit enforced (default: 2GB per subprocess)
- Process lifetime limited (default: 5 minutes per command)
- Network access disabled by default unless NET_* token explicitly granted

**Failure Rule:** If a Windows Job Object cannot be created or attached, the action MUST be DENIED and the system MUST enter Safe Mode. No subprocess may execute outside a Job Object.

**Authority Model:**

- The sandbox boundary is enforced by the Guardian, with Core acting only as a policy-constrained execution proxy
- Core and AI operate entirely inside this boundary
- No component may weaken, bypass, or reconfigure sandbox rules at runtime

**Failure Mode:**

Any detected sandbox violation MUST:

- Immediately HALT autonomous execution
- Enable Evidence Preservation Mode
- Log a `SANDBOX-BREACH` security incident
- Require Operator intervention before resumption

**Concurrency Handling:**

Exacta App Studio supports **single-goal execution only**. Multiple concurrent goals are not supported to maintain deterministic execution and auditability.

- **Subprocess Concurrency:** Within a single goal, multiple subprocesses (builds, tests) may run concurrently if explicitly allowed by capability tokens and budget limits.
- **Job Object Grouping:** All subprocesses for a goal are grouped under a single Windows Job Object for coordinated termination.
- **Resource Limits:** Concurrent subprocesses share the goal's total resource budget (CPU, memory, time).
- **Synchronization:** Core enforces sequential execution of AI decisions but allows parallel subprocess execution where safe.
- **Failure Propagation:** If any subprocess fails, the entire goal cycle is marked failed and may trigger rollback.

**Non-Goals:**

This sandbox does NOT defend against kernel-level compromise, firmware attacks, or physical access. These are covered by the Platform Trust Assumption.

### **AI Provider Trust Assumption**

External AI providers and local model runtimes are treated as **untrusted data sources**.

Exacta App Studio DOES NOT control or guarantee memory behavior of external AI providers.
Providers may retain, log, or train on submitted prompts according to their own policies.

**Non-Mitigable Risk Notice**

Exacta App Studio CANNOT technically prevent AI providers from retaining or training on submitted data.
Use of cloud AI providers SHALL be treated as a data disclosure event governed by the providerâ€™s terms.

**Invariant:**  
**INV-MEM-14: Provider Memory Boundary** â€” System guarantees apply only to local memory, state, and execution layers, not to third-party AI services.

### Supply Chain Trust Boundary

Exacta App Studio does NOT trust:

- Package registries (npm, PyPI, NuGet)
- CLI binary distributors
- Model hosting endpoints

Enforcement:

- All installers and binaries are treated as untrusted inputs
- Hash verification is REQUIRED for all CLI tools, whether manually installed or auto-detected in PATH
- Auto-detected CLIs are verified against known-good hashes from the Exacta trusted CLI registry
- Package installs require explicit Operator approval
- Dependency execution is always sandboxed under Job Object constraints

All AI outputs are considered advisory only and MUST pass through Policy Engine validation, capability enforcement, and sandbox boundaries before any action is taken.

**Security Model:**

- AI provider compromise does not compromise sandbox integrity
- Malicious AI outputs are caught by diff validation, path jail, and capability checks
- No AI output can bypass Guardian or Core enforcement
- Provider API keys are user-owned; vendor assumes no liability for provider behavior

### **Filesystem Safety**

- **Project root jail** â€” All file operations confined to detected project root
- **Path traversal prevention** â€” Absolute paths and `..` outside project rejected
- **Symlinks not followed** â€” Prevents jail escape
- **Binary edits forbidden** â€” Diffs cannot modify binary files
- **Atomic writes** â€” Temp file + atomic move with automatic backup
- **Capability tokens required** â€” FS_READ for reads, FS_WRITE for writes

### **System Paths Protection**

The following paths trigger SYSTEM-LEVEL classification:

- `C:\Program Files`
- `C:\`
- `.exacta\upgrades\`
- `.exacta\policy\`
- `.exacta\certified_state.json`

### **Capability Token System**

**Available Tokens (per goal, per session):**

**Token Lifecycle:**

Capability tokens follow a strict lifecycle:

- **Issuance**: Guardian issues tokens per goal, signed with Guardian_Secret.
- **Validation**: Core validates tokens before each action using HMAC.
- **Expiration**: Tokens expire at goal completion, IPC session end, or 24-hour max.
- **Renewal Exception**: Tokens MAY be renewed automatically for active goals with Operator approval if 24-hour limit is approached.
- **Revocation**: Guardian can revoke tokens mid-goal (e.g., on abuse detection).

**Capability Token Validation:**

Before executing any action, the system validates that the appropriate capability token has been issued by the Guardian.

### **CLI Provider Capability Requirements**

| CLI Provider | Required Tokens | Risk Level | Justification |
| --- | --- | --- | --- |
| Goose CLI | SHELL_EXEC, FS_WRITE, NET_AI_ONLY* | High | Autonomous coding, may call cloud APIs |
| Crush CLI | SHELL_EXEC, FS_WRITE, NET_AI_ONLY* | High | Multi-agent mode, cloud API support |
| Aider | SHELL_EXEC, FS_WRITE, NET_AI_ONLY* | High | Git commands, API calls |
| Codex CLI | SHELL_EXEC, FS_WRITE, NET_AI_ONLY | High | OpenAI API calls, file modifications |
| Droid Factory | SHELL_EXEC, FS_WRITE, NET_AI_ONLY | High | Tool calling, API communication |
| GPT Engineer | SHELL_EXEC, FS_WRITE, NET_AI_ONLY | Very High | Package installation, API calls |
| Qwen Code (Ollama) | SHELL_EXEC, FS_WRITE | Medium | Local inference only, no network |
| Gemini CLI | SHELL_EXEC, FS_WRITE, NET_AI_ONLY | High | Google API calls |
| Blackbox CLI | SHELL_EXEC, FS_WRITE | Medium | Local execution mode, no cloud |

* NET_AI_ONLY required only when using cloud-based models; not needed for local models (Ollama, Docker).

**Security Notes:**

- All CLI executions run inside Windows Job Object with no breakaway allowed
- Working directory forced to `scope_root`
- 5-minute timeout enforced per command
- Network access gated by capability tokens
- CLI output redacted for secrets (SBX-006 test)
- **Revoked immediately** if:
    - User toggles capability off in UI
    - Agent Supervisor detects abuse pattern
    - Policy violation detected
    - Goal is suspended or halted
- **Expiration** â€” Tokens expire at the earliest of:
    - Goal completion
    - IPC session termination
    - 24-hour maximum lifetime
- **No token caching** â€” Core must request fresh validation from Guardian for every action

**Capability Grant Provenance:**

All capability grants MUST be logged with:

- grant_id (UUID)
- operator_id (authenticated user)
- timestamp (ISO 8601)
- UI origin (panel/button that triggered grant)
- goal_id (associated goal)
- capability_type (FS_READ, FS_WRITE, BUILD_EXEC, etc.)
- expiration (when token expires)

This audit trail enables forensic reconstruction of all authority delegations.

**Token Format:**

Capability tokens are structured as:

```tsx
Token = {
  token_id: UUID,
  goal_id: UUID,
  capability_type: enum,
  issued_at: timestamp,
  expires_at: timestamp,
  renewed_count: number,        // Number of times token has been renewed
  last_renewed_at: timestamp,   // Last renewal timestamp (null if never renewed)
  scope_root_hash: SHA256,
  nonce: 128-bit random,
  signature: HMAC-SHA256(Guardian_Secret, all_fields)
}
```

Tokens are non-transferable and valid only within the IPC session in which they were issued.

**Token Revocation Flow:**

```jsx
User clicks "Disable SHELL_EXEC" in UI
         â†“
Guardian revokes SHELL_EXEC token for active goal
         â†“
Core receives CAPABILITY_REVOKED event via IPC
         â†“
In-flight actions using SHELL_EXEC are canceled at next safe boundary
         â†“
Subsequent SHELL_EXEC attempts return DENY
```

| Token | Purpose | Risk Level |
| --- | --- | --- |
| FS_READ | Read files within project root | Low |
| FS_WRITE | Write files within project root | Medium |
| BUILD_EXEC | Execute build commands | Medium |
| PACKAGE_EXEC | Execute packaging tools | High |
| SIGN_EXEC | Execute code-signing tools on produced artifacts | High |
| NET_AI_ONLY | Network access to AI APIs only | Medium |
| NET_DOCS_ONLY | Network access to documentation sources | Low |
| SHELL_EXEC | Execute arbitrary shell commands | Very High |
| PROCESS_KILL | Kill subprocesses | High |

Tokens are issued by Guardian, validated by Capability Authority, and presented per action.

### **SHELL_EXEC Security Model**

**This is your primary blast radius risk.**

**Command Classification:**

Every shell command is classified before execution:

| Class | Examples | Default Policy |
| --- | --- | --- |
| READ | `dir`, `ls`, `dotnet --info` | Allowed |
| BUILD | `dotnet build`, `msbuild` | Allowed |
| FS_MUTATE | `del`, `rm`, `move`, `copy` | Restricted |
| SYSTEM | `reg`, `sc`, `taskkill` | Restricted (CRITICAL risk class only) |
| NETWORK | `curl`, `wget`, `ping` | Blocked (unless NET_* token present) |

**Enforcement Rules:**

- Commands are **parsed before execution**
- All paths must be inside `scope_root` (jail enforced)
- Network tools blocked unless `NET_AI_ONLY` or `NET_DOCS_ONLY` token present
- SYSTEM class requires goal `risk_class: CRITICAL`
- Unknown commands default to DENY

**Shell Sandbox:**

- Working directory **forced to scope_root** (cannot cd outside)
- `PATH` environment variable **restricted** to known safe binaries (e.g., dotnet, msbuild, cl, link, git, npm, pip, node)
- Environment variables **scrubbed** (no inherited secrets)
- **No inherited credentials** (no Windows auth tokens passed)
- Subprocess timeout enforced (default: 5 minutes per command)

### **Blast Radius Control**

Every autonomous cycle enforces:

- Max files per action
- Max lines of code per action
- Max commands per action
- Max recursion depth
- Max subprocess lifetime

### **Index-File Consistency**

**Problem:** The Project Index (in-memory code structure) can drift from the actual file system if external tools or the user modify files outside Exacta's control.

**Detection Mechanism:**

- **Pre-Cycle Fingerprint Check** â€” Before each cycle, Guardian computes SHA-256 hashes of all files in scope_root and compares against Project Index fingerprints. To mitigate TOCTOU vulnerabilities, hashes are recomputed immediately before action execution if drift is detected.
- **Drift Classification:**
    - **Low drift** (1-5 files changed, <500 lines): System warns, updates index, continues
    - **Medium drift** (6-20 files changed, 500-2000 lines): System warns, updates index, requires user confirmation to continue
    - **High drift** (>20 files or >2000 lines): System HALTS, requires full re-indexing and user review before resuming
- **Reconciliation** â€” Detected drift triggers automatic index rebuild from file system ground truth

**Invariant:**

**INV-INDEX-1: Index Follows File System** â€” The Project Index is a cache, not authority. File system is ground truth. Any detected drift triggers reconciliation before execution continues.

### Index Trust Boundary

The Project Index is treated as **untrusted cache** until validated.

Before each cycle:
- Guardian MUST verify index fingerprints against filesystem hashes
- If mismatch exists, index is invalidated and rebuilt from disk
- AI context injection is BLOCKED until rebuild completes

**Invariant:**  
**INV-MEM-11: No Unverified Index Exposure** â€” AI SHALL NOT receive Project Index data that has not passed Guardian verification in the current cycle.

### Index Root Attestation

Each committed Project Index snapshot MUST include:

- index_hash = SHA256(all indexed file contents + dependency graph)
- guardian_signature = HMAC(Guardian_Secret, index_hash)

**Invariant:**  
**INV-MEM-17: Signed Index Root** â€” AI context injection and execution SHALL NOT proceed unless the current Project Index snapshot is Guardian-signed.

### **Index Rebuild Failure Mode**

If index rebuild fails due to corruption or inconsistency:

1. Guardian SHALL quarantine the corrupted index
2. System SHALL enter read-only mode for the affected goal (other goals may continue if index is intact)
3. User SHALL be prompted to restore from backup or re-initialize the specific goal
4. AI operations SHALL be suspended only for the affected goal until index integrity is restored

**Invariant:**

**INV-MEM-5: Index Integrity First** â€” System SHALL NOT proceed with any operations if Project Index cannot be verified as consistent and current.

## ðŸ”„ Autonomous Execution Loop

The system follows this continuous cycle:

```
GOAL (User-defined with success criteria)
  â†“
PERCEIVE (Verified Project Index + Goal State Summary + Redacted Outcome Summaries)
  â†“
DECIDE (Policy Engine + Budget Check â†’ AI proposes Decision)
  â†“
ACT (Capability-Scoped Execution with token validation)
  â†“
OBSERVE (Result + Drift + Side Effects)
  â†“
CHECKPOINT (Advanced: Snapshot + Budget Update | Default: Lightweight State)
  â†“
LOOP or HALT
```

**System halts when:**

- Goal is satisfied (success criteria met)
- Budget is exhausted (any cap exceeded)
- Policy violation occurs (denied action attempted)
- User presses emergency stop
- System detects instability (runaway pattern)

**Decision Model:**

AI outputs:

```tsx
Decision {
  intent: string
  proposed_actions: Action[]
  risk_level: 'low' | 'medium' | 'high'
  expected_outcome: string
}
```

System translates this into bounded, validated execution steps with capability token requirements.

## ðŸ¤– AI Provider Management

Exacta App Studio automatically manages AI provider connections and model selection. Provider setup and model discovery are handled internally with no user-visible governance or catalog features.

---

---

## ðŸŽ¨ **User Experience Enhancements**

### **Streaming AI Responses**

**Real-time Progress Indication:**

When AI is generating a response:
```
ðŸ¤– AI is thinking...

Analyzing dependencies... âœ“
Planning changes... âœ“  
Generating diffs... [â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–‘â–‘] 80%
  â€¢ src/App.tsx (done)
  â€¢ src/api/users.ts (done)
  â€¢ src/utils/helpers.ts (in progress...)
```

**Rationale:** Improve perceived performance and give Operator visibility into AI progress without violating any security boundaries.

### **AI Progress Indicators (Lovable-Inspired)**

When the AI starts processing a user request, Exacta displays layered progress information:

**Level 1: High-Level Status (Always Visible)**

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  ðŸ¤– Exacta is building your application...          â”‚
â”‚     â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘  68% complete      â”‚
â”‚                                                      â”‚
â”‚     Current Step: Adding SQLite persistence         â”‚
â”‚     Estimated time: 45 seconds remaining            â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Level 3: Technical Details (Optional)**

For debugging, users can click "View Technical Log":

```
[12:34:56] Guardian: Validating capability tokens... OK
[12:34:57] Core: Computing dependency closure... OK  
[12:34:58] AI Provider: Generating diff for Todo.cs... OK
[12:34:59] Policy Engine: Evaluating diffs... ALLOW
[12:35:00] Core: Applying changes atomically... OK
```

**Timing Expectations:**

Based on Lovable's performance, Exacta targets:
- Simple UI changes: 3-5 seconds
- Adding features: 5-15 seconds  
- Database schema changes: 10-20 seconds
- Full project scaffolding: 30-60 seconds

**Key Differences from Lovable:**
- âœ… Exacta shows **file-level progress** (Lovable doesn't)
- âœ… Exacta shows **policy validation steps** (Lovable auto-applies)
- âœ… Exacta shows **budget consumption** in real-time
- âœ… Exacta requires **explicit commit** (Lovable auto-applies)

---

### **Optimistic UI Updates**

**Before Checkpoint Commit:**

```
Applying changes...
âœ“ src/App.tsx (staged)
âœ“ src/api/users.ts (staged)
â³ Validating policy... 
â³ Computing checkpoint hash...
```

**After Commit:**
```
âœ… Checkpoint created: cp_a3f9c2
   3 files modified, 68 lines changed
```

**Rationale:** Keep Operator informed during atomic commit without allowing partial state visibility.

---

## ðŸ’¬ **Chat Interface & Interaction Patterns**

### **Chat Panel Design (Lovable-Inspired)**

**Layout:**

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Conversation with Exacta                   â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                             â”‚
â”‚  ðŸ‘¤ You (12:34 PM)                          â”‚
â”‚  Add SQLite persistence for todos           â”‚
â”‚                                             â”‚
â”‚  ðŸ¤– Exacta (12:34 PM)                       â”‚
â”‚  I'll add SQLite persistence. This will:    â”‚
â”‚  â€¢ Create TodoContext.cs (EF Core)          â”‚
â”‚  â€¢ Add Todo.Id property                     â”‚
â”‚  â€¢ Register DbContext in Program.cs         â”‚
â”‚                                             â”‚
â”‚                                             â”‚
â”‚  ðŸ‘¤ You (12:35 PM)                          â”‚
â”‚  Also add due dates to tasks               â”‚
â”‚                                             â”‚
â”‚  ðŸ¤– Exacta is typing...                     â”‚
â”‚                                             â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  Type your instruction...          [Send]  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### **Message Types**

**1. User Messages**
- Natural language instructions
- Can include images (paste screenshots)
- Can reference files ("modify App.tsx")
- Can provide error logs

**2. AI Responses (Read-Only)**
- High-level explanation
- Proposed changes summary
- Action buttons (Preview, Apply, Reject)

**3. System Messages**
- Build completed: âœ… Build successful (3 warnings)
- Policy denied: â›” Action denied: SHELL_EXEC required
- Checkpoint created: ðŸ’¾ Checkpoint cp_a3f9c2 saved

**4. Streaming Indicators**
- "Exacta is typing..." (when AI processing)
- "Guardian is validating..." (during policy check)
- "Building..." (during compilation)

### **Chat Features**

**Context Awareness:**
- AI can reference previous messages
- Every message includes current budget state
- File references auto-link to file tree (Internal System Function â€” Not Exposed in UI)

**Quick Actions:**
```
Recent commands:
[Add Feature] [Fix Bug] [Build] [Test] [Deploy]
```

**Conversation Export:**
```
[Export Chat] â†’ Saves as .md with:
- All messages
- Budget usage per request  
- Checkpoints created (Internal System Function â€” Not Exposed in UI)
- Files modified
```

**Keyboard Shortcuts:**
- `Enter` â†’ Send message
- `Shift+Enter` â†’ New line
- `Ctrl+K` â†’ Clear chat
- `Ctrl+R` â†’ Rollback last change (Internal System Function â€” Not Exposed in UI)

---

## ðŸš€ Getting Started

### **System Requirements**

- **Windows 10 Build 1809 or later, or Windows 11 (64-bit)** â€” Minimum supported OS version. Build 1809 required for Job Object enforcement and process isolation features.
- .NET Runtime (version 8.0 or later)
- 4GB RAM minimum, 8GB recommended
- 500MB disk space for application
- **Offline-capable** â€” Can operate without internet connection (with warnings and cached documentation fallback)

### **Installation**

1. Download signed installer from official release channel
2. Run installer with administrator privileges (Guardian setup requires elevation for Job Object creation and policy registration)
3. **Privilege Mitigation:** Guardian drops administrator privileges immediately after setup. Runtime operation requires only standard user privileges. Administrator access is needed only for initial installation and future upgrades.
4. First launch: Guardian performs initial certification and policy setup
5. Open or create a project directory

### **Scope Root Detection**

When a project directory is selected:

1. **User Selection**: User explicitly selects the project root directory via file picker
2. **Validation**: System scans for project markers (.sln, .csproj, package.json, etc.)
3. **Multi-Project Solutions**: For monorepos or multi-project setups, system identifies all valid project roots and allows user to select specific scope or entire solution
4. **Dependency Analysis**: When multiple projects detected, system analyzes inter-project dependencies to suggest optimal scope boundaries
5. **Ambiguity Resolution**: If multiple potential roots detected (e.g., monorepo with multiple .sln files), user must select the specific scope
6. **Immutability**: Once set for a goal, scope_root cannot be changed during execution
7. **Jail Enforcement**: All file operations are restricted to paths within scope_root

### **First Goal**

```jsx
> Goal: "Build a WPF todo application with SQLite persistence"
> Budget: 500k tokens, 30 minutes
> Capabilities: FS_READ, FS_WRITE, BUILD_EXEC, NET_AI_ONLY
```

Exacta will:

1. Create persistent goal with success criteria
2. Enter continuous loop: PERCEIVE â†’ DECIDE â†’ ACT â†’ OBSERVE â†’ CHECKPOINT
3. Show live action stream in supervisor UI
4. Display real-time budget meters and capability status
5. Create checkpoint after each cycle for rollback
6. Run until goal satisfied, budget exhausted, or user stops
7. Log causal chain: goal_id â†’ cycle_id â†’ decision_id â†’ actions â†’ results
8. **Persist full plan + state** â€” System survives reboots and can resume execution from last checkpoint

## Trust Model

### **Operator Definition**

The Operator is the authenticated human user with local administrative privileges on the host system.

Only the Operator may approve upgrades, revoke capabilities, authorize evidence deletion, enable Legal Hold, or override Safe Mode.

**Operator Authentication Model:**

The Operator identity is bound to a Windows user account authenticated via the OS security subsystem (LSA). Guardian verifies Operator authority by validating:

- Active Windows session SID
- Membership in the local Administrators group
- Interactive logon session presence

All Operator actions are recorded with:

- operator_sid (Windows Security Identifier)
- session_id (Windows logon session)
- timestamp (ISO 8601)
- action_type (approval, revocation, halt, etc.)

**Operator Authority Limits:**

The Operator CANNOT override budget caps, capability enforcement, or sandbox rules at runtime. Operator authority is limited to:

- âœ… Halt execution
- âœ… Approve upgrades
- âœ… Enable/disable Safe Mode (system-wide safety profile)
- âœ… Grant or revoke capability tokens for goals
- âŒ **Cannot bypass budgets** (hard enforced by Core)
- âŒ **Cannot disable sandbox** (Guardian-enforced)
- âŒ **Cannot modify audit logs** (Guardian-owned, immutable)
- âŒ **Cannot alter policy engine rules at runtime** (requires upgrade)

**Rationale:** Even Operator privilege cannot weaken core safety guarantees. This prevents accidental or coerced bypass of security boundaries.

### **AI Agent Trust Boundary**

**AI is:** Untrusted decision proposer, NOT authority

**System is:** Sole execution authority with capability enforcement

### **What Exacta App Studio CAN do:**

- âœ… Read/write project files within scope_root
- âœ… Orchestrate execution of external build and packaging tools as sandboxed subprocesses
- âœ… Execute shell commands (within classification policy)
- âœ… Make network calls to AI APIs and documentation sources
- âœ… Create checkpoints and rollback to any cycle
- âœ… Run autonomously within goal and budget constraints
- âœ… **Propose system upgrades** (via Controlled Self-Upgrade Pipeline)

### **What Exacta App Studio CANNOT do:**

- âŒ **Patch its own executables** (core binary is immutable)
- âŒ **Change its safety rules** (policy engine is immutable)
- âŒ **Modify capability enforcement** (Guardian is immutable)
- âŒ **Alter its logging or audit system** (audit log is trustworthy)
- âŒ Grant itself additional permissions or capability tokens
- âŒ Modify Guardian or system paths
- âŒ Bypass policy engine decisions
- âŒ **Apply unsigned upgrades** (requires human + signed installer)
- âŒ Embed or implement compiler/linker/packaging/signing toolchains (or bypass their trust boundaries)
- âŒ Escape project root jail
- âŒ Exceed budget caps (hard enforced)
- âŒ Act without presenting valid capability token
- âŒ Continue after emergency stop

### **Why Immutable Core Matters**

**Trust Anchor:** The binary itself is the trust anchor. Your invariants are guarantees, not documentation.

**Guarantees:**

- âœ… Logs are trustworthy (agent cannot rewrite audit trail)
- âœ… Budgets are enforced (agent cannot disable caps)
- âœ… Capability limits are real (agent cannot remove tokens)
- âœ… Kill switch works (agent cannot patch it out)
- âœ… Rollback always possible (checkpoint system is protected)
- âœ… System is certifiable (formal safety guarantees)

**Controlled Self-Upgrade Pipeline:**

The agent can propose upgrades but **cannot apply them:**

```jsx
Agent detects bug or improvement opportunity
         â†“
Generates patch / update proposal (staged in .exacta/upgrades/pending/)
         â†“
User reviews diffs, risk assessment, privilege impact
         â†“
User explicitly approves upgrade
         â†“
Guardian verifies signature + hashes
         â†“
Guardian applies update atomically (agent halted during upgrade)
         â†“
Guardian restarts Core with new binary
```

**Agent CAN:** Detect issues, analyze system behavior, generate patches, propose improvements, stage upgrade artifacts

**Agent CANNOT:** Apply upgrades, execute installers, modify core binary at runtime, bypass Guardian signature verification, self-authorize privilege escalation

This preserves:

- Innovation (agent can identify improvements)
- Safety (Guardian enforces human approval + cryptographic verification)
- Auditability (all changes logged and signed by Guardian)
- Immutability (core binary never modified by agent at runtime)

### **Guardian Integrity Attestation**

Guardian MUST verify its own integrity:

- On every system startup
- Before enabling shell execution
- Before installing any upgrade
- At least once every 24 hours during continuous operation

If attestation fails:

- Core MUST NOT start
- System enters Safe Mode
- Evidence Preservation Mode is enabled
- Operator confirmation is required

Verification includes:

- Binary hash check
- Trust root match
- Signature chain validation
- IPC ACL verification
- Log anchor accessibility
- **Trusted Root** â€” Guardian verifies signatures against a vendor-controlled public root certificate embedded at build time and protected by OS code integrity mechanisms (Windows Authenticode)

**Root Rotation Policy:** The trusted root certificate may only be updated via a Guardian-controlled, dual-signed upgrade package containing both the current valid root and the new root. Root changes require explicit Operator approval and are recorded as a CRITICAL security event in the audit log.

**Root Lifetime Guidance:** Implementations SHOULD define a maximum trusted root lifetime (e.g., 2 years) and surface warnings prior to expiry.

### **User as Governor**

In autonomous mode, you set goals and boundaries. The system executes automatically with background safeguards for critical operations.

### **Simplified Execution Flow**

The system operates with **auto-apply behavior (LOVABLE default)** for routine development tasks. User approval is required only for:

- **Goal creation** (explicit user intent)
- **High-risk operations** (SYSTEM shell commands, policy overrides, upgrades)

All other actions execute automatically within configured boundaries.

### **Supervisor UI (Internal System Function â€” Not Exposed in UI)**

The following UI panels are **required for advanced operation**:

| Panel | Purpose | Update Frequency |
| --- | --- | --- |

### **Enhanced Workspace Layout (Lovable-Inspired)**

**Three-Column Layout:**

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Exacta App Studio - [Project: WPF Todo App]         [âš™ï¸] [âŒ]  â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚          â”‚                        â”‚                               â”‚
â”‚  PANEL 1 â”‚      PANEL 2           â”‚         PANEL 3               â”‚
â”‚  (Left)  â”‚      (Center)          â”‚         (Right)               â”‚
â”‚          â”‚                        â”‚                               â”‚
â”‚  Chat &  â”‚  Live App Preview      â”‚  Status Summary              â”‚
â”‚  Active  â”‚  (Sandbox)             â”‚                               â”‚
â”‚  Files   â”‚                        â”‚                               â”‚
â”‚          â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚                               â”‚
â”‚  ðŸ’¬ Chat â”‚  â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚  â”‚                               â”‚
â”‚  â”€â”€â”€â”€â”€â”€â”€â”€â”‚  â”‚  â”‚ Todo App    â”‚ â”‚  â”‚                               â”‚
â”‚  > Add   â”‚  â”‚  â”‚  [ ] Task 1 â”‚ â”‚  â”‚                               â”‚
â”‚  SQLite  â”‚  â”‚  â”‚  [ ] Task 2 â”‚ â”‚  â”‚                               â”‚
â”‚  persist.â”‚  â”‚  â”‚  [Add Task] â”‚ â”‚  â”‚                               â”‚
â”‚          â”‚  â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚  â”‚                               â”‚
â”‚          â”‚  â”‚                  â”‚  â”‚                               â”‚
â”‚  ðŸ“ Active Filesâ”‚  â”‚  [Refresh] [âš™ï¸]  â”‚  â”‚                               â”‚
â”‚  â”€â”€â”€â”€â”€â”€â”€â”€â”‚  â”‚                  â”‚  â”‚                               â”‚
â”‚  âœ“ Todo.cs (modified)â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚                               â”‚
â”‚  âœ“ TodoContext.cs (new)â”‚                        â”‚                               â”‚
â”‚  â³ Program.cs (in progress)â”‚  Status: âœ… Build OK   â”‚                               â”‚
â”‚          â”‚  Tests: 3/3 passing    â”‚                               â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Panel Descriptions:**

**Panel 1 (Left - 20% width):**
- **Chat Interface** (top): Natural language input for AI

**Panel 2 (Center - 50% width):**
- **Live Preview**: Interactive sandbox showing app
- **Browser-like controls**: Refresh, back/forward
- **Status bar**: Build status, test results, warnings

**Panel 3 (Right - 30% width):**
- **Status Summary**: High-level execution status

**Responsive Behavior:**
- On smaller screens (<1600px), Panel 3 collapses into a drawer
- On very small screens (<1024px), Panel 1 becomes a slide-out menu


### Internal Audit & Stability Systems (Hidden)

Exacta maintains internal logs and snapshots for:
- Crash recovery
- System integrity
- Debugging

These systems are not part of the user experience and are not exposed, configurable, or documented as product features.





## Failure Taxonomy

The following are **FATAL** errors that trigger automatic HALT + ROLLBACK:

| Error Code | Description | Recovery |
| --- | --- | --- |
| AGENT-RUNAWAY | Same file modified 3x in 5 loops or recursive pattern detected | Rollback to last stable checkpoint |
| BUDGET-EXHAUSTED | Any budget cap exceeded (files, lines, shells, builds, tokens, time, network) | Review budget allocation, adjust caps |
| POLICY-VIOLATION | Action denied by Autonomy Policy Engine | Review policy rules, adjust goal scope |
| CAPABILITY-ESCALATION | Attempted action without valid capability token | Revoke escalated capabilities |
| SCOPE-BREACH | Action attempted outside scope_root or on system paths | Rollback, review goal scope definition |
| COMMAND-CLASS-VIOLATION | Shell command denied by classification rules (e.g., SYSTEM without CRITICAL) | Review command, adjust risk class or use safer alternative |
| RECURSIVE-LOOP | Detected cyclic decision pattern with no progress | Manual intervention required |
| GOAL-DRIFT | System actions diverging from goal success criteria | Clarify goal, tighten success criteria |
| REPLAY-MISMATCH | Logged execution cannot be deterministically reproduced | Forensic analysis required, possible state corruption |

### **Additional System Failures**

- File system errors (FS-xxx) â€” Path violations (FS-001), permission denied (FS-002), write failures (FS-003)
- Build failures (BLD-xxx) â€” Compilation errors (BLD-001), toolchain failures (BLD-002), dependency issues (BLD-003)
- IPC protocol errors (IPC-xxx) â€” Communication failures (IPC-001), authentication failures (IPC-002), sequence errors (IPC-003)
- Validation errors (VAL-xxx) â€” Schema violations (VAL-001), constraint failures (VAL-002)
- Configuration errors (CFG-xxx) â€” Invalid settings (CFG-001), missing dependencies (CFG-002)

## Goal Model (Implicit)

Users interact with Exacta only through natural-language intent.

Goals are not exposed as structured objects, timelines, or UI elements.

The system maintains internal representations for execution only. There is no user-visible goal history, versioning, or replay surface.

## Non-Goals (Explicit Exclusions)

Exacta App Studio is **intentionally not designed** for the following use cases:

- âŒ **Mobile applications** â€” No iOS, Android, or mobile development support
- âŒ **Web applications** â€” No browser-based apps, SPAs, or web frameworks
- âŒ **Cloud deployment** â€” No Azure, AWS, or cloud infrastructure management
- âŒ **Team collaboration** â€” Single-user tool; no multi-user workspaces or real-time collaboration
- âŒ **Plugin marketplace** â€” No third-party plugin ecosystem or extensions

These are deliberate scope constraints to maintain focus on local-first, deterministic Windows desktop application development.

## Offline Capabilities

**Network Tolerance:**

- System can operate **fully offline** after initial setup
- AI API calls require network (user's own API keys)
- Documentation lookups fall back to **cached docs** when network unavailable
- User can proceed with **warnings** if offline (e.g., "Latest dependency versions unavailable, using cached metadata")

**What works offline:**

- All builds (local toolchains)
- All file operations
- All checkpoints and rollbacks
- Complete audit trail

**What requires network:**

- AI provider API calls (OpenAI, OpenRouter, etc.)
- Fresh documentation lookups (falls back to cache)
- Package manager operations (NuGet, npm) for new dependencies

**Network Disabled by Default During Execution:**

During autonomous execution (goal-driven loops), network access is **disabled by default** for all spawned subprocesses unless:

- A NET_AI_ONLY or NET_DOCS_ONLY capability token is explicitly granted for the goal
- The command is classified as requiring network access (e.g., package manager operations)
- User has explicitly enabled network access via capability toggle in Supervisor UI

**Offline Enforcement Rule:**

When offline mode is active, all NET_* capability tokens are treated as DENY regardless of goal configuration or policy profile.

**Network Policy Hierarchy:**

1. **Offline mode** â†’ All network DENY (highest priority)
2. **No NET_* token** â†’ Network disabled for subprocesses (default)
3. **NET_AI_ONLY token** â†’ Only AI provider endpoints allowed
4. **NET_DOCS_ONLY token** â†’ Only documentation sources allowed
5. **Explicit user override** â†’ Network enabled per user command in UI

**Documentation Allowlist Governance:**

The documentation endpoint allowlist is stored in Guardian policy storage and may only be modified via signed system upgrade or explicit Operator approval. All changes are logged as POLICY-NETWORK events with old and new values recorded.

## ðŸ’¾ Persistence & Resume

### **Failure Recovery Guarantees (Explicit)**

Exacta App Studio is **fail-closed**. If execution is halted (budget exhaustion, policy violation, crash, or manual stop), **all in-flight subprocesses are terminated as a group** using the Windows Job Object boundary, including any child processes spawned by build tools or CLIs. Any step that does not reach a recorded â€œsafe boundaryâ€ is treated as **failed**, and Exacta will not continue autonomously. For power loss or OS crash mid-cycle, Exacta guarantees that on next launch it will either (a) resume from the **last fully committed checkpoint**, or (b) require Operator review if recovery cannot be proven. Partially applied file operations are prevented by atomic write/replace semantics, so the project is restored to a known checkpointed state rather than an in-between state.

### Cold Start Memory Rule

On fresh launch or crash recovery:

- AI SHALL receive NO prior context
- Only Core-generated Goal State Summary and Verified Index Snapshot may be injected
- Execution resumes strictly from last COMMITTED checkpoint

**INV-MEM-CS1:** AI SHALL NOT be used to reconstruct system state after restart.

### **Versioning & Backward Compatibility (Audit Guarantees)**

- **Checkpoint format is versioned.** Each checkpoint includes a schema version and the Exacta build identifier that produced it.
- **Backwards readability is guaranteed within a compatibility window.** Newer versions must be able to *read and display* older checkpoints and audit logs, or they must fail closed and clearly mark the checkpoint as â€œrequires older Exacta version.â€
- **Replay across versions:** deterministic replay is **scoped to the same Exacta version (and recorded toolchain/environment)**. Cross-version replay is **not guaranteed** and is treated as a separate, explicitly labeled â€œbest-effort replayâ€ mode, never used for compliance-grade audit claims.

**State Persistence:**

- **Full goal state** â€” Goals, budgets, capabilities, success criteria
- **Execution state** â€” Current cycle, step history, decision log
- **Checkpoint snapshots** â€” File states, index snapshots, budget counters
- **Audit trail** â€” Complete causal chain from goal inception to current state

**Resume After Reboot:**

- System can **resume execution** from last checkpoint after crash or reboot
- User can choose to resume or abandon interrupted goals
- All checkpoints remain available for rollback even after restart

**Crash Recovery:**

- Last known good state is always preserved
- Incomplete cycles are rolled back automatically
- User can inspect crash logs and decide whether to retry or rollback

## ðŸ§ª Testing Philosophy

**Automatic Test Generation:**

- âœ… **Generate tests automatically** â€” When no tests exist, agent generates minimal smoke-test set
- âœ… **Run tests automatically after edits** â€” Tests and builds execute automatically after code modifications
- âŒ **Testing is NOT user-managed only** â€” System proactively manages test lifecycle

**Test Management:**

- If no tests exist â†’ Generate minimal smoke-test set (basic functionality coverage)
- If tests exist â†’ Run them after every code change
- Modify tests only when required by refactors or API changes
- Test failures trigger rollback to last passing checkpoint

### **Sandbox Escape Test Suite (Mandatory)**

The system MUST maintain an automated test group validating sandbox enforcement:

| Test ID | Attempt | Expected Result |
| --- | --- | --- |
| SBX-001 | Shell `cd ..` escape attempt | DENY + SANDBOX-BREACH |
| SBX-002 | Symlink to system path | DENY |
| SBX-003 | Network call without NET token | DENY |
| SBX-004 | Diff targeting `.exacta/` | DENY |
| SBX-005 | Job Object breakaway attempt | HALT |
| SBX-006 | Credential in shell output | REDACT + HALT |
| SBX-007 | Package manager outside allowlist | DENY |

**Package Manager Allowlist:**

### **Package Manager Allowlist**

**Purpose:** Restricts package installation to trusted, audited package managers to prevent supply chain attacks and untrusted code execution.

**Default Allowlist:**
- **NuGet:** `nuget.exe`, `dotnet restore`, `dotnet add package` (C#/.NET packages from nuget.org)
- **npm:** `npm.cmd`, `npm.exe`, `npm install`, `npm update` (Node.js packages from npm registry)
- **pip:** `pip.exe`, `pip install`, `pip wheel` (Python packages from PyPI)
- **Chocolatey:** `choco.exe`, `choco install` (Windows system packages, requires PROCESS_KILL capability)

**Security Controls:**
- All package manager commands require PACKAGE_EXEC capability token
- Network access restricted to official registries only (no custom registries without explicit approval)
- Package installation requires user confirmation for non-development dependencies
- Automatic dependency resolution limited to direct dependencies (no deep transitive installs)

**User Additions:** Via Settings â†’ Security â†’ Package Managers (logged as POLICY event with audit trail)

**Rationale:** Package managers are high-risk because they download and execute untrusted code. The allowlist ensures only well-audited, officially supported package managers can be used, with additional controls on network access and user approval.

| SBX-CLI-001 | Goose CLI path traversal via `--output ../../system` | DENY + SANDBOX-BREACH |
| SBX-CLI-002 | Aider git commit to remote without NET_AI_ONLY | DENY |
| SBX-CLI-003 | GPT Engineer `npm install` without user approval | DENY |
| SBX-CLI-004 | Crush CLI Job Object breakaway via subprocess spawn | HALT + INCIDENT |
| SBX-CLI-005 | Codex CLI credential in stdout (API key leak) | REDACT + HALT |
| SBX-CLI-006 | Droid Factory write to `.exacta/Guardian/` | DENY + INCIDENT |
| SBX-CLI-007 | Blackbox CLI exceeding 5-minute timeout | KILL + HALT |

Failure of any SBX test blocks release.

### **Release Gating Rule**

A release build MUST NOT be signed or distributed unless:

- All SBX tests PASS
- Guardian attestation tests PASS
- IPC authentication tests PASS
- Evidence retention tests PASS
- Upgrade signature verification tests PASS

## ðŸ“Š Telemetry & Diagnostics

**Local Telemetry Definition:**

Exacta App Studio collects operational metrics locally for debugging and user visibility only.

No metrics are transmitted off-device under any condition.

**Local-Only Diagnostics:**

- âœ… All diagnostics stored locally on user's machine
- âœ… Crash dumps, error logs, performance metrics remain on-device
- âœ… **All health metrics are local-only and never transmitted** (latency, error rate, call counts, and uptime are computed on-device)
- âŒ **No outbound telemetry** â€” Zero data transmitted to external servers
- âŒ No usage analytics, no error reporting, no phone-home

**What is logged locally:**

- Execution traces (goal â†’ cycle â†’ action â†’ result)
- AI API call metadata (tokens used, latency, errors)
- Build output and test results
- System performance metrics (CPU, memory, disk I/O)
- Crash dumps and stack traces

**User controls:**

- View all logs in UI
- Export logs for manual sharing (if user chooses)
- Clear logs manually (privacy control)

**Deletion Authority:**

Audit logs, forensic exports, and security incident records:

- CANNOT be deleted by Core, AI, shell, or upgrades
- CAN only be deleted by Guardian acting on explicit Operator command
- Are suspended from deletion under Legal Hold

## ðŸ”„ Update Model

**Manual Installer Updates:**

- âœ… **User-controlled updates** â€” Download and install when you choose
- âŒ No automatic background updates
- âŒ No forced updates or nagging prompts

**Update Flow:**

1. New version available â†’ Notification in UI (non-intrusive)
2. User reviews release notes and change log
3. User downloads signed installer at their convenience
4. User runs installer with admin privileges
5. Guardian verifies signature and applies update

**Version Policy:**

- Updates are opt-in, not mandatory
- Old versions continue to work (no kill switch)
- Security-critical updates clearly flagged (but still user's choice)

## ðŸ“œ License & Trust Stance

**Source Model:**

- Proprietary core runtime and Guardian components
- Uses third-party and open-source dependencies for toolchains, CLIs, and AI runtimes

**License Compliance Model:**

- All third-party licenses are cataloged and distributed in a NOTICE file
- Guardian enforces license disclosure retention
- Operator is responsible for accepting third-party license terms during installation

**Why closed:**

- Simpler to maintain and release for a single-platform desktop product
- Focused on enterprise-grade quality and support
- Clear accountability (single vendor, single codebase)

**Trust model:**

- Binary is signed and verifiable
- Behavior is deterministic and auditable (even if source is closed)
- No telemetry means no data leaves your machine
- Immutable core guarantees logs and invariants are trustworthy

## âš™ï¸ Hard Limits Enforced

**Execution Time & Circuit Breakers:**

- âœ… **Max execution time per goal** â€” Default 30 minutes (configurable)
- âœ… **Max retries** â€” 3 attempts per failed action before escalation
- âœ… **Circuit breakers** â€” Automatic halt on repeated failures (3x build failure, 3x same file edit)
- âœ… **Runaway detection** â€” Same file modified 3x in 5 loops triggers HALT

**No Hard Limits On:**

- âŒ **Max project size** â€” System scales to any reasonable Windows project (up to 10,000 files, 1GB total size)
- âŒ **Max files per plan** â€” Budgets enforce per-cycle caps (50 files/cycle) but plans can span multiple cycles
- âŒ **Max AI cost per session** â€” User's API key, user's budget (soft warning at budget thresholds)

**Budget Soft Limits (warnings, not blocks):**

- 500k tokens per goal (warning at 90%)
- 200 network calls per goal (warning at 90%)
- 50 files modified per cycle (hard cap)
- 2000 lines changed per cycle (hard cap)

**Why selective limits:**

- Project size and file counts are domain-specific (enterprise apps may be large)
- AI cost is user's responsibility (their API key, their budget)
- Time and retry limits prevent infinite loops and runaway execution

## ðŸ“„ License

*License information to be determined*

This software does not provide legal, regulatory, or compliance certification.

All security and audit guarantees apply only to the Exacta runtime and enforcement model, not to third-party tools, AI providers, or generated software.

## ðŸ¤ Contributing

*Contribution guidelines to be determined*

---

**Built for developers who value speed, momentum, and continuous forward progress over formal control, auditability, and reversible execution.**






