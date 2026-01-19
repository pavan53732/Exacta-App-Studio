**Exacta App Studio** is a **sandboxed, policy-governed, state-reproducible autonomous AI system** for Windows application development with an **immutable core**. 

**Determinism Scope:** Exacta guarantees **deterministic policy evaluation, capability enforcement, execution ordering, checkpoint creation, and rollback behavior** for a given `(goal, policy_version, environment_snapshot)`.  
Exacta **DOES NOT guarantee deterministic AI outputs, compiler outputs, package resolution, timestamps, or network-fetched artifacts.**

**Determinism Boundary Clarification**

Execution ordering is deterministic **within a single cycle** given identical:
(goal, policy_version, environment_snapshot, context_shard, provider_id).

Cross-cycle ordering in Progressive Context Mode is **convergent, not strictly deterministic**, and is governed by semantic coverage completion rather than fixed step ordering.

**Formal Convergence Definition:**
- Convergence means: semantic_coverage_map reaches 100% within N cycles (configurable in Advanced Settings, default N=5)
- Failure condition: If coverage < 100% after max_cycles, require Operator review and manual context expansion
- Divergence handling: If coverage decreases between cycles, trigger context reset with expanded shard size

It is a Windows desktop application that builds complete desktop applications (output: **.exe** and **.msi** installers) through fully autonomous, goal-driven execution loops.

## 📚 Terminology Glossary

| Term | Definition | Also Called |
|------|------------|-------------|
| **Operator** | Human user with administrative privileges | User, Administrator |
| **Core** | Exacta App Studio runtime (immutable execution engine) | Core Runtime, System |
| **Guardian** | Elevated security process enforcing policy and sandbox | Security Guardian, Policy Engine |
| **AI Agent** | Untrusted decision proposer (generates plans/code) | AI, Agent |
| **Goal** | User-defined objective with success criteria | Task, Objective |
| **Cycle** | One complete Perceive→Decide→Act→Observe→Checkpoint loop | Loop, Iteration |
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
- **Immutable core:** The agent can modify project files but cannot alter its own runtime, policy engine, or safety mechanisms
- **Structured semantic indexing:** Context selection and refactoring safety are driven by AST + dependency graph indexing, not embedding-based memory

**Autonomous workflow:**

```
Goal (user-defined with success criteria)
  ↓
Continuous autonomous loop until goal satisfied:
  → Perceive (analyze project state + redacted outcome summaries only)
  → Decide (AI proposes next actions)
  → Act (Guardian validates → Core executes with capability tokens)
  → Observe (check results + drift detection)
  → Checkpoint (create restore point)
  → Loop or Halt
```

**Authority model:** User governs (sets goals and boundaries) → Guardian enforces (issues capability tokens, validates policy) → Core executes (orchestrates builds, manages files) → AI proposes (generates plans and code, zero execution authority)

**Governed + Sandbox Executor Model:** Every action is **auditable, bounded, and reversible**. The system guarantees that AI cannot escape the sandbox, escalate privileges, or bypass policy enforcement.  
Execution behavior is **state-reproducible**, not AI-output deterministic.

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

- ✅ **WPF (.NET)** — Windows Presentation Foundation
- ✅ **WinUI 3 (.NET)** — Modern Windows UI Library
- ✅ **WinForms** — Classic Windows Forms
- ✅ **C++ (Win32)** — Supported as advanced/limited templates only (to control complexity)
- ✅ **Console applications** — Command-line tools
- ❌ **Rust (Tauri-style)** — Not supported
- ❌ **WebView-based desktop** — Not supported

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

- **Optional** — Unsigned installers are allowed but clearly warned
- **User-provided certificates** — Bring your own code signing cert for signed output
- **Default behavior** — Generates unsigned installers with security warnings visible to end users

**Optional Signing Orchestration (External Toolchain):**

- Exacta MAY orchestrate Windows signing tools (e.g., `signtool.exe`) as a sandboxed subprocess after packaging.
- Signing MUST require an explicit capability token and MUST NOT embed private keys in project files, diffs, or checkpoints.

## Core Principles

**Bounded Autonomy** — System runs self-directed loops within strict capability tokens, budget limits, and policy constraints. User approves goals, system auto-executes steps, Guardian enforces boundaries.

**Policy-Deterministic by Design** — Every execution follows the autonomous loop: Goal → Perceive → Decide → Act → Observe → Checkpoint. Repeats until goal satisfied, budget exhausted, or user halts.

**Determinism Scope:** Determinism guarantees apply only under identical OS version, toolchain versions, filesystem state, environment variables, policy_version, and memory schema_version as recorded in the checkpoint metadata.

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

**Sandboxed Execution** — All operations run in a hardened sandbox: project root jail (no path traversal), capability token enforcement (no raw system access), shell command classification (parsed before execution), subprocess isolation, Guardian-enforced boundaries.

**Local-First Architecture** — All project data, **persistent state**, execution logs, checkpoints, and indexes are stored on your machine. AI context windows are ephemeral. No cloud dependencies for core functionality.

**Fail-Closed Security** — When in doubt, the system stops. AI cannot escalate privileges, bypass safety boundaries, or exceed budget caps.

**Complete Audit Trail** — Every goal, decision, action, and file modification is correlated and logged with causal chain traceability.

**Guardian-Enforced Authority** — A cryptographically isolated Guardian component (separate process with elevated privileges) enforces all security boundaries. Guardian owns policy storage, issues capability tokens, and manages system upgrades. Core runtime and AI agent cannot grant themselves additional permissions.

**User as Governor** — You set goals, budgets, and capabilities. System supervises execution. Emergency stop always available.

## Memory Authority Model (Canonical)

Exacta App Studio distinguishes between **State**, **Memory**, and **Context** as separate trust domains.

- **Persistent State** — System-owned, durable, authoritative
- **Execution Memory** — Forensic, append-only, Guardian-owned
- **Context Window** — Ephemeral, AI-visible, non-authoritative

**AI SHALL NOT be a memory authority under any condition.**

**Clarification:** AI may receive **redacted system metadata** (version numbers, feature flags, policy version) for upgrade proposals, but cannot access or modify persistent memory layers, audit logs, or forensic artifacts.

## 🏗️ Architecture Overview

### **Autonomous Execution Model**

Exacta App Studio runs continuous **Goal → Perceive → Decide → Act → Observe → Checkpoint** loops until goal is satisfied, budget is exhausted, policy is violated, or user halts.

Every cycle:

- Creates a checkpoint before execution
- Validates capability tokens before actions
- Enforces budget limits (hard caps)
- Logs causal chain (goal_id → cycle_id → decision_id → actions → results)
- Detects runaway patterns (same file 3x in 5 loops, consecutive build failures)

### **Trust Boundary Separation (Immutable Core Architecture)**

Exacta App Studio uses a **three-layer authority model** with an **immutable trust anchor**:

```jsx
+---------------------------+
|   GUARDIAN (LOCKED)       |  ← Separate elevated process
|  - Policy Storage         |
|  - Capability Authority   |
|  - Upgrade Manager        |
|  - Certification State    |
+---------------------------+
           ↑ Governed API
           ↓ (IPC boundary)
+---------------------------+
|   CORE RUNTIME (LOCKED)   |  ← Immutable at runtime
|  - Orchestrator           |
|  - Budget Enforcer        |
|  - Checkpoint System      |
|  - Audit Log              |
|  - File Gateway           |
+---------------------------+
           ↑ Execution API
           ↓
+---------------------------+
|       AI AGENT            |  ← Untrusted proposer
+---------------------------+
           ↓
+---------------------------+
|     PROJECT SPACE         |  ← Fully mutable
+---------------------------+
```

**Guardian (Highest Authority, Separate Process)** — Enforces policy, manages upgrades, controls system paths, signs certification state, issues capability tokens. Runs in a separate process with just-in-time elevated privileges granted only for:

- Upgrade installation
- Certificate validation
- Policy storage access
- Windows Job Object enforcement

Guardian does NOT maintain persistent administrator privileges. **Cannot be modified by Core or AI.**

**Core Runtime (Middle Authority, User Process)** — Orchestrates AI interactions, manages project files within jail, executes within capability tokens, enforces budgets. Communicates with Guardian via IPC. **Cannot touch Guardian paths, policy storage, or self-upgrade.**

**IPC Security Model:**

- **Transport** — Named pipes with Windows ACLs (Guardian process SID only)
- **Authentication** — HMAC-SHA256 message authentication with per-session key (derived from Guardian_Secret via HKDF)
- **Authorization** — Every IPC request includes capability token; Guardian validates before processing
- **Replay protection** — Nonce + timestamp in every message (5-second validity window)
- **Nonce validity logic**: max(5 seconds, 2x observed IPC round-trip time); clock skew tolerance ±30 seconds with warning on detection
- **Encryption** — AES-256-GCM for all IPC payloads (defends against non-privileged local process inspection; does not defend against kernel or administrator-level compromise)
- **Sequence enforcement** — Messages include sequence numbers; out-of-order messages rejected

**Guardian_Secret Management:**

- **Storage**: Guardian_Secret is generated on first run, stored encrypted via Windows DPAPI (bound to user account + machine).
- **Rotation**: Automatic rotation every 7 days or on system upgrade; old secrets retained for 7 days for decryption.
- **Migration**: On machine migration, secrets are lost; user must re-enter API keys and re-initialize Guardian.

**IPC Threat Model:**

- **Defends against:** Compromised Core process, local privilege escalation, IPC injection
- **Does NOT defend against:** Kernel-level compromise, physical access, firmware attacks

**Invariant:**

**INV-IPC-1: Authenticated IPC Only** — Guardian SHALL reject any IPC message lacking valid HMAC, current nonce, or valid capability token.

**AI Agent (Lowest Authority, Untrusted)** — Decision proposer only. Generates goals, plans, diffs, and decisions. **Cannot execute, modify files, access system resources, self-authorize, or alter its own binary.**

### Context Selection Rule (Mandatory)

The AI agent SHALL NOT receive the full project repository.

**Context is assembled by Core as:**
- User request
- Relevant Project Index nodes (dependency-closed file set only)
- Redacted Goal State summary
- Last N execution outcomes (N ≤ 5)

**INV-CTX-1: Dependency-First Context Assembly**

Only the **minimum dependency-closed file set** required for the current action MAY be injected into the AI context window.

If the dependency-closed set exceeds the provider’s context capacity, the system SHALL NOT drop dependency-critical files to fit a single request.

**INV-CTX-2: Progressive Context Mode (Mandatory)**

When the dependency-closed file set exceeds the active provider’s context capacity, Exacta App Studio SHALL enter **Progressive Context Mode** instead of halting execution.

In this mode:

- The action is decomposed into **multiple autonomous cycles**
- Each cycle operates on a **dependency-safe subset** of the full closure
- Checkpoints are created between every cycle
- The **full semantic closure MUST be covered across cycles**
- Dependency edges MAY NOT be violated between cycles

The system SHALL surface a visible banner:
> “Progressive Context Mode Active — semantic coverage in progress”

**MAY-CTX-FAST: Throughput Mode (Operator-Controlled)**

**Shard Computation Algorithm:**
- Use topological sort on the dependency graph to identify safe execution order
- Circular dependencies detected via Strongly Connected Components (SCC) analysis: if SCC size > 1, treat entire component as single shard with warning
- Each shard MUST be < 80% of the provider's context capacity to allow headroom
- If a single file + its immediate dependencies > capacity → HALT with "Unsupported: file too large for context window"
- Cross-shard dependencies are validated at cycle boundaries to prevent violations

The Operator MAY enable Throughput Mode, allowing relevance-ranked context selection instead of strict dependency closure.

When enabled:
- Semantic coverage guarantees are DISABLED
- Determinism guarantees are SUSPENDED
- Audit logs SHALL record `context_mode=FAST`
- UI SHALL display:
  > “FAST MODE — semantic safety reduced”

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
**INV-MEM-CTX-1: Forensic Non-Observability** — AI context SHALL NOT allow reconstruction of system state, policy behavior, user identity, or prior execution history beyond the last N redacted outcomes.

**INV-MEM-FW-2: Semantic Neutralization**
All injected content SHALL be normalized to prevent:
- Implicit execution order inference
- File hierarchy reconstruction
- Change chronology reconstruction
- Goal lineage reconstruction

**INV-MEM-9: No Forensic Perception** — AI SHALL NOT perceive, infer from, or receive execution logs, checkpoints, policy decisions, or causal traces. Only redacted outcome summaries produced by Core MAY be provided.

**INV-MEM-15: No Execution Trace in Context** — Execution traces, causal records, and audit logs SHALL NOT be exposed to the AI Agent during PERCEIVE under any condition.

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

### **Goal Progress Digest (Core-Generated Summary)**

To improve AI context quality without violating forensic isolation, Core generates a **deterministic, redacted summary** every 5 cycles.

**Digest Schema:**

```tsx
GoalProgressDigest {
  cycles_completed: number
  files_modified_total: number
  successful_builds: number
  failed_builds: number
  coverage_progress: string      // "78% → 92%"
  budget_status: {
    tokens: string,              // "320k / 500k remaining"
    time: string,                // "18min / 30min remaining"
    files: string,               // "127 / 500 modified"
    builds: string               // "3 / 5 runs used"
  }
  last_5_outcomes: OutcomeSummary[]  // Standard redacted outcomes
}
```

**Generation Rules:**
- Produced by Core every 5 cycles (deterministic interval)
- Replaces individual outcome summaries in AI context
- Contains only aggregate statistics (no forensic details)
- Injected into AI context alongside current cycle's state

**Invariant:**  
**INV-MEM-DIGEST-1: Digest Authority** — Only Core may generate progress digests. AI SHALL NOT summarize, compress, or transform execution history. Digests are computed from persistent state, not from AI reasoning.

**Why This is Safe:**
- Core-generated (not AI hallucination)
- Deterministic (same state = same digest)
- Redacted (no timestamps, hashes, or forensic IDs)
- Goal-scoped (no cross-goal data leakage)
- Read-only (AI cannot modify digest)

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

## Formal Definitions — Memory vs State vs Context

### Global Memory Invariants (Non-Overridable)

**INV-MEM-G1: System-Owned Memory**
All persistent memory layers SHALL be owned and written only by Core or Guardian.

**INV-MEM-G2: AI Ephemerality**
AI context and reasoning state SHALL be ephemeral and SHALL NOT persist across cycles or restarts.

**INV-MEM-G3: No Cross-Goal Recall**
Memory artifacts from one Goal SHALL NOT be visible, injectable, or inferable in another Goal.

**INV-MEM-G4: Guardian Final Authority**
In any memory conflict, corruption, or ambiguity, Guardian’s state SHALL be treated as ground truth.

## Memory Lifecycle State Machine

Persistent memory objects SHALL follow this lifecycle:

CREATED → VERIFIED → ACTIVE → [ARCHIVED | EVIDENCE]
↓
CORRUPT

### Rules

- **CREATED** — Written during PHASE 1 (PREPARE)
- **VERIFIED** — Hash + schema + Guardian signature validated
- **ACTIVE** — Eligible for rollback, replay, and audit reference
- **ARCHIVED** — Retained but excluded from active rollback window
- **EVIDENCE** — Legal Hold or incident-linked, immutable, non-prunable
- **CORRUPT** — Validation failure → Safe Mode enforced

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

