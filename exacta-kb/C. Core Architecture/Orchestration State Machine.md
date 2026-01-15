# Orchestration State Machine

This document defines the state machine that governs all execution flow in Exacta App Studio. Every operation follows these states and transitions. There are no exceptions.

---

## States

The orchestrator exists in exactly one of the following states at any time:

| State | Description |
| --- | --- |
| `Idle` | No active plan. Waiting for user input. |
| `ExtractingIntent` | Processing user input to extract intent. |
| `Planning` | Generating execution plan from validated intent. |
| `AwaitingApproval` | Plan generated and presented to user. Waiting for approval. |
| `Executing` | Approved plan is being executed step by step. |
| `Paused` | Execution paused by user or system. Resumable. |
| `Failed` | Execution failed. Requires user intervention. |
| `Completed` | Plan executed successfully. |
| `Cancelling` | Cancellation in progress. Rolling back if necessary. |

---

## State Transition Table

All valid transitions are listed below. Any transition not in this table is **invalid and must be rejected**.

| From State | To State | Trigger | Condition |
| --- | --- | --- | --- |
| `Idle` | `ExtractingIntent` | User submits input | Input is non-empty |
| `ExtractingIntent` | `Planning` | Intent validated | Confidence above threshold |
| `ExtractingIntent` | `Idle` | Intent rejected | Confidence below threshold, user clarifies |
| `ExtractingIntent` | `Failed` | AI error | Provider unreachable or invalid response |
| `Planning` | `AwaitingApproval` | Plan validated | All validation rules pass |
| `Planning` | `Failed` | Plan invalid | Validation fails after retries |
| `Planning` | `Idle` | User cancels | Before plan is generated |
| `AwaitingApproval` | `Executing` | User approves | Explicit approval action |
| `AwaitingApproval` | `Idle` | User rejects | Plan discarded |
| `AwaitingApproval` | `Planning` | User requests changes | New plan version generated |
| `Executing` | `Completed` | All steps succeed | No failures |
| `Executing` | `Failed` | Step fails | After retry exhaustion |
| `Executing` | `Paused` | User requests pause | Between steps only |
| `Executing` | `Cancelling` | User requests cancel | Immediate transition |
| `Paused` | `Executing` | User resumes | State validated |
| `Paused` | `Cancelling` | User cancels | From paused state |
| `Paused` | `Failed` | Resume fails | State invalid on resume |
| `Failed` | `Idle` | User acknowledges | After viewing error |
| `Failed` | `Planning` | User retries | Same intent, new plan |
| `Completed` | `Idle` | User acknowledges | Automatic or manual |
| `Cancelling` | `Idle` | Cancellation complete | Rollback finished |
| `Cancelling` | `Failed` | Rollback fails | Rollback error |

---

## State Diagram

```
┌─────────────────────────────────┐
│                                 │
▼                                 │
┌──────┐    input    ┌──────────────────┐    validated   ┌───────────┐
│ Idle │───────────▶│ ExtractingIntent │─────────────▶│ Planning  │
└──────┘            └──────────────────┘               └───────────┘
▲                       │                                 │
│                       │ low confidence                  │ plan ready
│                       ▼                                 ▼
│                  ┌────────┐                    ┌──────────────────┐
│                  │ Failed │                    │ AwaitingApproval │
│                  └────────┘                    └──────────────────┘
│                       ▲                                 │
│                       │                                 │ approved
│                       │                                 ▼
│                       │                          ┌───────────┐
│                       │                          │ Executing │
│                       │                          └───────────┘
│                       │                             │   │   │
│                       │              success ┌──────┘   │   └──────┐
│                       │                     ▼           │        ▼
│                       │              ┌───────────┐     │  ┌────────┐
└───────────────────────┤ Completed │     │  │ Paused │
└───────────┘     │  └────────┘
│       │
│       │
▼       ▼
┌────────────┐
│ Cancelling │
└────────────┘
```

---

