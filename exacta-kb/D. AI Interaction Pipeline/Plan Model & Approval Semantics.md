
# Plan Model & Approval Semantics

This document specifies the **plan data model**, **validation rules**, and **approval gate semantics** for Exacta App Studio.

---

## Purpose
A Plan is the intermediate representation between user intent and executable diffs. This document defines the plan structure, validation criteria, and the approval gate that governs execution.

---

## Plan Data Model

### Plan Structure
```

interface Plan {

id: string;                     // Unique identifier

version: number;                // Schema version

createdAt: ISO8601String;       // Creation timestamp

intent: IntentReference;        // Source intent

steps: PlanStep[];              // Ordered execution steps

constraints: Constraint[];      // Applicable constraints

estimatedTokens: number;        // Token budget estimate

status: PlanStatus;             // pending | approved | rejected | expired

}

interface PlanStep {

id: string;                     // Step identifier

order: number;                  // Execution order

type: StepType;                 // file_create | file_modify | file_delete

target: FilePath;               // Target file path

description: string;            // Human-readable description

dependencies: string[];         // IDs of prerequisite steps

diff?: UnifiedDiff;             // Generated diff (if applicable)

}

type PlanStatus = 'pending' | 'approved' | 'rejected' | 'expired';

```

---

## Plan Validation Rules

### Structural Validation
| Rule ID | Rule | Failure Behavior |
| --- | --- | --- |
| **PV-1** | Plan MUST have at least one step | Reject plan; request clarification |
| **PV-2** | All step dependencies MUST reference existing steps | Reject plan; report broken dependency |
| **PV-3** | Dependency graph MUST be acyclic | Reject plan; report cycle |
| **PV-4** | All target paths MUST be within project sandbox | Reject plan; report path violation |
| **PV-5** | Token estimate MUST be within budget | Reject plan; report budget exceeded |

### Semantic Validation
| Rule ID | Rule | Failure Behavior |
| --- | --- | --- |
| **PS-1** | Plan MUST satisfy all extracted constraints | Reject plan; report constraint violation |
| **PS-2** | File modifications MUST not conflict | Reject plan; report conflict |
| **PS-3** | Delete operations MUST not target files with pending modifications | Reject plan; report ordering error |

---

## Approval Gate Semantics

### Gate Behavior
> **The Approval Gate is a hard synchronization point.** No plan step executes until the user explicitly approves. There is no timeout-based auto-approval.

### Approval States
| State | Meaning | Transitions |
| --- | --- | --- |
| **Pending** | Awaiting user decision | → Approved, Rejected, Expired |
| **Approved** | User approved; execution may proceed | → (terminal for gate) |
| **Rejected** | User rejected; plan discarded | → (terminal) |
| **Expired** | Plan invalidated by state change | → (terminal) |

### Expiration Triggers
A pending plan expires (transitions to `expired`) if:
1. **File system change** — Any file in the plan's target set is modified externally
2. **Project state change** — Project configuration changes
3. **Session end** — User closes the application
4. **Timeout** — Plan remains pending beyond configurable limit (default: 30 minutes). Timeout transitions the plan to `expired`. **Timeout MUST NOT cause auto-approval under any circumstances.**

---

## User Approval Interface

### Required Information Display
| Element | Description |
| --- | --- |
| **Step list** | All steps with descriptions |
| **Diff preview** | Full unified diff for each file modification |
| **Affected files** | List of files to be created/modified/deleted |
| **Constraint summary** | Active constraints and how they're satisfied |
| **Token estimate** | Estimated token usage |

### User Actions
| Action | Effect |
| --- | --- |
| **Approve All** | Approve entire plan; proceed to execution |
| **Reject All** | Reject entire plan; return to chat |
| **Approve Selected** | Approve subset of steps; creates a **derived plan** (see below) |
| **Request Changes** | Return to AI with modification request |

---

## Partial Approval & Derived Plans

### How Partial Approval Works
When a user selects "Approve Selected" for a subset of steps, the system creates a **derived plan**:
1. A new plan is generated containing only the selected steps
2. The derived plan is assigned a new `id` and `version = 1`
3. The derived plan references the original plan's `intent_id`
4. The derived plan MUST pass full validation before execution

### Dependency Resolution Rules
> **Critical:** For every selected step, all its dependencies MUST also be selected. If dependencies are missing, partial approval MUST fail.

| Scenario | Behavior |
| --- | --- |
| Selected step has no dependencies | Allowed |
| Selected step's dependencies are also selected | Allowed |
| Selected step depends on unselected step | **Rejected** — error shown to user listing missing dependencies |
| No steps selected | **Rejected** — equivalent to Reject All |

### Derived Plan Validation
The derived plan undergoes the same validation as any plan:
- Structural validation
- Limit enforcement
- Completeness criteria (scoped to selected steps)
- Constraint satisfaction

If the derived plan fails validation, partial approval is rejected and the user is informed.

### Reconciling Partial Approval with No Partial Execution
> **Clarification:** "Allow partial plan approval" and "No Partial Execution" (INV-PLAN-3) are not contradictory.
> - **Partial approval** creates a new, smaller, complete plan (the derived plan)
> - **No partial execution** means the derived plan executes fully or rolls back fully
> - The original plan remains in `pending` or transitions to `expired`

---

## Invariants

> **INV-PLAN-1: No Implicit Approval**  
> A plan never transitions from `pending` to `approved` without explicit user action. There is no auto-approval, no default approval, and no approval-by-timeout.

> **INV-PLAN-2: Atomic Approval**  
> Approval is atomic with respect to plan validity. If the plan expires between user clicking "Approve" and system processing, the approval is rejected.

> **INV-PLAN-3: No Partial Execution**  
> An approved plan either executes completely or rolls back completely. There is no partial execution state.

---

## Hard Invariants
This component enforces the following Global System Invariants:
- **INV-GLOBAL-1: Local-Only Execution**
- **INV-GLOBAL-2: Deterministic Orchestration**
- **INV-GLOBAL-3: Fail-Closed Behavior**
- **INV-GLOBAL-4: AI Treated as Untrusted Input**
- **INV-GLOBAL-5: User-Owned API Keys**
- **INV-GLOBAL-6: No Telemetry**

---

## Does / Does Not
| **System DOES** | **System DOES NOT** |
| --- | --- |
| Show complete diff before approval | Execute any step before approval |
| Expire plans on state change | Auto-approve after timeout |
| Allow partial approval (creates derived plan) | Allow partial approval with missing dependencies |
| Validate derived plans before execution | Allow step reordering by user |
| Log all approval/rejection decisions | Remember approval decisions across sessions |
```