1. **Global hard invariants** (non-overridable): if any match → `DENY`.
2. **Safety Mode / Offline mode** gates: enforced before any allow.
3. **Scope + path jail checks**: outside `scope_root` or system paths → `DENY`.
4. **Capability requirements**: missing required capability token → `DENY`.
5. **Command classification** (READ/BUILD/FS_MUTATE/SYSTEM/NETWORK): apply class policy; unknown → `DENY`.
6. **Budget checks**: if would exceed any cap → `DENY`.
7. **Ordered policy rules**: first matching rule with `DENY` wins; otherwise accumulate the most restrictive allow (`ALLOW_WITH_LIMITS` beats `ALLOW`).
8. Default: `DENY`.

**Override precedence:**

- **Non-overridable:** global invariants, sandbox boundary, system path protection, and capability enforcement.
- **Operator overrides (allowed):** only by switching to a pre-defined, signed *policy profile* (e.g., “More permissive shell allowlist”), never by ad-hoc runtime editing.
- **Most restrictive wins:** When multiple rules apply, the final decision is the minimum in this order: `DENY` > `ALLOW_WITH_LIMITS` > `ALLOW`.

**Determinism requirement:** Policy evaluation is deterministic for a given `(goal, action, state, policy_version)` snapshot, and the snapshot is logged with the decision.

- **Capability Authority**

Issues and validates per-action capability tokens: FS_READ, FS_WRITE, BUILD_EXEC, PACKAGE_EXEC, SIGN_EXEC, NET_AI_ONLY, NET_DOCS_ONLY, SHELL_EXEC (optional, high risk), PROCESS_KILL

- **Budget Enforcer**

Hard runtime governor enforcing caps: files modified/cycle (50), lines changed/cycle (2000), build runs/goal (5), tokens/goal (500k), time/goal (30 min), network calls/goal (200)

- **Checkpoint & Rollback Service**

Every loop creates restore point with file snapshots, index snapshot, goal state, budget counters, execution trace pointer. **Rollback is atomic and global, enforced through the Transactional State Commit Protocol (INV-MEM-1).**

### Checkpoint Integrity Proof

Each checkpoint MUST include:

- `checkpoint_hash` = SHA256(all staged files + index snapshot + goal state + budget state)
- `previous_checkpoint_hash`
- `guardian_signature` = HMAC(Guardian_Secret, checkpoint_hash + previous_hash)
- `semantic_coverage_map` = Map<file_path_hash, CoverageRecord>
- `context_mode` = 'NORMAL' | 'PROGRESSIVE'

Where `file_path_hash` = HMAC-SHA256(Guardian_Secret, relative_path).

**Coverage Record Schema:**

```tsx
CoverageRecord {
  coverage_level: 'INJECTED' | 'PARSED' | 'DEPENDENCY_VALIDATED'
  cycle_id: UUID
  index_snapshot_hash: SHA256
}
```

**INV-CTX-3: Coverage Integrity**

A file SHALL NOT be marked DEPENDENCY_VALIDATED unless:
- It was included in AI context
- Its dependency edges were validated against the current Project Index
- At least one outbound or inbound dependency was exercised in a patch or validation step

This forms a cryptographic hash chain.

**Invariant:**  
**INV-MEM-6: Hash-Chained Checkpoints** — Any break in the checkpoint hash chain SHALL trigger Evidence Preservation Mode and HALT execution.

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
**INV-DET-1: Snapshot Completeness** — A checkpoint SHALL NOT be considered deterministic unless a valid EnvironmentSnapshot is present and hash-anchored.

### **Transactional State Commit Protocol (Mandatory)**

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
PHASE 1 — PREPARE
- Write file diffs to a temporary workspace (.exacta/staging/)
- Build new Project Index snapshot in memory
- Write checkpoint record with status=PENDING
- Validate schema versions for all memory objects
- Verify sufficient disk space and write permissions

PHASE 2 — COMMIT
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
**INV-MEM-7: Corruption Fails Closed** — System SHALL NEVER attempt auto-repair or regeneration of corrupted memory.

**Invariant:**

**INV-MEM-1: Atomic State Commit** — Filesystem, index, goal state, budget counters, and checkpoint metadata SHALL be committed as a single atomic unit. Partial state visibility is forbidden.

**Checkpoint Retention Policy:**

- **Last 10 checkpoints** — Always retained (guaranteed rollback window)
- **Hourly checkpoints** — Retained for 24 hours
- **Daily checkpoints** — Retained for 7 days
- **Goal completion checkpoint** — Retained for 30 days
- **Manual checkpoints** — Never auto-deleted (user must explicitly delete)
- **Storage limit** — If checkpoint storage exceeds 10GB or 90% of available disk, oldest auto-checkpoints pruned first
- **Precedence rule** — Last 3 checkpoints are NEVER pruned regardless of storage pressure. If remaining checkpoints exceed quota, oldest of those beyond the last 3 are pruned.
- **Edge case handling** — If only 3 checkpoints exist and storage limit is reached, system SHALL halt autonomous execution and warn Operator (no auto-pruning of the minimum guaranteed set)
- **Minimum guaranteed** — Last 3 checkpoints are never auto-deleted, even under storage pressure
- **Critical disk pressure** — If available disk drops below 5%, the system SHALL pause autonomous execution and require Operator intervention before continuing

**Storage Management:**

- Checkpoints are incremental (only changed files stored)
- Deduplication across checkpoints (identical files stored once)
- Compression applied to all snapshots
- User can manually prune checkpoints older than N cycles via UI

### Persistent Memory Quotas

**Default Limits:**
- Execution Logs: 500MB
- Project Index Cache: 200MB
- Goal State Store: 50MB
- Checkpoint Metadata: 100MB (excluding file blobs)

**Invariant:**  
**INV-MEM-10: Quota Enforcement** — If any memory class exceeds its quota, system SHALL:
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
- **Project Index (Structured State Cache)** — Dependency graph, symbol map, file fingerprints. Cache only; filesystem is ground truth.
- **Goal State (Persistent State)** — Objectives, constraints, budgets, and policy bindings.
- **Plan Trace (Execution State)** — Proposed actions, approvals, and decision lineage.
- **Execution Log (Forensic State)** — What actually ran, timestamps, exit codes, capability grants.
- **World Model (Volatile Advisory State)** — AI assumptions; non-authoritative; never persisted.

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

**INV-MEM-2: Schema Mismatch HALT** — If any memory object’s `schema_version` or `producer_version` is incompatible with the running system, execution MUST HALT and require Operator review.

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
| Project Index | ✅ Read-only | ✅ Full | ⚠️ Verify |
| Goal Memory   | ⚠️ Redacted | ✅ Full | ✅ Full |
| Plan Trace   | ⚠️ Summary only | ✅ Full | ✅ Full |
| Execution Log| ❌ None | ❌ None | ✅ Full |
| Checkpoints  | ❌ None | ⚠️ Restore only | ✅ Full |
| Secrets/Keys | ❌ None | ❌ None | ✅ Full |

### Memory Write Authority Matrix

| Memory Layer   | AI Agent | Core Runtime | Guardian |
|---------------|----------|--------------|----------|
| Project Index | ❌ None  | ✅ Full       | ⚠️ Verify |
| Goal Memory   | ❌ None  | ✅ Full       | ✅ Full |
| Plan Trace    | ❌ None  | ✅ Full       | ✅ Full |
| Execution Log | ❌ None  | ❌ None      | ✅ Full |
| Checkpoints   | ❌ None  | ❌ None      | ✅ Full |
| Secrets/Keys  | ❌ None  | ❌ None      | ✅ Full |

**Invariant:**  
**INV-MEM-3B: No AI Write Authority** — AI SHALL NOT write to any persistent or forensic memory layer under any condition.

**Invariant:**
**INV-MEM-3: No Forensic Leakage to AI** — AI SHALL NOT read audit logs, checkpoints, secrets, or Guardian-owned memory layers under any condition.

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

**INV-MEM-4: World Model Isolation** — Any attempt to use World Model data for policy or execution SHALL trigger immediate Guardian intervention and system halt.

### AI Memory Prohibition Rule (Hard)

The AI Agent SHALL NOT:

- Persist embeddings, summaries, vector indexes, or compressed representations of project data
- Maintain cross-session recall
- Store prior goal context in any external system
- Use provider-side “memory” or “conversation history” features

Any detection of persistent AI memory behavior SHALL be classified as a **SANDBOX-BREACH** event.

## ✨ Features

### **Goal-Based Autonomous Execution**

- Set persistent goals with explicit success criteria
- System runs continuous loops until goal satisfied or budget exhausted
- Real-time supervision with live action stream
- Capability toggles and budget meters visible during execution
- Emergency stop at any time
- Rollback to any checkpoint in execution history

### **Goal Types**

While the system is fully autonomous, goals can be categorized by intent:

- **CreateProject** — Scaffold new project structure from templates
- **AddFeature** — Add new functionality with continuous refinement
- **FixBug** — Debug and repair defects iteratively
- **BuildPackage** — Compile, test, and package application
- **Custom Goals** — Any software engineering objective with defined success criteria

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

### **Budget Enforcement**

**Hard Runtime Limits (per cycle or per goal):**

**Note:** A "cycle" is one complete Goal → Perceive → Decide → Act → Observe → Checkpoint loop. Each cycle may execute multiple plan steps (typically 1-10). Each step may modify multiple files via atomic diff application.

| Budget Type | Default Cap | Scope |
| --- | --- | --- |
| Files modified | 50 | per cycle |
| Lines changed | 2,000 | per cycle |
| Shell commands | 25 | per cycle |
| Build runs | 5 | per goal |
| Network calls | 200 | per goal |
| Tokens used | 500,000 | per goal |
| Time elapsed | 30 minutes | per goal |
| Rollbacks | Unlimited | per goal |

Exceeding any budget triggers automatic HALT with rollback option.

### **Budget Meter UI Design**

**Visual Representation:**

```
Tokens Used:  ████████████░░░░░░░░  320k / 500k  (64%)
Time Elapsed: ███████████████░░░░░   18min / 30min (60%)
Files Modified: ██████░░░░░░░░░░░░░  127 / 500 (25%)
Builds Run:   ███░░░░░░░░░░░░░░░░░    3 / 5 (60%)

Network Calls: ███████████████████░  187 / 200 (93%) ⚠️ Warning

Status: 🟢 Healthy | ⚠️ Approaching limits on: Network Calls
```

**Color Coding:**
- 🟢 Green (0-70%): Healthy
- 🟡 Yellow (70-90%): Warning
- 🔴 Red (90-100%): Critical
- ⚫ Black (100%): Exhausted → HALT

**Live Updates:**
- Budget meters update in real-time as actions execute
- Warning toast when any budget exceeds 90%
- Countdown timer shows time remaining
- Projected completion estimate based on current velocity

**Historical Trend:**
```
Last 5 cycles average:
• Tokens/cycle: 15k → Estimated 6 more cycles before exhaustion
• Files/cycle: 12 → Well within limits
```

### **Live Budget Visualization (Lovable-Inspired Speed)**

**Meter Panel (Always Visible in Right Sidebar):**

```
┌─────────────────────────────────────────────┐
│  BUDGET STATUS                              │
├─────────────────────────────────────────────┤
│  Tokens:  ████████████░░░░░░░░  64%         │
│           320,000 / 500,000 used            │
│           Estimated: 6 cycles remaining     │
│                                             │
│  Time:    ███████████████░░░░░  60%         │
│           18:00 / 30:00 elapsed             │
│           Average: 2min/cycle               │
│                                             │
│  Files:   ██████░░░░░░░░░░░░░░  25%         │
│           127 / 500 modified                │
│                                             │
│  Builds:  ███░░░░░░░░░░░░░░░░░  60%         │
│           3 / 5 builds used                 │
│                                             │
│  Network: ███████████████████░  93% ⚠️      │
│           187 / 200 calls used              │
│           WARNING: Approaching limit        │
├─────────────────────────────────────────────┤
│  Status: 🟢 Healthy                         │
│  Last update: 2 seconds ago                 │
└─────────────────────────────────────────────┘
```

**Color Coding (Same as Lovable):**
- 🟢 Green (0-70%): Healthy
- 🟡 Yellow (70-90%): Warning - shown in meter
- 🔴 Red (90-100%): Critical - flashing indicator
- ⚫ Black (100%): Exhausted → Automatic HALT

**Velocity Tracking:**

Shows historical trend for prediction:

```
Last 5 cycles:
• Tokens/cycle: 12k → 15k → 14k → 16k → 13k (avg: 14k)
• Files/cycle: 8 → 12 → 10 → 15 → 9 (avg: 11)
  
Projection:
• Token budget will last ~6 more cycles
• File budget has 38 cycles remaining
• Time budget has 12 minutes remaining

⚠️ Limiting factor: TIME (will exhaust first)
```

**Budget Violation Priority (first match halts):**
1. Files modified (immediate halt - filesystem safety)
2. Lines changed (immediate halt - code safety)  
3. Time elapsed (immediate halt - runaway prevention)
4. Tokens used (immediate halt - cost control)
5. Network calls (warning first, then halt)
6. Shell commands (warning first, then halt)
7. Build runs (warning first, then halt)

*Rationale: Files > Lines because file count indicates scope of change; line count can be high in single files but fewer files means more contained impact.*

### **Runaway Detection**

System automatically halts if:

- Same file modified 3x in 5 loops
- Build fails 3x consecutively
- No goal progress detected in 5 cycles (N=5)
- Action velocity exceeds safety threshold (10 actions/minute)
- Recursive loop pattern detected
- **Repeated identical shell commands** (same command 3x in 5 cycles)
- Budget drops below 10% (warning only)
- Progressive Context Mode is active AND semantic coverage is incomplete AND user attempts to finalize goal

**Runaway Detection Rationale:**
- "3x in 5 loops" balances sensitivity (catches issues early) vs. false positives (allows iterative refinement)
- Configurable in Advanced Settings → Safety → Runaway Detection: detection_sensitivity = 'conservative' | 'balanced' | 'permissive'
- Conservative: 2x in 3 loops; Permissive: 5x in 10 loops

**Rule:** A goal SHALL NOT be marked COMPLETED while any dependency-critical file remains uncovered in the semantic_coverage_map.

**Dependency-Critical File**

A file is dependency-critical if it:
- Is in the transitive closure of any modified file
- Declares or implements a symbol referenced by a modified file
- Is part of a build, packaging, or runtime entry path

### **Unified Diff Contract**

- **POSIX unified diff format** (RFC 3629 UTF-8 encoding)
- **Atomic application** — All hunks apply or none do
- **Automatic rollback** on partial failure
- **Drift detection** before every apply
- **NO_CHANGES_REQUIRED sentinel** for no-op responses

### **Diff Staging Area (Lovable + Git Hybrid)**

**Lovable Pattern:** Shows SQL/code with single "Apply Changes" button
**Exacta Enhancement:** Multi-step review with granular control

**Stage 1: AI Proposes Changes**

```
┌─────────────────────────────────────────────────────┐
│  🤖 Exacta is typing...                              │
│                                                      │
│  I'll add SQLite persistence with these changes:    │
│                                                      │
│  📄 src/models/TodoContext.cs (NEW FILE)            │
│     +45 lines | Creating EF Core context            │
│     [Preview Diff] [Stage]                          │
│                                                      │
│  📄 src/models/Todo.cs (MODIFIED)                   │
│     +12 lines, -3 lines | Adding Id property        │
│     [Preview Diff] [Stage]                          │
│                                                      │
│  📄 Program.cs (MODIFIED)                           │
│     +8 lines | Registering DbContext                │
│     [Preview Diff] [Stage]                          │
│                                                      │
│  [Stage All] [Reject All] [Ask AI to Revise]       │
└─────────────────────────────────────────────────────┘
```

