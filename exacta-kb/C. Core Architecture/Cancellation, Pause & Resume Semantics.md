# Cancellation, Pause & Resume Semantics

## Purpose
Specify exact behavior for cancel/pause/resume across all operations.

## Definitions
- "Between steps" boundary
- "Atomic operation" boundary

## Cancel
- During AI call
- During diff validation
- During atomic apply
- During build
- During preview

## Pause
- Allowed boundaries
- State persistence requirements

## Resume
- Required revalidation
- Drift checks

## Requirements
- MUST not leave partial writes.
- MUST be deterministic.
- MUST be auditable.