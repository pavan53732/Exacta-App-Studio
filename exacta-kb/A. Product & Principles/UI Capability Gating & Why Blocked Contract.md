# UI Capability Gating & "Why Blocked" Contract

## Purpose
Define which UI actions are available in each Orchestrator state and which gates must pass before an action becomes enabled.
Define what the UI must show when an action is blocked.

This document is authoritative for:
- when UI controls are enabled/disabled
- what error/blocked messages must say
- which gate is responsible for each block

---

## UI Actions (V1)
- Open Project
- Ask / Chat (submit user input)
- Generate Plan
- Approve Plan
- Reject Plan
- Execute Plan
- Pause
- Resume
- Cancel
- Preview
- Export Diagnostics

---

## Gate Naming (Stable Identifiers)

Use these stable gate names in UI and logs:

### Project / Setup Gates
- `G-PROJECT-OPEN` — project is open and root resolved
- `G-AI-CONFIGURED` — AI provider selected + endpoint + model set
- `G-AI-KEY-PRESENT` — API key exists in credential store (or local model configured)
- `G-INDEX-READY` — project index built (or minimal index ready per V1)
- `G-LOGGING-READY` — log directory writable

### State / Flow Gates
- `G-STATE` — current Orchestrator state allows the action
- `G-PLAN-EXISTS` — plan exists for the current intent
- `G-PLAN-VALID` — plan passes validation
- `G-PLAN-PENDING` — plan is awaiting approval
- `G-PLAN-APPROVED` — plan has been approved
- `G-EXECUTION-ACTIVE` — an execution is in progress
- `G-EXECUTION-PAUSED` — execution is paused
- `G-EXECUTION-NOT-CANCELLING` — cancellation not in progress

### Safety / Drift / Resource Gates
- `G-DRIFT-CHECK` — no drift since plan creation (hash/config fingerprint)
- `G-TOKEN-BUDGET` — context budget within limits
- `G-LIMITS` — plan/step limits within hard caps
- `G-PREVIEW-ACK` — preview isolation acknowledgment given (per project or per session as specified)
- `G-NETWORK-POLICY` — only allowed network calls (AI/doc fetch) permitted

---

## "Why Blocked" Requirements (UI Output Contract)

When an action is disabled, the UI MUST show:
1. **Blocking gate name** (from the list above)
2. **Blocking reason** (human-readable, specific)
3. **Remediation steps** (what user can do next)
4. **Retryability**
   - `retryable_now = true` if user can fix without changing state (e.g., set API key)
   - `retryable_now = false` if it requires a state transition or completion (e.g., wait for cancellation)

### Message Format (Canonical)
```

Blocked: <Action Name>

Gate: <GATE-ID>

Reason: <short reason>

Next steps: <bulleted steps>

Retry: <Retry now | Not retryable now>

```

---

## Mapping Table (V1 Complete)

> Notes:
> - "Allowed state(s)" means the UI may enable the action only in these states.
> - If multiple gates fail, UI MUST display the **highest priority** gate (see priority rules below).
> - The backend is authoritative for actual enforcement; UI gating is a safety + UX layer and MUST match backend rules.

### Gate Priority (when multiple gates block)
1. `G-STATE`
2. `G-PROJECT-OPEN`
3. `G-EXECUTION-NOT-CANCELLING`
4. `G-PLAN-*` (plan presence/validity/approval)
5. `G-DRIFT-CHECK`
6. `G-AI-*` (configured/key)
7. `G-TOKEN-BUDGET`
8. `G-LIMITS`
9. `G-PREVIEW-ACK`
10. `G-LOGGING-READY` (still must block if missing)

---

### Open Project
- **Allowed state(s):** Any
- **Gates required:** None (but errors must be surfaced if open fails)
- **If blocked:** Never blocked (always enabled)
- **Failure (not blocked) handling:** If open fails, show error with `FS-*` or `CFG-*` code and actionable remediation.

---

### Ask / Chat (submit user input)
- **Allowed state(s):** `Idle`, `AwaitingApproval`
- **Gates required:** `G-PROJECT-OPEN`, `G-STATE`, `G-EXECUTION-NOT-CANCELLING`
- **Blocked examples**
  - Gate: `G-PROJECT-OPEN`
    - Reason: No project is open.
    - Next steps:
      - Open a project folder.
    - Retry: Retry now
  - Gate: `G-STATE`
    - Reason: System is executing a plan.
    - Next steps:
      - Wait for execution to finish, or press Pause/Cancel.
    - Retry: Not retryable now

---

### Generate Plan
- **Allowed state(s):** `Idle`
- **Gates required:** `G-PROJECT-OPEN`, `G-STATE`, `G-AI-CONFIGURED`, `G-AI-KEY-PRESENT`, `G-TOKEN-BUDGET`, `G-LIMITS`
- **Blocked examples**
  - Gate: `G-AI-CONFIGURED`
    - Reason: AI provider is not configured.
    - Next steps:
      - Open Settings → AI.
      - Select provider, endpoint, and model.
    - Retry: Retry now
  - Gate: `G-AI-KEY-PRESENT`
    - Reason: No API key available for the selected provider.
    - Next steps:
      - Add API key in Settings → AI.
    - Retry: Retry now
  - Gate: `G-TOKEN-BUDGET`
    - Reason: Request/context exceeds hard token budget.
    - Next steps:
      - Narrow the request.
      - Target a specific file or symbol.
    - Retry: Retry now

