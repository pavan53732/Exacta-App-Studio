# Advanced Mode & Guardrail Overrides (Future)

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
| Approval gates | Always required |
| Path restrictions | Always enforced |
| Diff validation | Always strict |
| Context matching | Always exact |
| Plan limits | Always enforced |
| File type restrictions | Always enforced |

**This is intentional.** V1 prioritizes safety over flexibility.

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

### 3. Skip Approval for Trusted Operations
**Default (V1 and future):** All plans require approval.  
**Potential override:** Auto-approve certain low-risk operations.

**Risks:**
- Unexpected changes
- Loss of audit trail
- Erosion of user control

**If implemented:**
- Requires explicit opt-in per project
- Only specific operation types eligible (e.g., formatting only)
- Every auto-approval is logged
- User can review auto-approved changes retroactively

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
| AI autonomy | User approval is fundamental |
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
| Skip approval | Not implemented | Under consideration |
| Path exceptions | Not implemented | Under consideration |
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

## Hard Invariants
This component enforces the following Global System Invariants:
- **INV-GLOBAL-1: Local-Only Execution**
- **INV-GLOBAL-2: Deterministic Orchestration**
- **INV-GLOBAL-3: Fail-Closed Behavior**
- **INV-GLOBAL-4: AI Treated as Untrusted Input**
- **INV-GLOBAL-5: User-Owned API Keys**
- **INV-GLOBAL-6: No Telemetry