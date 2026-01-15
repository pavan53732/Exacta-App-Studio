# Intent Model & Supported Intent Types (V1)

This document defines the canonical contract for intent extraction in Exacta App Studio V1. It is authoritative for the Orchestrator.

---

## What Is an Intent
An **Intent** is a structured representation of what the user wants to accomplish.
- Extracted from natural language user input
- Validated against a closed taxonomy
- Contains metadata required for plan generation
- Does not describe *how* to accomplish the goal (that is the Plan)

---

## Supported Intent Types (V1)

V1 supports exactly **four** intent types:

| Intent Type | Description | Example Input |
| --- | --- | --- |
| `CreateProject` | Initialize a new project from a built-in template | "Create a new WPF app" |
| `AddFeature` | Add new functionality to existing code | "Add a login button" |
| `FixBug` | Correct a defect in existing code | "Fix the null reference in UserService" |
| `BuildPackage` | Compile the project and/or generate an installer | "Build the MSI installer" |

Any request that does not map to one of these types is rejected.

---

## Intent Schema

```

Intent {

id: UUID                          [Required]

type: IntentType                  [Required]

confidence: float (0.0 - 1.0)     [Required]

raw_input: string                 [Required]

target: TargetSpecification       [Optional]

constraints: Constraint[]         [Optional]

timestamp: ISO 8601 datetime      [Required]

}

```

---

## Required Fields

| Field | Type | Description |
| --- | --- | --- |
| `id` | UUID | Unique identifier for this intent instance |
| `type` | Enum | One of: `CreateProject`, `AddFeature`, `FixBug`, `BuildPackage` |
| `confidence` | Float | AI's confidence in the extraction (0.0 to 1.0) |
| `raw_input` | String | Original user text, unmodified |
| `timestamp` | DateTime | When the intent was extracted |

---

## Optional Fields

| Field | Type | Description |
| --- | --- | --- |
| `target` | TargetSpecification | Files, symbols, or components the intent applies to |
| `constraints` | Constraint[] | User-specified requirements or restrictions |

### TargetSpecification Schema

```

TargetSpecification {

files: string[]         [Optional] Relative paths

symbols: string[]       [Optional] Type/method/property names

description: string     [Required] Natural language description

}

```

### Constraint Schema

```

Constraint {

type: ConstraintType    [Required] MUST | MUST_NOT | PREFER

description: string     [Required] What the constraint requires

scope: string           [Required] "global" | "step" | symbol reference

}

```

---

## Confidence Thresholds

| Score Range | System Behavior |
| --- | --- |
| **0.85 - 1.00** | Proceed to plan generation |
| **0.60 - 0.84** | Ask user to confirm interpretation before proceeding |
| **0.00 - 0.59** | Reject intent; ask user to rephrase |

Thresholds are **hard gates**, not suggestions. The system does not proceed below threshold without user confirmation.

---

## Rejection Conditions

An intent is **rejected** (not executed) when:

| Condition | Rejection Reason |
| --- | --- |
| Type not recognized | Does not match any V1 intent type |
| Confidence below 0.60 | Too uncertain to proceed |
| Multiple conflicting types | Ambiguous (could be AddFeature or FixBug) |
| Composite request | Contains multiple distinct intents ("do X and Y") |
| Target unresolvable | Cannot determine which file or symbol is meant |
| Constraints conflict | User requirements contradict each other |
| Safety violation | Request would violate path or execution safety rules | 

Rejection is explicit. The user is informed why and asked to clarify.

---

## How Constraints Are Preserved

Constraints survive the entire execution pipeline:

```

User states constraint (e.g., "don't use third-party packages")

│

▼

Extracted as Constraint object with type=MUST_NOT

│

▼

Attached to Intent

│

▼

Propagated to Plan (plan.constraints[])

│

▼

Inherited by each Step (step.constraints[])

│

▼

Included in AI context for diff generation

│

▼

Validated in generated output

│

▼

Violation → Step rejected, plan halted

```

Constraints are **first-class objects**, not prompt text. They are enforced, not suggested.

---

## Intent Type Details

### CreateProject
**Purpose:** Initialize a new project from a built-in template.

**Required context:**
- Project type (WPF, WinUI, WinForms)
- Project name
- Target directory

**Produces:** A complete project scaffold, not incremental changes.

---

### AddFeature
**Purpose:** Add new functionality to an existing project.

**Required context:**
- Description of the feature
- Target location (if known)

**Constraints commonly applied:**
- MUST use specific patterns
- MUST_NOT add dependencies
- PREFER existing naming conventions

---

### FixBug
**Purpose:** Correct a defect in existing code.

**Required context:**
- Description of the bug or symptom
- Location (if known)

**Distinguishing from AddFeature:**
- FixBug corrects existing behavior
- AddFeature introduces new behavior

If ambiguous, the system asks for clarification.

---

### BuildPackage
**Purpose:** Compile the project and/or generate an installer.

**Required context:**
- Build type (debug, release)
- Output type (exe only, MSI, NSIS)

**Does not modify source code.** This intent triggers build execution, not code generation.

---

## Unknown Intent Handling

If user input does not map to a known intent type:
1. Classify as `UnknownIntent`
2. Set confidence to 0.0
3. Do not generate a plan
4. Return error to user: "Request not recognized as a supported action."
5. Suggest closest matching intent types if applicable

Unknown intents are never executed.

---

## Hard Invariants
This component enforces the following Global System Invariants:
- **INV-GLOBAL-1: Local-Only Execution**
- **INV-GLOBAL-2: Deterministic Orchestration**
- **INV-GLOBAL-3: Fail-Closed Behavior**
- **INV-GLOBAL-4: AI Treated as Untrusted Input**
- **INV-GLOBAL-5: User-Owned API Keys**
- **INV-GLOBAL-6: No Telemetry