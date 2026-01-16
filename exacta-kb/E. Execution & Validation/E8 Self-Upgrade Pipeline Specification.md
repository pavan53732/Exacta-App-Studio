# E8. Self-Upgrade Pipeline Specification

This is the **Master Specification** for Self-Upgrade — defining how the autonomous agent can safely modify and upgrade itself.

> **Status:** Canonical & Enforced
> 

> **Scope:** Self-modification gates, upgrade flow, validation, rollback
> 

> **Related:** Autonomy Profiles, Safe Execution Engine, Approval Gates
> 

---

## 1. Core Invariants

- **INV-UPGRADE-1: Self-Improving, Never Self-Authorizing** — The agent CAN upgrade itself, but CANNOT authorize its own upgrades. All upgrades must pass through the standard policy/approval gates.
- **INV-UPGRADE-2: No Hot-Patching** — The agent CANNOT modify its own running binary. Upgrades require a restart cycle.
- **INV-UPGRADE-3: Atomic Upgrade** — Upgrades are all-or-nothing. Partial upgrades are not allowed. Failure at any stage triggers full rollback.
- **INV-UPGRADE-4: Verified Before Swap** — New binaries must pass integrity checks and basic functionality tests before replacing the current version.
- **INV-UPGRADE-5: Rollback Always Available** — The previous working version is preserved and can be restored automatically if the new version fails to start.
- **INV-UPGRADE-6: Audit Everything** — Every self-upgrade attempt is logged with full details: trigger, changes, validation results, success/failure.

---

## 2. Upgrade Eligibility

### Profile Requirements

| Profile | Self-Upgrade Allowed | Conditions |
| --- | --- | --- |
| **PROFILE-SAFE** | ❌ Blocked | Never allowed |
| **PROFILE-DEV** | ❌ Blocked | Never allowed |
| **PROFILE-FULL-AUTO** | ✅ Allowed | With gates (see below) |

### Additional Gates for PROFILE-FULL-AUTO

Even in PROFILE-FULL-AUTO, self-upgrade requires:

1. **Explicit Enable:** `self_upgrade_enabled: true` in config.
2. **Source Restriction:** Upgrade source must be from approved origins.
3. **Signature Validation:** All upgrade artifacts must be signed.
4. **User Notification:** User is notified before upgrade begins.

---

## 3. Upgrade Types

| Type | Scope | Risk Level | Auto-Approval |
| --- | --- | --- | --- |
| **Patch** | Bug fixes, minor improvements | Low | Allowed in FULL-AUTO |
| **Minor** | New features, behavior changes | Medium | Requires CONFIRM |
| **Major** | Breaking changes, architecture shifts | High | Always CONFIRM |
| **Self-Generated** | AI-generated improvements to itself | Critical | Always CONFIRM + extra gates |

---

## 4. Self-Upgrade Pipeline

### Phase 1: Trigger

Upgrades can be triggered by:

- **User Request:** "Upgrade yourself" / "Improve your code handling"
- **Version Check:** Periodic check finds newer version available
- **Error Recovery:** System determines self-modification could fix recurring errors

### Phase 2: Plan Generation

The agent generates an **Upgrade Plan**:

```tsx
interface UpgradePlan {
  id: UUID;
  correlation_id: UUID;
  trigger: 'user' | 'version_check' | 'error_recovery';
  upgrade_type: 'patch' | 'minor' | 'major' | 'self_generated';
  current_version: string;
  target_version: string;
  changes: UpgradeChange[];
  risk_score: number;
  estimated_downtime_seconds: number;
  rollback_strategy: RollbackStrategy;
}

interface UpgradeChange {
  file_path: string;
  change_type: 'create' | 'modify' | 'delete';
  description: string;
  diff?: string;            // For self-generated changes
}
```

### Phase 3: Validation

Before execution, the plan must pass:

1. **Policy Gate:** Profile allows self-upgrade.
2. **Signature Gate:** For external upgrades, signatures verified.
3. **Risk Gate:** Risk score within acceptable range.
4. **Approval Gate:** User confirmation if required.

### Phase 4: Execution

