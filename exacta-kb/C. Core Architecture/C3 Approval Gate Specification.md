# C3. Approval Gate Specification

> **Document ID:** C3
> 

> **Version:** V2 (Autonomous Agent)
> 

> **Status:** Canonical & Enforced
> 

This is the **Master Specification** for Approval Gates — the decision points that determine whether an action proceeds, requires confirmation, or is blocked.

> **Scope:** Gate definitions, approval sources, decision flow
> 

> **Related:** Autonomy Profiles, Policy Engine, Orchestrator
> 

---

## 1. Core Invariants

- **INV-GATE-1: Policy-Based Approval** — Approval is no longer exclusively human. Actions can be approved by: (1) User, (2) System Policy Engine, or (3) Active Autonomy Profile.
- **INV-GATE-2: Gate Ordering** — Gates are evaluated in strict priority order. First gate to produce a definitive result (ALLOW or DENY) wins. CONFIRM propagates to next gate.
- **INV-GATE-3: Fail-Closed** — If all gates return UNKNOWN or error, the default is DENY.
- **INV-GATE-4: Audit All Decisions** — Every gate evaluation is logged, including which gate made the decision and why.
- **INV-GATE-5: Ceiling Supremacy** — No Gate, including Risk or Quality, may authorize a plan that violates Safety Policy ceilings or Policy Gate outcomes. Safety Policy is the absolute authority ceiling.
- **INV-GATE-6: System-Level Plan Enforcement** — Plans classified as SYSTEM-LEVEL bypass auto-execution and require explicit human approval with cryptographic binding.
- **INV-GATE-7: No Bypass** — No code path exists that skips gate evaluation. All actions flow through the gate pipeline.

---

## 2. The New Approval Model

### Before (V1): Human-Only Approval

```
Action → [Wait for User Click] → Execute
```

### Now (V2): Policy-Based Approval

```
Action → [Gate Pipeline] → ALLOW/DENY/CONFIRM → Execute or Block
              ↓
         Policy Engine evaluates:
         - Active Profile rules
         - Risk assessment
         - Quality score
         - Custom policies
```

---

## 3. Approval Sources

| Source | Authority | When Used |
| --- | --- | --- |
| **User** | Explicit human confirmation | High-risk actions, CONFIRM decisions, manual override |
| **Policy Engine** | Evaluates rules against active profile | All actions (first-pass evaluation) |
| **Autonomy Profile** | Pre-configured trust levels | Determines default behavior for action types |

### Approval Authority Hierarchy

1. **Security Gate** — Always first. Can DENY, never ALLOW directly.
2. **Policy Engine** — Evaluates profile rules. Can ALLOW, DENY, or CONFIRM.
3. **Risk Gate** — Evaluates risk score. Can escalate to CONFIRM.
4. **Quality Gate** — Evaluates plan quality. Can DENY if too low.
5. **User Confirmation** — Final fallback for CONFIRM decisions.

---

## 4. Gate Definitions

### Gate 1: Security Gate (Priority 0)

**Purpose:** Catch security violations before any other evaluation.

```tsx
interface SecurityGate {
  checks: [
    'path_traversal',      // Attempts to escape sandbox
    'privilege_escalation', // Attempts to gain elevated access
    'secret_exposure',     // Credentials in output/logs
    'forbidden_operations' // Blocklisted commands/patterns
  ];
  decision: 'PASS' | 'DENY';  // Never ALLOW directly
}
```

**Behavior:**

- **DENY:** Security violation detected. Action blocked. No retry.
- **PASS:** No security issues. Proceed to next gate.

---

### Gate 2: Policy Gate (Priority 1)

**Purpose:** Evaluate action against active profile's policy rules.

```tsx
interface PolicyGate {
  active_profile: string;
  rules_evaluated: PolicyRule[];
  first_match: PolicyRule | null;
  decision: 'ALLOW' | 'DENY' | 'CONFIRM' | 'PASS';
}
```

**Behavior:**

