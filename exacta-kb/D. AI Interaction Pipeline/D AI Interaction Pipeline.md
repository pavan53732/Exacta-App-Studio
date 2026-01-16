# D. AI Interaction Pipeline

This is the **Master Specification** for the AI Interaction Pipeline. It consolidates the logic for Intent Extraction, Constraint Propagation, Planning, Risk Assessment, and Validation.

> **Version:** V2 (Autonomous Agent)
> 

> **Status:** Canonical & Enforced
> 

> **Scope:** From user text input → Validated, Risk-Assessed Plan
> 

> **Next Stage:** Gate Pipeline → Safe Execution Engine
> 

---

## 1. Core Pipeline Invariants

- **INV-PIPE-1: Closed Taxonomy** — The system ONLY recognizes `CreateProject`, `AddFeature`, `FixBug`, and `BuildPackage`. All other intents are rejected.
- **INV-PIPE-2: Deterministic Risk** — Risk scoring (0-100) is deterministic based on file counts, deletions, and operation types.
- **INV-PIPE-3: Policy-Based Approval Gate** *(Changed in V2)* — Plans flow through the Gate Pipeline. Approval can come from User, Policy Engine, or Active Profile. Low/Medium risk plans with High Quality can auto-execute per profile settings. High risk (> 65) requires confirmation in all profiles.
- **INV-PIPE-4: Constraints are First-Class** — User constraints (MUST/MUST_NOT) propagate from Intent → Plan → Step → Validation.
- **INV-PIPE-5: Fail-Closed Validation** — Invalid plans (cycles, bad paths, missing steps) are rejected immediately.

---

## 2. AI Provider Layer (Contract)

The pipeline relies on a deterministic provider capability matrix.

### Capability Schema

All providers must match this capability interface:

```tsx
interface ProviderCapability {
  provider_id: string;             // e.g. "openai", "anthropic"
  model_id: string;                // e.g. "gpt-4o", "claude-3-5-sonnet"
  max_input_tokens: number;        // Context window hard limit
  supports_streaming: boolean;     // Required for Diff generation
  supports_json_mode: boolean;     // Required for Plan generation
  supports_function_calling: boolean; // Required for Intent extraction
}
```

### Selection & Fallback Strategy

1. **Intent Extraction:** Prefers lowest latency (e.g., `gpt-4o-mini`, `claude-3-haiku`).
2. **Plan Generation:** Prefers largest context/reasoning (e.g., `claude-3-5-sonnet`, `gpt-4o`).
3. **Fallback:** If a provider fails (5xx, timeout), the system attempts up to **3 retries** with exponential backoff, falling back to the next capable provider.

---

## 3. Step 1: Intent Extraction

Converts raw user text into a structured, validated command.

### Intent Taxonomy (Closed)

| Intent Type | Description | Required Context |
| --- | --- | --- |
| :--- | :--- | :--- |
| `CreateProject` | Initialize new project from template | Type (WPF/WinUI), Name, Path |
| `AddFeature` | Add new functionality | Feature Description |
| `FixBug` | Correct existing behavior | Bug Description, Location |
| `BuildPackage` | Compile/Package app | Build Config (Debug/Release) |

### Intent Schema

```tsx
interface Intent {
  id: UUID;
  correlation_id: UUID;          // Traces entire operation
  type: IntentType;
  confidence: number;            // 0.0 - 1.0
  target: {
    files: string[];             // Specific files mentioned
    symbols: string[];           // Specific classes/methods
  };
  constraints: Constraint[];     // Extracted requirements
}
```

### Confidence Gates

- **≥ 0.85 (High):** Proceed to Planning automatically.
- **0.60 - 0.84 (Medium):** **STOP.** Ask user to confirm interpretation.
- **< 0.60 (Low):** **REJECT.** Ask user to rephrase.

---

## 4. Step 2: Constraint Propagation

Constraints are strict boundaries that survive the entire pipeline.

### Constraint Schema

