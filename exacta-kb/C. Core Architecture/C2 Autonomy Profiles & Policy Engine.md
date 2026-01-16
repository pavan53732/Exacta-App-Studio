# C2. Autonomy Profiles & Policy Engine

> **Document ID:** C2
> 

> **Version:** V2 (Autonomous Agent)
> 

> **Status:** Canonical & Enforced
> 

This is the **Master Specification** for Autonomy Profiles and the Policy Engine — the governance layer that controls how autonomous the agent operates.

> **Scope:** Policy definitions, profile semantics, gate logic
> 

> **Related:** Approval Gates, Orchestrator, Shell Execution
> 

---

## 1. Core Invariants

- **INV-POLICY-1: Policy Supremacy** — All autonomous actions MUST be evaluated against the active policy profile before execution. No action bypasses policy evaluation.
- **INV-POLICY-2: Profile Immutability During Execution** — The active profile CANNOT change mid-operation. Profile switches take effect only at operation boundaries.
- **INV-POLICY-3: Explicit Defaults** — Every policy setting has an explicit default. No "undefined" behavior exists.
- **INV-POLICY-4: Audit Trail** — Every policy decision (allow/deny) MUST be logged with the profile name, rule matched, and timestamp.

---

## 2. Autonomy Profiles

Autonomy profiles are named policy bundles that control the agent's freedom to act.

### Profile Definitions

| Profile | Description | Use Case |
| --- | --- | --- |
| **PROFILE-SAFE** | Near-manual operation. Most actions require explicit user approval. | New users, sensitive projects, learning mode |
| **PROFILE-DEV** | Semi-autonomous. Low/medium risk actions auto-execute; high risk requires confirmation. | Active development, trusted projects |
| **PROFILE-FULL-AUTO** | Fully autonomous. All policy-compliant actions execute without prompting. | CI/CD pipelines, batch operations, trusted environments |

### Profile Capability Matrix

| Capability | PROFILE-SAFE | PROFILE-DEV | PROFILE-FULL-AUTO |
| --- | --- | --- | --- |
| **File Modifications** | Confirm All | Auto (Low/Med Risk) | Auto (All) |
| **Shell Execution** | Blocked | Allowlist Only | Policy-Filtered |
| **Network Access** | AI APIs Only | AI APIs + Package Managers | AI APIs + Package Managers + Configured Hosts |
| **Self-Upgrade** | Blocked | Blocked | Allowed (with gates) |
| **Plan Auto-Approval** | Never | Low/Med Risk Only | All (if policy passes) |
| **Resource Limits** | Strict (1 concurrent) | Moderate (3 concurrent) | Relaxed (5 concurrent) |

---

## 3. Policy Engine Architecture

The Policy Engine evaluates every action request against the active profile's rules.

### Evaluation Flow

```
Action Request
    ↓
┌─────────────────────┐
│  Load Active Profile │
└─────────────────────┘
    ↓
┌─────────────────────┐
│  Evaluate Gates     │
│  (in priority order)│
└─────────────────────┘
    ↓
┌─────────────────────┐
│  ALLOW / DENY /     │
│  CONFIRM            │
└─────────────────────┘
    ↓
┌─────────────────────┐
│  Log Decision       │
└─────────────────────┘
```

### Policy Decision Types

| Decision | Meaning | UI Behavior |
| --- | --- | --- |
| **ALLOW** | Action permitted by policy. Execute immediately. | Proceed (may show toast) |
| **DENY** | Action forbidden by policy. Do not execute. | Show block reason, suggest alternatives |
| **CONFIRM** | Action requires explicit user approval. | Modal dialog with action details |

---

## 4. Policy Rules Schema

```tsx
interface PolicyRule {
  id: string;                    // e.g. "shell-allowlist"
  priority: number;              // Lower = evaluated first
  condition: PolicyCondition;    // When this rule applies
  action: 'ALLOW' | 'DENY' | 'CONFIRM';
  reason?: string;               // Human-readable explanation
}

interface PolicyCondition {
  operation_type?: OperationType[];  // e.g. ['shell', 'file_write']
  risk_level?: RiskLevel[];          // e.g. ['high']
  target_pattern?: string;           // Glob pattern for paths
  command_pattern?: string;          // Regex for shell commands
}
```

### Default Policy Rules (PROFILE-DEV)

| Priority | Rule ID | Condition | Action |
| --- | --- | --- | --- |
| 1 | `deny-outside-sandbox` | Target outside project root | DENY |
| 2 | `deny-dangerous-commands` | Command matches blocklist | DENY |
| 3 | `confirm-high-risk` | Risk level = HIGH | CONFIRM |
| 4 | `confirm-delete-ops` | Operation = DELETE | CONFIRM |
| 5 | `allow-low-med-risk` | Risk level = LOW or MEDIUM | ALLOW |
| 99 | `default-confirm` | * (catch-all) | CONFIRM |

---

## 5. Profile Configuration

### Storage Location

- **System Default:** Built-in (immutable)
- **User Override:** `.exacta/profile.json`
- **Project Override:** `.exacta/project-profile.json` (takes precedence)

### Configuration Schema

```tsx
interface ProfileConfig {
  active_profile: 'PROFILE-SAFE' | 'PROFILE-DEV' | 'PROFILE-FULL-AUTO';
  custom_rules?: PolicyRule[];      // Merged with profile defaults
  shell_allowlist?: string[];       // Additional allowed commands
  shell_blocklist?: string[];       // Additional blocked commands
  network_allowlist?: string[];     // Additional allowed hosts
  resource_limits?: {
    max_concurrent_ops: number;
    max_files_per_plan: number;
    timeout_seconds: number;
  };
}
```

---

## 6. Profile Switching

### Rules

1. **User-Initiated:** User can switch profiles at any time via UI or CLI.
2. **Boundary Enforcement:** Switch takes effect only when no operation is in progress.
3. **Downgrade Safe:** Switching to a more restrictive profile is always allowed.
4. **Upgrade Confirmation:** Switching to a less restrictive profile requires confirmation.

### CLI Commands

```bash
exacta profile list              # Show available profiles
exacta profile current           # Show active profile
exacta profile set PROFILE-DEV   # Switch profile
exacta profile show PROFILE-SAFE # Show profile details
```

---

## 7. Audit Requirements

Every policy decision MUST be logged:

```tsx
interface PolicyDecisionLog {
  timestamp: string;
  correlation_id: UUID;
  active_profile: string;
  operation_type: string;
  target: string;
  decision: 'ALLOW' | 'DENY' | 'CONFIRM';
  rule_matched: string;           // Which rule triggered the decision
  user_override?: boolean;        // Did user override CONFIRM?
}
```