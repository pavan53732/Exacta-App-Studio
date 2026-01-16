# C1. System Architecture & Core Contracts

> **Document ID:** C1
> 

> **Version:** V2 (Autonomous Agent)
> 

> **Status:** Canonical & Enforced
> 

This is the **Master Specification** for the System Core. It consolidates the Architecture, Orchestrator, Agent Controller, and Data Contracts.

> **Scope:** Internal State, Decision Logic, and Component Interfaces
> 

> **Related:** Pipeline (Inputs), Execution (Outputs), Autonomy Profiles, Approval Gates
> 

---

## 1. System Architecture

The system consists of **7 isolated components** enforcing strict separation of concerns.

| Component | Responsibility | Authority |
| --- | --- | --- |
| **Orchestrator** | State Machine & Coordination | Sole mutator of system state. |
| **Agent Controller** | Decisions (Risk/Quality) | Advisory on Risk & Quality Scoring (No Execution Authority). |
| **AI Interface** | Provider Abstraction | Stateless I/O only. |
| **Project Indexer** | Context & Search | Source of Truth for code. |
| **File Gateway** | Safety & I/O | Sole writer to disk. |
| **Build Executor** | Compilation | Toolchain invoker. |
| **Chat UI** | User Interaction | View layer only. |

---

## 2. The Orchestrator (Autonomous Decision Engine) *(Changed in V2)*

The Orchestrator is now an **autonomous decision engine** that evaluates policies and controls gate flow.

### V1 → V2 Change

| Aspect | V1 | V2 |
| --- | --- | --- |
| **Primary Role** | Wait for user | Autonomous decision engine |
| **Policy Evaluation** | None | Core responsibility |
| **Gate Management** | None | Opens/closes gates based on policy |
| **Auto-Approval** | Never | When policy permits |

### States

- **Idle:** Waiting for input.
- **ExtractingIntent:** Parsing user text.
- **Planning:** Generating plan steps.
- **GateEvaluation:** Running through Gate Pipeline (Security → Policy → Risk → Quality).
- **WaitingForConfirmation:** Blocked on CONFIRM decision from gate.
- **Executing:** Running approved plan (auto or user-approved).
- **AutoRetrying:** Attempting self-healing.
- **AutoRollingBack:** Reverting autonomous action on failure.
- **Paused/Cancelling/Failed/Completed:** Terminal or holding states.

### Critical Transitions

- `Planning` → `GateEvaluation` (Automatic)
- `GateEvaluation` → `Executing` (IF Gate Pipeline returns ALLOW)
- `GateEvaluation` → `WaitingForConfirmation` (IF Gate Pipeline returns CONFIRM)
- `GateEvaluation` → `Failed` (IF Gate Pipeline returns DENY)
- `Executing` → `AutoRollingBack` (IF autonomous action fails)

---

## 3. The Agent Controller (Policy-Aware Decision Engine) *(Enhanced in V2)*

This component makes autonomous decisions **based on active profile and policy rules**.

### Risk Assessment (0-100)

Calculated from weighted factors: File Ops (35), Deps (25), Refactor (20), Breaks (15), Security (15), Complexity (10).

### Decision Logic (V2 - Profile-Aware)

The Agent Controller now delegates to the **Gate Pipeline** which evaluates:

1. **Security Gate:** Check for violations (path traversal, privilege escalation, secrets)
2. **Policy Gate:** Evaluate against active profile rules
3. **Risk Gate:** Apply risk thresholds per profile
4. **Quality Gate:** Ensure plan meets quality threshold
5. **User Confirmation:** Final fallback for CONFIRM decisions

### Profile Authority Binding *(New in V2.2)*

<aside>
🔒

**INV-AUTO-1: Profile Authority**

Core MAY NOT change autonomy profile. All profile changes MUST be requested from Guardian and require: (1) Operator approval, OR (2) Signed policy package. Without this binding, FULL-AUTO is one compromised IPC call away.

</aside>

<aside>
🔒

**INV-AUTO-2: Advisory Only**

The Agent Controller MAY score, recommend, and classify plans, but SHALL NOT approve, authorize, or trigger execution. All execution authority resides with the Orchestrator under Safety Policy and Approval Gate control.

</aside>

**Enforcement:**

