# E6. Smart Retry Strategies

This document defines the **automatic recovery strategies** the execution engine uses before escalating to the user.

---

## Hard Invariants

- **INV-RETRY-4: Model Consistency** *(New in V2.2)* — Smart Retry SHALL NOT change AI provider or model for any plan or diff. If provider fallback is required, the operation MUST be aborted and re-entered as a new plan requiring re-approval.

**Rationale:** Model identity is part of the approval artifact (INV-PIPE-7, D1). Silently changing models violates forensic provenance and determinism assumptions in the formal model (H3).

**Related:** AI Pipeline (D1), Plan Model (D2), Provider Capability Matrix (D3), Self-Healing (F3)

---

## 1. Context Mismatch

- *Attempt 1:* Reload file from disk, Regenerate Diff.
- *Attempt 2:* Expand context window (+10 lines), Regenerate.
- *Fail:* Escalate to user ("File has changed too much").

---

## 2. Syntax/Build Error

- *Attempt 1-2:* Pass error log to AI, Regenerate Fix.
- *Attempt 3:* Simplify patch (reduce scope).
- *Fail:* Auto-Rollback, Escalate to user.

---

## 3. File Lock

- *Strategy:* Exponential backoff wait (500ms → 2s → 5s).
- *Fail:* Escalate ("Close other programs").