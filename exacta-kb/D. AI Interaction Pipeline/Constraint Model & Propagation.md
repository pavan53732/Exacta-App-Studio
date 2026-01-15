# Constraint Model & Propagation

This document specifies the **constraint model** used throughout Exacta App Studio, and how constraints **propagate** through the intent → plan → diff → apply pipeline.

---

## Purpose
Constraints are **hard boundaries** that govern what the system can and cannot do. Unlike preferences (which can be overridden), constraints are **invariants** that must hold at all times. This document defines the constraint taxonomy, propagation rules, and enforcement points.

---

## Constraint Taxonomy

### Constraint Categories

| Category | Source | Examples | Override Policy |
| --- | --- | --- | --- |
| **System Constraints** | Hardcoded in application | Local-only execution, fail-closed behavior, approval gate | **Never overridable** |
| **Project Constraints** | Project configuration | Target framework, output type, project root path | User can modify project config |
| **Session Constraints** | Current execution context | Token budget, active file set, current state | Derived; not directly settable |
| **User Constraints** | Explicit user input | "Do not modify X", "Only change Y" | User can revise in same session |

---

## System Constraints (Non-Negotiable)

These constraints are **hardcoded** and cannot be overridden by any means:

| ID | Constraint | Enforcement Point |
| --- | --- | --- |
| **SC-1** | All file operations within project sandbox | File Gateway |
| **SC-2** | No network calls except configured AI API | HTTP Client |
| **SC-3** | No file writes without user approval | Approval Gate |
| **SC-4** | No execution of AI-generated content as code | Orchestrator |
| **SC-5** | All state transitions are explicit and logged | State Machine |
| **SC-6** | Rollback capability preserved at all times | File Gateway |

---

## Constraint Propagation Model

Constraints flow through the pipeline in a **monotonically narrowing** fashion. Each stage can only **add** constraints, never remove them.

```

┌──────────────────────────────────────────────────────────────────┐

│                     CONSTRAINT FLOW                              │

├──────────────────────────────────────────────────────────────────┤

│                                                                  │

│  [System Constraints] ──────────────────────────────────────►    │

│         │                                                        │

│         ▼                                                        │

│  [Project Constraints] ─────────────────────────────────────►    │

│         │                                                        │

│         ▼                                                        │

│  [User Intent] ─► Intent Extraction ─► [Extracted Constraints]   │

│                          │                                       │

│                          ▼                                       │

│               Plan Generation ─► [Plan with Constraints]         │

│                          │                                       │

│                          ▼                                       │

│               Diff Generation ─► [Diffs with Constraints]        │

│                          │                                       │

│                          ▼                                       │

│               Validation ─► [Validated Constraints]              │

│                          │                                       │

│                          ▼                                       │

│                    Application                                   │

│                                                                  │

└──────────────────────────────────────────────────────────────────┘

```

---

## Constraint Representation

### Internal Constraint Structure

```

interface Constraint {

id: string;                    // Unique identifier

category: ConstraintCategory;  // system | project | session | user

scope: ConstraintScope;        // global | file | region

rule: ConstraintRule;          // The actual constraint logic

source: ConstraintSource;      // Where this constraint originated

overridable: boolean;          // Can user override? (always false for system)

}

interface ConstraintScope {

type: 'global' | 'file' | 'region';

target?: string;               // File path or region identifier

}

interface ConstraintRule {

type: 'include' | 'exclude' | 'require' | 'forbid';

predicate: string;             // Machine-readable condition

humanReadable: string;         // User-facing description

}

```

---

## Constraint Enforcement Points

| Pipeline Stage | Constraints Checked | Failure Behavior |
| --- | --- | --- |
| **Intent Extraction** | User constraints parsed and validated | Clarification requested if ambiguous |
| **Plan Generation** | Plan steps checked against all constraints | Plan rejected; error surfaced to user |
| **Diff Generation** | Diff targets checked against file constraints | Diff rejected; constraint violation reported |
| **Diff Validation** | Path safety, encoding, format constraints | Diff rejected; validation error reported |
| **File Apply** | Sandbox boundary, write permissions | Apply aborted; no partial writes |

---

## User Constraint Extraction

When users express constraints in natural language, the system extracts and formalizes them:

| User Input | Extracted Constraint |
| --- | --- |
| "Don't touch the database layer" | `{ type: 'exclude', predicate: 'path.startsWith("src/data")' }` |
| "Only modify MainWindow.xaml" | `{ type: 'include', predicate: 'path == "src/MainWindow.xaml"' }` |
| "Keep the public API unchanged" | `{ type: 'forbid', predicate: 'modifies.publicApi == true' }` |
| "Use async/await everywhere" | `{ type: 'require', predicate: 'pattern.asyncAwait == true' }` |

---

## Constraint Conflict Resolution

When constraints conflict, resolution follows strict precedence:
1. **System constraints** always win (non-negotiable)
2. **Explicit user constraints** override implicit constraints
3. **Narrower scope** overrides broader scope
4. **Later constraints** override earlier (within same category)

> **Conflict Detection:** If constraints are irreconcilable (for example user says "modify X" but X is outside sandbox), the system **rejects the request** with an explanation. It does not silently ignore constraints.

---

## Invariants

> **INV-CONST-1: Monotonic Narrowing**  
> Constraints can only become more restrictive as they propagate through the pipeline. No stage can remove or weaken a constraint from a prior stage.

> **INV-CONST-2: Complete Enforcement**  
> Every constraint is checked at its designated enforcement point. There is no "unchecked" path through the system.

> **INV-CONST-3: Explicit Violation Reporting**  
> When a constraint is violated, the specific constraint and violation are reported to the user. The system never silently ignores violations.

---

## Constraint Logging

All constraint checks are logged with:

| Field | Description |
| --- | --- |
| `timestamp` | When the check occurred |
| `constraint_id` | Which constraint was checked |
| `result` | `pass` or `fail` |
| `context` | What was being checked (plan step, diff hunk, etc.) |
| `violation_detail` | If failed, what specifically violated the constraint |

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
| Extract constraints from user input | Infer constraints the user didn't express |
| Enforce all constraints at designated points | Skip constraint checks for "trusted" sources |
| Report constraint violations explicitly | Silently ignore or work around violations |
| Allow user to revise constraints | Allow override of system constraints |
| Log all constraint checks | Cache or reuse constraint check results across sessions |