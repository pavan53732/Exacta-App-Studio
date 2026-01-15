# Scope

## Purpose
This document defines what Exacta App Studio is, what it is not, and which behaviors are considered in-scope for this knowledge base.
This scope is normative and must be used to resolve ambiguity.

## Product Definition
Exacta App Studio is a local-first Windows application builder with AI assistance.
It orchestrates user-approved file edits and build steps using deterministic, auditable execution.

## In Scope
The following are in scope for this knowledge base:

- Local application behavior, constraints, and invariants.
- The deterministic orchestration model (states, transitions, gates, and error handling).
- Security and trust boundaries, including input validation and fail-closed behavior.
- AI interaction contracts that govern:
	- request and response handling
	- token/context limit enforcement
	- validation of any AI-produced artifacts (for example diffs)
- User approval requirements and how approvals are represented and enforced.
- Build and execution workflows that run locally (including the rules that prevent unsafe execution).
- Audit logging requirements (what must be logged, when, and at what granularity).
- Installer and prerequisite gates required for correct operation on Windows.

## Out of Scope
The following are explicitly out of scope for this knowledge base:

- Marketing copy, positioning, or growth-related content.
- Cloud-hosted execution or server-side orchestration.
- "Best effort" behavior. Ambiguous behavior must be specified or rejected.
- Unbounded plugin ecosystems or arbitrary third-party code execution without explicit user approval and security review.
- Any feature that silently performs network actions without user configuration and consent.

## Primary Assumptions
- The product is Windows-first.
- The product is local-only by default.
- The only permitted network communication is user-configured AI provider calls (if enabled).
- The system must remain deterministic and auditable under normal operation.

## Non-goals
- Competing with full hosted CI/CD systems.
- Providing a general-purpose remote agent that can act without explicit user approval.
- Supporting undocumented behavior for convenience.

## Definitions (Local to This Document)
- **Canonical specification**: This repository is the source of truth. If Notion or code comments conflict, this repository wins.
- **Fail-closed**: When the system cannot prove safety or validity, it must reject the action with an explicit error.
- **User approval gate**: A required explicit approval before any file writes or build/execution steps.

## Notes / Rationale
A strict scope prevents accidental expansion of trust surface area, keeps behavior testable, and enables deterministic operation with clear security boundaries.