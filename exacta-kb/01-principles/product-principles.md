# Product Principles

## Purpose
This document defines product-level principles that guide design decisions and resolve tradeoffs.

## Principles

### Specification over Convention
- Behavior SHOULD be specified explicitly.
- Underspecified behavior SHOULD be rejected (fail-closed) until defined.

### Safety over Convenience
- The product MUST prioritize safety gates over "quick fixes."
- The product MUST prefer refusal with an actionable error over unsafe continuation.

### User Control over Automation
- The product MUST require explicit user approval for any side effects.
- The product SHOULD explain what will happen before requesting approval.

### Clarity over Cleverness
- The product SHOULD produce readable, consistent error messages.
- The product SHOULD keep policies and constraints visible to the user.

### Small, Composable Building Blocks
- Core behaviors SHOULD be expressed as simple gates and state transitions.
- Each gate SHOULD have a single responsibility and a clear input/output contract.

### Observability by Default
- The product MUST log decisions that affect outcomes.
- The product SHOULD make it easy to diagnose why an action was rejected.

### Stable Interfaces
- Contracts between pipeline stages SHOULD be explicit and versioned when necessary.
- If a contract changes, dependent components MUST be updated together.

## Non-goals
- Promising support for every workflow or environment.
- Providing "magic" automation that is not explainable or auditable.

## Notes / Rationale
These principles keep the system consistent as features expand and reduce the risk of unsafe or unpredictable behavior.