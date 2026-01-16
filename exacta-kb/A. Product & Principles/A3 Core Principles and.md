# A3. Core Principles and Invariants

> **Document ID:** A3
> 

> **Version:** V2 (Autonomous Agent)
> 

> **Status:** Canonical & Enforced
> 

This document defines the **non-negotiable rules** that govern the autonomous agent. Any proposed feature, optimization, or change that violates these principles must be rejected.

These invariants exist to ensure the system remains safe, trustworthy, and effective at autonomous operation.

---

## 1. Autonomous Execution with Safety Nets

**Invariant:** The agent proceeds without explicit approval when operations are safe (low/medium risk + good quality). Only high-risk or low-quality operations require confirmation.

- Auto-execute when risk ≤65 and quality ≥threshold
- Risk assessment is deterministic and auditable
- Quality scoring validates plan completeness
- All changes are reversible via checkpoint/rollback

**Rationale:** Users trust agents that move fast on safe operations and pause on risky ones. Speed without safety is reckless. Safety without speed is tedious.

---

## 2. Graceful Degradation

**Invariant:** When the agent encounters errors, it attempts automatic recovery first. Only after retry exhaustion does it escalate to the user.

- Context mismatch: refresh context, then expand window
- Syntax error: regenerate with error feedback
- Build error: regenerate fix, then simplify approach
- Maximum 3 retry attempts with smart strategies
- Non-retryable errors (file not found, permission denied) escalate immediately

**Rationale:** Most failures are transient or self-correctable. Automatic retry improves success rate without bothering the user.

---

## 3. Background Operation with Progress Tracking

**Invariant:** The agent can work while the user does other things. Background operations queue, execute with priority, notify based on risk, and persist across restarts.

- Up to 5 concurrent background operations
- Priority-based queue (user-initiated > quick > low-risk)
- Notifications scale with risk (silent/status bar/toast/modal)
- State persists to disk; survives app restart

**Rationale:** Blocking the user for every operation defeats the purpose of autonomy. Background execution enables parallel work.

---

## 4. All Changes Reversible

**Invariant:** Every autonomous operation creates a checkpoint before execution. Rollback is atomic and verified.

- Checkpoint created before medium/high risk operations
- File snapshots stored with content hashes
- Rollback restores all files or none
- Checksum verification after restoration

**Rationale:** Mistakes happen. Even with risk assessment, AI can be wrong. Reversibility is the ultimate safety net.

---

## 5. Complete Audit Trail

**Invariant:** Every autonomous action is logged with full context: operation details, risk assessment, quality score, execution result, files changed.

- Audit log is immutable and queryable
- Risk scores and decision rationale recorded
- User notification status tracked
- Exportable for review and debugging

**Rationale:** Trust requires transparency. Users must be able to answer "What did the agent do and why?"

---

## 6. AI Outputs Are Validated, Not Blindly Trusted

**Invariant:** AI output is trusted for low/medium risk operations but always validated through risk assessment, quality scoring, and post-execution checks.

| AI Output | Validation |
| --- | --- |
| Intent | Confidence threshold gate |
| Plan | Risk assessment (0-100), quality scoring (0.0-1.0) |
| Diff | Unified diff parser, path safety, syntax check |
| Code | Post-apply syntax validation, build verification |

The system must never:

- Execute high-risk operations without confirmation
- Execute low-quality plans (quality <0.60)
- Skip post-execution validation
- Allow AI to escalate privileges or bypass risk assessment

**Rationale:** AI is a "skilled but imperfect junior developer." Trust but verify.

---

## 7. Safety Over Convenience

**Invariant:** When safety and convenience conflict, safety wins.

| Scenario | Convenience | Safety (Chosen) |
| --- | --- | --- |
| High risk operation | Auto-execute | Require confirmation |
| Low quality plan | Execute anyway | Reject and ask for clarification |
| File changed externally | Overwrite | Reject and regenerate |
| Context mismatch (3rd attempt) | Keep trying | Escalate to user |
| Critical validation failure | Leave changes | Auto-rollback |

**Rationale:** Convenience failures are annoying. Safety failures cause data loss.

---

## 8. Deterministic Risk and Quality Scoring

**Invariant:** Given the same plan and project context, risk assessment and quality scoring produce the same results.

- Risk scoring uses explicit weighted factors (no randomness)
- Quality scoring uses deterministic dimension analysis
- Auto-approval decision tree is explicit and traceable
- No AI involvement in approval decisions

**Rationale:** Approval decisions must be predictable and debuggable. Users should understand why operations auto-executed or required confirmation.

---

## 9. Local-Only Execution

**Invariant:** All processing occurs on the user's machine. No data leaves the machine except via user-configured AI API calls.

- No telemetry
- No analytics
- No crash reporting to remote servers
- No background sync
- No cloud storage

**Rationale:** Users trust local tools with their source code. That trust must not be violated.

---

## 10. Smart Retry with Escalation

**Invariant:** The agent selects retry strategies based on error type. After 3 attempts, it escalates to user with detailed context.

- Error classification determines strategy
- Each retry uses a different approach (not blind retry)
- Exponential backoff for network errors
- Non-retryable errors escalate immediately
- Escalation includes error history and suggested fixes

**Rationale:** Blind retry wastes time. Smart retry fixes problems. Escalation with context enables user intervention.

---

## Using This Document

When evaluating a proposed feature or change:

1. Check each invariant above
2. If the proposal violates any invariant, it must be rejected or redesigned
3. If an exception is required, document it explicitly with justification
4. Exceptions must be rare and reviewed

This document is the **final authority** for architectural decisions.

---

## Hard Invariants

This component enforces the following Global System Invariants:

- **INV-GLOBAL-1: Local-Only Execution**
- **INV-GLOBAL-2: Autonomous Execution**
- **INV-GLOBAL-3: Background Operation**
- **INV-GLOBAL-4: Graceful Degradation**
- **INV-GLOBAL-5: AI Treated as Trusted Advisor**
- **INV-GLOBAL-6: User-Owned API Keys**
- **INV-GLOBAL-7: No Telemetry**
- **INV-GLOBAL-8: All Changes Reversible**
- **INV-GLOBAL-9: Complete Audit Trail**