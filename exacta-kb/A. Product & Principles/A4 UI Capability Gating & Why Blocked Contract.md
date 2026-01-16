# A4. UI Capability Gating & "Why Blocked" Contract

## Purpose

Define which UI actions are available in each Orchestrator state and which gates must pass before an action becomes enabled. Define what the UI must show when an action is blocked.

> **Document ID:** A4
> 

> **Version:** V2 (Autonomous Agent)
> 

> **Status:** Canonical & Enforced
> 

This document is authoritative for:

- when UI controls are enabled/disabled
- what error/blocked messages must say
- which gate is responsible for each block
- **policy decisions displayed to user** *(New in V2)*

---

## UI Actions

- Open Project
- Ask / Chat (submit user input)
- Generate Plan
- Pause Background Work
- Resume Background Work
- Review Auto-Executed Changes
- Interrupt Agent
- Cancel
- Preview
- Export Diagnostics
- **Request Autonomy Profile Change** *(New in V2 — renamed from "Switch")*
- **View Policy Decisions** *(New in V2)*
- **Execute Shell Command** *(New in V2 — SYSTEM-LEVEL action)*

---

## Gate Naming (Stable Identifiers)

Use these stable gate names in UI and logs:

### Project / Setup Gates

- `G-PROJECT-OPEN` — project is open and root resolved
- `G-AI-CONFIGURED` — AI provider selected + endpoint + model set
- `G-AI-KEY-PRESENT` — API key exists in credential store (or local model configured)
- `G-INDEX-READY` — project index built
- `G-LOGGING-READY` — log directory writable

### State / Flow Gates

- `G-STATE` — current Orchestrator state allows the action
- `G-AGENT-IDLE` — agent is not currently working
- `G-BACKGROUND-ACTIVE` — background work in progress
- `G-SAFE-TO-INTERRUPT` — at safe interruption point
- `G-EXECUTION-NOT-CANCELLING` — cancellation not in progress
- `G-GATE-EVALUATION` — action is being evaluated by Gate Pipeline *(New in V2)*
- `G-WAITING-CONFIRMATION` — waiting for user confirmation on CONFIRM decision *(New in V2)*
- `G-AUTO-ROLLING-BACK` — autonomous rollback in progress *(New in V2)*

### Policy / Profile Gates *(New in V2)*

- `G-POLICY-ALLOW` — active policy permits the action
- `G-POLICY-CONFIRM` — active policy requires user confirmation
- `G-PROFILE-SHELL-ENABLED` — shell execution enabled in active profile
- `G-PROFILE-SWITCH-BOUNDARY` — no operation in progress (safe to switch profiles)
- `G-SAFETY-POLICY-ALLOW` — requested action does not exceed Safety Policy ceiling *(V2.1)*
- `G-SYSTEM-LEVEL-PLAN` — action classified as SYSTEM-LEVEL requires human approval + cryptographic binding *(V2.1)*

### Safety / Drift / Resource Gates

- `G-DRIFT-CHECK` — no drift since operation start
- `G-TOKEN-BUDGET` — context budget within limits
- `G-LIMITS` — operation limits within hard caps
- `G-PREVIEW-ACK` — preview isolation acknowledgment given
- `G-NETWORK-POLICY` — only allowed network calls permitted
- `G-SHELL-SANDBOX` — shell command passes sandbox validation *(New in V2)*
- `G-SHELL-ALLOWLIST` — shell command on allowlist or not on blocklist *(New in V2)*
- `G-SHELL-RESOURCE-LIMITS` — shell resources within profile limits *(New in V2)*

---

## Shell Execution Is a System-Level Action *(V2.1)*

<aside>
🔒

**G-SYSTEM-LEVEL-PLAN Requirement**

Any shell execution request SHALL:

- Be classified as a **SYSTEM-LEVEL PLAN**
- Require **explicit human approval**
- Be **cryptographically bound** to approval record
- Be **denied** if Safety Policy forbids shell execution (`shell_execution_allowed: false`)

