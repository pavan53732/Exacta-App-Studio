# E6. Smart Retry Strategies

This document defines the **automatic recovery strategies** the execution engine uses before escalating to the user.

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