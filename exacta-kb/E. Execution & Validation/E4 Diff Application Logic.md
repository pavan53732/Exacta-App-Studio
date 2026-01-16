# E4. Diff Application Logic

This document defines the **deterministic, fail-safe process** for applying diffs to files.

---

## 1. Pre-Flight Validation

- Check file existence (for Modify/Delete) or non-existence (for Create).
- Check **Drift**: Does file hash match the hash from the Plan phase?
- If Drift Detected: **STOP**. Trigger Smart Retry (Regenerate Diff).

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