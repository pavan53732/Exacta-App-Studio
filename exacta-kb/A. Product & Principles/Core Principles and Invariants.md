# Core Principles and Invariants

This document defines the **non-negotiable rules** that govern Exacta App Studio. Any proposed feature, optimization, or change that violates these principles must be rejected.

These invariants exist to ensure the system remains deterministic, safe, and trustworthy.

---

## 1. Deterministic Orchestration

**Invariant:** Given the same inputs, the orchestrator must produce the same execution sequence.

- No randomness in execution order
- No race conditions in state transitions
- No implicit dependencies between steps
- State machine transitions are defined in explicit tables, not ad-hoc conditionals

**Rationale:** Users must be able to predict and reproduce system behavior. Non-determinism erodes trust.

---

## 2. Fail-Closed Defaults

**Invariant:** When the system encounters ambiguity, uncertainty, or error, it must stop and surface the problem. It must never proceed with a guess.

- Unknown intent type: refuse and ask for clarification
- Low confidence score: refuse and ask for clarification
- Patch does not apply cleanly: refuse, do not attempt fuzzy matching
- File hash mismatch: refuse, do not overwrite
- Build environment uncertain: refuse, do not assume

**Rationale:** Silent failures cause data loss and erode trust. Explicit failures are recoverable.

---

## 3. No Silent File Writes

**Invariant:** Every file modification must be:
- Explicitly requested by an approved plan
- Logged with before/after state
- Reversible via rollback
- Visible to the user before and after execution

The system must never:
- Write files without user approval
- Write files outside the project root
- Write files that were not part of the approved plan
- Modify files silently in the background

**Rationale:** File system mutations are the highest-risk operations. They must be auditable.

---

## 4. No AI Memory

**Invariant:** AI is stateless. It has no memory of previous conversations, sessions, or projects.

- Each AI call receives only the context explicitly provided by the system
- Chat history is UI-only; it is never injected into AI context
- No user preferences, patterns, or history are learned or stored by AI
- All "memory" is system-managed via the project index

**Rationale:** AI memory creates unpredictable behavior. System-managed memory is auditable and controllable.

---

## 5. User Approval Gates

**Invariant:** No plan executes without explicit user approval.

- Plan generation does not imply approval
- Diff preview does not imply approval
- The user must take an affirmative action (click, confirm) to approve
- Approval is recorded and timestamped

**Rationale:** The user owns the codebase. No automated system should mutate it without consent.

---

## 6. AI Outputs Are Never Trusted Blindly

**Invariant:** Every AI output is validated by deterministic system logic before use.

| AI Output | Validation |
| --- | --- |
| Intent | Confidence threshold gate |
| Plan | Completeness checklist, dependency DAG validation |
| Diff | Unified diff parser, path safety, syntax check |
| Code | Post-apply syntax validation, build verification |

The system must never:
- Execute an AI-suggested action without validation
- Pass AI output directly to the file system
- Allow AI to specify execution order or file paths without verification

**Rationale:** AI outputs are probabilistic. Deterministic validation converts probability to certainty.

---

## 7. Safety Over Convenience

**Invariant:** When safety and convenience conflict, safety wins.

| Scenario | Convenience | Safety (Chosen) |
| --- | --- | --- |
| Patch context mismatch | Apply with fuzzy match | Reject and regenerate |
| File changed externally | Overwrite | Reject and notify |
| Build tool ambiguous | Guess from file extensions | Ask user |
| AI confidence low | Proceed anyway | Ask user |
| Cross-file edit needed | Apply partial | Reject until all files ready |

**Rationale:** Convenience failures are annoying. Safety failures cause data loss.

---

## 8. Explicit Over Implicit

**Invariant:** The system must not perform implicit actions.

- No auto-save without explicit trigger
- No auto-build without explicit trigger
- No auto-install of dependencies without explicit approval
- No inference of user intent beyond what is stated
- No "smart" defaults that change based on context

**Rationale:** Implicit behavior is unpredictable. Explicit behavior is debuggable.

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

## 10. Reversibility

**Invariant:** Every mutation must be reversible.

- File writes are logged with full before/after content
- Rollback is available per-plan
- Undo survives app restart
- No destructive operation is final until explicitly confirmed

**Rationale:** Mistakes happen. Recovery must always be possible.

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
- **INV-GLOBAL-2: Deterministic Orchestration**
- **INV-GLOBAL-3: Fail-Closed Behavior**
- **INV-GLOBAL-4: AI Treated as Untrusted Input**
- **INV-GLOBAL-5: User-Owned API Keys**
- **INV-GLOBAL-6: No Telemetry**