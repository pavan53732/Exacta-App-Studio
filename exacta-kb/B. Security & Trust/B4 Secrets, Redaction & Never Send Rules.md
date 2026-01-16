# B4. Secrets, Redaction & "Never Send" Rules

## Purpose

This document defines what data is considered secret, how secrets are detected, and where secrets are never sent.

> **Document ID:** B4
> 

> **Version:** V2 (Autonomous Agent)
> 

> **Status:** Canonical & Enforced
> 

Secrets are any data that, if exposed, would create security risk. This includes but is not limited to: API keys, passwords, tokens, private keys, and credentials.

This document is a **security boundary**. Any violation is a security incident.

---

## Threat Model (What We Prevent)

- Secrets appearing in **AI prompts/context**
- Secrets appearing in **logs**
- Secrets appearing in **diagnostic bundles**
- Secrets being written into **persisted state** (`.exacta/`, `%APPDATA%`, caches)
- Secrets being echoed back through **IPC**

---

## Definitions

### Secret (Canonical)

A "secret" is any value which, if disclosed, can enable:

- authentication to an external service
- impersonation of a user/system
- access to private resources (repos, cloud, tokens)
- cryptographic signing/decryption

### Sensitive Data (Non-secret but still restricted)

Examples:

- private source code
- proprietary config
- user paths / machine identifiers
- error logs with internal structure

Sensitive data may be included in AI context *only* if allowed by policy, but secrets must never be included.

---

## Secret Sources (Non-Exhaustive)

- API keys (OpenAI-compatible, OpenRouter, etc.)
- OAuth tokens and refresh tokens
- Bearer tokens
- Passwords
- Private keys and certificates:
    - `.pfx`, `.p12`, `.pem`, `.key`, `.cer` (depending on content)
- `.env` files and credential configs
- Cloud credentials:
    - AWS keys, Azure keys, GCP service account keys
- Git credentials / PATs
- SSH private keys

---

## Never-Send Rules (AI Context)

### Never-Send by Path (Default Deny List)

The Context Builder MUST exclude these paths from AI context:

**Infrastructure / generated**

- `.git/\*\*`
- `.vs/\*\*`
- `\*\*/bin/\*\*`
- `\*\*/obj/\*\*`
- `node_modules/\*\*`
- `packages/\*\*`

**Known secret containers**

- `\*\*/.env`
- `\*\*/.env.\*`
- `\*\*/\*secrets\*.\*` (case-insensitive match)
- `\*\*/\*secret\*.\*` (case-insensitive match)
- `\*\*/\*credentials\*.\*` (case-insensitive match)
- `\*\*/\*private\*key\*.\*` (case-insensitive match)

**Key / cert files**

- `\*\*/\*.pfx`
- `\*\*/\*.p12`
- `\*\*/\*.pem`
- `\*\*/\*.key`
- `\*\*/\*.ppk`

**Common cloud key files**

- `\*\*/\*service-account\*.json`
- `\*\*/aws\*.json`
- `\*\*/gcp\*.json`

> If a project explicitly needs a file that matches a deny rule, user must move it or explicitly configure a safe override. Default is fail-closed.
> 

### Never-Send by File Type

- Binary files MUST NOT be included in AI context.
- Any file containing NUL bytes in first 8KB MUST be treated as binary and excluded.

### Never-Send by Content (Pattern Detection)

Before any text is sent to AI, the system MUST scan the outgoing context for high-confidence secret patterns (see below).

If detected:

- MUST redact or exclude per policy
- If safe redaction cannot be guaranteed: MUST refuse (SEC-003)

---

## Redaction Policy (AI Context)

### Redaction Actions

For each detected secret, choose exactly one:

1) **Exclude block** (preferred)

- Remove the entire file block or context block from the context bundle
- Record in Redaction Report: `block_removed`

2) **Redact matched spans** (allowed only if deterministic and safe)