**Stage 2: Preview Individual Diff**

Click "Preview Diff" to see unified diff with syntax highlighting:

```diff
--- a/src/models/Todo.cs
+++ b/src/models/Todo.cs
@@ -1,5 +1,8 @@
 namespace TodoApp.Models {
   public class Todo {
+    [Key]
+    public int Id { get; set; }
+    
     public string Title { get; set; }
     public bool IsCompleted { get; set; }
   }
 }
```

**Stage 3: Commit Staged Changes**

After staging desired files:

```
┌─────────────────────────────────────────────────────┐
│  Staged Changes (2 files)                           │
│                                                      │
│  ✓ src/models/TodoContext.cs (+45 lines)            │
│  ✓ src/models/Todo.cs (+12, -3 lines)               │
│                                                      │
│  Budget Impact:                                      │
│  • Files: 2/50 remaining                            │
│  • Lines: 54/2000 remaining                         │
│  • Tokens: ~1,200 consumed                          │
│                                                      │
│  [Commit Changes] [Unstage All]                     │
│                                                      │
│  ⚠️ This will create checkpoint cp_a3f9c2           │
└─────────────────────────────────────────────────────┘
```

**Key Difference from Lovable:**
- **Lovable**: Single "Apply Changes" → instant application
- **Exacta**: Stage → Review → Commit → Checkpoint (full auditability)

**Features:**
- **Live Preview:** Show diff as AI generates (streaming)
- **Selective Staging:** Unstage individual files
- **Manual Edit:** Open file in external editor before commit
- **Risk Indicators:** Flag high-risk changes (config files, system paths)
- **Rollback Integration:** "Reject All" discards without creating checkpoint

**Invariant Compliance:**
- Does NOT violate immutability (Core still enforces atomic commit)
- Does NOT allow AI to bypass policy (Guardian validates before commit)
- Does NOT break checkpoint integrity (only committed diffs are checkpointed)

**Implementation:** This is purely a UI staging layer. All diffs are validated by Policy Engine before commit, regardless of user selection.

### **Background Execution Model**

- Plans execute in background workers with smart retry (up to 3 attempts)
- **Safe interruption boundaries** — User can pause/cancel at step boundaries only
- **Step boundary definition** — After checkpoint commit, before next AI call (ensures atomic state)
- **Notification policy** — Risk-based toasts vs. modals
- **Correlation tracking** — Full lineage from intent to file change

## Security Model

### **Hard Invariants**

**INV-MEM-0: System-Owned Memory Authority** — All persistent memory, execution state, checkpoints, and audit artifacts are owned by Core and Guardian. AI SHALL NOT create, modify, delete, version, or influence any persistent memory layer.

**INV-MEM-13: Goal Isolation** — Persistent State, Index views, and Outcome Summaries SHALL be goal-scoped. Data from Goal A SHALL NOT be injected into AI context for Goal B under any condition.

**INV-MEM-DIGEST-1: Core-Only Digest Authority** — Goal progress digests SHALL be generated only by Core from persistent state. AI SHALL NOT summarize, compress, or transform execution history. Digest injection into AI context SHALL follow the same redaction rules as OutcomeSummary.

**INV-A1: System Authority Supremacy** — Only Guardian and Core Runtime have execution authority. AI is untrusted decision proposer.

**INV-A2: Capability-Scoped Actions Only** — Every action must present valid capability token (FS_READ, FS_WRITE, BUILD_EXEC, etc.). No raw system access.

**INV-A3: Budget-Bounded Execution** — Hard caps enforced on files, lines, builds, tokens, time, network. Budget exhaustion triggers HALT.

**INV-A4: Checkpoint Before Action** — Every loop creates restore point before execution. Rollback is atomic and global.

**INV-A5: Reversible by Default** — All operations backed by checkpoint. User can rollback to any cycle.

**INV-A6: Local-Only Execution** — All processing occurs on the user's machine. External network communication is restricted to user-authorized AI providers and explicitly allowlisted documentation endpoints via NET_* capability tokens.

**INV-A7: No External Telemetry** — No usage data, error reports, or analytics transmitted externally.

**INV-A8: Human Kill Switch Always Available** — User can emergency stop at any time. System honors halt immediately.

**INV-GLOBAL-14: External Toolchain Orchestration Only** — Exacta App Studio SHALL NOT implement or embed any compiler, linker, or packaging logic. It may only orchestrate external toolchain binaries as sandboxed subprocesses.

**INV-ITC-3: No Upward Authority Flow** — Core components SHALL NOT grant AI agents or lower-trust components access to file system, network, shell, build, signing, packaging, or binary staging authority.

**INV-CORE-1: Immutable Core Runtime** — The Exacta App Studio binary, Guardian, Policy Engine, Capability Authority, Budget Enforcer, Checkpoint System, and Audit Log are immutable at runtime. No code path shall allow the AI agent to modify these components.

**INV-CORE-2: Controlled Upgrade Only** — System upgrades require human approval, cryptographic signature verification, and execution by Guardian updater. AI may propose upgrades but cannot apply them.

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
Use of cloud AI providers SHALL be treated as a data disclosure event governed by the provider’s terms.

**Invariant:**  
**INV-MEM-14: Provider Memory Boundary** — System guarantees apply only to local memory, state, and execution layers, not to third-party AI services.

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

- **Project root jail** — All file operations confined to detected project root
- **Path traversal prevention** — Absolute paths and `..` outside project rejected
- **Symlinks not followed** — Prevents jail escape
- **Binary edits forbidden** — Diffs cannot modify binary files
- **Atomic writes** — Temp file + atomic move with automatic backup
- **Capability tokens required** — FS_READ for reads, FS_WRITE for writes

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
- **Expiration** — Tokens expire at the earliest of:
    - Goal completion
    - IPC session termination
    - 24-hour maximum lifetime
- **No token caching** — Core must request fresh validation from Guardian for every action

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
         ↓
Guardian revokes SHELL_EXEC token for active goal
         ↓
Core receives CAPABILITY_REVOKED event via IPC
         ↓
In-flight actions using SHELL_EXEC are canceled at next safe boundary
         ↓
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

- **Pre-Cycle Fingerprint Check** — Before each cycle, Guardian computes SHA-256 hashes of all files in scope_root and compares against Project Index fingerprints. To mitigate TOCTOU vulnerabilities, hashes are recomputed immediately before action execution if drift is detected.
- **Drift Classification:**
    - **Low drift** (1-5 files changed, <500 lines): System warns, updates index, continues
    - **Medium drift** (6-20 files changed, 500-2000 lines): System warns, updates index, requires user confirmation to continue
    - **High drift** (>20 files or >2000 lines): System HALTS, requires full re-indexing and user review before resuming
- **Reconciliation** — Detected drift triggers automatic index rebuild from file system ground truth

**Invariant:**

**INV-INDEX-1: Index Follows File System** — The Project Index is a cache, not authority. File system is ground truth. Any detected drift triggers reconciliation before execution continues.

### Index Trust Boundary

The Project Index is treated as **untrusted cache** until validated.

Before each cycle:
- Guardian MUST verify index fingerprints against filesystem hashes
- If mismatch exists, index is invalidated and rebuilt from disk
- AI context injection is BLOCKED until rebuild completes

**Invariant:**  
**INV-MEM-11: No Unverified Index Exposure** — AI SHALL NOT receive Project Index data that has not passed Guardian verification in the current cycle.

### Index Root Attestation

Each committed Project Index snapshot MUST include:

- index_hash = SHA256(all indexed file contents + dependency graph)
- guardian_signature = HMAC(Guardian_Secret, index_hash)

**Invariant:**  
**INV-MEM-17: Signed Index Root** — AI context injection and execution SHALL NOT proceed unless the current Project Index snapshot is Guardian-signed.

### **Index Rebuild Failure Mode**

If index rebuild fails due to corruption or inconsistency:

1. Guardian SHALL quarantine the corrupted index
2. System SHALL enter read-only mode for the affected goal (other goals may continue if index is intact)
3. User SHALL be prompted to restore from backup or re-initialize the specific goal
4. AI operations SHALL be suspended only for the affected goal until index integrity is restored

**Invariant:**

**INV-MEM-5: Index Integrity First** — System SHALL NOT proceed with any operations if Project Index cannot be verified as consistent and current.

## 🔄 Autonomous Execution Loop

The system follows this continuous cycle:

```
GOAL (User-defined with success criteria)
  ↓
PERCEIVE (Verified Project Index + Goal State Summary + Redacted Outcome Summaries)
  ↓
DECIDE (Policy Engine + Budget Check → AI proposes Decision)
  ↓
ACT (Capability-Scoped Execution with token validation)
  ↓
OBSERVE (Result + Drift + Side Effects)
  ↓
CHECKPOINT (Snapshot + Budget Update)
  ↓
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

## 🤖 AI Provider Configuration

### **Supported AI Providers**

Exacta App Studio supports multiple AI provider types:

**Cloud Providers (API Key Required):**

*Major Commercial Providers:*

- **OpenAI** — GPT-4, GPT-4 Turbo, GPT-4o, GPT-3.5 Turbo, o1, o1-mini
- **Anthropic** — Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Sonnet, Claude 3 Haiku
- **Google AI Studio / Gemini API** — Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini Ultra
- **Azure OpenAI** — Enterprise deployment (GPT-4, GPT-3.5, embeddings)
- **Amazon Bedrock** — Claude, Llama, Mistral, Titan models via AWS
- **Google Vertex AI** — Gemini, PaLM 2, Codey via Google Cloud

*Specialized AI Providers:*

- **Mistral AI** — Mistral Large, Mistral Medium, Mistral Small, Mixtral 8x7B, Mixtral 8x22B
- **Cohere** — Command R, Command R+, Command, Command Light
- **AI21 Labs** — Jurassic-2 Ultra, Jurassic-2 Mid, Jamba
- **Writer** — Palmyra-X, Palmyra-Med, Palmyra-Fin (domain-specific)
- **Reka AI** — Reka Core, Reka Flash, Reka Edge
- **Perplexity AI** — pplx-70b-online, pplx-7b-online (search-augmented)
- **xAI (Grok)** — Grok-1, Grok-2 (via API)
- **Inflection AI** — Pi (conversational AI)
- [**01.AI**](http://01.AI) — Yi-34B, Yi-6B (Chinese/English bilingual)

*Unified Gateways & Aggregators:*

- **OpenRouter** — Unified gateway to 100+ models (OpenAI, Anthropic, Meta, Mistral, etc.)
- **Together AI** — 50+ open-source models with serverless inference
- **Replicate** — Run any open-source model via API
- **Anyscale Endpoints** — Llama 2, Mistral, CodeLlama hosted inference
- **HuggingFace Inference API** — Serverless access to 10,000+ models
- **Fireworks AI** — Fast inference for Llama, Mistral, Mixtral, etc.
- **DeepInfra** — Llama 2, Mistral, CodeLlama, WizardCoder, etc.
- **Lepton AI** — Optimized inference for open models
- **Groq** — Ultra-fast LPU inference (Llama 3, Mixtral, Gemma)
- **Monster API** — Cost-optimized inference for open models
- **Novita AI** — Open model hosting with pay-per-use

*Enterprise & Private Cloud:*

- **IBM [watsonx.ai](http://watsonx.ai)** — Foundation models (Granite, Llama, etc.) via IBM Cloud
- **Oracle Cloud Infrastructure Generative AI** — Cohere, Llama via Oracle Cloud
- **Databricks** — DBRX, Llama 2, MPT models on Databricks platform
- **Snowflake Cortex** — LLMs integrated into Snowflake data platform

*Custom & Self-Hosted API Endpoints:*

- **Any OpenAI-compatible API** — Custom endpoint URL + API key (manual configuration)
- **vLLM Server** — Self-hosted OpenAI-compatible inference
- **TGI (Text Generation Inference)** — HuggingFace's production inference server
- **TensorRT-LLM** — NVIDIA's optimized inference engine
- **llama-cpp-python server** — OpenAI-compatible API via llama.cpp

**Note:** Official providers (OpenAI, Anthropic, Google, etc.) have default endpoints built-in. Custom OpenAI-compatible APIs require manual endpoint URL configuration.

---

**Local Model Runtimes (No API Key, Fully Offline):**

*Desktop GUI Applications:*

- **Ollama** — Most popular local runner (Llama 3, Mistral, CodeLlama, Phi, Gemma, Qwen, etc.)
- **LM Studio** — Cross-platform GUI with OpenAI-compatible API server
- **Jan** — Open-source desktop app (Windows, Mac, Linux)
- **GPT4All** — Simple desktop app with bundled models
- **AnythingLLM** — Full-stack local AI workspace
- **Msty** — Multi-model desktop interface
- **RecurseChat** — Local-first AI chat app

*API Servers (Self-Hosted, OpenAI-Compatible):*

- **LocalAI** — OpenAI-compatible API for local models (Docker or binary)
- **llama-cpp-python server** — Python wrapper with OpenAI-compatible endpoints
- **vLLM** — High-throughput inference server with OpenAI-compatible API
- **TGI (Text Generation Inference)** — HuggingFace production inference server
- **Xinference** — Model management and OpenAI-compatible serving
- **FastChat (Vicuna)** — OpenAI-compatible API for open models
- **LiteLLM Proxy** — Unified API gateway for 100+ LLM providers (local or cloud)
- **Text Generation WebUI (oobabooga)** — Web UI + API server with extensions
- **KoboldCpp** — Easy-to-use inference server with Kobold API
- **llama.cpp server** — Official llama.cpp HTTP server
- **Petals** — Distributed inference (run large models across machines)

---

### **CLI-Based AI Coding Agents**

Exacta App Studio supports terminal-native AI coding assistants that run as CLI tools on your system.

### Cost Classification

**Fully Free / Offline:**

- Qwen Code (via Ollama)
- LocalAI
- llama.cpp server
- GPT4All

**Hybrid (Free Tier + Paid):**

- Gemini CLI
- Goose CLI
- Crush CLI
- Blackbox CLI

**Paid (API Required):**

- Codex CLI
- Aider (cloud models)
- GPT Engineer

#### **Autonomous Coding Agents**

- **Goose CLI** — Open-source AI agent supporting 25+ providers (OpenAI, Claude, Ollama) with 3,000+ MCP server integrations. Open-source community-maintained.
- **Crush CLI** — Multi-model CLI supporting 75+ LLM providers with LSP integration and multi-agent parallel execution.
- **Aider** — AI pair programming assistant with automatic git commits, codebase mapping, and test integration. Best with Claude 3.5 Sonnet or DeepSeek R1.
- **Codex CLI** — OpenAI's official terminal coding agent. Supports GPT-4, o3, and o4-mini models with repo-aware editing.
- **Droid Factory CLI** — Autonomous debugging agent with self-fixing capabilities. Supports OpenRouter, Hugging Face, and Gemini.

#### **Project Scaffolding**

- **GPT Engineer** — Generates complete applications from natural language prompts. Creates objectives, features, and full source code.

#### **Specialized Coding**

- **Qwen Code CLI** — Alibaba's Qwen3-Coder models via Ollama. Optimized for code generation with deep reasoning mode. Works fully offline.

#### **Cloud CLI Agents**

- **Gemini CLI** — Google’s CLI for Gemini models. Free tier subject to Google API policy and quota changes. GCP environment-aware.
- **Blackbox CLI** — Local execution mode for [Blackbox.AI](http://Blackbox.AI) platform.

**Security Model:**

- All CLI providers execute in a sandboxed environment (Windows Job Object)
- Require `SHELL_EXEC` capability token
- Enforce 5-minute timeout per command
- Support budget limits and rollback
- Log all executions to the audit trail

### CLI Memory Containment Rule

All CLI-based agents SHALL run with:

- Session persistence DISABLED by default
- Working directory forced to scope_root
- Home/config directories redirected to a sandbox path under `.exacta/cli-sandbox/{cli_name}/` (per-CLI isolation)

**Invariant:**  
**INV-MEM-16: No External Agent Memory** — CLI agents SHALL NOT maintain persistent memory, embeddings, session state, or project summaries outside Exacta-controlled storage. This includes prohibition of provider-side “project memory,” “long-term chat memory,” or “workspace recall” features.

**INV-INDEX-CLI-1: Post-CLI Reindex Barrier**

After any CLI agent execution, the Project Index SHALL be invalidated and fully rebuilt from filesystem ground truth before:
- Any AI context is injected
- Any further autonomous actions are executed

### **Settings UI (AI Provider Configuration)**

**Location:** Settings → AI Providers

**User Flow:**

1. Click "Add Provider" button
2. Select provider type from dropdown:
    - **Cloud API** (OpenAI, Anthropic, etc.)
    - **Local Runtime** (Ollama, LM Studio, etc.)
    - **CLI Agent** ⭐ NEW (Goose, Aider, Crush, etc.)
3. If CLI Agent selected, choose specific CLI:
    - Goose CLI (25+ providers, MCP ecosystem)
    - Crush CLI (75+ models, ultra-fast)
    - Aider (Git integration, auto-commits)
    - Codex CLI (OpenAI terminal agent)
    - Droid Factory CLI (Autonomous debugging)
    - GPT Engineer (Project scaffolding)
    - Qwen Code CLI (Specialized coding)
    - Gemini CLI (Google AI)
    - Blackbox CLI (Local execution)
4. Configure CLI-specific settings
5. Test connection (executes CLI with --version or --list-models)
6. Save configuration

### **Configuration Fields (Per Provider Type)**

**Schema Format:** Configuration schemas use TypeScript-like syntax for clarity. Fields marked `// REQUIRED` must be provided. `string` fields accept text, `UUID` fields require valid UUIDs, `enum` fields accept only listed values. Optional fields are marked with `?`. Arrays are denoted `type[]`.

