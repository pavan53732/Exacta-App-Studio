# UI Capability Gating & "Why Blocked" Contract

## Purpose
Define which UI actions are available in each Orchestrator state and which gates must pass before an action becomes enabled.
Define what the UI must show when an action is blocked.

## UI Actions (V1)
- Open Project
- Ask / Chat (submit user input)
- Generate Plan
- Approve Plan
- Reject Plan
- Execute Plan
- Pause
- Resume
- Cancel
- Preview
- Export Diagnostics

## Gating Model
For each UI action, define:
- Required Orchestrator state
- Required prerequisites (project open, provider configured, etc.)
- Required approvals (plan approval, preview acknowledgment, etc.)
- Required resource limits (token budget, plan limits, etc.)

## "Why Blocked" Requirements
When an action is disabled, the UI MUST show:
1. Blocking gate name (stable identifier)
2. Blocking reason (human-readable)
3. Remediation steps (what user can do next)
4. Whether the block is retryable immediately or requires state change

## Mapping Table
(TBD: Add a table mapping each UI action to required state + gates.)