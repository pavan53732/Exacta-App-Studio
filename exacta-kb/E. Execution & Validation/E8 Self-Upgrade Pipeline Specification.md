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

- **INV-UPGRADE-0: Guardian Exclusive Authorization** *(New in V2.1)* — Core may **propose** upgrades. Only Guardian may **authorize and install** upgrades. Core has no access to signing keys, cannot create trusted packages, and cannot modify Guardian, its config, the trust store, or policy root. All upgrade installation flows through Guardian verification.
- **INV-UPGRADE-1: Self-Improving, Never Self-Authorizing** — The agent CAN upgrade itself, but CANNOT authorize its own upgrades. All upgrades must pass through the standard policy/approval gates.
- **INV-UPGRADE-2: No Hot-Patching** — The agent CANNOT modify its own running binary. Upgrades require a restart cycle.
- **INV-UPGRADE-3: Atomic Upgrade** — Upgrades are all-or-nothing. Partial upgrades are not allowed. Failure at any stage triggers full rollback.
- **INV-UPGRADE-4: Verified Before Swap** — New binaries must pass integrity checks and basic functionality tests before replacing the current version.
- **INV-UPGRADE-5: Rollback Always Available** — The previous working version is preserved and can be restored automatically if the new version fails to start.
- **INV-UPGRADE-6: Audit Everything** — Every self-upgrade attempt is logged with full details: trigger, changes, validation results, success/failure.
- **INV-UPGRADE-7: No In-Process Build Authority** — The Core and AI Agent MUST NOT compile binaries, link executables, package upgrade artifacts, or stage executable files.
- **INV-UPGRADE-8: External Build Requirement** — All executable artifacts MUST be produced and signed outside the Exacta runtime. Any attempt by Core or AI to generate binaries, packages, or signed artifacts SHALL be denied and logged as a security incident.

---

## 2. Upgrade Eligibility

### Safety Policy Gate (Primary)

Self-upgrade is permitted **only if**:

1. `self_upgrade_allowed = true` in **Safety Policy (Guardian-owned)**, AND
2. Active profile ≤ `autonomy_ceiling`, AND
3. User provides **explicit system-level approval**

<aside>
🔒

**INV-UPGRADE-6: Safety Policy Supremacy**

Self-upgrade SHALL be denied if Safety Policy forbids it, regardless of profile, risk score, or user confirmation. Safety Policy is the **sole authority** for upgrade enablement.

</aside>

### Profile Requirements (Secondary — Bounded by Safety Policy)

| Profile | Self-Upgrade Allowed | Conditions |
| --- | --- | --- |
| **PROFILE-SAFE** | ❌ Blocked | Never allowed (even if Safety Policy permits) |
| **PROFILE-DEV** | ❌ Blocked | Never allowed (even if Safety Policy permits) |
| **PROFILE-FULL-AUTO** | ✅ Allowed | Only if Safety Policy `self_upgrade_allowed = true` |

### Additional Gates for PROFILE-FULL-AUTO

Even in PROFILE-FULL-AUTO with Safety Policy permission, self-upgrade requires:

1. **Safety Policy Check:** `self_upgrade_allowed: true` in Guardian-owned Safety Policy.
2. **Explicit Enable:** `self_upgrade_enabled: true` in runtime config.
3. **Source Restriction:** Upgrade source must be from approved origins.
4. **Signature Validation:** All upgrade artifacts must be signed.
5. **User Notification:** User is notified before upgrade begins.
6. **System-Level Approval:** Classified as SYSTEM-LEVEL PLAN requiring explicit human approval.

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

### Phase 4: Execution (Guardian-Only, External Build Model)

**INV-UPGRADE-7: No In-Process Build Authority**

The Core and AI Agent MUST NOT:

- Compile binaries
- Link executables
- Package upgrade artifacts
- Stage executable files

#### Authorized Flow

**1. Proposal Only (Core / AI)**

Generates:

- Diffs
- Migration scripts
- Risk report
- Compatibility matrix
- Rollback plan

Writes to:

```
.exacta/upgrades/pending/{upgrade-id}/
```

**2. External Build System**

Human or CI system:

- Applies patches
- Builds binaries
- Runs tests
- Signs package with Operational Certificate
- Produces `upgrade-package.exapkg`

**3. Guardian Install Path**

Guardian:

- Verifies signature
- Verifies manifest scope
- Requires SYSTEM-LEVEL approval
- Applies atomic swap
- Performs post-install validation

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

## 9. See Also

- [A5. Safety Policy Partitioning](../A%20Product%20&%20Principles/A5%20Safety%20Policy%20Partitioning%20b320a3d07264453e8e3ec017b214cdc8.md) — Safety Policy ceiling definitions
- [C3. Approval Gate Specification](../C%20System%20Core%20Specification/C3%20Approval%20Gate%20Specification%20a63e631886434139b3855fc4cae13915.md) — System-Level Plan classification
- [E10. Update Trust Chain & Signing Model](E10%20Update%20Trust%20Chain%20&%20Signing%20Model%20e16661463a0c4000ac48cb61f45c5127.md) — Signature verification
- [E3. File System Safety & Atomic Writes](E3%20File%20System%20Safety%20&%20Atomic%20Writes%20f8410a603e9140359619ff50be7b66bb.md) — System Path enforcement

## Hard Invariants

This component enforces the following Global System Invariants:

- **INV-GLOBAL-11: Self-Improving, Never Self-Authorizing**
- **INV-GLOBAL-12: Immutable Trust Core**
- **INV-GLOBAL-8: All Changes Reversible**
- **INV-GLOBAL-9: Complete Audit Trail**
- **INV-GLOBAL-14: External Build & Signing Authority** — Exacta App Studio runtime SHALL NOT produce, compile, package, or sign executable artifacts. All executable code must originate from an external, human-governed, signed build system.

---

## 10. CLI Reference

```bash
exacta upgrade status           # Show current version and available upgrades
exacta upgrade check            # Check for available upgrades
exacta upgrade plan             # Generate upgrade plan without executing
exacta upgrade apply <plan_id>  # Execute upgrade plan
exacta upgrade rollback         # Rollback to previous version
exacta upgrade history          # Show upgrade history
```