- Profile state is owned by Guardian, not Core
- Core can only query current profile via IPC
- Profile change requests require Guardian authentication
- All profile changes are logged with operator identity

---

### Decision by Profile

| Risk Level | PROFILE-SAFE | PROFILE-DEV | PROFILE-FULL-AUTO |
| --- | --- | --- | --- |
| LOW (0-30) | CONFIRM | **ALLOW** | **ALLOW** |
| MEDIUM (31-65) | CONFIRM | **ALLOW** | **ALLOW** |
| HIGH (66-100) | CONFIRM | CONFIRM | CONFIRM |

---

## 4. Data Contracts

### IPC Contract (Frontend ↔ Backend)

- **Transport:** Tauri `invoke` (Requests) + `emit` (Events).
- **Versioning:** `ipc_version = "1.0"`.
- **Invariants:**
    - Every request has a `request_id`.
    - Every operation has a `correlation_id`.
    - Events are strictly ordered by `seq` number.

### Context Builder Contract (AI Input)

- **Selection:** Deterministic ranking (Target File > Deps > Config).
- **Budgeting:** Hard token limit. If exceeded: Slice P2/P3 blocks → Refuse.
- **Redaction:**
    - **Never Send:** `.env`, `.pfx`, API Keys (`sk-...`).
    - **Action:** If secret detected, **REFUSE** operation (Fail-Closed).

### Config Schema

- **Location:** `.exacta/config.json`.
- **State:** `.exacta/state.json` (Persists across restarts).
- **Invariants:** Atomic writes (temp+rename), Secrets in Credential Manager ONLY.

---

## 5. Runtime Behaviors

### Background Execution

- **Queue:** Up to 5 concurrent ops.
- **Priority:** User Request > Quick Op > Low Risk > Retry.
- **Persistence:** Queue survives app restart.
- **High Risk / Failure:** Modal / Interruptive Toast.

### Drift Detection

- **Trigger:** Before Execution, On Resume.
- **Check:** `FileHash(now) == FileHash(plan_time)`.
- **Action:**
    - *Low Drift:* Auto-Retry (Replan).
    - *High Drift:* Escalate to User.

### Structural Drift Detection *(New in V2.2)*

<aside>
🔒

**INV-INDEX-1: Structural Drift Detection**

Drift detection MUST include structural metadata, not just file hashes. AI can operate on stale structure even when file hashes match.

</aside>

**Drift MUST include:**

| **Component** | **Hash/Version** | **Mismatch Action** |
| --- | --- | --- |
| File content | SHA-256 | REPLAN required |
| AST structure | AST hash | REPLAN required |
| Symbol table | Version number | REPLAN required |
| Dependency graph | Graph hash | REPLAN required |

**Enforcement:**

- Plan stores all four fingerprints at generation time
- Execution gate verifies all four before apply
- Any mismatch → plan invalidated → REPLAN required

### Cancellation & Pause

- **Safe Points:** Between Steps.
- **Unsafe Points:** During File Write, Build, or AI Call.
- **Rule:** Cancel MUST wait for atomic operation to finish, then Rollback.

### Notifications

- **Low Risk:** Silent / Status Bar.
- **Medium Risk:** Toast on completion.
- **High Risk:** Toast on start + Modal on completion.

---

---

## System State Definition

"System State" includes:

- Active policy
- Autonomy profile
- Execution state
- Upgrade state
- Kill switch state
- Logging state

**Authority:**

- **Guardian** is authoritative for policy, autonomy, logging, kill switch, and upgrade install.
- **Orchestrator** is authoritative for execution flow within Guardian-defined ceilings.

---

## Hard Invariants

This component enforces the following Global System Invariants:

- **INV-GLOBAL-1: Local-Only Execution**
- **INV-GLOBAL-2: Autonomous Execution**
- **INV-GLOBAL-3: Background Operation**
- **INV-GLOBAL-4: Graceful Degradation**
- **INV-GLOBAL-5: AI Treated as Trusted Advisor**
- **INV-GLOBAL-6: User-Owned API Keys**
- **INV-GLOBAL-7: No Telemetry**
- **INV-GLOBAL-8: All Changes Reversible**
- **INV-GLOBAL-9: Complete Audit Trail**
- **INV-GLOBAL-10: Shell Execution Sandbox**
- **INV-GLOBAL-11: Self-Improving, Never Self-Authorizing**