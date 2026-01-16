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

- **INV-POLICY-0: Safety Policy Ceiling** *(New in V2.1)* — All autonomy levels and Runtime Policy settings are bounded by the Safety Policy ceiling enforced by Guardian. Core cannot request or use capabilities that Safety Policy forbids, regardless of active profile or user request.
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
| **Self-Upgrade** | Blocked | Blocked | Denied unless Safety Policy permits AND System-Level Plan approved |
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
- **User Override:** Guardian-managed registry store
- **Project Override:** Guardian-managed policy store

**Authority Binding:** Core MAY propose policy changes, but Guardian MUST validate, store, and serve all active policy configurations.

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

## 6. Autonomy Escalation Rules

<aside>
🔒

**INV-POLICY-5: Controlled Escalation**

Autonomy level increases are safety-critical transitions. They MUST only occur under explicit operator approval and safe system state.

</aside>

### Escalation Preconditions

Autonomy level MAY ONLY increase when ALL of the following are true:

| **Condition** | **Rationale** | **Verification** |
| --- | --- | --- |
| Guardian receives explicit operator approval | Human must authorize increased autonomy | Guardian IPC confirms user action |
| System is in Idle state | No mid-operation autonomy changes | Orchestrator state = Idle |
| No execution is active | Prevent autonomy change affecting running work | Execution queue empty |
| No upgrade is pending | Prevent autonomy change during vulnerable state | Upgrade state = None |
| No drift detected | Ensure system state is known-good | Last drift check passed |
| Not in Safe Mode | Safe Mode locks autonomy at minimum | Guardian mode ≠ SAFE |

### Automatic De-escalation

Autonomy level MUST decrease immediately (without operator approval) when:

| **Trigger** | **New Level** | **Rationale** |
| --- | --- | --- |
| Safe Mode activated | PROFILE-SAFE (forced) | Emergency override |
| Policy violation detected | PROFILE-SAFE | Trust boundary crossed |
| Drift check fails | PROFILE-SAFE | System state unknown |
| Repeated execution failures (3+) | One level down | System may be unstable |
| Guardian restart | PROFILE-DEV (max) | Re-establish trust |
| Core signature verification fails | PROFILE-SAFE | Integrity compromised |

### Escalation State Machine

```jsx
                ┌─────────────────┐
User Request    │                 │   Policy Violation
+ All Conditions│  PROFILE-SAFE   │◄──────────────────┐
     Met        │   (Minimum)     │                   │
                └────────┬────────┘                   │
                         │                            │
                         ▼                            │
                ┌─────────────────┐                   │
User Request    │                 │   Drift/Failure   │
+ All Conditions│  PROFILE-DEV    │───────────────────┤
     Met        │   (Default)     │                   │
                └────────┬────────┘                   │
                         │                            │
                         ▼                            │
                ┌─────────────────┐                   │
                │                 │   Any De-escalation
                │ PROFILE-FULL-  │───────────────────┘
                │ AUTO (Maximum)  │
                └─────────────────┘
```

### Escalation Audit

Every autonomy level change MUST be logged:

```tsx
interface AutonomyChangeLog {
  timestamp: string;
  previous_level: string;
  new_level: string;
  direction: 'escalation' | 'de-escalation';
  trigger: 'user_request' | 'policy_violation' | 'drift' | 'failure' | 'safe_mode';
  operator_id?: string;        // For escalations
  violation_details?: string;  // For de-escalations
}
```

---

## 7. Certified Autonomy State

<aside>
🧪

**INV-POLICY-6: Certified Operation**

Autonomy levels above PROFILE-SAFE require a "certified" system state. Degraded systems MUST NOT operate at elevated autonomy.

</aside>

### Certification Requirements

An autonomy level is considered **certified** only when ALL of the following are true:

| **Requirement** | **Verification** | **Failure Action** |
| --- | --- | --- |
| Guardian trust verified | `exacta-guardian.exe --verify` passes | Cap at PROFILE-SAFE |
| Log anchor healthy | Last anchor verification passed | Cap at PROFILE-SAFE |
| Model identity stable | No model drift in current session | Cap at PROFILE-DEV |
| No policy violations | Zero violations in last 10 sessions | Cap at PROFILE-SAFE |
| No recent Safe Mode | No Safe Mode in last 24 hours | Cap at PROFILE-DEV |
| Core signature valid | Guardian verified Core on startup | Cap at PROFILE-SAFE |

### Certification State Machine

```jsx
┌─────────────────┐
│   UNCERTIFIED   │
│ (Max: SAFE)     │
└────────┬────────┘
         │
All checks pass
         │
         ▼
┌─────────────────┐
│   CERTIFIED     │
│ (Max: FULL-AUTO)│
└────────┬────────┘
         │
Any check fails
         │
         ▼
┌─────────────────┐
│   DEGRADED      │
│ (Max: varies)   │
└─────────────────┘
```

### Certification Check Timing

Certification is evaluated:

- **On startup** (before any autonomy level is granted)
- **Before autonomy escalation** (as part of escalation preconditions)
- **Periodically** (every 60 minutes while running)
- **After any Safe Mode exit**
- **After any policy violation**

### Non-Certified Operation

When system is not fully certified:

1. **UI shows certification status** (yellow "Degraded" or red "Uncertified")
2. **Autonomy is capped** at the level allowed by failed checks
3. **User is notified** of which checks failed
4. **Audit log records** certification state

### Certification Audit Entry

```tsx
interface CertificationLog {
  timestamp: string;
  state: 'CERTIFIED' | 'DEGRADED' | 'UNCERTIFIED';
  max_autonomy_allowed: string;
  checks: {
    guardian_trust: boolean;
    log_anchor: boolean;
    model_identity: boolean;
    policy_violations: boolean;
    recent_safe_mode: boolean;
    core_signature: boolean;
  };
  failed_checks: string[];
}
```

### Certified Operation Schema *(New in V2.2)*

Guardian SHALL maintain a `certified_state.json` containing:

```tsx
interface CertifiedState {
  guardian_hash: string;           // SHA-256 of Guardian binary
  core_hash: string;               // SHA-256 of Core binary
  policy_hash: string;             // SHA-256 of active policy
  log_anchor_hash: string;         // Current log anchor hash
  model_identity: string;          // Active AI model identifier
  last_safe_mode_timestamp: string | null;  // ISO-8601 or null
}
```

**Enforcement:**

- Autonomy escalation SHALL be denied if any field fails validation
- Guardian MUST regenerate `certified_state.json` on startup
- Core MUST query certification before any autonomy escalation request
- Any hash mismatch → escalation denied + security incident logged

---

## 8. Profile Switching

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

## Hard Invariants

This component enforces the following Global System Invariants:

- **INV-GLOBAL-1: Local-Only Execution**
- **INV-GLOBAL-2: Policy-Based Approval Gate**
- **INV-GLOBAL-9: Complete Audit Trail**
- **INV-GLOBAL-12: Immutable Trust Core**
- **INV-GLOBAL-14: External Build & Signing Authority** — Exacta App Studio runtime SHALL NOT produce, compile, package, or sign executable artifacts. All executable code must originate from an external, human-governed, signed build system.