`G-PROFILE-SHELL-ENABLED` is NOT sufficient as sole gate. Shell commands MUST pass `G-SAFETY-POLICY-ALLOW` and `G-SYSTEM-LEVEL-PLAN`.

</aside>

---

## Request Autonomy Profile Change *(V2.1)*

<aside>
⚠️

**G-SAFETY-POLICY-ALLOW Requirement**

UI MUST disable profile change if requested profile exceeds `autonomy_ceiling` in Safety Policy.

Attempt SHALL be logged as `UI-POLICY-DENY`.

Profile switching is a **request**, not a **command**. Guardian enforces the ceiling.

</aside>

---

## "Why Blocked" Requirements (UI Output Contract)

When an action is disabled, the UI MUST show:

1. **Blocking gate name** (from the list above)
2. **Blocking reason** (human-readable, specific)
3. **Remediation steps** (what user can do next)
4. **Retryability**
    - `retryable_now = true` if user can fix without changing state
    - `retryable_now = false` if it requires a state transition or completion

### Message Format (Canonical)

```
Blocked: <Action Name>

Gate: <GATE-ID>

Reason: <short reason>

Next steps: <bulleted steps>

Retry: <Retry now | Not retryable now>
```

---

## Mapping Table

### Gate Priority (when multiple gates block)

1. `G-STATE`
2. `G-PROJECT-OPEN`
3. `G-EXECUTION-NOT-CANCELLING`
4. `G-BACKGROUND-ACTIVE`
5. `G-AGENT-IDLE`
6. `G-SAFE-TO-INTERRUPT`
7. `G-DRIFT-CHECK`
8. `G-AI-\\\\\\\\\\\\\\\*` (configured/key)
9. `G-TOKEN-BUDGET`
10. `G-LIMITS`
11. `G-PREVIEW-ACK`
12. `G-LOGGING-READY`

---

### Open Project

- **Allowed state(s):** Any
- **Gates required:** None
- **If blocked:** Never blocked (always enabled)
- **Failure handling:** If open fails, show error with actionable remediation

---

### Ask / Chat (submit user input)

- **Allowed state(s):** `Idle`, `WaitingForClarification`
- **Gates required:** `G-PROJECT-OPEN`, `G-STATE`, `G-EXECUTION-NOT-CANCELLING`
- **Blocked examples**
    - Gate: `G-PROJECT-OPEN`
        - Reason: No project is open.
        - Next steps:
            - Open a project folder.
        - Retry: Retry now
    - Gate: `G-STATE`
        - Reason: Agent is currently working.
        - Next steps:
            - Wait for agent to finish, or press Pause/Cancel.
        - Retry: Not retryable now

---

### Generate Plan

- **Allowed state(s):** `Idle`
- **Gates required:** `G-PROJECT-OPEN`, `G-STATE`, `G-AI-CONFIGURED`, `G-AI-KEY-PRESENT`, `G-TOKEN-BUDGET`, `G-LIMITS`, `G-AGENT-IDLE`
- **Blocked examples**
    - Gate: `G-AI-CONFIGURED`
        - Reason: AI provider is not configured.
        - Next steps:
            - Open Settings → AI.
            - Select provider, endpoint, and model.
        - Retry: Retry now
    - Gate: `G-AGENT-IDLE`
        - Reason: Background operations are running.
        - Next steps:
            - Wait for background work to complete.
            - Or pause background work.
        - Retry: Not retryable now

---

### Pause Background Work

- **Allowed state(s):** `Executing`, `AutoRetrying`
- **Gates required:** `G-BACKGROUND-ACTIVE`, `G-STATE`, `G-EXECUTION-NOT-CANCELLING`, `G-SAFE-TO-INTERRUPT`
- **Blocked examples**
    - Gate: `G-BACKGROUND-ACTIVE`
        - Reason: No background work is currently running.
        - Next steps:
            - Background queue is empty.
        - Retry: Retry now
    - Gate: `G-SAFE-TO-INTERRUPT`
        - Reason: Agent is in the middle of an atomic operation.
        - Next steps:
            - Wait a moment for the agent to reach a safe point.
        - Retry: Not retryable now

