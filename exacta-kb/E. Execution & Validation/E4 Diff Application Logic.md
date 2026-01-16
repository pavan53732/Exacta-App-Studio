# E4. Diff Application Logic

This document defines the **deterministic, fail-safe process** for applying diffs to files.

---

## 0. Pre-Flight: Cryptographic Approval Binding *(New in V2.2)*

**Before any diff parsing or validation, verify approval provenance:**

1. Extract diff metadata block (see E2)
2. Verify `plan_id` exists and is approved in Approval Gate (C3)
3. Verify `step_id` matches the approved plan
4. Verify `approval_signature` using Guardian public key (C4)
5. Verify `approval_hash` matches the Approval Gate record

**Failure Handling:**

- Missing metadata → **SEC-001 (Unauthorized Mutation)** → STOP
- Invalid signature → **SEC-001 (Unauthorized Mutation)** → STOP
- Hash mismatch → **SEC-001 (Unauthorized Mutation)** → STOP
- No retry permitted for SEC-class errors (F1)

**Related:** INV-DIFF-1 (E2), INV-FS-2 (E3), INV-ITC-3 (C4)

---

## 1. Pre-Flight Validation

- Check file existence (for Modify/Delete) or non-existence (for Create).
- Check **Drift**: Does file hash match the **Guardian-signed file hash manifest** from Approval Gate?
    - The expected hash MUST be part of the cryptographically signed approval artifact.
    - Unsigned or tampered hashes SHALL be rejected as **SEC-001**.
- If Drift Detected (hash mismatch with valid signature): **STOP**. Trigger Smart Retry (Regenerate Diff).

---

## 2. Application (In-Memory)

- Load file content.
- Apply hunks sequentially.
- If Hunk Fails (Context Mismatch):
    - **STOP**. Do not write anything.
    - Trigger **Smart Retry** (Refresh Context → Regenerate).

---

## 3. Post-Apply Verification

- Run **Syntax Validator** (e.g. Roslyn for C#) on the in-memory result.
- If Syntax Error:
    - **STOP**.
    - Trigger **Smart Retry** (Regenerate with Error Feedback).