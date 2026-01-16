# G2. Advanced Mode & Guardrail Overrides (Future)

**Status: NOT IMPLEMENTED IN V1**

This document describes potential power-user escape hatches for future versions. None of these features exist in V1. This page exists solely to document the design space.

---

## Purpose

Advanced Mode, if implemented, would allow experienced users to relax certain guardrails when they understand the risks.

This document:

1. Defines what overrides might exist
2. Establishes that defaults remain strict
3. Requires all overrides to be logged and visible

---

## V1 Behavior (Current)

In V1, there are **no overrides**. All guardrails are enforced unconditionally:

| Guardrail | V1 Behavior |
| --- | --- |
| Approval gates | Risk-based (high-risk only) |
| Path restrictions | Always enforced |
| Diff validation | Always strict |
| Context matching | Always exact |
| Plan limits | Always enforced |
| File type restrictions | Always enforced |
| Autonomous execution | Enabled (low/medium risk auto-execute) |
| Smart retry | Enabled (up to 3 attempts) |

**This is intentional.** V1 prioritizes safety and autonomous operation within strict boundaries.

---

## Potential Future Overrides

The following overrides are **under consideration for future versions**. They do not exist today.

### 1. Fuzzy Context Matching

**Default (V1 and future):** Context lines must match exactly.

**Potential override:** Allow fuzzy matching with configurable tolerance.

**Risks:**

- Diff may apply to wrong location
- Subtle bugs introduced
- Harder to audit

**If implemented:**

- Requires explicit opt-in per project
- Each fuzzy application is logged with warning
- User is shown original vs matched context

---

### 2. Extended Plan Limits

**Default (V1 and future):** Max 10 steps, 15 files.

**Potential override:** Allow larger plans for experienced users.

**Risks:**

- Larger plans are harder to review
- More potential for cascading failures
- Rollback complexity increases

**If implemented:**

- Requires explicit opt-in per project
- Extended limits shown prominently during approval
- Additional confirmation required

---

### 3. Disable Autonomous Execution

**Default (V1 and future):** Autonomous execution enabled (low/medium risk operations auto-execute).

**Potential override:** Require approval for ALL operations, even low-risk ones.

**Risks:**

- Slower workflow
- More user interruptions
- Reduced productivity

**If implemented:**

- Requires explicit opt-in per project
- All operations would require manual approval
- Every approval is logged
- User can re-enable autonomous execution at any time

---

### 4. Allow Path Exceptions

**Default (V1 and future):** Only project root is writable.

**Potential override:** Allow writes to specific paths outside root.

**Risks:**

- Security boundary weakened
- Accidental modification of system files
- Cross-project contamination

**If implemented:**

- Requires explicit allowlist per project
- Each exception is logged
- First write to excepted path requires confirmation

---

## Override Principles (Future)

If Advanced Mode is implemented, these principles apply:

### 1. Defaults Remain Strict

No override changes default behavior. Users must explicitly opt in.

```
Default behavior: Always safe
Override behavior: Safe when user understands risks
```

### 2. All Overrides Are Logged

Every use of an override is recorded:

- What override was used
- When it was used
- What operation triggered it
- What the outcome was

Logs are local and user-accessible.

### 3. All Overrides Are Visible

Overrides are never hidden:

- Active overrides shown in UI
- Override usage shown during approval
- Override effects shown in execution log

### 4. Overrides Are Per-Project

Overrides do not apply globally. Each project has its own configuration.

### 5. Overrides Are Revocable

Users can disable overrides at any time. Disabling takes effect immediately.

---

## What Will Never Be Overridable

Certain behaviors are **never overridable**, even in Advanced Mode:

| Behavior | Reason |
| --- | --- |
| Risk-based approval | High-risk operations always require approval |
| Complete audit trail | All operations must be logged with correlation_id |
| Telemetry | Local-only is a hard guarantee |
| Cloud sync | Local-only is a hard guarantee |
| API key logging | Security requirement |
| Rollback capability | Safety net must exist |
| Error visibility | Users must know what failed |

