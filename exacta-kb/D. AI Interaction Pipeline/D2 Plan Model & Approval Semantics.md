# D2. Plan Model & Approval Semantics

This document specifies the **plan data model**, **validation rules**, and **auto-evaluation semantics** for the autonomous agent.

---

## Purpose

A Plan is the intermediate representation between user intent and executable diffs. This document defines the plan structure, validation criteria, and the auto-evaluation logic that determines execution path.

---

## Plan Data Model

### Plan Structure

```tsx
interface Plan {
  id: string;                     // Unique identifier
  correlation_id: string;         // For audit trail tracking
  version: number;                // Schema version
  createdAt: ISO8601String;       // Creation timestamp
  intent: IntentReference;        // Source intent
  steps: PlanStep[];              // Ordered execution steps
  target_files: string[];         // All files this plan will modify (for drift detection)
  constraints: Constraint[];      // Applicable constraints
  estimatedTokens: number;        // Token budget estimate
  estimatedDuration: number;      // Estimated execution time (ms)
  riskAssessment: RiskAssessment; // Risk evaluation
  qualityScore: QualityScore;     // Quality evaluation
  status: PlanStatus;             // pending | auto_approved | user_approved | rejected | expired
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

type PlanStatus = 'pending' | 'auto_approved' | 'user_approved' | 'rejected' | 'expired';
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

## Auto-Evaluation Semantics

### Risk Assessment

Plans are scored from 0-100 based on 6 factors:

| Factor | Weight | Key Criteria |
| --- | --- | --- |
| File Operations | 0-35 pts | Deletions, bulk modifications |
| Dependency Changes | 0-25 pts | Added/removed dependencies |
| Refactoring Scope | 0-20 pts | Cross-file changes |
| Breaking Changes | 0-15 pts | API signature changes |
| Security Impact | 0-15 pts | Auth/crypto code touched |
| Code Complexity | 0-10 pts | Cyclomatic complexity |

**Risk levels:**

- **Low (0-30):** Auto-execute
- **Medium (31-65):** Auto-execute with notification
- **High (66-100):** Require user confirmation

### Quality Scoring

Plans are scored from 0.0-1.0 across 5 dimensions:

| Dimension | Weight | Key Criteria |
| --- | --- | --- |
| Completeness | 30% | Intent coverage, missing steps |
| Specificity | 25% | Placeholder detection, vague values |
| Feasibility | 20% | Impossible operations, conflicts |
| Safety | 15% | Unsafe patterns, data loss risk |
| Clarity | 10% | Step description quality |

**Quality thresholds:**

- **≥0.75:** Good quality
- **0.60-0.75:** Moderate quality
- **<0.60:** Insufficient quality (reject)

### Auto-Approval Decision Tree

```jsx
Quality < 0.60 
  → Reject (INV-PLAN-1)

Quality ≥ 0.60 + Risk > 65 
  → WaitingForClarification

Quality ≥ 0.60 + Risk 31-65 + Conservative 
  → WaitingForClarification

Quality 0.60-0.75 + Risk 31-65 
  → WaitingForClarification

Quality ≥ 0.75 + Risk 31-65 
  → Auto-Approve (notify_and_execute)

Quality ≥ 0.75 + Risk 0-30 
  → Auto-Approve (execute)