- **ALLOW:** Policy explicitly permits. Execute immediately.
- **DENY:** Policy explicitly forbids. Block action.
- **CONFIRM:** Policy requires user confirmation.
- **PASS:** No matching rule. Proceed to next gate.

---

### Gate 3: Risk Gate (Priority 2)

**Purpose:** Evaluate risk score and escalate high-risk actions.

```tsx
interface RiskGate {
  risk_score: number;        // 0-100
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  thresholds: {
    low_max: 30,
    medium_max: 65,
    high_min: 66
  };
  decision: 'ALLOW' | 'CONFIRM' | 'PASS';
}
```

**Behavior by Profile:**

| Risk Level | PROFILE-SAFE | PROFILE-DEV | PROFILE-FULL-AUTO |
| --- | --- | --- | --- |
| **LOW (0-30)** | CONFIRM | ALLOW | ALLOW |
| **MEDIUM (31-65)** | CONFIRM | ALLOW | ALLOW |
| **HIGH (66-100)** | CONFIRM | CONFIRM | CONFIRM |

---

### Gate 4: Quality Gate (Priority 3)

**Purpose:** Ensure plan quality meets minimum threshold.

```tsx
interface QualityGate {
  quality_score: number;     // 0.0-1.0
  threshold_reject: 0.60;
  threshold_good: 0.75;
  decision: 'DENY' | 'CONFIRM' | 'PASS';
}
```

**Behavior:**

- **Quality < 0.60:** DENY (Plan too low quality to execute)
- **Quality 0.60-0.74:** CONFIRM (Moderate quality, user should review)
- **Quality ≥ 0.75:** PASS (Good quality, proceed)

---

### Gate 5: User Confirmation Gate (Priority 4)

**Purpose:** Final gate for actions requiring explicit human approval.

```tsx
interface UserConfirmationGate {
  prompt_shown: boolean;
  user_response: 'approve' | 'reject' | 'timeout' | null;
  timeout_seconds: 300;      // 5 minutes
  decision: 'ALLOW' | 'DENY';
}
```

**Behavior:**

- **User approves:** ALLOW
- **User rejects:** DENY
- **Timeout:** DENY (fail-closed)

---

## 5. Gate Pipeline Flow

```
    Action Request
          ↓
┌─────────────────┐
│ Security Gate   │ ──DENY──→ BLOCKED
│ (Priority 0)    │
└────────┬────────┘
         │ PASS
         ↓
┌─────────────────┐
│ Policy Gate     │ ──DENY──→ BLOCKED
│ (Priority 1)    │ ──ALLOW─→ EXECUTE
└────────┬────────┘
         │ CONFIRM/PASS
         ↓
┌─────────────────┐
│ Risk Gate       │ ──ALLOW─→ EXECUTE
│ (Priority 2)    │
└────────┬────────┘
         │ CONFIRM/PASS
         ↓
┌─────────────────┐
│ Quality Gate    │ ──DENY──→ BLOCKED
│ (Priority 3)    │
└────────┬────────┘
         │ CONFIRM/PASS
         ↓
┌─────────────────┐
│ User Confirm    │ ──DENY──→ BLOCKED
│ (Priority 4)    │ ──ALLOW─→ EXECUTE
└─────────────────┘
```

---

## 5.1 System-Level Plans

A plan SHALL be classified as **SYSTEM-LEVEL** if it:

- Modifies `.exacta/` or any System Path (as defined in INV-GLOBAL-8)
- Affects shell, network, policy, upgrade, audit, or enforcement logic
- Proposes self-upgrade
- Touches any Guardian-owned resource

**SYSTEM-LEVEL plans:**

- MUST bypass auto-execution (never auto-approve)
- MUST require explicit human approval
- MUST be cryptographically bound to approval record
- MUST be logged as `PLAN-SYSTEM` in audit trail
- MUST validate Safety Policy state at execution time

