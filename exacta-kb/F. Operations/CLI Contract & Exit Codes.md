# CLI Contract & Exit Codes

## Purpose
Define the command-line interface contract and stable output/exit behaviors.

## Commands (Draft)
- exacta --open-project
- exacta --extract-intent
- exacta --generate-plan
- exacta --execute-plan
- exacta --export-diagnostics
- exacta --show-errors
- exacta --tail-logs
- exacta --clear-logs

## Output Formats
- Human-readable
- JSON (stable schema)

## Exit Codes
- MUST map to canonical error categories/codes.

## Security
- MUST NOT print secrets.
- MUST redact sensitive paths if configured.