```
┌─────────────────────────────┐
│ 1. Create Rollback Point    │
│    (backup current binary)  │
└─────────────────────────────┘
            ↓
┌─────────────────────────────┐
│ 2. Apply Source Changes     │
│    (diffs to source files)  │
└─────────────────────────────┘
            ↓
┌─────────────────────────────┐
│ 3. Rebuild                  │
│    (compile new binary)     │
└─────────────────────────────┘
            ↓
┌─────────────────────────────┐
│ 4. Validate New Binary      │
│    (integrity + smoke test) │
└─────────────────────────────┘
            ↓
┌─────────────────────────────┐
│ 5. Prepare Swap             │
│    (stage new binary)       │
└─────────────────────────────┘
            ↓
┌─────────────────────────────┐
│ 6. Request Restart          │
│    (notify user, schedule)  │
└─────────────────────────────┘
            ↓
┌─────────────────────────────┐
│ 7. Swap & Restart           │
│    (atomic binary replace)  │
└─────────────────────────────┘
            ↓
┌─────────────────────────────┐
│ 8. Post-Upgrade Validation  │
│    (verify new version OK)  │
└─────────────────────────────┘
```

### Phase 5: Post-Upgrade Validation

After restart, the new version must:

1. Start successfully within 30 seconds.
2. Pass basic self-test (can load project, can reach AI, can write files).
3. Report its version correctly.

**If validation fails:** Automatic rollback to previous version.

---

## 5. Rollback Strategy

### Automatic Rollback Triggers

- Build fails during upgrade.
- New binary fails integrity check.
- New version crashes on startup.
- New version fails self-test.
- User initiates rollback within grace period.

### Rollback Process

```tsx
interface RollbackStrategy {
  backup_location: string;      // Path to previous binary
  backup_config: string;        // Path to previous config
  backup_timestamp: string;
  restore_command: string;      // How to restore
  grace_period_seconds: number; // Time user can trigger manual rollback
}
```

### Rollback Execution

1. Stop current (failed) version.
2. Restore previous binary from backup.
3. Restore previous config if changed.
4. Restart with previous version.
5. Log rollback event with reason.

---

## 6. Self-Generated Upgrades (Special Rules)

When the agent generates improvements to its own code:

### Additional Requirements

1. **Scope Limit:** Max 5 files modified per self-upgrade.
2. **Change Review:** All diffs shown to user for review.
3. **Justification:** Agent must explain why each change is needed.
4. **Test Coverage:** Changes must include corresponding tests.
5. **Sandboxed Build:** Build runs in isolated environment.

### Forbidden Self-Modifications

The agent CANNOT modify:

- Security validation logic
- Policy enforcement code
- Audit logging code
- Rollback mechanisms
- This invariants list itself

Attempts to modify these result in **IMMEDIATE DENY** with security alert.

---

## 7. Audit Requirements

```tsx
interface UpgradeAuditLog {
  timestamp: string;
  correlation_id: UUID;
  trigger: string;
  upgrade_type: string;
  from_version: string;
  to_version: string;
  changes_summary: string[];
  risk_score: number;
  approval_source: 'policy' | 'user';
  approval_rule?: string;
  execution_result: 'success' | 'failed' | 'rolled_back';
  failure_reason?: string;
  rollback_performed: boolean;
  duration_seconds: number;
}
```

---

## 8. Configuration

```tsx
interface SelfUpgradeConfig {
  enabled: boolean;                    // Default: false
  allowed_sources: string[];           // Approved upgrade origins
  auto_check_interval_hours: number;   // 0 = disabled
  require_signature: boolean;          // Default: true
  max_auto_upgrade_type: 'patch' | 'minor' | 'none';
  rollback_grace_period_seconds: number;
  notify_before_upgrade: boolean;      // Default: true
}
```

---

## 9. CLI Reference

```bash
exacta upgrade status           # Show current version and available upgrades
exacta upgrade check            # Check for available upgrades
exacta upgrade plan             # Generate upgrade plan without executing
exacta upgrade apply <plan_id>  # Execute upgrade plan
exacta upgrade rollback         # Rollback to previous version
exacta upgrade history          # Show upgrade history
```