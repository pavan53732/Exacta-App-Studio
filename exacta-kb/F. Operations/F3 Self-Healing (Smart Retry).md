# F3. Self-Healing (Smart Retry)

This document defines the **automatic recovery strategies** applied by the Agent Controller.

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

### 4. Strategy: Provider Fallback

- *Trigger:* 5xx or Timeout from AI.
- *Action:* Try next provider in capability matrix.