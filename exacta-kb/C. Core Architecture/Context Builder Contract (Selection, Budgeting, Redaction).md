# Context Builder Contract (Selection, Budgeting, Redaction)

## Purpose
Specify how context is assembled for AI calls in a deterministic, auditable way.

## Inputs
- Intent
- Plan step
- Project Index (symbols, file hashes)
- Constraints
- Token budget and reserve

## Outputs
- Ordered context bundle
- Included files/symbols metadata
- Redaction report (what was excluded and why)

## Determinism Rules
- Ordering MUST be stable.
- Same inputs MUST produce same context bundle.

## Budgeting
- Soft vs hard thresholds
- Response token reserve

## Redaction / Exclusion
- MUST exclude secrets.
- MUST avoid logging full file contents.

## Failure Modes
- Refuse if cannot fit deterministically (no silent truncation).