# IPC Contract & Backend Command Surface

## Purpose
Define the versioned IPC contract between UI and backend.

## Scope
- Commands (requests)
- Events (push)
- Progress reporting
- Cancellation and timeouts
- Compatibility and versioning rules

## Requirements
- MUST be versioned.
- MUST be deterministic.
- MUST be backward compatible within a defined policy.

## Command Catalog (Draft)
- OpenProject
- CloseProject
- ExtractIntent
- GeneratePlan
- ValidatePlan
- ApprovePlan
- RejectPlan
- ExecutePlan
- Pause
- Resume
- Cancel
- ApplyDiffSet
- Build
- Preview
- ExportDiagnostics

## Event Catalog (Draft)
- StateChanged
- PlanProposed
- DiffProposed
- StepStarted / StepCompleted
- LogEntry
- ErrorRaised

## Wire Format
(TBD)

## Versioning
(TBD)