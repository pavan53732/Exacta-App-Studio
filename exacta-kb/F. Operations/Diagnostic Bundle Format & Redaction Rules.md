# Diagnostic Bundle Format & Redaction Rules

## Purpose
Define the diagnostic bundle file set, schemas, and redaction guarantees.

## Bundle Contents
- system_info.json
- config_sanitized.json
- recent_logs.jsonl
- state_snapshot.json
- error_details.json
- (opt-in) debug_logs.jsonl
- (opt-in) project_structure.txt

## Redaction Rules
- MUST remove API keys.
- MUST remove credentials and tokens.
- MUST exclude file contents.

## User Review
- User MUST be able to review bundle before sharing.

## Schemas
(TBD)