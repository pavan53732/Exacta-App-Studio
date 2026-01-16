# A5. Safety Policy Partitioning

> **Document ID:** A5
> 

> **Version:** V2.1 (Guardian Architecture)
> 

> **Status:** Canonical & Enforced
> 

This document defines the **two-layer policy model** that separates immutable safety controls from runtime-configurable behavior.

> **Scope:** Policy hierarchy, ownership, modification rules
> 

> **Related:** Autonomy Profiles (C2), Immutable Trust Core (C4), Policy Engine
> 

---

## 1. Core Invariants

<aside>
🔒

**INV-POLICY-5: Two-Layer Partition**

Policy MUST be split into Safety Policy (Guardian-owned, immutable at runtime) and Runtime Policy (Core-owned, modifiable). These layers MUST NOT be conflated.

</aside>

<aside>
🔒

**INV-POLICY-6: Safety Policy Supremacy**

Safety Policy settings ALWAYS override Runtime Policy. If Runtime Policy requests something Safety Policy forbids, the request is denied.

</aside>

<aside>
🔒

**INV-POLICY-7: Core Cannot Modify Safety Policy**

No action by Core, AI, shell commands, diffs, or upgrades can modify Safety Policy. Only Guardian can modify Safety Policy, and only through operator action.

</aside>

---

## 2. Policy Layer Model

```
┌─────────────────────────────────────────────────────────┐
│                    SAFETY POLICY                        │
│                 (Guardian-owned)                        │
│                                                         │
│  • Immutable at runtime                                 │
│  • Modified only by operator via Guardian CLI           │
│  • Defines hard ceilings and absolute prohibitions      │
│  • Cannot be overridden by Core or AI                   │
└─────────────────────────────────────────────────────────┘
                          ▲
                          │ Constrains
                          │
┌─────────────────────────────────────────────────────────┐
│                   RUNTIME POLICY                        │
│                  (Core-owned)                           │
│                                                         │
│  • Configurable at runtime                              │
│  • Modified by user or AI (within Safety bounds)        │
│  • Defines current preferences and project settings     │
│  • Bounded by Safety Policy ceiling                     │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Safety Policy Specification

### Ownership

- **Owner:** Guardian (Immutable Trust Core)
- **Storage:** `C:\\ProgramData\\Exacta\\Guardian\\safety-policy.json`
- **Protection:** ACL (Administrators only), WDAC, signature verification

### Settings

| **Setting** | **Type** | **Default** | **Controls** |
| --- | --- | --- | --- |
| `shell_execution_allowed` | boolean | false | Whether shell execution is ever permitted |
| `self_upgrade_allowed` | boolean | false | Whether self-upgrade is ever permitted |
| `autonomy_ceiling` | enum | PROFILE-SAFE | Maximum autonomy level Core can use |
| `network_scope` | enum | AI_ONLY | What network access is permitted |
| `logging_enforcement` | enum | MANDATORY | Whether logging can be disabled |
| `max_concurrent_operations` | integer | 3 | Maximum parallel operations |
| `max_files_per_plan` | integer | 15 | Maximum files in single plan |
| `kill_switch_enabled` | boolean | true | Whether external kill mechanisms are active |

### Modification Rules

- **Who:** Only operator via Guardian CLI
- **How:** `exacta-guardian.exe --set-safety \<setting\> \<value\>`
- **When:** Only when Core is stopped or in Safe Mode
- **Audit:** Every change logged with timestamp, previous value, new value, operator

---

## 4. Runtime Policy Specification

### Ownership

- **Owner:** Core (Autonomous Agent)
- **Storage:** `.exacta/runtime-policy.json` (per project) or `%APPDATA%\\Exacta\\runtime-policy.json` (global)
- **Protection:** Standard file permissions

### Settings

| **Setting** | **Type** | **Default** | **Bounded By** |
| --- | --- | --- | --- |
| `active_profile` | enum | PROFILE-DEV | `autonomy_ceiling` |
| `shell_allowlist_extensions` | string[] | [] | `shell_execution_allowed` |
| `auto_retry_enabled` | boolean | true | — |
| `notification_level` | enum | MEDIUM | — |
| `context_lines` | integer | 3 | — |
| `preferred_ai_provider` | string | null | `network_scope` |

### Modification Rules

- **Who:** User via UI, or AI (with appropriate gates)
- **How:** Direct file edit or Core API
- **When:** Anytime (subject to Safety Policy bounds)
- **Audit:** Changes logged to standard audit trail

---

## 5. Policy Evaluation Logic

When Core requests an action:

```
Action Request
    ↓
┌─────────────────────────────────────┐
│ Guardian evaluates Safety Policy    │
│                                     │
│ Is this action category allowed?    │
│ (shell, upgrade, autonomy level)    │
└─────────────────────────────────────┘
    ↓
    IF Safety Policy forbids → DENY (no appeal)
    ↓
    IF Safety Policy allows → Continue
    ↓