- Replace with `\[REDACTED:TYPE\]`
- Redaction MUST preserve line breaks and stable formatting
- Record in Redaction Report: `pattern_redacted`

3) **Refuse operation** (security boundary: fail-closed, no retry)

- Used when:
    - too many secrets are detected across multiple blocks
    - secret appears in the target file necessary for the requested operation
    - redaction would materially change code semantics in a way that could mislead the AI
- This is a **security boundary**: no automatic retry, escalate to user immediately with SEC-003

---

## Secret Detection Rules (Patterns)

### High-Confidence Patterns (MUST trigger)

These patterns MUST always trigger redaction or refusal.

#### Private keys / certs

- `-----BEGIN PRIVATE KEY-----`
- `-----BEGIN RSA PRIVATE KEY-----`
- `-----BEGIN OPENSSH PRIVATE KEY-----`
- `-----BEGIN EC PRIVATE KEY-----`

#### Authorization headers

- `Authorization: Bearer`
- `Authorization: Basic`

#### Common API key prefixes (examples)

- OpenAI-style:
    - `sk-` followed by 20+ URL-safe characters (heuristic)
- GitHub token patterns (heuristic):
    - `ghp_` prefix
    - `github_pat_` prefix
- Slack token patterns (heuristic):
    - `xoxb-`, `xoxp-`, `xoxa-`

#### Common env-var assignments (heuristic but treated as high-confidence when combined)

- `API_KEY=...`
- `SECRET_KEY=...`
- `PASSWORD=...`
- `TOKEN=...`
- `PRIVATE_KEY=...`

> Pattern matching MUST be conservative: false positives are acceptable; false negatives are not.
> 

### Medium-Confidence Patterns (SHOULD trigger with context)

These SHOULD trigger if found in a "secret-like" file or configuration:

- JSON fields: `"apiKey"`, `"token"`, `"secret"`, `"client_secret"`
- PEM-looking base64 blocks in JSON

If uncertain, default to exclude/refuse.

---

## Logging Rules (Hard)

### Never Log

The system MUST NOT log:

- API keys
- tokens
- passwords
- private key material
- full AI prompts
- full AI responses
- full file contents

### Allowed to Log (Safe Metadata)

The system MAY log:

- file paths (configurable)
- SHA-256 hashes
- byte sizes
- counts of redactions
- which deny rule matched
- correlation ids
- error codes

### Mandatory Log Filtering

Before writing any log entry, apply a final filter:

- If a secret pattern is detected in a log message/context:
    - replace with `\[REDACTED:SECRET\]`
    - increment a security counter
    - emit SEC-003 if the system cannot safely redact

### Failure Policy

If the system detects that a secret would be logged or sent:

- MUST fail closed (security boundary: no retry, no graceful degradation)
- MUST surface `SEC-003` (Credential exposure prevented)
- MUST escalate to user immediately (high-risk operation requiring confirmation)
- MUST advise rotating credentials if any chance of leakage exists

---

## Diagnostics Bundle Rules

Diagnostic bundle MUST:

- include only sanitized configuration
- exclude any file contents
- exclude any AI prompts/responses
- include logs only after the log filtering pipeline has applied redaction

User MUST be able to review bundle before sharing.

---

## Persistence Rules

- Secrets MUST NOT be persisted in:
    - `.exacta/config.json`
    - `.exacta/state.json`
    - `.exacta/plan/\*`
    - cache directories
- API keys MUST be stored only in Windows Credential Manager.

---

## Comprehensive Test Cases (Required)

> These tests are written as requirements. Implementation may be unit tests, integration tests, or end-to-end tests, but each MUST exist.
> 

### A) Context Builder never-sends

1. **Exclude by path: `.env`**
    - Create `\{project\}/.env` containing `API_KEY=sk-123...`
    - Request an operation that would normally scan whole project
    - Expected:
        - `.env` is excluded from context
        - redaction report includes `path_excluded`
        - no outgoing AI payload contains `sk-`
