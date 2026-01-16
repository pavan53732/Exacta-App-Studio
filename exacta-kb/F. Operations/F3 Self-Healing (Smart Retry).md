# F3. Self-Healing (Smart Retry)

This document defines the **automatic recovery strategies** applied by the Agent Controller.

---

## Hard Invariants

- **INV-RETRY-4: Model Consistency** *(New in V2.2)* — Smart Retry SHALL NOT change AI provider or model for any plan or diff. If provider fallback is required, the operation MUST be aborted and re-entered as a new plan requiring re-approval.

**Rationale:** Model identity is part of the approval artifact (INV-PIPE-7, D1). Silently changing models violates forensic provenance and determinism assumptions in the formal model (H3).

**Related:** AI Pipeline (D1), Plan Model (D2), Provider Capability Matrix (D3), Smart Retry (E6)

---

## Retry Strategies

### 1. Strategy: Refresh Context

- *Trigger:* Context Mismatch (VAL-005).
- *Action:* Re-read files from disk → Update Context → Regenerate.

### 2. Strategy: Feedback Loop

- *Trigger:* Syntax/Build Error (BLD-002).
- *Action:* Feed error log to AI → Request Fix.

### 3. Strategy: Simplify

- *Trigger:* Repeated failures on complex change.
- *Action:* Break plan into smaller steps.

#### 4. Strategy: Provider Fallback *(DEPRECATED in V2.2)*

- *Trigger:* 5xx or Timeout from AI.
- *Action (V1):* Try next provider in capability matrix.
- **Action (V2.2):** Abort operation and escalate to user. Provider fallback is no longer permitted during plan execution due to INV-RETRY-4 (Model Consistency) and INV-PIPE-7 (Provider Lock-In).
- **Rationale:** Model identity must remain stable throughout plan lifecycle. Provider changes require re-approval.