┌─────────────────────────────────────┐
│ Core evaluates Runtime Policy       │
│                                     │
│ Does current profile allow this?    │
│ Do custom rules permit this?        │
└─────────────────────────────────────┘
    ↓
    IF Runtime Policy forbids → DENY or CONFIRM
    ↓
    IF Runtime Policy allows → ALLOW
```

### Resolution Examples

| **Request** | **Safety Policy** | **Runtime Policy** | **Result** |
| --- | --- | --- | --- |
| Execute shell command | `shell_execution_allowed: false` | Any | **DENY** (Safety blocks) |
| Execute shell command | `shell_execution_allowed: true` | Profile allows | **ALLOW** |
| Use PROFILE-FULL-AUTO | `autonomy_ceiling: PROFILE-DEV` | User requests FULL-AUTO | **DENY** (Ceiling blocks) |
| Self-upgrade | `self_upgrade_allowed: false` | Profile is FULL-AUTO | **DENY** (Safety blocks) |
| Disable logging | `logging_enforcement: MANDATORY` | User requests disable | **DENY** (Cannot disable) |

---

## 6. What Each Layer Controls

### Safety Policy Controls (Absolute)

- Whether shell execution exists at all
- Whether self-upgrade exists at all
- Maximum autonomy level available
- Network access boundaries
- Logging requirements
- Kill switch behavior
- Resource hard limits

### Runtime Policy Controls (Bounded)

- Which autonomy profile is active (up to ceiling)
- Which shell commands are allowlisted (if shell enabled)
- Notification preferences
- AI provider selection
- Project-specific overrides
- UI preferences

---

## 7. Policy Files

### Safety Policy Schema

```json
{
  "version": "2.1",
  "last_modified": "2026-01-16T10:00:00Z",
  "modified_by": "operator",
  
  "shell_execution_allowed": false,
  "self_upgrade_allowed": false,
  "autonomy_ceiling": "PROFILE-DEV",
  "network_scope": "AI_ONLY",
  "logging_enforcement": "MANDATORY",
  "max_concurrent_operations": 3,
  "max_files_per_plan": 15,
  "kill_switch_enabled": true,
  
  "signature": "<Guardian signature>"
}
```

### Runtime Policy Schema

```json
{
  "version": "2.1",
  "last_modified": "2026-01-16T10:30:00Z",
  
  "active_profile": "PROFILE-DEV",
  "shell_allowlist_extensions": ["npm", "dotnet"],
  "auto_retry_enabled": true,
  "notification_level": "MEDIUM",
  "context_lines": 3,
  "preferred_ai_provider": "openai"
}
```

---

## 8. Upgrade and Policy

### What Upgrades CAN Modify

- Runtime Policy defaults
- Available Runtime Policy options
- Core behavior within existing policy bounds

### What Upgrades CANNOT Modify

- Safety Policy values
- Safety Policy schema
- Policy evaluation logic
- Guardian policy enforcement

### Policy Schema Evolution

If a new Safety Policy setting is needed:

1. New Guardian version adds setting with safe default
2. Operator explicitly configures new setting
3. Old settings remain unchanged

---

## 9. Policy Change Workflow

All Safety Policy modifications SHALL be represented as **SYSTEM-LEVEL PLANS** and recorded in the Approval Gate, even when executed via Guardian CLI.

Each change MUST produce:

- **Plan record** — Formal plan document with correlation_id
- **Operator identity** — Authenticated operator who initiated change
- **Diff of policy** — Before/after comparison of policy values
- **Approval timestamp** — When change was approved
- **Policy hash before/after** — SHA-256 of policy file pre/post change

```tsx
interface PolicyChangeRecord {
  correlation_id: UUID;
  plan_class: 'PLAN-SYSTEM';
  operator_id: string;
  operator_auth_method: 'certificate' | 'hardware_token' | 'passphrase';
  timestamp: ISO8601String;
  policy_before: {
    version: string;
    hash: string;
    settings: SafetyPolicySettings;
  };
  policy_after: {
    version: string;
    hash: string;
    settings: SafetyPolicySettings;
  };
  change_diff: PolicyDiff[];
  approval_method: 'HUMAN_EXPLICIT';
  binding: 'CRYPTOGRAPHIC';
}
```

This ensures Safety Policy changes have the same formal approval semantics as any other system action, preventing "shadow authority" through CLI bypass.

---

## 10. Implementation Checkpoints

- [ ]  Safety Policy stored in Guardian-protected location
- [ ]  Safety Policy signed by Guardian
- [ ]  Runtime Policy bounded by Safety Policy ceiling
- [ ]  Core cannot read Safety Policy file directly (queries Guardian)
- [ ]  Safety Policy modification requires operator action
- [ ]  Safety Policy modification requires Core stopped/Safe Mode
- [ ]  All policy changes logged
- [ ]  Policy evaluation follows strict hierarchy
- [ ]  Upgrades cannot modify Safety Policy

---

## Hard Invariants

This component enforces the following Global System Invariants:

- **INV-GLOBAL-2: Policy-Based Approval Gate**
- **INV-GLOBAL-12: Immutable Trust Core**
- **INV-GLOBAL-9: Complete Audit Trail**