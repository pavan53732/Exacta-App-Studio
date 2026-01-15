# Scope

## Purpose
This document defines what Exacta App Studio is, what it is not, and which behaviors are in-scope for this knowledge base.
This scope is normative and must be used to resolve ambiguity.

## Product Definition
Exacta App Studio is a Windows-first, local-only, deterministic application builder with optional AI assistance.
It orchestrates user-approved file edits and build steps while enforcing explicit safety gates and maintaining an audit trail.

## In Scope
The following are in scope for this knowledge base:

- Product invariants and constraints that must hold under normal operation.
- Deterministic orchestration and state transitions.
- Security and trust model, including boundaries, threat assumptions, and validation rules.
- AI interaction contracts including:
	- prompt and response handling rules
	- context and token limit enforcement
	- validation of AI-produced artifacts (for example diffs)
- Execution gating and policy enforcement (fail-closed behavior).
- User approval gating for file writes and build/execution operations.
- Audit logging requirements (what is logged, when, and why).
- Installer and prerequisite gating required for correct operation on Windows.

## Out of Scope
The following are explicitly out of scope:

- Marketing copy, positioning, and promotional content.
- Cloud-hosted execution or server-side orchestration.
- Any behavior that relies on hidden heuristics without a specified contract.
- Silent network communication not initiated by user configuration and explicit consent.
- Unbounded third-party code execution without explicit user approval and security review.

## Assumptions
- Windows is the primary supported platform unless explicitly stated otherwise.
- Local-only operation is the default.
- Network calls are not permitted except for user-configured AI provider calls (when enabled).
- Ambiguity is treated as unsafe unless specified (fail-closed).

## Non-goals
- Competing with hosted CI/CD platforms.
- Operating as a remote agent that can act without explicit user approval.
- "Best effort" behavior that changes based on environment without being observable and logged.

## Notes / Rationale
Strict scope reduces the trust surface, increases testability, and prevents accidental expansion into unsafe or non-deterministic behavior.