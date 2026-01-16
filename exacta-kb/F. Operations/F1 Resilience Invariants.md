# F1. Resilience Invariants

This document defines the **non-negotiable resilience rules** that govern error handling and recovery in Exacta App Studio.

---

## Hard Invariants

- **INV-OPS-1: Fail-Closed Security** — If a security check fails (e.g. path traversal), the operation stops immediately. No retry for security violations.
- **INV-OPS-2: No Silent Failures** — Every error MUST be surfaced with a code, cause, and recovery path.
- **INV-OPS-2a: Classified Fault System** *(New in V2)* — Failures are classified as: System Fault, Policy Violation, AI Error, or Environment Error. Each type has a defined recovery strategy.
- **INV-OPS-3: Graceful Degradation with Auto-Rollback** *(Enhanced in V2)* — Retryable errors trigger automatic smart retry. **Autonomous action failures trigger auto-rollback before user escalation.** No more "ask user what to do" for autonomous failures.
- **INV-OPS-4: Observability** — Every operation emits correlation-traced logs. Secrets are redacted BEFORE logging.