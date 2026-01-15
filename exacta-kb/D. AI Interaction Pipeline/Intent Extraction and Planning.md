# Intent Extraction and Planning

This document defines how Exacta App Studio interprets user requests and converts them into executable plans.

---

## Intent Extraction Overview
Intent extraction is the process of converting natural language user input into a structured, validated intent object that the system can act upon.

### Principles
- **Closed taxonomy:** Only defined intent types are recognized
- **Explicit uncertainty:** Low confidence triggers user clarification, not guessing
- **Constraints preserved:** User constraints are first-class objects, not discarded
- **Composites split:** Multi-part requests become multiple intents

---

## Intent Taxonomy (Closed)

Version 1 supports the following intent types:

| Intent Type | Description | Example |
| --- | --- | --- |
| `CreateProject` | Initialize a new project from template | "Create a new WPF app" |
| `AddFeature` | Add new functionality to existing code | "Add a login screen" |
| `FixBug` | Correct existing behavior | "Fix the null reference in UserService" |
| `BuildPackage` | Compile and/or package the application | "Build the installer" |

**Future intents (out of scope for v1):**
- `Refactor` — Restructure without changing behavior
- `AddDependency` — Add external package
- `RemoveDependency` — Remove external package
- `Inspect` — Analyze without modifying

### Unknown Intent Handling
If user input does not map to a known intent type:
1. Classify as `UnknownIntent`
2. Do not attempt execution
3. Ask user for clarification
4. Suggest closest matching intent types if applicable

---

## Intent Schema

A validated intent object contains:

```

Intent {

id: UUID

type: IntentType (enum)

confidence: float (0.0 - 1.0)

raw_input: string (original user text)

target: TargetSpecification | null

constraints: Constraint[]

timestamp: datetime

}

```

### Target Specification

```

TargetSpecification {

files: string[] | null

symbols: string[] | null

description: string

}

```

### Constraint

```

Constraint {

type: ConstraintType (enum: MUST, MUST_NOT, PREFER)

description: string

scope: string ("global" | "step" | symbol reference)

}

```

Example constraints:
- `MUST_NOT use third-party packages`
- `MUST use async/await pattern`
- `PREFER existing naming conventions`

---

## Intent Confidence Scoring

The AI produces a confidence score for each intent extraction.

### Confidence Thresholds

| Score Range | Action |
| --- | --- |
| 0.85 - 1.00 | Proceed to planning |
| 0.60 - 0.84 | Ask user to confirm interpretation |
| 0.00 - 0.59 | Reject intent; ask user to rephrase |

### Confidence Factors
- Clarity of user language
- Presence of explicit targets (file names, method names)
- Absence of ambiguous terms
- Match to known intent patterns

**Calibration policy:** Thresholds are set conservatively. False negatives (asking when not needed) are preferred over false positives (proceeding incorrectly).

---

## When the System Asks vs Proceeds

### System Proceeds When
- Intent type is unambiguous
- Confidence score meets threshold
- Target is resolvable to specific files/symbols
- No conflicting constraints

### System Asks When
- Intent type is ambiguous (could be AddFeature or FixBug)
- Confidence score below threshold
- Target is ambiguous (multiple matching symbols)
- Constraints conflict with each other
- Request appears to span multiple intent types

---

## Composite Intent Handling

Users often issue compound requests:
> "Add a login screen and connect it to the database"

### Processing Rules
1. Intent extraction produces a **flat list** of atomic intents
2. Each atomic intent is independently validated
3. Intents are ordered by dependency (login screen before database connection)
4. Each intent produces its own plan
5. Plans execute sequentially, not in parallel

### Rejection Criteria
Composite intents are rejected (with explanation) if:
- Dependencies cannot be resolved
- Intents conflict with each other
- Total scope exceeds safe execution limits

---

## Constraints as First-Class Objects

Constraints are not just prompt text. They are structured objects that:
1. **Survive planning:** Constraints are attached to the plan, not just the intent
2. **Propagate to steps:** Each step inherits relevant constraints
3. **Affect code generation:** AI prompts include active constraints
4. **Enable validation:** Generated code is checked against constraints
5. **Cause rejection:** Constraint violations block execution

### Constraint Lifecycle

```

User states constraint

│

▼

Extracted as Constraint object

│

▼

Attached to Intent

│

▼

Propagated to Plan

│

▼

Included in step context for AI

│

▼

Validated in generated output

│

▼

Violation → step rejected

```

---

## Plan Generation

A **Plan** is an ordered set of steps that, when executed, fulfills the intent.

### Plan Schema

```

Plan {

id: UUID

version: int

intent_id: UUID

status: PlanStatus (enum: Draft, Approved, Executing, Completed, Failed, Cancelled)

steps: Step[]

constraints: Constraint[]

estimatedTokens: number

created_at: datetime

approved_at: datetime | null

}

```

### Step Schema

```

Step {

id: UUID

order: int

description: string

target_files: string[]

target_symbols: string[]

operation: OperationType (enum: Create, Modify, Delete)

dependencies: UUID[] (step IDs this step depends on)

constraints: Constraint[]

status: StepStatus (enum: Pending, Executing, Completed, Failed, Skipped)

}

```

---

## Plan Validation Rules

Before a plan is presented for approval, it must pass validation:

### Structural Validation
- [ ] All steps have unique IDs
- [ ] Step order is consistent with dependencies
- [ ] No circular dependencies
- [ ] All target files exist (for Modify/Delete) or parent directories exist (for Create)

### Semantic Validation
- [ ] Plan MUST satisfy all extracted constraints
- [ ] File modifications MUST not conflict
- [ ] Delete operations MUST not target files with pending modifications

### Completeness Validation
Each intent type has a completeness checklist.

**AddFeature checklist:**
- [ ] UI component defined (if applicable)
- [ ] Business logic defined
- [ ] Data binding/connection defined (if applicable)
- [ ] Error handling specified

**FixBug checklist:**
- [ ] Bug location identified
- [ ] Fix approach specified
- [ ] Regression risk assessed

### Constraint Validation
- [ ] No step violates a MUST_NOT constraint
- [ ] All MUST constraints are addressed by at least one step

### Granularity Validation
- [ ] No step modifies more than 3 files (configurable)
- [ ] No step produces a diff larger than 500 lines (configurable)
- [ ] No step has more than 5 dependencies

---

## Plan Versioning

Plans are versioned artifacts:
- Each plan has a unique ID and version number
- Rejected or modified plans increment the version
- Only one plan version may be "active" at a time
- Previous versions are retained for audit but are immutable

---

## Plan Lifecycle

```

Intent validated

│

▼

Plan generated (Draft)

│

▼

System validates plan

│

├── Validation fails → regenerate or reject

│

▼

Plan presented to user

│

├── User rejects → plan marked Cancelled, new version generated

│

▼

User approves → plan marked Approved

│

▼

Execution begins → plan marked Executing

│

├── All steps complete → plan marked Completed

└── Any step fails → plan marked Failed

```

---

## Hard Invariants
This component enforces the following Global System Invariants:
- **INV-GLOBAL-1: Local-Only Execution**
- **INV-GLOBAL-2: Deterministic Orchestration**
- **INV-GLOBAL-3: Fail-Closed Behavior**
- **INV-GLOBAL-4: AI Treated as Untrusted Input**
- **INV-GLOBAL-5: User-Owned API Keys**
- **INV-GLOBAL-6: No Telemetry