```

---

## Plan Status Lifecycle

### Status Transitions

| From Status | To Status | Trigger |
| --- | --- | --- |
| `pending` | `auto_approved` | Auto-evaluation: low/medium risk + good quality |
| `pending` | `user_approved` | User explicitly approves after clarification |
| `pending` | `rejected` | Quality too low OR user rejects |
| `pending` | `expired` | File changes, timeout, or session end |
| `auto_approved` | `expired` | File changes before execution starts |
| `user_approved` | `expired` | File changes before execution starts |

### Expiration Triggers

A plan expires if:

1. **File system change** — Any file in the plan's target set is modified externally
2. **Project state change** — Project configuration changes
3. **Session end** — User closes the application
4. **Timeout** — Plan remains pending beyond 30 minutes (does NOT cause auto-approval)

---

## User Confirmation Interface

When auto-evaluation determines user confirmation is needed (`WaitingForClarification`), the UI displays:

### Required Information Display

| Element | Description |
| --- | --- |
| **Why confirmation needed** | Risk level, quality score, specific concerns |
| **Step list** | All steps with descriptions |
| **Diff preview** | Full unified diff for each file modification |
| **Risk assessment** | Detailed risk factors and scores |
| **Quality dimensions** | Scores for each quality dimension with issues |
| **Affected files** | List of files to be created/modified/deleted |
| **Estimated duration** | How long execution will take |

### User Actions

| Action | Effect |
| --- | --- |
| **Approve** | Mark as `user_approved`; proceed to execution |
| **Reject** | Mark as `rejected`; return to chat |
| **Request Changes** | Return to AI with modification request |
| **Pause to Review Later** | Keep in `pending` state |

---

## Autonomous Execution Flow

```
Planning Complete
    │
    ▼
[Agent Controller] ─── assess risk
    │
    ├─── score quality
    │
    └─── make decision
            │
            ├─ Quality < 0.60 ──▶ Reject
            │
            ├─ Risk > 65 ──▶ WaitingForClarification
            │
            └─ Risk ≤ 65 + Quality OK ──▶ Auto-Approve
                    │
                    ├─ Low Risk ──▶ Execute (silent)
                    │
                    └─ Medium Risk ──▶ Execute (with notification)
```

---

## Invariants

<aside>
🔒

**INV-PLAN-1: Auto-Execution Only When Safe**

A plan auto-executes only when:

- Quality score ≥ quality threshold for risk level
- Risk score ≤ 65 (Low or Medium)
- User autonomy preference allows it
- No conflicting constraints
</aside>

<aside>
🔒

**INV-PLAN-2: Atomic Approval**

Approval is atomic with respect to plan validity. If the plan expires between approval decision and execution start, execution is blocked.

</aside>

<aside>
🔒

**INV-PLAN-3: No Partial Execution**

An approved plan either executes completely or rolls back completely. There is no partial execution state.

</aside>

<aside>
🔒

**INV-PLAN-4: Risk Assessment is Deterministic**

Given the same plan and project context, risk assessment produces the same score. No randomness in risk calculation.

</aside>

<aside>
🔒

**INV-PLAN-5: Model Identity Binding**

Every Plan MUST record the AI provider and model that generated it. Execution MUST fail if the current provider/model does not match the Plan record unless Operator re-approves.

</aside>

<aside>
🔒

**INV-PLAN-5B: Safety Policy State Binding**

Every Plan MUST record:

- AI provider/model (per INV-PLAN-5)
- **Safety Policy version/hash**
- **Active profile at plan creation**

Execution SHALL fail if any value mismatches current system state. This ensures approval provenance is preserved across policy changes.

</aside>

### Model & Policy Binding Record *(Extended in V2.3)*

Every Plan MUST include:

```tsx
interface PlanBinding {
  // Model binding (INV-PLAN-5)
  provider_id: string;        // e.g., "openai", "anthropic", "ollama"
  model_id: string;           // e.g., "gpt-4-turbo", "claude-3-opus"
  model_version?: string;     // If available from provider
  provider_class: 'LOCAL_ONLY' | 'TRUSTED_CLOUD' | 'UNTRUSTED_CLOUD';
  request_hash: string;       // SHA-256 of the AI request
  
  // Policy binding (INV-PLAN-5B)
  safety_policy_version: string;   // Version from Safety Policy
  safety_policy_hash: string;      // SHA-256 of Safety Policy file
  active_profile: string;          // Profile at plan creation time
  autonomy_ceiling: string;        // Ceiling at plan creation time
  
