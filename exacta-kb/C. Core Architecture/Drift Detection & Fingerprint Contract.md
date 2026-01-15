# Drift Detection & Fingerprint Contract

## Purpose
Define how the system detects drift between plan/review time and execution time.

## Inputs
- Target file hashes at plan time
- Current file hashes
- Plan step targets
- Project configuration fingerprint

## Fingerprints
- File fingerprint (hash + size + encoding)
- Plan fingerprint (ordered steps + targets + constraints)
- Config fingerprint (canonical JSON)

## Invalidation Rules
- What triggers plan expiration vs step rejection
- Pause/Resume revalidation requirements

## Requirements
- MUST fail-closed on drift.
- MUST never apply diffs against unverified file state.
- MUST surface actionable remediation.

## Logging
- Log fingerprints and mismatch reasons.
- MUST NOT log file contents.