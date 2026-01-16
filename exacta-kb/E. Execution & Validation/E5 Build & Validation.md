# E5. Build & Validation

This document defines how the system **validates results** after files are written.

---

## Hard Invariants

- **INV-PREVIEW-1: Governed Preview** *(New in V2.2)* — Preview execution SHALL be treated as a SYSTEM-LEVEL PLAN step and MUST:
    - Be bound to a `plan_id` and `step_id`
    - Require Safety Policy clearance (A5)
    - Be logged as execution with full correlation chain (F4)
    - Be disabled in Safe Mode (F7)
    - Require explicit user approval before first execution

**Rationale:** Preview is an execution surface. Treating it as informal/ungoverne creates a shadow execution channel that bypasses INV-GLOBAL-2 (Policy-Based Approval) and INV-GLOBAL-11 (Never Self-Authorizing).

**Related:** Shell Execution (E7, E9), Approval Gate (C3), Safe Mode (F7), Global Invariants

---

## Build Executor

- **Tools:** Auto-detects `.sln` (MSBuild) or `.csproj` (dotnet build).
- **Isolation:** Runs in a child process. Captures `stdout`/`stderr`.
- **Timeout:** Enforces hard timeout (default 5m) to prevent hangs.
- **Plan Binding** *(New in V2.2)*: Build execution MUST be bound to a `plan_id` and `step_id`. Builds invoked outside of an approved plan context SHALL be rejected.

---

## Error Classification

The system distinguishes between:

| Error Type | Source | Recovery Strategy |
| --- | --- | --- |
| **Code Error** | Compilation fail, Syntax error | **Retryable.** Feed error to AI → Regenerate. |
| **Environment Error** | Missing SDK, Disk Full, Locked File | **Non-Retryable** (mostly). User intervention required. |
| **Logic Error** | Build succeeds, Test fails | **Retryable** (if tests enabled). |

---

## Preview Sandbox

- **Restriction:** Previews run on the local machine with User permissions.
- **Warning:** First-time preview requires explicit User Acknowledgment (files/network access).
- **Isolation:** NOT fully sandboxed (OS level). Users are warned "Code runs with your privileges."

### V2.2 Update: Preview Governance

**Security Model:** Preview execution uses the **same Job Object containment model** as shell commands (see E9. Shell Execution Containment Model). Previews run under:

- Restricted token (same privileges removed)
- Job Object resource limits (same CPU/memory caps)
- Filesystem filtering (same path restrictions)

**Authority Model** *(New in V2.2)*: Preview is now a **governed execution surface** bound to the approval pipeline:

- Previews MUST be requested as part of a plan step
- Require Safety Policy clearance before execution
- Logged with `plan_id`, `step_id`, `correlation_id` (F4)
- Disabled when system is in Safe Mode (F7)
- Require explicit user acknowledgment on first preview execution per session

The only technical difference from build commands: Preview processes may have longer timeouts and higher memory limits since they are interactive applications.