2. **Exclude key files**
    - Add `secrets/app.pfx`
    - Expected: excluded by extension deny rule
3. **Secret in allowed file triggers refusal**
    - Put `Authorization: Bearer xyz` inside a file that is required target
    - Expected:
        - operation refused with `SEC-003`
        - user guidance to remove secret and retry
4. **Binary file excluded**
    - Add `.png` with NUL bytes
    - Expected: excluded, recorded as `binary`

### B) Logging filter tests

1. **No API key in logs**
    - Trigger an error that would include a request payload in logs
    - Expected:
        - log entry contains `\[REDACTED:SECRET\]`
        - no raw token appears anywhere in log files
2. **No private key markers in logs**
    - Simulate reading a PEM file path (even if excluded)
    - Expected: logs never contain PEM contents
3. **Refuse if cannot redact**
    - Construct a log entry with a secret in a field that is not redaction-safe (e.g., unknown binary)
    - Expected: fail closed with SEC-003

### C) Diagnostics bundle tests

1. **Diagnostic bundle excludes secrets**
    - Generate diagnostics after operations involving keys
    - Expected:
        - `config_sanitized.json` contains no secrets
        - logs inside bundle are redacted
        - bundle contains no file contents
2. **User review required**
    - Attempt to export diagnostics
    - Expected:
        - system provides preview list of included files
        - nothing is uploaded automatically

### D) IPC tests (never leak secrets)

1. **IPC payload does not include API key**
    - Make AI call via UI
    - Expected: invoke payload and events never include API key
2. **IPC log events are redacted**
    - Emit LogEntry event with text containing `sk-...`
    - Expected: UI receives redacted content only

### E) False-positive tolerance tests (fail-safe)

1. **Benign `token=` string triggers safe behavior**
    - File contains `token=example` in documentation
    - Expected:
        - either redacted or excluded deterministically
        - operation may proceed with warning
        - never send raw matched string if pattern is considered high-confidence

### F) Regression tests (safety invariants)

1. **Search for secrets in outgoing AI payload**
    - Integration test intercepts outgoing request body
    - Assert:
        - no matches for high-confidence patterns
2. **Search for secrets in logs**
    - Run suite, then grep log directory for patterns:
        - `sk-`
        - `BEGIN PRIVATE KEY`
        - `Authorization: Bearer`
    - Assert: no matches

---

## V2 Changes

### Shell Output Redaction *(New in V2)*

Shell command output is now scanned for secrets before logging:

- Full output available in-memory during operation only
- Logged output has secrets redacted
- Detection uses same patterns as file/prompt redaction
- Applies to stdout, stderr, and environment capture

### Self-Upgrade Artifact Scanning *(New in V2)*

Self-upgrade operations scan for embedded secrets:

- Downloaded artifacts scanned before application
- Build output scanned before packaging
- Upgrade rejected if secrets detected in binaries

---

## Hard Invariants

This component enforces the following Global System Invariants:

- **INV-GLOBAL-1: Local-Only Execution**
- **INV-GLOBAL-5: AI Treated as Trusted Advisor**
- **INV-GLOBAL-6: User-Owned API Keys**
- **INV-GLOBAL-7: No Telemetry**
- **INV-GLOBAL-9: Complete Audit Trail** *(Enhanced in V2)*
- **INV-GLOBAL-10: Shell Execution Sandbox** *(New in V2)*

### Security Boundary Exception

**Secret handling remains fail-closed** (not graceful degradation) because this is a **security boundary**:

- If a secret is detected in context that would be sent to AI → MUST refuse operation (SEC-003)
- If a secret would be logged → MUST redact or refuse
- No retry logic for secret detection violations
- This is an intentional exception to INV-GLOBAL-4 (Graceful Degradation)

Rationale: Secret leakage is a **security incident**, not an operational error. Autonomous execution does not override security boundaries.