  timestamp: ISO8601String;   // When plan was generated
}
```

### Model & Policy Drift Detection

Before execution, Guardian validates:

| **Check** | **Failure Behavior** |
| --- | --- |
| Provider ID mismatch | BLOCK + require re-approval |
| Model ID mismatch | BLOCK + require re-approval |
| Provider class less strict | BLOCK (e.g., TRUSTED→UNTRUSTED) |
| Provider class more strict | ALLOW (e.g., CLOUD→LOCAL) |
| Plan age exceeds TTL | BLOCK + require re-generation |
| **Safety Policy hash mismatch** | **BLOCK + require re-approval** |
| **Active profile mismatch** | **BLOCK + require re-approval** |
| **Autonomy ceiling more permissive** | **BLOCK (policy escalation)** |
| **Autonomy ceiling more restrictive** | **RE-EVALUATE (may now be denied)** |

**Rationale:** Prevents forensic invalidation where a plan generated by one model executes under a different model, AND prevents plans approved under stricter policy from executing under more permissive policy (approval provenance).

---

## Hard Invariants

This component enforces the following Global System Invariants:

- **INV-GLOBAL-1: Local-Only Execution** — All plan evaluation and storage happens locally; no external services
- **INV-GLOBAL-2: Autonomous Execution** — Plans auto-approve and execute when quality and risk thresholds are met
- **INV-GLOBAL-3: Background Operation** — Approved plans can execute in the background while user continues other work
- **INV-GLOBAL-4: Graceful Degradation** — Plans expire on file changes instead of executing with stale data
- **INV-GLOBAL-5: AI Treated as Untrusted Input** — AI output validated by Guardian-enforced gates before any system effect
- **INV-GLOBAL-6: User-Owned API Keys** — Plans are generated using user's own API keys
- **INV-GLOBAL-7: No Telemetry** — Plans and approval decisions stored locally in `.exacta/plans/` and `.exacta/audit-log/`
- **INV-GLOBAL-8: All Changes Reversible** — All plan steps backed up before execution; undo available
- **INV-GLOBAL-9: Complete Audit Trail** — Every plan logged with correlation_id, risk assessment, quality score, and approval decision

---

## Storage and Persistence

### Plan Storage

Plans are persisted to `.exacta/plans/\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\{plan_id\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\}.json` with the following structure:

```tsx
interface PersistedPlan {
  plan: Plan;
  timestamp: ISO8601String;
  approval_decision: {
    decision: 'auto_approved' | 'user_approved' | 'rejected';
    risk_score: number;
    quality_score: number;
    decided_at: ISO8601String;
    decided_by: 'system' | 'user';
  };
}
```

### Audit Trail

Every plan operation is logged to `.exacta/audit-log/\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\{correlation_id\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\}.json`:

```tsx
interface PlanAuditEntry {
  event: 'plan_created' | 'plan_evaluated' | 'plan_approved' | 'plan_rejected' | 'plan_expired' | 'plan_executed';
  correlation_id: string;
  plan_id: string;
  timestamp: ISO8601String;
  risk_score?: number;
  quality_score?: number;
  decision?: string;
  reason?: string;
}
```

---

## Drift Detection Integration

Before executing an approved plan, drift detection validates that target files haven't changed:

```tsx
async function validatePlanBeforeExecution(plan: Plan): Promise<ValidationResult> {
  const driftDetector = new DriftDetector();
  
  const driftResult = await driftDetector.checkDrift({
    plan_id: 
```

---

## Risk Assessment Implementation

```tsx
class RiskAssessor {
  assess(plan: Plan, context: ProjectContext): RiskAssessment {
    let score = 0;
    const factors: RiskFactor[] = [];
    
    // Factor 1: File Operations (0-35 pts)
    const fileOpScore = this.assessFileOperations(plan.steps);
    score += fileOpScore;
    factors.push({ name: 'File Operations', score: fileOpScore, max: 35 });
    
    // Factor 2: Dependency Changes (0-25 pts)
    const depScore = this.assessDependencyChanges(plan.steps, context);
    score += depScore;
    factors.push({ name: 'Dependency Changes', score: depScore, max: 25 });
    
    // Factor 3: Refactoring Scope (0-20 pts)
    const refactorScore = this.assessRefactoringScope(plan.steps);
    score += refactorScore;
    factors.push({ name: 'Refactoring Scope', score: refactorScore, max: 20 });
    
    // Factor 4: Breaking Changes (0-15 pts)
    const breakingScore = this.assessBreakingChanges(plan.steps, context);
    score += breakingScore;
    factors.push({ name: 'Breaking Changes', score: breakingScore, max: 15 });
    
    // Factor 5: Security Impact (0-15 pts)
    const securityScore = this.assessSecurityImpact(plan.steps);
    score += securityScore;
    factors.push({ name: 'Security Impact', score: securityScore, max: 15 });
    
    // Factor 6: Code Complexity (0-10 pts)
    const complexityScore = this.assessComplexity(plan.steps);
    score += complexityScore;
    factors.push({ name: 'Code Complexity', score: complexityScore, max: 10 });
    
    const level = this.getRiskLevel(score);
    
    return {
      score,
      level,
      factors,
      timestamp: new Date().toISOString()
    };
  }
  
  private assessFileOperations(steps: PlanStep[]): number {
    let score = 0;
    const deleteCount = steps.filter(s => s.type === 'file_delete').length;
    const modifyCount = steps.filter(s => s.type === 'file_modify').length;
    
    // Deletions are high risk
    score += deleteCount * 10;
    
    // Bulk modifications are risky
    if (modifyCount > 10) score += 15;
    else if (modifyCount > 5) score += 10;
    else if (modifyCount > 2) score += 5;
    
    return Math.min(score, 35);
  }
  
  private getRiskLevel(score: number): 'low' | 'medium' | 'high' {
    if (score <= 30) return 'low';
    if (score <= 65) return 'medium';
    return 'high';
  }
}
```

---

## Quality Scoring Implementation

```tsx
class QualityScorer {
  score(plan: Plan): QualityScore {
    const dimensions = {
      completeness: this.scoreCompleteness(plan),
      specificity: this.scoreSpecificity(plan),
      feasibility: this.scoreFeasibility(plan),
      safety: this.scoreSafety(plan),
      clarity: this.scoreClarity(plan)
    };
    
    // Weighted average
    const overallScore = 
      dimensions.completeness * 0.30 +
      dimensions.specificity * 0.25 +
      dimensions.feasibility * 0.20 +
      
```

---

## Requirements (Non-Negotiable)

- **MUST track correlation_id** — Every plan linked to original intent for audit trail
- **MUST validate structure** — All 5 structural validation rules (PV-1 through PV-5) enforced before approval
- **MUST validate semantics** — All 3 semantic validation rules (PS-1 through PS-3) enforced before approval
- **MUST assess risk deterministically** — Same plan + same context = same risk score (INV-PLAN-4)
- **MUST NOT auto-execute high risk** — Plans with risk > 65 always require user confirmation
- **MUST NOT execute quality < 0.60** — Plans below quality threshold always rejected
- **MUST expire on file changes** — Plans expire immediately if target files modified externally
- **MUST expire on session end** — Plans do not persist across application restarts
- **MUST timeout pending plans** — Plans pending > 30 minutes expire (but do NOT auto-approve)
- **MUST check drift before execution** — Run drift detection on all target files before executing
- **MUST persist all plans** — Save to `.exacta/plans/\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\{plan_id\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\}.json` with approval decision
- **MUST log all decisions** — Write audit entry to `.exacta/audit-log/\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\{correlation_id\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\}.json`
- **MUST enforce atomic approval** — If plan expires between approval and execution, block execution (INV-PLAN-2)
- **MUST rollback on failure** — No partial execution; all-or-nothing (INV-PLAN-3)
- **MUST notify on medium risk** — Show notification when auto-executing medium risk plans
- **MUST show full details for confirmation** — Display risk, quality, diffs, and affected files when requesting user confirmation

---

## Does / Does Not

| **System DOES** | **System DOES NOT** |
| --- | --- |
| Auto-execute low and medium risk plans | Auto-execute high-risk plans |
| Show detailed risk assessment | Hide risk factors from user |
| Require confirmation for high risk | Auto-approve after timeout |
| Expire plans on state change | Execute expired plans |
| Provide detailed quality feedback | Execute plans with quality <0.60 |
| Log all approval decisions | Remember approval decisions across sessions |