These are **invariants**, not guardrails. They define the product.

---

## Implementation Status

| Feature | V1 | Future |
| --- | --- | --- |
| Fuzzy context matching | Not implemented | Under consideration |
| Extended plan limits | Not implemented | Under consideration |
| Disable autonomous execution | Not implemented | Under consideration |
| Path exceptions | Not implemented | Under consideration |
| Autonomous execution | Implemented | Standard behavior |
| Smart retry (3 attempts) | Implemented | Standard behavior |
| Override logging infrastructure | Not implemented | Required before any override |
| Per-project override config | Not implemented | Required before any override |

---

## How to Request This Feature

Advanced Mode is not currently planned for any specific release.

If you need override capabilities:

1. Document your use case
2. Explain why default behavior is insufficient
3. Describe what risks you are willing to accept

Feature requests are evaluated against core principles. Requests that violate invariants will be rejected.

---

## Cross-References

- **Core Principles and System Invariants**: [A. Product & Principles](../A%20Product%20&%20Principles%2069ff5b1188fb4a93a85ff9767af785e6.md)
- **System Architecture & Core Contracts**: [C1. System Architecture & Core Contracts](../C%20System%20Core%20Specification/C1%20System%20Architecture%20&%20Core%20Contracts%20cf548baeaf7544f4931368c32804b2f7.md)
- **Autonomy Profiles & Policy Engine**: [C2. Autonomy Profiles & Policy Engine](../C%20System%20Core%20Specification/C2%20Autonomy%20Profiles%20&%20Policy%20Engine%20ffaafb4e81004f0ba919509f863332db.md)
- **Smart Retry Strategies**: [E6. Smart Retry Strategies](../E%20Safe%20Execution%20Engine%20Specification/E6%20Smart%20Retry%20Strategies%202dee43b396d94dff93b69e28f21a3d0c.md)

---

## Hard Invariants

This component enforces the following Global System Invariants:

- **INV-GLOBAL-1: Local-Only Execution** — All processing occurs on the user's machine; no cloud dependencies.
- **INV-GLOBAL-2: Policy-Based Approval Gate** *(Changed in V2)* — Actions approved by User, Policy Engine, or Active Profile via Gate Pipeline.
- **INV-GLOBAL-3: Background Operation** — Operations can execute in background without blocking the UI.
- **INV-GLOBAL-4: Graceful Degradation with Auto-Rollback** *(Enhanced in V2)* — Smart retry (up to 3 attempts); autonomous failures auto-rollback before escalating.
- **INV-GLOBAL-5: AI Treated as Trusted Advisor** — AI is trusted; errors trigger automatic regeneration with error context.
- **INV-GLOBAL-6: User-Owned API Keys** — Users provide and own all API keys; never transmitted except to configured providers.
- **INV-GLOBAL-7: No Telemetry** — No data transmitted to Exacta servers; all logging is local.
- **INV-GLOBAL-8: All Changes Reversible** — Every change preserves rollback capability.
- **INV-GLOBAL-9: Complete Audit Trail** *(Enhanced in V2)* — Every operation logged with approval source, profile, gates, and rollback path.
- **INV-GLOBAL-10: Shell Execution Sandbox** *(New in V2)* — Shell commands filtered, jailed to project root, resource-limited.
- **INV-GLOBAL-11: Self-Improving, Never Self-Authorizing** *(New in V2)* — Agent can upgrade itself but cannot authorize its own upgrades.

---

## Relationship to Autonomous Execution

V1 implements **autonomous execution** as a core feature, not an override:

- **Low-risk operations (risk 0-30)**: Auto-execute silently
- **Medium-risk operations (risk 31-65)**: Auto-execute with notification
- **High-risk operations (risk 66-100)**: Require user confirmation

Advanced Mode overrides would allow users to:

- **Tighten controls**: Require approval for ALL operations (even low-risk)
- **Relax controls**: Extend plan limits, enable fuzzy matching, etc.

The default behavior (risk-based autonomous execution) is NOT an override—it is the standard V1 behavior.