## Cancellation Rules

### When Cancellation Is Allowed
- From `AwaitingApproval`: Immediate, no rollback needed
- From `Executing`: Only between steps (not mid-step)
- From `Paused`: Immediate

### When Cancellation Is Not Allowed
- During atomic file write (wait for completion)
- During build invocation (wait for completion or timeout)
- During AI call (wait for response or timeout)

### Cancellation Behavior
1. Transition to `Cancelling` state
2. Wait for current atomic operation to complete
3. Execute rollback for any applied changes
4. Transition to `Idle` on success, `Failed` on rollback error

---

## Resume Behavior

### Resuming from Paused
Before resuming, the system must:
1. Re-validate file hashes for all files in the plan
2. Verify project index is current
3. Confirm provider is reachable
4. Check for external changes to target files

If any validation fails:
- Resume is blocked
- User is informed of the conflict
- Options: re-plan, cancel, or manually resolve

### Resuming from Failed
Failed state does not support direct resume. Options are:
- Retry: Generate new plan for the same intent
- Acknowledge: Return to Idle
- Manual recovery: User fixes issue externally, then retries

---

## Crash Recovery

### State Persistence
The following is persisted to disk:

| Data | Location | Format |
| --- | --- | --- |
| Current state | Project directory | JSON |
| Active plan | Project directory | JSON |
| Step completion status | Project directory | JSON |
| Rollback stack | Project directory | Binary + metadata |
| File hashes at plan time | Project directory | JSON |

### Recovery Process
On app restart:
1. Load persisted state
2. Validate state integrity (checksums)
3. If state is `Executing` or `Paused`:
   - Transition to `Paused`
   - Require explicit user action to resume or cancel
4. If state is `Cancelling`:
   - Continue cancellation/rollback
5. If state is corrupted:
   - Transition to `Failed`
   - Surface error to user
   - Offer manual recovery options

### Recovery Guarantees
- **Completed steps are preserved:** If step N completed before crash, it remains complete
- **In-progress steps are rolled back:** If step N was mid-execution, it is rolled back
- **No partial file writes:** Atomic write ensures files are either fully written or unchanged
- **User always informed:** Crash recovery status is always displayed on restart

---

## Persistence Guarantees

### What Is Persisted
- Orchestrator state
- Active plan (all versions)
- Step execution status
- Rollback data (full file content before changes)
- Execution logs
- Error information

### What Is Not Persisted
- Chat history (UI-only)
- AI conversation context (stateless by design)
- Temporary files (cleaned on restart)

### Persistence Timing
- State changes: Persisted immediately before transition
- Step completion: Persisted immediately after success
- Rollback data: Persisted before file modification
- Logs: Persisted continuously

---

## State Invariants

The following must always be true:
1. **Single state:** Orchestrator is in exactly one state at any time
2. **Valid transitions only:** State changes only via defined transitions
3. **Persisted before transition:** State is written to disk before memory update
4. **Atomic step completion:** A step is either fully complete or fully rolled back
5. **User control:** Execution cannot proceed without user in the loop

---

## Error Handling by State

| State | Error Type | Behavior |
| --- | --- | --- |
| `ExtractingIntent` | AI timeout | Retry with backoff, then fail |
| `ExtractingIntent` | Invalid response | Log and fail |
| `Planning` | AI timeout | Retry with backoff, then fail |
| `Planning` | Validation failure | Retry generation, then fail |
| `Executing` | Diff apply failure | Rollback step, retry once, then fail |

---

## Hard Invariants
This component enforces the following Global System Invariants:
- **INV-GLOBAL-1: Local-Only Execution**
- **INV-GLOBAL-2: Deterministic Orchestration**
- **INV-GLOBAL-3: Fail-Closed Behavior**
- **INV-GLOBAL-4: AI Treated as Untrusted Input**
- **INV-GLOBAL-5: User-Owned API Keys**
- **INV-GLOBAL-6: No Telemetry