**Cloud API Providers:**

```tsx
CloudProviderConfig {
  provider_id: UUID
  provider_type: 'openai' | 'anthropic' | 'openrouter' | 'google' | 'azure' | 'mistral' | 'cohere' | 'custom'
  display_name: string              // User-friendly name (e.g., "My OpenAI Account")
  api_key: string                   // Encrypted at rest, redacted in logs
  api_endpoint: string              // REQUIRED for 'custom' type (e.g., "https://custom-api.example.com/v1")
}
```

**Auto-Fetch vs. Manual Configuration:**

- **Official providers** (OpenAI, Anthropic, Google, etc.) → Auto-fetch models from known endpoints
- **Custom OpenAI-compatible APIs** → User must enter custom endpoint URL; system attempts auto-fetch from `/v1/models`, falls back to manual model entry if unavailable

**Local Runtime Providers:**

```tsx
LocalRuntimeConfig {
  provider_id: UUID
  provider_type: 'ollama' | 'lmstudio' | 'localai' | 'koboldcpp' | 'textgen-webui' | 'jan' | 'gpt4all'
  display_name: string
  api_endpoint: string              // e.g., "http://localhost:11434" for Ollama
}
```

**CLI Tool Providers:**

```tsx
CLIProviderConfig {
  provider_id: UUID
  provider_type: 'gemini-cli' | 'custom-cli'
  display_name: string
  cli_path: string                  // Absolute path to CLI executable
  cli_args_template: string         // e.g., "--model {model} --prompt {prompt}"
  working_directory?: string        // Optional, defaults to scope_root
  timeout_seconds: number           // Default: 300
  enabled: boolean
}
```

**CLI-Based Agent Providers:**

```tsx
CLIAgentConfig {
  provider_id: UUID
  provider_type: 'goose' | 'crush' | 'aider' | 'codex' | 'droid' | 'gpt-engineer' | 'qwen-code' | 'gemini-cli' | 'blackbox-cli'
  display_name: string
  cli_path: string                  // Absolute path to CLI executable
  installation_method: 'npm' | 'pip' | 'binary' | 'brew' | 'cargo'
  
  // Configuration varies by provider type
  config: GooseConfig | CrushConfig | AiderConfig | CodexConfig | DroidConfig | GPTEngineerConfig | QwenCodeConfig | GeminiCLIConfig | BlackboxCLIConfig
  
  enabled: boolean
  last_health_check: timestamp
  installed_version: string
}

// 1. Goose CLI Configuration
GooseConfig {
  // Multi-provider support
  selected_provider: 'ollama' | 'openai' | 'anthropic' | 'google' | 'azure' | 'bedrock' | 'docker-model-runner'
  
  // Provider credentials (encrypted)
  provider_api_key?: string
  provider_endpoint?: string        // For custom endpoints
  
  // MCP Server Integration
  mcp_servers: MCPServerConfig[]    // Array of enabled MCP servers
  
  // Model selection
  selected_model: string
  
  // Agentic settings
  enable_autonomous_building: boolean
  enable_debugging: boolean
  enable_multi_step_workflows: boolean
  
  // Budget per workflow
  max_tokens_per_workflow: number   // Default: 100k
  max_time_per_workflow: number     // Default: 600 seconds
}

MCPServerConfig {
  server_id: string                 // e.g., "github", "docker", "vscode"
  server_type: 'http' | 'stdio' | 'sse'
  endpoint: string
  enabled: boolean
}

// 2. Crush CLI Configuration
CrushConfig {
  // Multi-model support (75+ providers)
  primary_provider: string          // OpenAI, Claude, Gemini, OpenRouter, local
  primary_model: string
  fallback_provider?: string
  fallback_model?: string
  
  // API credentials
  api_keys: Map<string, string>     // Encrypted per provider
  
  // LSP Integration
  enable_lsp: boolean
  lsp_languages: string[]           // ['csharp', 'typescript', 'cpp']
  
  // Multi-agent mode
  enable_multi_agent: boolean
  max_parallel_agents: number       // Default: 3
  
  // Session management
  enable_session_persistence: boolean
  session_storage_path: string
}

// 3. Aider Configuration
AiderConfig {
  // Best-performing models
  primary_model: 'claude-3-5-sonnet' | 'deepseek-r1' | 'gpt-4o' | string
  
  // API key (encrypted)
  api_key: string
  api_endpoint?: string             // For local models via Ollama
  
  // Git integration
  enable_auto_commits: boolean      // Default: true
  commit_message_template: string   // Default: "[Aider] {summary}"
  
  // Codebase mapping
  enable_codebase_mapping: boolean  // Default: true
  map_refresh_interval: number      // Seconds, default: 60
  
  // Auto-testing
  enable_auto_test: boolean         // Default: true
  test_command: string              // e.g., "dotnet test"
  enable_auto_fix: boolean          // Auto-fix test failures
  
  // Voice input (optional)
  enable_voice_input: boolean       // Default: false
}

// 4. Codex CLI Configuration
CodexConfig {
  // Authentication
  auth_method: 'chatgpt-account' | 'api-key'
  api_key?: string                  // If using API key mode
  
  // Model selection
  model: 'gpt-4' | 'gpt-4-turbo' | 'o3' | 'o4-mini' | string
  
  // Approval modes
  approval_mode: 'suggest' | 'auto-edit' | 'full-auto'
  
  // Repo awareness
  enable_repo_context: boolean      // Default: true
  context_window_size: number       // Default: 128000
  
  // Parallel execution
  max_parallel_tasks: number        // Default: 1
}

// 5. Droid Factory CLI Configuration
DroidConfig {
  // Multi-provider support
  selected_provider: 'openrouter' | 'huggingface' | 'gemini'
  provider_endpoint: string
  api_key: string
  
  // Model selection
  model: string
  
  // Agentic behavior
  enable_self_debugging: boolean    // Default: true
  enable_auto_fixes: boolean        // Default: true
  max_retry_attempts: number        // Default: 3
  
  // Tool calling
  enable_tool_calling: boolean      // Default: true
  allowed_tools: string[]           // ['file_read', 'file_write', 'shell_exec', 'build']
  
  // Codebase analysis
  enable_full_analysis: boolean     // Default: true
  analysis_depth: 'shallow' | 'deep'
}

// 6. GPT Engineer Configuration
GPTEngineerConfig {
  // OpenAI API
  api_key: string
  model: 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo'
  
  // Scaffolding settings
  enable_multi_step_generation: boolean  // Default: true
  generate_objectives: boolean           // Default: true
  generate_features: boolean             // Default: true
  
  // Dependency management
  auto_install_dependencies: boolean     // Default: false (requires user approval)
  package_manager: 'npm' | 'pip' | 'dotnet' | 'auto-detect'
  
  // Output configuration
  output_directory: string               // Relative to scope_root
  create_readme: boolean                 // Default: true
}

// 7. Qwen Code CLI Configuration
QwenCodeConfig {
  // Model selection (via Ollama)
  model: 'qwen3-coder:7b' | 'qwen3-coder:14b' | 'qwen3-coder:32b'
  
  // Ollama endpoint
  ollama_endpoint: string           // Default: "http://localhost:11434"
}
```

### **Model Discovery (Live Model Fetching)**

**Automatic Model Discovery:**

When a provider is added or "Refresh Models" is clicked:

1. **Cloud API Providers:**
    - Send authenticated request to `/v1/models` endpoint (OpenAI-compatible)
    - Parse response, extract model IDs and metadata
    - Display in dropdown with: model name, context window, cost (if available)
    - Cache for 24 hours, refresh on demand
