# Global System Invariants

## Purpose
This document defines invariants that must hold at all times.
A violation of an invariant is a bug.

## Invariants

### Local-only Execution
- The system MUST operate locally by default.
- The system MUST NOT require a server-side orchestrator to function.
- The system MUST NOT perform network calls except for user-configured AI provider calls (when enabled).

### Deterministic Orchestration
- The system MUST model behavior as explicit states and explicit transitions.
- The system MUST NOT rely on hidden heuristics that change outcomes without being observable.
- The system MUST log state transitions and gate decisions.

### Fail-closed by Default
- The system MUST reject ambiguous or invalid inputs.
- The system MUST NOT "guess" intent when the result could cause side effects.
- Any fallback behavior MUST be explicitly specified and must preserve safety.

### Explicit User Approval for Side Effects
- The system MUST NOT write files without explicit user approval.
- The system MUST NOT run builds or execute commands without explicit user approval.
- The system MUST present an actionable explanation before requesting approval.

### Input Validation as a Security Boundary
- AI output MUST be treated as untrusted input.
- Diffs, paths, and tool outputs that influence file writes MUST be validated before use.
- Validation MUST reject path traversal, absolute paths (unless explicitly allowed), and malformed structures.

### Auditable Decisions
- Every side-effecting action MUST be traceable to:
	- the triggering user request or workflow step
	- the gate decisions that allowed it
	- the exact artifacts used (for example: diff hash, bundle hash)
- Errors MUST be explicit, structured, and user-actionable.

### Minimal Privilege
- The system SHOULD minimize filesystem access to only the intended workspace.
- The system SHOULD avoid storing sensitive tokens on disk.
- Secrets MUST NOT be written to logs.

## Non-goals
- Defining implementation details for every invariant enforcement mechanism (those belong in architecture and execution sections).

## Notes / Rationale
These invariants keep the product predictable, reviewable, and safe under both normal and adversarial conditions.