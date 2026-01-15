# Terminology

## Purpose
This document defines canonical terms used throughout the knowledge base.
Terms in this document must be used consistently across all specifications.

## Core Terms

### Canonical Specification
The markdown files in this repository are the single source of truth for product behavior.
If another document conflicts, the canonical specification wins.

### Deterministic Orchestration
A system behavior model where outcomes are defined by explicit state, explicit inputs, and explicit rules.
Undocumented heuristics are not permitted.

### Fail-closed
When the system cannot prove validity or safety, it must reject the action with an explicit error.
Fail-open fallback behavior is not permitted unless explicitly specified.

### Gate
A decision point that must pass before the system is allowed to proceed.
A gate produces a structured decision and must be auditable.

### User Approval Gate
A gate that requires explicit user consent before any file writes, builds, or execution steps occur.

### Policy
A set of normative rules that constrain system behavior (for example: token usage limits, allowed filesystem operations, allowed diff patterns).

### Trust Boundary
A boundary across which data must be treated as untrusted and validated before use.
Examples include AI output, user-provided archives, and external tool output.

### Untrusted Input
Any input that could be malformed, adversarial, or ambiguous.
This includes but is not limited to:
- AI model output
- diffs and patches
- paths and filenames
- archives
- tool output that is parsed

### Execution
Any operation that causes side effects, including:
- writing files
- running build commands
- invoking installers
- running binaries
- mutating repositories or build outputs

### Audit Trail
A tamper-evident or at minimum append-only log of actions, decisions, and relevant context sufficient for debugging and security review.

## Naming Conventions
- Use MUST / SHALL / SHOULD / MAY language for requirements.
- Prefer exact terms from this document over synonyms.
- Prefer explicit names for artifacts (for example: "Unified Diff" instead of "patch text").

## Notes / Rationale
Shared terminology prevents subtle contradictions and makes review and testing repeatable.