2. **Local Runtimes (Ollama, LM Studio, etc.):**
    - Query local API endpoint for available models
    - Ollama: `GET` [`](http://localhost:11434/api/tags)http://localhost:11434/api/tags`
    - LM Studio: `GET` [`](http://localhost:1234/v1/models)http://localhost:1234/v1/models`
    - Display installed models with size and quantization info
    - Show "Pull Model" button for Ollama (download new models)
3. **CLI Tools:**
    - Execute CLI with `--list-models` or equivalent flag
    - Parse stdout for model list
    - Manual model entry fallback if listing not supported

**Model Selection UI:**

```
[Provider Dropdown: My OpenAI Account ▼]
[Model Dropdown: gpt-4-turbo-2024-04-09 ▼]
   └─ gpt-4-turbo-2024-04-09 (128k context, $10/$30 per 1M tokens)
   └─ gpt-4-0613 (8k context, $30/$60 per 1M tokens)
   └─ gpt-3.5-turbo-0125 (16k context, $0.50/$1.50 per 1M tokens)
   └─ [Refresh Models]

[Test Connection] [Save Configuration]
```

### **API Key Security**

**Storage:**

- API keys encrypted at rest using Windows DPAPI (Data Protection API)
- Stored in: Stored in: C:\Users\<username>\AppData\Roaming\Exacta\providers.encrypted
- Decryption key bound to user account + machine (cannot be exported)

**Redaction:**

- API keys NEVER logged in plaintext
- Audit logs show: `api_key: sk-proj-****...****`
- Only first 4 and last 4 characters shown in UI: `sk-proj-abcd...xyz9`

**Never-Send Rules (INV-SECRET-1):**

**INV-SECRET-1:** API keys and secrets SHALL NEVER be transmitted, logged, or exposed outside the local system. This includes AI prompts, project files, diffs, checkpoints, or external communications.

API keys SHALL NEVER be:

- Included in AI prompts or context
- Sent to AI providers (except their own authentication header)
- Written to project files
- Included in diffs or checkpoints
- Exported in forensic exports (except audit trail of when keys were used)

### **Provider Fallback & Retry Logic**

**If Primary Provider Fails:**

1. Smart retry (3 attempts with exponential backoff: 1s, 2s, 4s)
2. If all retries fail:
    - Check if secondary provider configured
    - Prompt user: "Primary provider (OpenAI) failed. Switch to secondary (Anthropic)? [Yes] [No] [Halt]"
    - User choice recorded in audit log
3. If no fallback → HALT with error code PROVIDER-UNAVAILABLE

**Rate Limit Handling:**

- Detect HTTP 429 (Too Many Requests)
- Parse `Retry-After` header
- Wait specified duration (max 60 seconds)
- If rate limit persists → escalate to user with "Provider rate limited. [Wait] [Switch Provider] [Halt]" dialog

### **OAuth Flow Support (Future)**

For providers requiring OAuth (Google, Microsoft, etc.):

1. Click "Authenticate with [Provider]"
2. Open system browser with OAuth consent screen
3. User authorizes Exacta App Studio
4. Redirect to [localhost](http://localhost) callback with authorization code
5. Exchange code for access token + refresh token
6. Store encrypted refresh token
7. Auto-refresh access token as needed

**OAuth tokens stored separately from API keys**, same encryption (DPAPI).

### **Model Provider Settings (Advanced)**

**Per-Provider Overrides:**

- **Temperature:** 0.0 - 2.0 (default: 0.7)
- **Top-p:** 0.0 - 1.0 (default: 0.95)
- **Max tokens:** 1 - context window max (default: 4096)
- **Frequency penalty:** -2.0 - 2.0 (default: 0)
- **Presence penalty:** -2.0 - 2.0 (default: 0)
- **Stop sequences:** Custom stop tokens

**Constrained Replay Mode (for Audit Reproduction):**

- Force temperature=0, seed={fixed}, top_p=1.0
- Enabled automatically when replaying execution from audit log to **approximate prior AI behavior; output equivalence is NOT guaranteed**
- User can manually enable for reproducible output

### **Model Discovery Protocol**

**Purpose:** Define exact behavior for live model fetching from AI providers.

#### **API Endpoints by Provider Type**

**Cloud Providers (OpenAI-compatible):**

```
GET {base_url}/v1/models
Authorization: Bearer {api_key}
```

**Complete Provider Endpoint Reference (35 Cloud Providers):**

**Major Commercial Providers:**

- **OpenAI:** [`https://api.openai.com/v1/models`](https://api.openai.com/v1/models)
- **Anthropic:** [`https://api.anthropic.com/v1/models`](https://api.anthropic.com/v1/models)
- **Google Gemini:** [`https://generativelanguage.googleapis.com/v1/models`](https://generativelanguage.googleapis.com/v1/models)
- **Azure OpenAI:** `https://{resource}.[openai.azure.com/openai/deployments?api-version=2024-02-01](http://openai.azure.com/openai/deployments?api-version=2024-02-01)`
- **Amazon Bedrock:** [`https://bedrock-runtime.{region}.amazonaws.com/model/{model-id}/invoke`](https://bedrock-runtime.{region}.amazonaws.com/model/{model-id}/invoke)
- **Google Vertex AI:** `https://{region}-[aiplatform.googleapis.com/v1/projects/{project}/locations/{region}/publishers/google/models](http://aiplatform.googleapis.com/v1/projects/{project}/locations/{region}/publishers/google/models)`

**Specialized AI Providers:**

- **Mistral AI:** `https://api.mistral.ai/v1/models`
- **Cohere:** [`](https://api.cohere.ai/v1/models)https://api.cohere.ai/v1/models`
- **AI21 Labs:** [`](https://api.ai21.com/studio/v1/models)https://api.ai21.com/studio/v1/models`
- **Writer:** [`](https://api.writer.com/v1/models)https://api.writer.com/v1/models`
- **Reka AI:** [`](https://api.reka.ai/v1/models)https://api.reka.ai/v1/models`
- **Perplexity AI:** [`](https://api.perplexity.ai/models)https://api.perplexity.ai/models`
- **xAI (Grok):** [`](https://api.x.ai/v1/models)https://api.x.ai/v1/models`
- **Inflection AI:** [`](https://api.inflection.ai/v1/models)https://api.inflection.ai/v1/models`
- [**01.AI**](http://01.AI)**:** [`](https://api.01.ai/v1/models)https://api.01.ai/v1/models`

**Unified Gateways & Aggregators:**

- **OpenRouter:** [`https://openrouter.ai/api/v1/models`](https://openrouter.ai/api/v1/models)
- **Together AI:** [`https://api.together.xyz/v1/models`](https://api.together.xyz/v1/models)
- **Replicate:** [`https://api.replicate.com/v1/models`](https://api.replicate.com/v1/models)
- **Anyscale Endpoints:** [`https://api.endpoints.anyscale.com/v1/models`](https://api.endpoints.anyscale.com/v1/models)
- **HuggingFace Inference API:** [`https://api-inference.huggingface.co/models`](https://api-inference.huggingface.co/models)
- **Fireworks AI:** [`https://api.fireworks.ai/inference/v1/models`](https://api.fireworks.ai/inference/v1/models)
- **DeepInfra:** [`https://api.deepinfra.com/v1/openai/models`](https://api.deepinfra.com/v1/openai/models)
- **Lepton AI:** [`https://api.lepton.ai/api/v1/models`](https://api.lepton.ai/api/v1/models)
- **Groq:** [`https://api.groq.com/openai/v1/models`](https://api.groq.com/openai/v1/models)
- **Monster API:** [`https://api.monsterapi.ai/v1/models`](https://api.monsterapi.ai/v1/models)
- **Novita AI:** [`https://api.novita.ai/v3/openai/models`](https://api.novita.ai/v3/openai/models)

**Enterprise & Private Cloud:**

- **IBM [watsonx.ai](http://watsonx.ai):** `https://{region}.[ml.cloud.ibm.com/ml/v1/foundation_model_specs](http://ml.cloud.ibm.com/ml/v1/foundation_model_specs)`
- **Oracle Cloud Infrastructure:** [`https://inference.generativeai.{region}.oci.oraclecloud.com/20231130/models`](https://inference.generativeai.{region}.oci.oraclecloud.com/20231130/models)
- **Databricks:** `https://{workspace-url}/serving-endpoints/{endpoint-name}/invocations`
- **Snowflake Cortex:** `SELECT CORTEX_AVAILABLE_MODELS()` (SQL-based, no REST endpoint)

**Model Catalog by Provider:**

**OpenAI Models:**

- **GPT-4 Turbo:** `gpt-4-turbo-2024-04-09`, `gpt-4-turbo`, `gpt-4-turbo-preview`
- **GPT-4:** `gpt-4`, `gpt-4-0613`, `gpt-4-32k`
- **GPT-4o:** `gpt-4o`, `gpt-4o-2024-05-13`, `gpt-4o-mini`
- **GPT-3.5 Turbo:** `gpt-3.5-turbo`, `gpt-3.5-turbo-0125`, `gpt-3.5-turbo-16k`
- **o1 Series:** `o1-preview`, `o1-mini`
- **Embeddings:** `text-embedding-3-small`, `text-embedding-3-large`, `text-embedding-ada-002`

**Anthropic Models:**

- **Claude 3.5:** `claude-3-5-sonnet-20241022`, `claude-3-5-sonnet-20240620`
- **Claude 3:** `claude-3-opus-20240229`, `claude-3-sonnet-20240229`, `claude-3-haiku-20240307`
- **Claude 2:** `claude-2.1`, `claude-2.0`
- **Legacy:** `claude-instant-1.2`

**Google Gemini Models:**

- **Gemini 1.5:** `gemini-1.5-pro`, `gemini-1.5-pro-002`, `gemini-1.5-flash`, `gemini-1.5-flash-002`
- **Gemini 1.0:** `gemini-1.0-pro`, `gemini-1.0-pro-vision`
- **Gemini Ultra:** `gemini-ultra` (limited availability)

**Mistral AI Models:**

- **Large:** `mistral-large-latest`, `mistral-large-2402`
- **Medium:** `mistral-medium-latest`, `mistral-medium-2312`
- **Small:** `mistral-small-latest`, `mistral-small-2402`
- **Mixtral:** `open-mixtral-8x7b`, `open-mixtral-8x22b`
- **Open Models:** `open-mistral-7b`, `mistral-tiny`

**Cohere Models:**

- **Command R:** `command-r-plus`, `command-r`
- **Command:** `command`, `command-light`, `command-nightly`
- **Embeddings:** `embed-english-v3.0`, `embed-multilingual-v3.0`

**AI21 Labs Models:**

- **Jamba:** `jamba-instruct`, `jamba-1.5-large`, `jamba-1.5-mini`
- **Jurassic-2:** `j2-ultra`, `j2-mid`, `j2-light`

**OpenRouter Models (100+ models, top examples):**

- All OpenAI, Anthropic, Google, Meta models
- `meta-llama/llama-3.1-405b-instruct`
- `anthropic/claude-3.5-sonnet`
- `openai/gpt-4-turbo`
- `google/gemini-pro-1.5`
- `mistralai/mixtral-8x22b-instruct`

**Groq Models (Ultra-fast LPU):**

- `llama-3.1-405b-reasoning`, `llama-3.1-70b-versatile`, `llama-3.1-8b-instant`
- `mixtral-8x7b-32768`, `gemma-7b-it`, `gemma2-9b-it`

**Amazon Bedrock Models:**

- **Anthropic:** `anthropic.claude-3-5-sonnet-20241022-v2:0`
- **Meta:** `meta.llama3-1-405b-instruct-v1:0`, `meta.llama3-1-70b-instruct-v1:0`
- **Mistral:** `mistral.mistral-large-2402-v1:0`
- **Amazon Titan:** `amazon.titan-text-premier-v1:0`
- **Cohere:** `cohere.command-r-plus-v1:0`

**Azure OpenAI Models:**

- Same as OpenAI (GPT-4, GPT-3.5, embeddings)
- Deployed via Azure resource endpoints
- Model availability varies by region

**Together AI Models (50+ open models):**

- `meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo`
- `mistralai/Mixtral-8x22B-Instruct-v0.1`
- `google/gemma-2-27b-it`
- `Qwen/Qwen2.5-72B-Instruct-Turbo`
- `NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO`

**HuggingFace Inference API:**

- 10,000+ models available
- Query specific model repos: [`](https://api-inference.huggingface.co/models/\{org\}/\{model-name\})https://api-inference.huggingface.co/models/\{org\}/\{model-name\}`
- Popular: `mistralai/Mixtral-8x7B-Instruct-v0.1`, `meta-llama/Llama-2-70b-chat-hf`

**Local Runtimes:**

- **Ollama:** `GET http://localhost:11434/api/tags`
- **LM Studio:** `GET http://localhost:1234/v1/models`
- **LocalAI:** `GET http://localhost:8080/v1/models`
- **Jan:** `GET http://localhost:1337/v1/models`

---

### **Live Model Discovery Implementation (Complete Reference)**

This section defines the exact HTTP requests, authentication methods, response parsing, and fallback behavior for every supported provider.

#### **Provider Discovery Matrix**

| Provider Category | Auth Method | Endpoint Pattern | Response Format | Fallback |
|-------------------|-------------|------------------|-----------------|----------|
| OpenAI-compatible | Bearer Token | `/v1/models` | JSON array | Manual entry |
| Anthropic | `x-api-key` header | `/v1/models` | JSON array | Manual entry |
| Google Gemini | API key param | `/v1beta/models` | JSON array | Manual entry |
| Azure OpenAI | `api-key` header | `/openai/deployments` | JSON array | Manual entry |
| AWS Bedrock | AWS Signature V4 | ListFoundationModels API | JSON | Manual entry |
| Local Runtimes | None | Varies | JSON | Manual entry |
| CLI Agents | N/A (shell exec) | CLI command | JSON/Text | Manual entry |

---

#### **Cloud Providers — Full Discovery Specification**

**1. OpenAI**
```
Endpoint: GET https://api.openai.com/v1/models
Headers:
  Authorization: Bearer {api_key}
  Content-Type: application/json

Response parsing:
  models = response.data.filter(m => m.id.startsWith('gpt') || m.id.startsWith('o1'))
  
Extract fields:
  id: model.id
  context_window: model.context_window (if available) or lookup from known catalog
  created: model.created
```

**2. Anthropic**
```
Endpoint: GET https://api.anthropic.com/v1/models
Headers:
  x-api-key: {api_key}
  anthropic-version: 2024-01-01
  Content-Type: application/json

Response parsing:
  models = response.data

Note: Anthropic may return limited model list. Supplement with known catalog:
  claude-3-5-sonnet-20241022, claude-3-opus-20240229, claude-3-sonnet-20240229, claude-3-haiku-20240307
```

**3. Google Gemini (AI Studio)**
```
Endpoint: GET https://generativelanguage.googleapis.com/v1beta/models?key={api_key}
Headers:
  Content-Type: application/json

Response parsing:
  models = response.models.filter(m => m.supportedGenerationMethods.includes('generateContent'))
  
Extract fields:
  id: model.name.replace('models/', '')
  display_name: model.displayName
  context_window: model.inputTokenLimit
  output_limit: model.outputTokenLimit
```

**4. Azure OpenAI**
```
Endpoint: GET https://{resource_name}.openai.azure.com/openai/deployments?api-version=2024-02-01
Headers:
  api-key: {api_key}
  Content-Type: application/json

Response parsing:
  models = response.data.map(d => ({
    id: d.id,
    model: d.model,
    status: d.status
  })).filter(d => d.status === 'succeeded')

Note: Azure returns deployments, not models. Each deployment maps to a base model.
```

**5. Amazon Bedrock**
```
Method: AWS SDK call (not REST)
SDK: @aws-sdk/client-bedrock
Call: ListFoundationModels

Pseudocode:
  const client = new BedrockClient({ region, credentials })
  const response = await client.send(new ListFoundationModelsCommand({}))
  models = response.modelSummaries.filter(m => m.modelLifecycle.status === 'ACTIVE')

Extract fields:
  id: model.modelId
  provider: model.providerName
  input_modalities: model.inputModalities
  output_modalities: model.outputModalities
  
Fallback: If AWS SDK unavailable, use static catalog of known Bedrock models.
```

**6. Google Vertex AI**
```
Endpoint: GET https://{region}-aiplatform.googleapis.com/v1/projects/{project_id}/locations/{region}/publishers/google/models
Headers:
  Authorization: Bearer {oauth_token}
  Content-Type: application/json

Note: Requires OAuth token, not API key. Use Google Cloud Application Default Credentials.

Response parsing:
  models = response.models

Fallback: Use static catalog (gemini-1.5-pro, gemini-1.5-flash, etc.)
```

**7. Mistral AI**
```
Endpoint: GET https://api.mistral.ai/v1/models
Headers:
  Authorization: Bearer {api_key}
  Content-Type: application/json

Response parsing:
  models = response.data

Extract fields:
  id: model.id
  created: model.created
  owned_by: model.owned_by
```

**8. Cohere**
```
Endpoint: GET https://api.cohere.ai/v1/models
Headers:
  Authorization: Bearer {api_key}
  Content-Type: application/json

Response parsing:
  models = response.models.filter(m => m.endpoints.includes('generate') || m.endpoints.includes('chat'))
  
Extract fields:
  id: model.name
  context_length: model.context_length
  tokenizer_url: model.tokenizer_url
```

**9. AI21 Labs**
```
Endpoint: GET https://api.ai21.com/studio/v1/models
Headers:
  Authorization: Bearer {api_key}
  Content-Type: application/json

Response parsing:
  models = response.models

Known models (supplement if API incomplete):
  jamba-instruct, jamba-1.5-large, jamba-1.5-mini, j2-ultra, j2-mid
```

**10. Groq**
```
Endpoint: GET https://api.groq.com/openai/v1/models
Headers:
  Authorization: Bearer {api_key}
  Content-Type: application/json

Response parsing:
  models = response.data

Note: Groq is fully OpenAI-compatible. No special handling required.
```

**11. OpenRouter**
```
Endpoint: GET https://openrouter.ai/api/v1/models
Headers:
  Authorization: Bearer {api_key}
  Content-Type: application/json

Response parsing:
  models = response.data

Extract fields:
  id: model.id
  name: model.name
  context_length: model.context_length
  pricing: { prompt: model.pricing.prompt, completion: model.pricing.completion }
  
Note: OpenRouter returns 100+ models. Filter by capability or show paginated list.
```

**12. Together AI**
```
Endpoint: GET https://api.together.xyz/v1/models
Headers:
  Authorization: Bearer {api_key}
  Content-Type: application/json

Response parsing:
  models = response.filter(m => m.type === 'chat' || m.type === 'language')

Extract fields:
  id: model.id
  context_length: model.context_length
  pricing: model.pricing
```

**13. Fireworks AI**
```
Endpoint: GET https://api.fireworks.ai/inference/v1/models
Headers:
  Authorization: Bearer {api_key}
  Content-Type: application/json

Response parsing:
  models = response.data

Note: OpenAI-compatible response format.
```

**14. DeepInfra**
```
Endpoint: GET https://api.deepinfra.com/v1/openai/models
Headers:
  Authorization: Bearer {api_key}
  Content-Type: application/json

Response parsing:
  models = response.data

Note: OpenAI-compatible response format.
```

**15. HuggingFace Inference API**
```
Endpoint: GET https://huggingface.co/api/models?filter=text-generation&sort=downloads&limit=50
Headers:
  Authorization: Bearer {api_key}
  Content-Type: application/json

Response parsing:
  models = response.map(m => ({
    id: m.id,
    downloads: m.downloads,
    likes: m.likes,
    pipeline_tag: m.pipeline_tag
  })).filter(m => m.pipeline_tag === 'text-generation')

Note: HuggingFace returns 10,000+ models. Apply filters and pagination.
```

**16. Replicate**
```
Endpoint: GET https://api.replicate.com/v1/models
Headers:
  Authorization: Token {api_key}
  Content-Type: application/json

Response parsing:
  models = response.results

Note: Replicate uses "Token" auth prefix, not "Bearer".
```

**17. Perplexity AI**
```
Endpoint: GET https://api.perplexity.ai/models
Headers:
  Authorization: Bearer {api_key}
  Content-Type: application/json

Known models (API may not list all):
  llama-3.1-sonar-small-128k-online
  llama-3.1-sonar-large-128k-online
  llama-3.1-sonar-huge-128k-online
```

**18-35. Remaining Providers (Grouped by Pattern)**

**OpenAI-Compatible (Standard Pattern):**
- Lepton AI: `GET https://api.lepton.ai/api/v1/models`
- Monster API: `GET https://api.monsterapi.ai/v1/models`
- Novita AI: `GET https://api.novita.ai/v3/openai/models`
- Anyscale: `GET https://api.endpoints.anyscale.com/v1/models`

**Custom Auth Required:**
- xAI (Grok): `GET https://api.x.ai/v1/models` (Bearer token)
- Reka AI: `GET https://api.reka.ai/v1/models` (Bearer token)
- Writer: `GET https://api.writer.com/v1/models` (Bearer token)
- Inflection AI: Contact-based access (no public API)
- 01.AI: `GET https://api.01.ai/v1/models` (Bearer token)

**Enterprise (Requires Org Credentials):**
- IBM watsonx.ai: Use IBM Cloud SDK with IAM token
- Oracle OCI: Use OCI SDK with API signing
- Databricks: Use workspace token + endpoint
- Snowflake Cortex: SQL query `SELECT CORTEX_AVAILABLE_MODELS()`

---

#### **Local Runtimes — Full Discovery Specification**

| Runtime | Endpoint | Port | Response Format |
|---------|----------|------|-----------------|
| Ollama | `GET /api/tags` | 11434 | `{ models: [...] }` |
| LM Studio | `GET /v1/models` | 1234 | OpenAI-compatible |
| LocalAI | `GET /v1/models` | 8080 | OpenAI-compatible |
| Jan | `GET /v1/models` | 1337 | OpenAI-compatible |
| GPT4All | `GET /v1/models` | 4891 | OpenAI-compatible |
| KoboldCpp | `GET /api/v1/model` | 5001 | `{ result: "model_name" }` |
| llama.cpp server | `GET /v1/models` | 8080 | OpenAI-compatible |
| vLLM | `GET /v1/models` | 8000 | OpenAI-compatible |
| TGI | `GET /info` | 8080 | `{ model_id, max_input_length, ... }` |
| Xinference | `GET /v1/models` | 9997 | OpenAI-compatible |
| Text Generation WebUI | `GET /v1/internal/model/list` | 5000 | `{ model_names: [...] }` |
| FastChat | `GET /v1/models` | 21001 | OpenAI-compatible |
| LiteLLM Proxy | `GET /v1/models` | 4000 | OpenAI-compatible |

**Ollama-Specific Parsing:**
```
Endpoint: GET http://localhost:11434/api/tags

Response parsing:
  models = response.models.map(m => ({
    id: m.name,
    size: m.size,
    modified: m.modified_at,
    digest: m.digest,
    details: {
      family: m.details.family,
      parameter_size: m.details.parameter_size,
      quantization: m.details.quantization_level
    }
  }))
```

**TGI-Specific Parsing:**
```
Endpoint: GET http://localhost:8080/info

Response parsing:
  model = {
    id: response.model_id,
    context_window: response.max_input_length,
    max_output: response.max_total_tokens - response.max_input_length,
    dtype: response.dtype
  }
  
Note: TGI serves one model at a time. Returns single model info, not list.
```

**KoboldCpp-Specific Parsing:**
```
Endpoint: GET http://localhost:5001/api/v1/model

Response parsing:
  model = {
    id: response.result,
    loaded: true
  }
  
Additional info: GET http://localhost:5001/api/v1/config/max_context_length
```

---

#### **CLI Agents — Full Discovery Specification**

**Version Detection (Run First):**

All CLI agents must pass version detection before model discovery:

| CLI | Version Command | Success Pattern |
|-----|-----------------|-----------------|
| Goose CLI | `goose --version` | `goose x.y.z` |
| Crush CLI | `crush --version` | `crush vx.y.z` |
| Aider | `aider --version` | `aider x.y.z` |
| Codex CLI | `codex --version` | `x.y.z` |
| Droid Factory | `droid --version` | `droid x.y.z` |
| GPT Engineer | `gpt-engineer --version` | `gpt-engineer x.y.z` |
| Gemini CLI | `gemini --version` | `x.y.z` |
| Blackbox CLI | `blackbox-cli --version` | `x.y.z` |

**Version Compatibility Handling:**
- If installed version < minimum supported → Show upgrade prompt, disable provider
- If installed version > known tested → Warn "Untested version", allow with disclaimer  
- Minimum versions: Goose 1.8+, Crush 2.3+, Aider 0.58.0+, Codex 0.91+, Droid 1.4+, Gemini 1.9+, Blackbox 2.1+

**Model Discovery Commands:**

```typescript
CLIModelDiscovery {
  goose: {
    command: 'goose models --json',
    parse: (stdout) => JSON.parse(stdout).models,
    fallback: ['gpt-4o', 'claude-3-5-sonnet', 'llama3.2']
  },
  
  crush: {
    command: 'crush --list-models --format json',
    parse: (stdout) => JSON.parse(stdout),
    fallback: ['gpt-4', 'claude-3-opus', 'gemini-1.5-pro']
  },
  
  aider: {
    command: 'aider --list-models --non-interactive',
    parse: (stdout) => stdout.split('\n').filter(l => l.trim()),
    fallback: ['claude-3-5-sonnet', 'gpt-4o', 'deepseek-r1']
  },
  
  codex: {
    command: 'codex models list --json',
    parse: (stdout) => JSON.parse(stdout).models,
    fallback: ['gpt-4', 'gpt-4-turbo', 'o3', 'o4-mini']
  },
  
  droid: {
    command: 'droid models --json',
    parse: (stdout) => JSON.parse(stdout),
    fallback: ['gpt-4o', 'gemini-1.5-pro']
  },
  
  'gpt-engineer': {
    command: null,  // No model discovery - uses OpenAI only
    parse: null,
    fallback: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo']
  },
  
  'qwen-code': {
    command: 'ollama list --format json',
    parse: (stdout) => JSON.parse(stdout).models.filter(m => m.name.includes('qwen')),
    fallback: ['qwen3-coder:7b', 'qwen3-coder:14b', 'qwen3-coder:32b']
  },
  
  'gemini-cli': {
    command: 'gemini models list --output=json',
    parse: (stdout) => JSON.parse(stdout).models,
    fallback: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash-exp']
  },
  
  'blackbox-cli': {
    command: 'blackbox-cli models --json',
    parse: (stdout) => JSON.parse(stdout),
    fallback: ['blackbox-ai']
  }
}
```

---

#### **Discovery Error Recovery Matrix**

| Error Type | HTTP Code | Recovery Action |
|------------|-----------|-----------------|
| Network timeout | — | Retry 3x with backoff (1s, 2s, 4s), then use cache |
| Auth failure | 401, 403 | Show "Invalid API key" error, no retry |
| Endpoint not found | 404 | Check if provider changed API, use fallback catalog |
| Rate limited | 429 | Parse Retry-After, wait, then retry once |
| Server error | 500, 502, 503 | Retry 3x with backoff, then use cache |
| Invalid JSON | — | Log parse error, use fallback catalog |
| Empty response | — | Warn user, use fallback catalog |
| CLI not found | — | Show installation instructions |
| CLI timeout (30s) | — | Kill process, use fallback catalog |

---

#### **Static Fallback Catalogs (When Live Discovery Fails)**

When live model discovery fails, Exacta uses these built-in catalogs:

```typescript
FallbackCatalogs = {
  openai: [
    { id: 'gpt-4o', context: 128000, output: 16384 },
    { id: 'gpt-4o-mini', context: 128000, output: 16384 },
    { id: 'gpt-4-turbo', context: 128000, output: 4096 },
    { id: 'gpt-4', context: 8192, output: 8192 },
    { id: 'o1-preview', context: 128000, output: 32768 },
    { id: 'o1-mini', context: 128000, output: 65536 }
  ],
  
  anthropic: [
    { id: 'claude-3-5-sonnet-20241022', context: 200000, output: 8192 },
    { id: 'claude-3-opus-20240229', context: 200000, output: 4096 },
    { id: 'claude-3-sonnet-20240229', context: 200000, output: 4096 },
    { id: 'claude-3-haiku-20240307', context: 200000, output: 4096 }
  ],
  
  google: [
    { id: 'gemini-1.5-pro', context: 1000000, output: 8192 },
    { id: 'gemini-1.5-flash', context: 1000000, output: 8192 },
    { id: 'gemini-2.0-flash-exp', context: 1000000, output: 8192 }
  ],
  
  mistral: [
    { id: 'mistral-large-latest', context: 128000, output: 8192 },
    { id: 'mistral-small-latest', context: 32000, output: 8192 },
    { id: 'open-mixtral-8x22b', context: 65536, output: 8192 }
  ],
  
  groq: [
    { id: 'llama-3.1-70b-versatile', context: 131072, output: 8192 },
    { id: 'llama-3.1-8b-instant', context: 131072, output: 8192 },
    { id: 'mixtral-8x7b-32768', context: 32768, output: 8192 }
  ]
}
```

**Invariant:**  
**INV-DISCOVERY-1: Graceful Degradation** — If live model discovery fails, the system SHALL use the static fallback catalog with a visible warning banner. The system SHALL NOT block provider configuration due to discovery failure.

---

**CLI-Based Agents – Live Model Discovery (2025 status)**

All major CLI agents now support structured model listing. Exacta uses the following commands:

**All CLI agents are executed with `--version` first as a health probe (READ-class only). Model discovery runs only after successful version detection.**

| Provider       | Model Discovery Command                            | Output Format | Since version |
|----------------|----------------------------------------------------|----------------|---------------|
| Goose CLI      | `goose models --json`                              | JSON           | 1.8+          |
| Crush CLI      | `crush --list-models --format json`                | JSON           | 2.3+          |
| Aider          | `aider --list-models --non-interactive`           | Plain text     | 0.58.0+       |
| Codex CLI      | `codex models list --json`                         | JSON           | 0.91+         |
| Droid Factory  | `droid models --json`                              | JSON           | 1.4+          |
| GPT Engineer   | N/A (uses configured OpenAI model only)           | —              | —             |
| Qwen Code      | `ollama list --format json`                        | JSON           | Ollama 0.1.30+|
| Gemini CLI     | `gemini models list --output=json`                 | JSON           | 1.9+          |
| Blackbox CLI   | `blackbox-cli models --json`                       | JSON           | 2.1+          |

→ Exacta automatically tries these commands in order, falls back to cached or manual entry only if all fail.

**Discovery Behavior:**

- **Goose, Crush, Aider, Codex, Droid, Gemini, Blackbox:** Support live model fetching via CLI command
- **GPT Engineer:** Manual model entry (uses configured OpenAI model only)
- **Qwen Code:** Queries Ollama runtime for installed models

#### **Trigger Behavior**

| User Action | Behavior |
| --- | --- |
| Select provider type (Cloud/Local/CLI) | No fetch, show config form only |
| Enter API key + base URL | No fetch yet |
| Click "Test Connection" | **TRIGGER:** Fetch models + validate credentials + measure latency |
| Save configuration without test | No fetch, warn "⚠️ Not tested" |
| Re-open saved provider | Load cached model list (last fetched) |
| Click "Refresh Models" button | Force re-fetch (updates cache) |

**Rule:** Fetch **only** on explicit user action (`Test Connection` or `Refresh Models`), **never** automatically on keystroke or selection.

**Rationale:** Autonomous system → every network call must be user-initiated and auditable.

#### **Metadata Display Format**

**Minimum Required Fields:**

```json
{
  "id": "gpt-4-0125-preview",
  "name": "GPT-4 Turbo (Jan 2024)",
  "context_window": 128000,
  "max_output_tokens": 4096,
  "input_cost_per_1k": 0.01,
  "output_cost_per_1k": 0.03,
  "supports_vision": true,
  "supports_function_calling": true
}
```

**UI Display Format:**

```
📦 gpt-4-0125-preview
   GPT-4 Turbo (Jan 2024)
   128K context | 4K output
   $0.01/$0.03 per 1K tokens (in/out)
   ✅ Vision  ✅ Functions
```

**Fallback:** If provider doesn't return pricing/context window → show "Unknown" and allow manual entry in Advanced Settings.

#### **Error Handling**

| Error | UI Response |
| --- | --- |
| Network timeout | "❌ Connection failed (timeout after 10s)" |
| 401 Unauthorized | "❌ Invalid API key" |
| 404 Not Found | "❌ Endpoint not found (check base URL)" |
| Rate limit (429) | "⚠️ Rate limited, retry in {seconds}s" |
| Invalid JSON response | "❌ Unexpected response format" |
| Empty model list | "⚠️ No models available (check account)" |
| Selected model missing from provider model list | "⚠️ Model not found in provider catalog (may be deprecated or unavailable)" |

#### **Caching Strategy**

**Cache Location:** C:\Users\<username>\AppData\Roaming\Exacta\model_cache.json per provider

**Cache Expiry:** 24 hours

**Cache Structure:**

```json
{
  "provider_id": "openai-main",
  "fetched_at": "2026-01-16T14:37:10Z",
  "models": [...]
}
```

**Cache Invalidation:**

- Automatic after 24 hours
- Manual via "Refresh Models" button
- Automatic when provider configuration changes (API key, endpoint)

**Offline Behavior:**

- If cache exists and network unavailable → use cached models with warning banner
- If no cache and network unavailable → manual model entry required

### **Default Provider Selection**

If no provider is configured, the system prompts:

```
No AI provider configured.
Please add a provider in Settings → AI Providers.
```

### **CLI Provider Auto-Detection & First-Time Setup Flow:**

When user opens Settings → AI Providers → Add Provider → CLI Agent:

1. **Scan for Installed CLIs:**

```
Detecting installed CLI tools...
 ✅ Ollama found at C:\Users\{user}\AppData\Local\Programs\Ollama\ollama.exe
 ✅ Goose CLI found in PATH (version 1.2.3)
 ❌ Aider not found
 ✅ Codex CLI found via npm global (version 0.87.0)
```

2. **Offer Quick Setup:**
- "Use Ollama + Qwen Code (Free, fully local)" → One-click setup
- "Use Goose CLI with Ollama (Free, 25+ providers)" → One-click setup
- "Install Aider via pip" → Show installation command
3. **Display Install Instructions:**

For undetected CLIs, show platform-specific install commands:

| CLI | Installation Command |
| --- | --- |
| Goose | `brew install goose` or `npm install -g @block/goose` |
| Crush | Download from GitHub releases |
| Aider | `pip install aider-chat` |
| Codex | `npm install -g @openai/codex` |
| Droid | `npm install -g droid-cli` |
| GPT Engineer | `pip install gpt-engineer` |
| Qwen Code | Via Ollama: `ollama pull qwen3-coder:7b` |
| Gemini CLI | `npm install -g @google/gemini-cli` (requires Node.js 18+) 
or run once: `npx @google/gemini-cli` |
| Blackbox | Download from [blackbox.ai](http://blackbox.ai) |

**Detection Paths (Windows):**

- **npm globals:** `%APPDATA%\npm\{cli-name}.cmd`
- **pip globals:** `%LOCALAPPDATA%\Programs\Python\Python3x\Scripts\{cli-name}.exe`
- **Homebrew (Windows):** `C:\Program Files\Homebrew\bin\{cli-name}.exe`
- **Manual binaries:** Search `PATH` environment variable
- **Ollama:** `%LOCALAPPDATA%\Programs\Ollama\ollama.exe`

**Preflight Checks:**

- Health checks and version probes MUST run as READ-class commands under `SHELL_EXEC` (there is no separate `SHELL_READ` capability).
- Any preflight that requires network MUST be gated by the appropriate NET_* capability token.

### **Provider Health Dashboard**

Settings → AI Providers → Health

**Local-only:** Health metrics (latency, error rate, call counts, last used) are computed and stored on-device and are never transmitted.

| Provider | Status | Last Used | Calls (24h) | Avg Latency | Error Rate |
| --- | --- | --- | --- | --- | --- |
| My OpenAI | 🟢 Online | 2 min ago | 47 | 1.2s | 0% |
| Ollama Local | 🟢 Online | 15 min ago | 12 | 3.8s | 0% |
| OpenRouter | 🟡 Slow | 1 hour ago | 8 | 8.4s | 12.5% |
| Anthropic | 🔴 Offline | 2 days ago | 0 | N/A | 100% |

**Health Checks:**

- Passive monitoring (track actual API call success/failure)
- Active ping (optional, user can enable periodic health checks)
- Alert if provider offline for >1 hour during active goal execution

---

## 🎨 **User Experience Enhancements**

### **Streaming AI Responses**

**Real-time Progress Indication:**

When AI is generating a response:
```
🤖 AI is thinking...

Analyzing dependencies... ✓
Planning changes... ✓  
Generating diffs... [████████░░] 80%
  • src/App.tsx (done)
  • src/api/users.ts (done)
  • src/utils/helpers.ts (in progress...)
```

**Streaming Diff Preview:**
- Show diffs as they're generated (line-by-line)
- Syntax highlighting for code changes
- Collapsible sections for large diffs

**Rationale:** Improve perceived performance and give Operator visibility into AI progress without violating any security boundaries.

### **AI Progress Indicators (Lovable-Inspired)**

When the AI starts processing a user request, Exacta displays layered progress information:

**Level 1: High-Level Status (Always Visible)**

```
┌─────────────────────────────────────────────────────┐
│  🤖 Exacta is building your application...          │
│     ████████████████████░░░░░░░░  68% complete      │
│                                                      │
│     Current Step: Adding SQLite persistence         │
│     Estimated time: 45 seconds remaining            │
└─────────────────────────────────────────────────────┘
```

**Level 2: File-Level Progress (Expandable)**

Click "Show Details" to see:

```
┌─────────────────────────────────────────────────────┐
│  Step 1: Analyzing dependencies          ✓ Complete │
│  Step 2: Generating data models           ⏳ Active  │
│    └─ src/models/Todo.cs        [████████░░] 80%    │
│    └─ src/models/TodoContext.cs [██░░░░░░░░] 20%    │
│  Step 3: Creating database layer           ○ Pending │
│  Step 4: Updating UI components            ○ Pending │
│  Step 5: Running tests                     ○ Pending │
└─────────────────────────────────────────────────────┘
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
- ✅ Exacta shows **file-level progress** (Lovable doesn't)
- ✅ Exacta shows **policy validation steps** (Lovable auto-applies)
- ✅ Exacta shows **budget consumption** in real-time
- ✅ Exacta requires **explicit commit** (Lovable auto-applies)

---

### **Optimistic UI Updates**

**Before Checkpoint Commit:**

```
Applying changes...
✓ src/App.tsx (staged)
✓ src/api/users.ts (staged)
⏳ Validating policy... 
⏳ Computing checkpoint hash...
```

**After Commit:**
```
✅ Checkpoint created: cp_a3f9c2
   3 files modified, 68 lines changed
   
[View Changes] [Rollback] [Continue]
```

**Rationale:** Keep Operator informed during atomic commit without allowing partial state visibility.

---

### **Context Coverage Transparency**

When Progressive Context Mode activates:

```
📊 Context Coverage: 42% (517 / 1,234 files)

Current shard includes:
• 12 files from src/core/
• 5 files from src/api/
• 3 files from src/utils/

Files deferred to next shard:
• 8 files from src/components/
• 15 files from tests/

Estimated shards remaining: 5
Estimated time to full coverage: 12 minutes

[View Coverage Map] [Adjust Shard Size]
```

**Rationale:** Make Progressive Context Mode's behavior transparent and give Operator control over shard sizing.

---

### **Interactive Checkpoint Timeline**

**Visual Timeline:**

```
Goal: Build WPF Todo App (ID: goal_f4a9)

├─ cp_001 (12:05) Initial scaffold ●
├─ cp_002 (12:18) Added SQLite ●
├─ cp_003 (12:31) UI components ● ← Current
└─ cp_004 (12:45) Packaging ○ (pending)

Click checkpoint to:
• View file changes
• Inspect budget state
• Rollback to this point
• Compare with other checkpoints
```

**Diff Comparison:**
```
Compare: [cp_001] ⟷ [cp_003]

Files changed: 15
Lines added: 342
Lines removed: 87

[View Full Diff] [Rollback to cp_001] [Export Diff]
```

**Rationale:** Make checkpoint system more accessible and encourage frequent rollbacks when needed.

## 💬 **Chat Interface & Interaction Patterns**

### **Chat Panel Design (Lovable-Inspired)**

**Layout:**

```
┌─────────────────────────────────────────────┐
│  Conversation with Exacta                   │
├─────────────────────────────────────────────┤
│                                             │
│  👤 You (12:34 PM)                          │
│  Add SQLite persistence for todos           │
│                                             │
│  🤖 Exacta (12:34 PM)                       │
│  I'll add SQLite persistence. This will:    │
│  • Create TodoContext.cs (EF Core)          │
│  • Add Todo.Id property                     │
│  • Register DbContext in Program.cs         │
│                                             │
│  Budget impact: 2 files, 54 lines, ~1.2k tokens │
│  [Preview Changes] [Apply]                  │
│                                             │
│  👤 You (12:35 PM)                          │
│  Also add due dates to tasks               │
│                                             │
│  🤖 Exacta is typing...                     │
│                                             │
├─────────────────────────────────────────────┤
│  Type your instruction...          [Send]  │
└─────────────────────────────────────────────┘
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
- Budget impact preview
- Action buttons (Preview, Apply, Reject)

**3. System Messages**
- Build completed: ✅ Build successful (3 warnings)
- Policy denied: ⛔ Action denied: SHELL_EXEC required
- Checkpoint created: 💾 Checkpoint cp_a3f9c2 saved

**4. Streaming Indicators**
- "Exacta is typing..." (when AI processing)
- "Guardian is validating..." (during policy check)
- "Building..." (during compilation)

### **Chat Features**

**Context Awareness:**
- AI can reference previous messages
- Every message includes current budget state
- File references auto-link to file tree

**Quick Actions:**
```
Recent commands:
[Add Feature] [Fix Bug] [Build] [Test] [Deploy]
```

**Conversation Export:**
```
[Export Chat] → Saves as .md with:
- All messages
- Budget usage per request  
- Checkpoints created
- Files modified
```

**Keyboard Shortcuts:**
- `Enter` → Send message
- `Shift+Enter` → New line
- `Ctrl+K` → Clear chat
- `Ctrl+R` → Rollback last change

---

## 🚀 Getting Started

### **System Requirements**

- **Windows 10 Build 1809 or later, or Windows 11 (64-bit)** — Minimum supported OS version. Build 1809 required for Job Object enforcement and process isolation features.
- .NET Runtime (version 8.0 or later)
- 4GB RAM minimum, 8GB recommended
- 500MB disk space for application
- **Offline-capable** — Can operate without internet connection (with warnings and cached documentation fallback)

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
2. Enter continuous loop: PERCEIVE → DECIDE → ACT → OBSERVE → CHECKPOINT
3. Show live action stream in supervisor UI
4. Display real-time budget meters and capability status
5. Create checkpoint after each cycle for rollback
6. Run until goal satisfied, budget exhausted, or user stops
7. Log causal chain: goal_id → cycle_id → decision_id → actions → results
8. **Persist full plan + state** — System survives reboots and can resume execution from last checkpoint

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

- ✅ Halt execution
- ✅ Rollback to checkpoint
- ✅ Approve upgrades
- ✅ Evidence and Legal Hold control
- ✅ Enable/disable Safe Mode (system-wide safety profile)
- ✅ Grant or revoke capability tokens for goals
- ❌ **Cannot bypass budgets** (hard enforced by Core)
- ❌ **Cannot disable sandbox** (Guardian-enforced)
- ❌ **Cannot modify audit logs** (Guardian-owned, immutable)
- ❌ **Cannot alter policy engine rules at runtime** (requires upgrade)

**Rationale:** Even Operator privilege cannot weaken core safety guarantees. This prevents accidental or coerced bypass of security boundaries.

### **AI Agent Trust Boundary**

**AI is:** Untrusted decision proposer, NOT authority

**System is:** Sole execution authority with capability enforcement

### **What Exacta App Studio CAN do:**

- ✅ Read/write project files within scope_root
- ✅ Orchestrate execution of external build and packaging tools as sandboxed subprocesses
- ✅ Execute shell commands (within classification policy)
- ✅ Make network calls to AI APIs and documentation sources
- ✅ Create checkpoints and rollback to any cycle
- ✅ Run autonomously within goal and budget constraints
- ✅ **Propose system upgrades** (via Controlled Self-Upgrade Pipeline)

### **What Exacta App Studio CANNOT do:**

- ❌ **Patch its own executables** (core binary is immutable)
- ❌ **Change its safety rules** (policy engine is immutable)
- ❌ **Modify capability enforcement** (Guardian is immutable)
- ❌ **Alter its logging or audit system** (audit log is trustworthy)
- ❌ Grant itself additional permissions or capability tokens
- ❌ Modify Guardian or system paths
- ❌ Bypass policy engine decisions
- ❌ **Apply unsigned upgrades** (requires human + signed installer)
- ❌ Embed or implement compiler/linker/packaging/signing toolchains (or bypass their trust boundaries)
- ❌ Escape project root jail
- ❌ Exceed budget caps (hard enforced)
- ❌ Act without presenting valid capability token
- ❌ Continue after emergency stop

### **Why Immutable Core Matters**

**Trust Anchor:** The binary itself is the trust anchor. Your invariants are guarantees, not documentation.

**Guarantees:**

- ✅ Logs are trustworthy (agent cannot rewrite audit trail)
- ✅ Budgets are enforced (agent cannot disable caps)
- ✅ Capability limits are real (agent cannot remove tokens)
- ✅ Kill switch works (agent cannot patch it out)
- ✅ Rollback always possible (checkpoint system is protected)
- ✅ System is certifiable (formal safety guarantees)

**Controlled Self-Upgrade Pipeline:**

The agent can propose upgrades but **cannot apply them:**

```jsx
Agent detects bug or improvement opportunity
         ↓
Generates patch / update proposal (staged in .exacta/upgrades/pending/)
         ↓
User reviews diffs, risk assessment, privilege impact
         ↓
User explicitly approves upgrade
         ↓
Guardian verifies signature + hashes
         ↓
Guardian applies update atomically (agent halted during upgrade)
         ↓
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
- **Trusted Root** — Guardian verifies signatures against a vendor-controlled public root certificate embedded at build time and protected by OS code integrity mechanisms (Windows Authenticode)

**Root Rotation Policy:** The trusted root certificate may only be updated via a Guardian-controlled, dual-signed upgrade package containing both the current valid root and the new root. Root changes require explicit Operator approval and are recorded as a CRITICAL security event in the audit log.

**Root Lifetime Guidance:** Implementations SHOULD define a maximum trusted root lifetime (e.g., 2 years) and surface warnings prior to expiry.

### **User as Governor**

In autonomous mode, you are not an approver—you are a **governor**:

- Set goals, budgets, and capability boundaries
- Monitor live action stream
- Toggle capabilities on/off during execution
- View budget meters in real-time
- Browse checkpoint timeline
- Emergency STOP at any time (keyboard shortcut: **Ctrl+Alt+X**)
  - Note: Ctrl+Shift+Esc opens Windows Task Manager
  - To force-kill Exacta if UI freezes, use Task Manager and end "Exacta.exe"
- Rollback to any checkpoint

### **Autonomy Approval Matrix**

The following table clarifies **when user approval is required** vs. when the system auto-executes:

| Action Type | Risk Level | Approval Required? | Who Decides |
| --- | --- | --- | --- |
| **Goal creation** | N/A | ✅ YES (explicit) | User |
| **Capability grant** | Varies | ✅ YES (per capability) | User |
| **File read** | Low | ❌ NO (auto-execute) | Policy Engine |
| **File write** (1-10 files) | Low | ❌ NO (auto-execute) | Policy Engine |
| **File write** (11-50 files) | Medium | ⚠️ DEPENDS on profile | Active Profile |
| **Build execution** | Medium | ❌ NO (auto-execute) | Policy Engine |
| **Package creation** | High | ⚠️ DEPENDS on profile | Active Profile |
| **Shell command** (READ class) | Low | ❌ NO (auto-execute) | Policy Engine |
| **Shell command** (SYSTEM class) | Critical | ✅ YES (always) | User |
| **System path access** | Critical | ✅ YES (always) | Guardian |
| **Policy override** | Critical | ✅ YES (dual approval) | User + Guardian |
| **Upgrade application** | Critical | ✅ YES (explicit) | User + Guardian |

**Clarification:** "Fully autonomous" means the system runs **goal-driven loops without per-step approval**. User approves the **goal** and **capabilities** upfront, then the system auto-executes steps within those boundaries. High-risk actions (SYSTEM shell commands, policy overrides, upgrades) always require explicit user confirmation.

### **Supervisor UI (Mandatory Panels)**

The following UI panels are **non-optional** for safe autonomous operation:

| Panel | Purpose | Update Frequency |
| --- | --- | --- |
| **Live Action Stream** | Real-time display of AI decisions and system actions | Every cycle |
| **Budget Meters** | Visual progress bars for all budget caps with remaining/total | Real-time |
| **Capability Toggles** | Enable/disable tokens (FS_WRITE, SHELL_EXEC, etc.) during execution | User-triggered |
| **Shell Command Log** | Chronological list of all executed shell commands with classification | Every command |
| **Context Coverage Map** | Visual graph showing which files/modules have been semantically covered across cycles | Every cycle |
| **Checkpoint Timeline** | Visual timeline of all checkpoints with cycle_id and timestamp | Every checkpoint |
| **Rollback Selector** | Interactive selector to choose checkpoint for rollback | On-demand |
| **Emergency STOP** | Large, always-visible button to halt execution immediately | N/A |

### **Enhanced Workspace Layout (Lovable-Inspired)**

**Three-Column Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Exacta App Studio - [Project: WPF Todo App]         [⚙️] [❌]  │
├──────────┬────────────────────────┬───────────────────────────────┤
│          │                        │                               │
│  PANEL 1 │      PANEL 2           │         PANEL 3               │
│  (Left)  │      (Center)          │         (Right)               │
│          │                        │                               │
│  Chat &  │  Live App Preview      │  Context Coverage Map         │
│  File    │  (Sandbox)             │  + Budget Meters              │
│  Tree    │                        │                               │
│          │  ┌──────────────────┐  │  Coverage: 68% (127/187 files)│
│  💬 Chat │  │  ┌─────────────┐ │  │  🟢🟢🟢🟢🟢🟡⚪⚪⚪⚪            │
│  ────────│  │  │ Todo App    │ │  │                               │
│  > Add   │  │  │  [ ] Task 1 │ │  │  Files in Context:            │
│  SQLite  │  │  │  [ ] Task 2 │ │  │  • src/App.tsx ✓              │
│  persist.│  │  │  [Add Task] │ │  │  • src/api/db.ts ✓            │
│          │  │  └─────────────┘ │  │  • src/components/... ⏳      │
│          │  │                  │  │                               │
│  📁 Files│  │  [Refresh] [⚙️]  │  │  Budget Remaining:            │
│  ────────│  │                  │  │  Tokens: ████████░░ 320k/500k │
│  ✓ App   │  └──────────────────┘  │  Time:   ███████░░░ 18m/30m   │
│  ✓ DB    │                        │  Files:  ██░░░░░░░░ 12/50     │
│  ⏳ UI   │  Status: ✅ Build OK   │                               │
│          │  Tests: 3/3 passing    │                               │
└──────────┴────────────────────────┴───────────────────────────────┘
```

**Panel Descriptions:**

**Panel 1 (Left - 20% width):**
- **Chat Interface** (top): Natural language input for AI
- **File Tree** (bottom): Collapsible project structure
- **Checkpoint Timeline** (bottom drawer): Click to expand

**Panel 2 (Center - 50% width):**
- **Live Preview**: Interactive sandbox showing app
- **Browser-like controls**: Refresh, back/forward
- **Status bar**: Build status, test results, warnings

**Panel 3 (Right - 30% width):**
- **Context Coverage Map**: Visual graph of semantic coverage
- **Budget Meters**: Real-time usage tracking
- **Capability Toggles**: Enable/disable tokens
- **Shell Command Log**: Recent executed commands

**Responsive Behavior:**
- On smaller screens (<1600px), Panel 3 collapses into a drawer
- On very small screens (<1024px), Panel 1 becomes a slide-out menu

### **Context Coverage Dashboard (Enhanced UI Feature)**

**Purpose:** Provide transparent visibility into Progressive Context Mode execution and semantic coverage progress.

**Panel Components:**

1. **Dependency Graph Visualization**
   - Interactive node graph showing file relationships
   - Color coding:
     - 🟢 Green: DEPENDENCY_VALIDATED (fully covered)
     - 🟡 Yellow: INJECTED or PARSED (in context but not validated)
     - ⚪ Gray: Not yet covered
     - 🔴 Red: Coverage decreased (requires investigation)
   - Click nodes to:
     - View file preview
     - See dependency edges (imports/exports)
     - Force inclusion in next shard
     - Mark as "skip if dead code"

2. **Shard Progress Tracker**
   ```
   Shard 3 of 7 | Coverage: 42% → 68% (+26%)
   
   Current Shard Files (12):
   ✓ src/App.tsx (validated)
   ✓ src/api/users.ts (validated)  
   ⚠ src/utils/helpers.ts (parsed, awaiting validation)
   
   Next Shard Preview (8 files)
   Estimated completion: 2 more cycles
   ```

3. **User Controls**
   - [Adjust Shard Size] - Increase/decrease files per shard
   - [Force Include File] - Add specific file to next shard
   - [View Full Coverage Report] - Export coverage map
   - [Switch to FAST Mode] - Disable coverage guarantees for speed

**Implementation Note:** This panel is read-only visualization of Core-maintained state. It does NOT allow AI to influence context selection.

### **Logging & Replay (Compliance Grade)**

**Causal Record Structure:**

Every autonomous cycle logs the following for forensic audit:

```tsx
CausalRecord {
  cycle_id: UUID
  goal_id: UUID
  ai_output_hash: SHA256      // Hash of raw AI response
  decision_hash: SHA256        // Hash of parsed Decision object
  policy_result: 'ALLOW' | 'ALLOW_WITH_LIMITS' | 'DENY'
  capability_used: CapabilityToken[]
  context_mode: 'NORMAL' | 'PROGRESSIVE' | 'FAST'
  files_in_context: number
  semantic_coverage_delta: number
  command_or_diff: string      // Executed shell command or unified diff
  result: 'SUCCESS' | 'FAILURE' | 'HALTED'
  timestamp: ISO8601
}
```

**Replay Requirements:**

- **Orchestration replay** — Given same goal_id and initial state, system produces identical *orchestration sequence* (cycle boundaries, step order, capability checks, budget enforcement)
- **AI output replay** — Requires fixed AI model version, seed, temperature=0, and frozen context. AI output is non-deterministic by default; replay guarantees apply only to system behavior given recorded AI outputs
- **Forensic audit** — All decisions traceable from goal → cycle → AI output → policy evaluation → action → result
- **Execution determinism** — Same orchestration decisions + same AI outputs + same file states = same execution results

**Replay Scope Limitation:** Replay determinism does NOT apply to time-based, provider-latency, or token-consumption budgets. These are validated for policy compliance, not identical numerical reproduction.

### Replay Authority Rule

Only Operator via Guardian MAY initiate:
- Deterministic replay
- Best-effort replay
- Forensic rehydration

Core and AI SHALL NOT request or trigger replay modes.

**Invariant:**  
**INV-MEM-12: Replay is Human-Authorized** — Replay functions are forensic tools, not operational capabilities.

### Determinism Proof Mode (Optional)

When enabled, the system SHALL:
- Freeze toolchain versions
- Disable provider fallback
- Force fixed model + seed + temperature=0
- Block all non-essential network access

Produces a "Det-Run Certificate" attached to checkpoint metadata.

Use case: regulatory or legal reproducibility claims.

### **Sandbox Incident Forensics**

All `SANDBOX-BREACH` events MUST:

- Be recorded in the audit log
- Be hash-anchored by Guardian
- Be included in forensic exports
- Include: command/diff attempted, capability token presented, policy result, and scope_root

### **Evidence Preservation Mode**

When enabled, the system:

- Freezes all checkpoint pruning
- Suspends log deletion and export expiration
- Forces read-only mode on audit logs and forensic artifacts
- Blocks system upgrades until Operator resolution
- Displays persistent banner in UI indicating mode is active
- Requires explicit Operator command to disable

**Activation Triggers:**

- Any SANDBOX-BREACH event
- Guardian attestation failure
- IPC authentication failure
- Manual Operator activation for investigation
- Legal Hold activation

### **Legal Hold**

Legal Hold prevents deletion, modification, or export of audit logs, checkpoints, and forensic artifacts until explicitly released by the Operator. Legal Hold state persists across reboots and upgrades and is enforced by Guardian.

**Legal Hold Behavior:**

- All Evidence Preservation Mode rules apply
- Additionally: checkpoint storage limits are suspended (no auto-pruning regardless of disk usage)
- Export operations are logged but not restricted (exports may be needed for legal disclosure)
- Legal Hold cannot be disabled programmatically; requires explicit Operator command with confirmation dialog
- Legal Hold state is recorded in certified_state.json and signed by Guardian
- Attempting to disable Legal Hold generates a CRITICAL audit event

**Use Cases:**

- Regulatory investigation
- Internal security incident review
- Litigation discovery hold
- Compliance audit requirements

### **Forensic Export Integrity**

All forensic exports MUST be:

- Digitally signed by Guardian using vendor root certificate
- Timestamped with a monotonic system clock (immune to clock tampering)
- Hash-linked to the audit log anchor
- Verifiable offline using the vendor public root certificate
- Include export manifest with: export_id, timestamp, scope (date range, goal_id, incident_id), file count, total hash

**INV-MEM-8: Export Authority Boundary** — Only Guardian may generate, sign, or authorize forensic memory exports. Core and AI SHALL NOT initiate, modify, or filter export content.

**Export Format:**

```
forensic-export-{UUID}.zip
├── manifest.json (signed)
├── audit-log.jsonl
├── checkpoints/ (referenced snapshots)
├── evidence/ (incident records)
└── signature.sig (Guardian signature)
```

### Memory Diff Export Rule

Operator MAY export:

- Checkpoint-to-checkpoint file diffs
- Budget state diffs
- Policy snapshot diffs

AI SHALL NOT request, trigger, or filter diff exports.

**Time Source:**

Guardian timestamps use the Windows monotonic clock (QueryPerformanceCounter) combined with UTC wall-clock time. Monotonic counters are used for ordering and tamper detection; wall-clock time is used for human-readable audit records.

**Timestamp Export Handling:**
- Primary timestamp: Monotonic counter (tamper-proof ordering)
- Secondary timestamp: UTC wall-clock (human readability)
- Export MUST include both + warning if wall-clock discontinuity detected (user clock tampering)

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

- File system errors (FS-xxx) — Path violations (FS-001), permission denied (FS-002), write failures (FS-003)
- Build failures (BLD-xxx) — Compilation errors (BLD-001), toolchain failures (BLD-002), dependency issues (BLD-003)
- IPC protocol errors (IPC-xxx) — Communication failures (IPC-001), authentication failures (IPC-002), sequence errors (IPC-003)
- Validation errors (VAL-xxx) — Schema violations (VAL-001), constraint failures (VAL-002)
- Configuration errors (CFG-xxx) — Invalid settings (CFG-001), missing dependencies (CFG-002)

## Goal Schema (Authoritative)

**Goal Structure:**

```tsx
Goal {
  id: UUID
  description: string                          // Natural language goal
  success_criteria: string[]                   // Explicit completion conditions
  scope_root: path                             // Project root jail boundary
  allowed_capabilities: CapabilityToken[]      // Tokens granted for this goal
  risk_class: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  max_budgets: BudgetSet                       // Budget caps for this goal
  created_at: timestamp
  status: 'ACTIVE' | 'SUSPENDED' | 'COMPLETED' | 'FAILED' | 'HALTED'
}
```

**Goal Properties:**

- **Persistent** — Goals survive application restarts
- **Versioned** — Every goal modification creates new version
- **Human-visible** — Goals displayed in UI, not hidden in system state
- **Replayable** — Goals can be re-executed from scratch for audit

**Goal Lifecycle:**

```
CREATED → ACTIVE → [SUSPENDED ↔ ACTIVE] → COMPLETED
                  ↓
                FAILED / HALTED
```

## Non-Goals (Explicit Exclusions)

Exacta App Studio is **intentionally not designed** for the following use cases:

- ❌ **Mobile applications** — No iOS, Android, or mobile development support
- ❌ **Web applications** — No browser-based apps, SPAs, or web frameworks
- ❌ **Cloud deployment** — No Azure, AWS, or cloud infrastructure management
- ❌ **Team collaboration** — Single-user tool; no multi-user workspaces or real-time collaboration
- ❌ **Plugin marketplace** — No third-party plugin ecosystem or extensions

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

1. **Offline mode** → All network DENY (highest priority)
2. **No NET_* token** → Network disabled for subprocesses (default)
3. **NET_AI_ONLY token** → Only AI provider endpoints allowed
4. **NET_DOCS_ONLY token** → Only documentation sources allowed
5. **Explicit user override** → Network enabled per user command in UI

**Documentation Allowlist Governance:**

The documentation endpoint allowlist is stored in Guardian policy storage and may only be modified via signed system upgrade or explicit Operator approval. All changes are logged as POLICY-NETWORK events with old and new values recorded.

## 💾 Persistence & Resume

### **Failure Recovery Guarantees (Explicit)**

Exacta App Studio is **fail-closed**. If execution is halted (budget exhaustion, policy violation, crash, or manual stop), **all in-flight subprocesses are terminated as a group** using the Windows Job Object boundary, including any child processes spawned by build tools or CLIs. Any step that does not reach a recorded “safe boundary” is treated as **failed**, and Exacta will not continue autonomously. For power loss or OS crash mid-cycle, Exacta guarantees that on next launch it will either (a) resume from the **last fully committed checkpoint**, or (b) require Operator review if recovery cannot be proven. Partially applied file operations are prevented by atomic write/replace semantics, so the project is restored to a known checkpointed state rather than an in-between state.

### Cold Start Memory Rule

On fresh launch or crash recovery:

- AI SHALL receive NO prior context
- Only Core-generated Goal State Summary and Verified Index Snapshot may be injected
- Execution resumes strictly from last COMMITTED checkpoint

**INV-MEM-CS1:** AI SHALL NOT be used to reconstruct system state after restart.

### **Versioning & Backward Compatibility (Audit Guarantees)**

- **Checkpoint format is versioned.** Each checkpoint includes a schema version and the Exacta build identifier that produced it.
- **Backwards readability is guaranteed within a compatibility window.** Newer versions must be able to *read and display* older checkpoints and audit logs, or they must fail closed and clearly mark the checkpoint as “requires older Exacta version.”
- **Replay across versions:** deterministic replay is **scoped to the same Exacta version (and recorded toolchain/environment)**. Cross-version replay is **not guaranteed** and is treated as a separate, explicitly labeled “best-effort replay” mode, never used for compliance-grade audit claims.

**State Persistence:**

- **Full goal state** — Goals, budgets, capabilities, success criteria
- **Execution state** — Current cycle, step history, decision log
- **Checkpoint snapshots** — File states, index snapshots, budget counters
- **Audit trail** — Complete causal chain from goal inception to current state

**Resume After Reboot:**

- System can **resume execution** from last checkpoint after crash or reboot
- User can choose to resume or abandon interrupted goals
- All checkpoints remain available for rollback even after restart

**Crash Recovery:**

- Last known good state is always preserved
- Incomplete cycles are rolled back automatically
- User can inspect crash logs and decide whether to retry or rollback

## 🧪 Testing Philosophy

**Automatic Test Generation:**

- ✅ **Generate tests automatically** — When no tests exist, agent generates minimal smoke-test set
- ✅ **Run tests automatically after edits** — Tests and builds execute automatically after code modifications
- ❌ **Testing is NOT user-managed only** — System proactively manages test lifecycle

**Test Management:**

- If no tests exist → Generate minimal smoke-test set (basic functionality coverage)
- If tests exist → Run them after every code change
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

**User Additions:** Via Settings → Security → Package Managers (logged as POLICY event with audit trail)

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

## 📊 Telemetry & Diagnostics

**Local Telemetry Definition:**

Exacta App Studio collects operational metrics locally for debugging and user visibility only.

No metrics are transmitted off-device under any condition.

**Local-Only Diagnostics:**

- ✅ All diagnostics stored locally on user's machine
- ✅ Crash dumps, error logs, performance metrics remain on-device
- ✅ **All health metrics are local-only and never transmitted** (latency, error rate, call counts, and uptime are computed on-device)
- ❌ **No outbound telemetry** — Zero data transmitted to external servers
- ❌ No usage analytics, no error reporting, no phone-home

**What is logged locally:**

- Execution traces (goal → cycle → action → result)
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

## 🔄 Update Model

**Manual Installer Updates:**

- ✅ **User-controlled updates** — Download and install when you choose
- ❌ No automatic background updates
- ❌ No forced updates or nagging prompts

**Update Flow:**

1. New version available → Notification in UI (non-intrusive)
2. User reviews release notes and change log
3. User downloads signed installer at their convenience
4. User runs installer with admin privileges
5. Guardian verifies signature and applies update

**Version Policy:**

- Updates are opt-in, not mandatory
- Old versions continue to work (no kill switch)
- Security-critical updates clearly flagged (but still user's choice)

## 📜 License & Trust Stance

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

## ⚙️ Hard Limits Enforced

**Execution Time & Circuit Breakers:**

- ✅ **Max execution time per goal** — Default 30 minutes (configurable)
- ✅ **Max retries** — 3 attempts per failed action before escalation
- ✅ **Circuit breakers** — Automatic halt on repeated failures (3x build failure, 3x same file edit)
- ✅ **Runaway detection** — Same file modified 3x in 5 loops triggers HALT

**No Hard Limits On:**

- ❌ **Max project size** — System scales to any reasonable Windows project (up to 10,000 files, 1GB total size)
- ❌ **Max files per plan** — Budgets enforce per-cycle caps (50 files/cycle) but plans can span multiple cycles
- ❌ **Max AI cost per session** — User's API key, user's budget (soft warning at budget thresholds)

**Budget Soft Limits (warnings, not blocks):**

- 500k tokens per goal (warning at 90%)
- 200 network calls per goal (warning at 90%)
- 50 files modified per cycle (hard cap)
- 2000 lines changed per cycle (hard cap)

**Why selective limits:**

- Project size and file counts are domain-specific (enterprise apps may be large)
- AI cost is user's responsibility (their API key, their budget)
- Time and retry limits prevent infinite loops and runaway execution

## 📄 License

*License information to be determined*

This software does not provide legal, regulatory, or compliance certification.

All security and audit guarantees apply only to the Exacta runtime and enforcement model, not to third-party tools, AI providers, or generated software.

## 🤝 Contributing

*Contribution guidelines to be determined*

---

**Built for developers who refuse to compromise on control.**
