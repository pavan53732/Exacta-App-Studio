# E2. Unified Diff Contract

This document defines the **strict diff format** accepted by the Safe Execution Engine and the **safety gates** applied at the diff level.

---

## Hard Invariants

- **INV-DIFF-1: Cryptographic Diff Binding** *(New in V2.2)* — A diff MUST be cryptographically bound to an approved plan step. Diffs without valid Guardian signature SHALL be rejected before parsing.

**Related:** Approval Gate (C3), File Gateway (E3), Immutable Trust Core (C4), Global Invariants (INV-GLOBAL-2, INV-GLOBAL-11)

---

## Format Rules

The system accepts ONLY strict Unified Diff format.

### Metadata Block *(New in V2.2)*

Every diff MUST begin with a cryptographic metadata header:

```
# EXACTA-DIFF-METADATA
# plan_id: <UUID>
# step_id: <UUID>
# correlation_id: <UUID>
# approval_hash: <SHA256>
# approval_signature: <Guardian-Signature>
```

**Enforcement:** File Gateway (E3) and Diff Application Logic (E4) MUST verify this signature before parsing or applying any diff. Missing or invalid signatures result in **SEC-001 (Unauthorized Mutation)** and immediate termination.

### Unified Diff Format

1. **Header:** Must use `--- a/path` and `+++ b/path`.
2. **Hunks:** Must use `@@ -start,count +start,count @@`.
3. **Context:** Minimum 3 lines of context required.
4. **No Decoration:** Markdown fences (`), git headers, or "Here is the diff" text are **forbidden**.
5. **Sentinel:** If no changes are needed, AI must output exactly: `NO_CHANGES_REQUIRED`.

---

## Safety Gates (Diff Level)

- **Binary Files:** Modifications to binary files (images, compiled libs) via diff are **REJECTED**.
- **Path Traversal:** Paths containing `../` or absolute paths (e.g. `/etc/passwd`) are **REJECTED**.
- **Encoding:** Output MUST be UTF-8.