---

### Approve Plan
- **Allowed state(s):** `AwaitingApproval`
- **Gates required:** `G-PLAN-EXISTS`, `G-PLAN-PENDING`, `G-PLAN-VALID`, `G-STATE`, `G-EXECUTION-NOT-CANCELLING`
- **Blocked examples**
  - Gate: `G-PLAN-PENDING`
    - Reason: No plan is currently awaiting approval.
    - Next steps:
      - Generate a plan first.
    - Retry: Retry now
  - Gate: `G-PLAN-VALID`
    - Reason: Plan is invalid or incomplete.
    - Next steps:
      - Request changes or regenerate the plan.
    - Retry: Retry now

---

### Reject Plan
- **Allowed state(s):** `AwaitingApproval`
- **Gates required:** `G-PLAN-PENDING`, `G-STATE`, `G-EXECUTION-NOT-CANCELLING`
- **Blocked examples**
  - Gate: `G-PLAN-PENDING`
    - Reason: No plan is currently awaiting approval.
    - Next steps:
      - Generate a plan first.
    - Retry: Retry now

---

### Execute Plan
- **Allowed state(s):** `AwaitingApproval`
- **Gates required:** `G-PLAN-APPROVED`, `G-DRIFT-CHECK`, `G-STATE`, `G-EXECUTION-NOT-CANCELLING`
- **Blocked examples**
  - Gate: `G-PLAN-APPROVED`
    - Reason: Plan is not approved.
    - Next steps:
      - Review the plan.
      - Click Approve Plan.
    - Retry: Retry now
  - Gate: `G-DRIFT-CHECK`
    - Reason: Files changed since plan was created (plan expired).
    - Next steps:
      - Regenerate the plan using the latest project state.
    - Retry: Retry now

---

### Pause
- **Allowed state(s):** `Executing`
- **Gates required:** `G-EXECUTION-ACTIVE`, `G-STATE`, `G-EXECUTION-NOT-CANCELLING`
- **Blocked examples**
  - Gate: `G-EXECUTION-ACTIVE`
    - Reason: No execution is currently running.
    - Next steps:
      - Execute a plan first.
    - Retry: Retry now
  - Gate: `G-EXECUTION-NOT-CANCELLING`
    - Reason: Cancellation is in progress.
    - Next steps:
      - Wait for cancellation to complete.
    - Retry: Not retryable now

---

### Resume
- **Allowed state(s):** `Paused`
- **Gates required:** `G-EXECUTION-PAUSED`, `G-DRIFT-CHECK`, `G-STATE`, `G-EXECUTION-NOT-CANCELLING`
- **Blocked examples**
  - Gate: `G-EXECUTION-PAUSED`
    - Reason: Execution is not paused.
    - Next steps:
      - Pause execution first.
    - Retry: Retry now
  - Gate: `G-DRIFT-CHECK`
    - Reason: Project changed while paused.
    - Next steps:
      - Cancel and re-plan, or resolve changes and regenerate plan.
    - Retry: Retry now

---

### Cancel
- **Allowed state(s):** `AwaitingApproval`, `Executing`, `Paused`
- **Gates required:** `G-STATE` (must be in one of the allowed states)
- **Blocked examples**
  - Gate: `G-STATE`
    - Reason: Nothing to cancel in the current state.
    - Next steps:
      - Start a plan execution or generate a plan first.
    - Retry: Retry now

---

### Preview
- **Allowed state(s):** `Idle`, `Completed`
- **Gates required:** `G-PROJECT-OPEN`, `G-STATE`, `G-PREVIEW-ACK`, `G-EXECUTION-NOT-CANCELLING`
- **Blocked examples**
  - Gate: `G-PREVIEW-ACK`
    - Reason: Preview isolation acknowledgment not accepted.
    - Next steps:
      - Review preview warning and accept acknowledgment.
    - Retry: Retry now

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

### 1) Plan expires while user is viewing it
- UI MUST disable **Approve Plan** and **Execute Plan**.
- UI MUST show `G-DRIFT-CHECK` with remediation: "Regenerate plan."

### 2) User clicks Execute while backend rejects (race)
- UI MUST surface backend error (fail-closed).
- UI MUST not attempt "best effort" execution.

### 3) Cancellation in progress
- UI MUST disable:
  - Execute Plan
  - Pause
  - Resume
- UI MUST keep Cancel disabled (already cancelling) and show `G-EXECUTION-NOT-CANCELLING` (not retryable now).

### 4) Multiple gates failing
UI MUST display the highest-priority gate per Gate Priority list above, not a random one.

---

## Hard Invariants
This component enforces the following Global System Invariants:
- **INV-GLOBAL-1: Local-Only Execution**
- **INV-GLOBAL-2: Deterministic Orchestration**
- **INV-GLOBAL-3: Fail-Closed Behavior**
- **INV-GLOBAL-4: AI Treated as Untrusted Input**
- **INV-GLOBAL-5: User-Owned API Keys**
- **INV-GLOBAL-6: No Telemetry**