---

### Resume Background Work

- **Allowed state(s):** `Paused`
- **Gates required:** `G-STATE`, `G-DRIFT-CHECK`, `G-EXECUTION-NOT-CANCELLING`
- **Blocked examples**
    - Gate: `G-STATE`
        - Reason: Background work is not paused.
        - Next steps:
            - Pause background work first.
        - Retry: Retry now
    - Gate: `G-DRIFT-CHECK`
        - Reason: Project changed while paused.
        - Next steps:
            - Cancel and start a new operation with current project state.
        - Retry: Retry now

---

### Review Auto-Executed Changes

- **Allowed state(s):** Any
- **Gates required:** `G-PROJECT-OPEN`, `G-LOGGING-READY`
- **Blocked examples**
    - Gate: `G-LOGGING-READY`
        - Reason: Audit log is not available.
        - Next steps:
            - Check log directory permissions.
        - Retry: Retry now

---

### Interrupt Agent

- **Allowed state(s):** `Executing`, `AutoRetrying`, `WaitingForClarification`
- **Gates required:** `G-STATE`, `G-EXECUTION-NOT-CANCELLING`
- **Blocked examples**
    - Gate: `G-STATE`
        - Reason: Agent is idle (nothing to interrupt).
        - Next steps:
            - Agent will respond when you submit a request.
        - Retry: Retry now

---

### Cancel

- **Allowed state(s):** `WaitingForClarification`, `Executing`, `Paused`, `AutoRetrying`
- **Gates required:** `G-STATE`
- **Blocked examples**
    - Gate: `G-STATE`
        - Reason: Nothing to cancel in the current state.
        - Next steps:
            - Agent is idle or already completed.
        - Retry: Retry now

---

### Preview

- **Allowed state(s):** `Idle`, `Completed`
- **Gates required:** `G-PROJECT-OPEN`, `G-STATE`, `G-PREVIEW-ACK`, `G-EXECUTION-NOT-CANCELLING`, `G-AGENT-IDLE`
- **Blocked examples**
    - Gate: `G-PREVIEW-ACK`
        - Reason: Preview isolation acknowledgment not accepted.
        - Next steps:
            - Review preview warning and accept acknowledgment.
        - Retry: Retry now
    - Gate: `G-AGENT-IDLE`
        - Reason: Agent is working in background.
        - Next steps:
            - Wait for background operations to complete.
        - Retry: Not retryable now

---

### Export Diagnostics

- **Allowed state(s):** Any
- **Gates required:** `G-LOGGING-READY`
- **Blocked examples**
    - Gate: `G-LOGGING-READY`
        - Reason: Log directory is not writable.
        - Next steps:
            - Check permissions for the logs directory.
            - Choose a different diagnostics output folder.
        - Retry: Retry now

---

## Edge Cases (Required Behavior)

### 1) Operation starts while user is viewing audit log

- UI MUST update audit log in real-time.
- UI MUST show new entries as they're logged.

### 2) User clicks Interrupt while backend is between steps

- UI MUST disable Interrupt and show "Stopping at safe point..."
- Backend MUST complete current step before stopping.

### 3) Background work completes while user has UI focused elsewhere

- UI MUST show notification based on risk level.
- UI MUST NOT steal focus unless notification is Modal priority.

### 4) Multiple gates failing

UI MUST display the highest-priority gate per Gate Priority list above, not a random one.

### 5) Auto-retry in progress

- UI MUST show retry attempt count (e.g., "Retrying 2/3")
- UI MUST show retry strategy being used
- UI MUST allow interrupt between retry attempts

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