```tsx
interface SystemLevelPlanCheck {
  is_system_level: boolean;
  triggers: (
    | 'system_path_modification'
    | 'shell_capability'
    | 'network_capability'
    | 'policy_modification'
    | 'self_upgrade'
    | 'audit_modification'
    | 'enforcement_modification'
  )[];
  required_approval: 'HUMAN_EXPLICIT';
  binding: 'CRYPTOGRAPHIC';
  log_class: 'PLAN-SYSTEM';
}
```

## 5.2 Privilege Escalation Plans

A plan SHALL be classified as **PRIVILEGE-ESCALATION** if it attempts to:

- Expand shell execution rights
- Expand network access scope
- Modify policy engine or rules
- Modify audit or logging systems
- Modify certification or trust logic
- Modify upgrade verification

**Rules:**

- Always SYSTEM-LEVEL
- Requires dual approval:
    1. Human explicit
    2. Guardian policy confirmation
- Logged as `PLAN-PRIVILEGE-ESCALATION`

---

## 6. Decision Schema

```tsx
interface GateDecision {
  timestamp: string;
  correlation_id: UUID;
  action_type: string;
  gates_evaluated: {
    gate_name: string;
    result: 'ALLOW' | 'DENY' | 'CONFIRM' | 'PASS';
    reason?: string;
    rule_matched?: string;
  }[];
  final_decision: 'ALLOW' | 'DENY';
  deciding_gate: string;        // Which gate made final decision
  approval_source: 'policy' | 'user' | 'profile';
  execution_permitted: boolean;
}
```

---

## 7. UI Integration

### When Policy Allows (ALLOW)

- Action executes immediately.
- Toast notification: "✓ [Action] approved by policy"
- No modal, no blocking.

### When Policy Requires Confirmation (CONFIRM)

- Modal dialog appears with:
    - Action description
    - Risk level indicator
    - Which gate triggered confirmation
    - Approve / Reject buttons
- Timeout after 5 minutes → auto-reject.

### When Policy Blocks (DENY)

- Toast notification: "✗ [Action] blocked"
- Expandable details showing:
    - Which gate blocked it
    - Why it was blocked
    - How to modify request to succeed

---

## 8. Audit Requirements

Every gate decision MUST log:

```tsx
interface GateAuditLog {
  timestamp: string;
  correlation_id: UUID;
  action_type: string;
  action_target: string;
  active_profile: string;
  gates_evaluated: GateEvaluation[];
  final_decision: 'ALLOW' | 'DENY';
  deciding_gate: string;
  approval_source: 'policy' | 'user';
  user_override?: boolean;       // Did user override policy?
  execution_started: boolean;
}
```

---

## 9. See Also

- [D2. Plan Model & Approval Semantics](../D%20AI%20Interaction%20Pipeline/D2%20Plan%20Model%20&%20Approval%20Semantics%20d65c7875e18b4373ac15bc50515444a7.md) — Plan validation and binding
- [A5. Safety Policy Partitioning](../A%20Product%20&%20Principles/A5%20Safety%20Policy%20Partitioning%20b320a3d07264453e8e3ec017b214cdc8.md) — Policy ceiling definitions

---

## 10. Configuration

```tsx
interface GateConfig {
  user_confirmation_timeout_seconds: number;  // Default: 300
  quality_threshold_reject: number;           // Default: 0.60
  quality_threshold_good: number;             // Default: 0.75
  risk_threshold_high: number;                // Default: 66
  allow_user_override_policy: boolean;        // Default: false
}
```

## Hard Invariants

This component enforces the following Global System Invariants:

- **INV-GLOBAL-2: Policy-Based Approval Gate**
- **INV-GLOBAL-4: Graceful Degradation with Auto-Rollback**
- **INV-GLOBAL-8: All Changes Reversible**
- **INV-GLOBAL-9: Complete Audit Trail**
- **INV-GLOBAL-14: External Build & Signing Authority** — Exacta App Studio runtime SHALL NOT produce, compile, package, or sign executable artifacts. All executable code must originate from an external, human-governed, signed build system.