```tsx
interface Constraint {
  type: 'MUST' | 'MUST_NOT' | 'PREFER';
  scope: 'global' | 'file' | 'step';
  description: string; // e.g. "Do not use third-party libraries"
}
```

### Propagation Rules

1. **Extraction:** Constraints extracted from user prompt.
2. **Injection:** Constraints injected into System Prompt for Plan Generation.
3. **Validation:** Plan steps validated against `MUST_NOT` constraints.
4. **Execution:** If a constraint is violated during diff generation, the step is rejected.

---

## 5. Step 3: Planning & Risk Assessment

Converts an Intent into an ordered list of execution steps (`Plan`).

### Plan Schema

```tsx
interface Plan {
  id: UUID;
  intent_id: UUID;
  risk_score: number;       // 0-100
  quality_score: number;    // 0.0-1.0
  status: 'pending' | 'approved' | 'rejected';
  steps: PlanStep[];
}

interface PlanStep {
  type: 'create' | 'modify' | 'delete' | 'build';
  target_file: string;
  description: string;
  constraints: Constraint[];
}
```

### Risk Assessment (Scoring Table)

The **Agent Controller** calculates `risk_score` (0-100) using these weights:

| Factor | Weight | Criteria |
| --- | --- | --- |
| :--- | :--- | :--- |
| **File Operations** | 0-35 pts | Deletions (+10), Bulk Modifies (>5 files +15) |
| **Dependency Changes** | 0-25 pts | Adding/Removing external packages |
| **Refactoring** | 0-20 pts | Cross-file changes, renames |
| **Breaking Changes** | 0-15 pts | Public API signature changes |
| **Security Impact** | 0-15 pts | Touching Auth/Crypto/Secrets |
| **Complexity** | 0-10 pts | Cyclomatic complexity estimate |

### Quality Scoring

- **Completeness (30%):** Does it cover the Intent?
- **Specificity (25%):** Are paths/symbols explicit?
- **Feasibility (20%):** Do files exist?
- **Safety (15%):** Are dangerous patterns avoided?
- **Clarity (10%):** Is the description readable?

### Approval Flow (V2 - Gate Pipeline)

Plans now flow through the **Gate Pipeline** instead of a simple decision tree:

```
Plan → Security Gate → Policy Gate → Risk Gate → Quality Gate → [User Confirm if needed]
```

**Gate Pipeline Outcomes:**

- **ALLOW:** Policy permits. Execute immediately.
- **DENY:** Policy forbids or quality too low. Block.
- **CONFIRM:** User must approve (high risk, moderate quality, or profile requires).

**Decision by Profile:**

| Condition | PROFILE-SAFE | PROFILE-DEV | PROFILE-FULL-AUTO |
| --- | --- | --- | --- |
| Quality < 0.60 | DENY | DENY | DENY |
| Risk > 65 (High) | CONFIRM | CONFIRM | CONFIRM |
| Quality 0.60-0.74 + Risk > 30 | CONFIRM | CONFIRM | **ALLOW** |
| Risk ≤ 65 + Quality ≥ 0.75 | CONFIRM | **ALLOW** | **ALLOW** |

**See:** Approval Gate Specification, Autonomy Profiles & Policy Engine

---

## 6. Step 4: Plan Validation Rules

Before a plan can be assessed for risk, it must pass structural validation.

### Critical Validation Rules (PV-Series)

- **PV-1 (Structure):** Plan MUST have at least one step.
- **PV-2 (Target):** All target paths MUST be within Project Root (Sandbox).
- **PV-3 (Flow):** Dependency graph MUST be acyclic (Linear for V1).
- **PV-4 (Limits):** Max 10 steps, Max 15 files touched total.
- **PV-5 (Safety):** NO binary file modifications allowed via Diff.

### Completeness Checklists (by Intent)

- **AddFeature:** Must define UI component (if needed) + Business Logic + Data wiring.
- **FixBug:** Must identify bug location + fix approach + regression check.
- **CreateProject:** Must create `.csproj` + Entry point (`Program.cs`) + Build config.

If validation fails, the system attempts **Auto-Regeneration** (up to 3 times) with the error context before failing to the user.