# Secrets, Redaction & "Never Send" Rules

## Purpose
Define what is considered a secret and how the system prevents leakage to logs, diagnostics, and AI prompts.

## Secret Sources
- API keys
- Tokens
- Passwords
- Private keys (.pfx, .key)
- .env files and credential configs

## Never-Send Rules
- Files / paths excluded from AI context
- Patterns redacted

## Logging Rules
- MUST filter credential-like strings.
- MUST fail closed on suspected leak.

## Test Cases
(TBD)