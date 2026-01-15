# Project Configuration Schema & Storage Layout

## Purpose
Define the canonical on-disk configuration schema and project-local storage layout.

This document is authoritative for:
- where data is stored
- what data is persisted vs ephemeral
- which changes invalidate plans (expiration)
- what MUST NOT be stored (secrets)

---

## Storage Layout (Canonical)

### Per-project (inside project root)
`{project_root}/.exacta/`

Contains:
- project-local state (orchestrator state)
- plan artifacts (validated/approved plans)
- rollback metadata (if enabled)
- project index artifacts (if enabled)

### Per-user
- `%APPDATA%\Exacta\` (user settings)
- `%LOCALAPPDATA%\Exacta\cache\` (cache)
- `%LOCALAPPDATA%\ExactaAppStudio\logs\` (logs)

### Secrets
- Windows Credential Manager (API keys)
- Secrets MUST NOT be stored in `.exacta/` or in `%APPDATA%` plaintext.

---

## Directory and File Set (V1)

### `.exacta/` contents
- `.exacta/config.json` (project configuration, user-editable)
- `.exacta/state.json` (orchestrator persisted state for crash recovery)
- `.exacta/plan/` (stored plan objects by id/version)
- `.exacta/rollback/` (optional; if rollback persistence enabled)
- `.exacta/index/` (optional; if index persistence enabled)

---

## `config.json` (Project Configuration) — Schema (V1)

### Canonical JSON requirements
- JSON MUST be UTF-8.
- Keys MUST be treated as case-sensitive.
- Unknown keys MUST be ignored (forward-compatible), but MUST be preserved if the system rewrites config.

### Top-level structure
```

{

"schema_version": 1,

"project_root": ".",

"ai": {

"provider": "openai_compatible",

"endpoint": "https://api.example.com/v1",

"model": "gpt-4.1-mini",

"max_input_tokens": 100000,

"max_output_tokens": 16000,

"response_token_reserve": 4000,

"soft_limit_threshold_pct": 80

},

"limits": {

"max_steps_per_plan": 10,

"max_files_per_step": 3,

"max_total_files_per_plan": 15,

"max_diff_lines_per_step": 500,

"build_timeout_seconds": 300,

"ai_timeout_seconds": 120

},

"file_rules": {

"deny": [

".git/",

".vs/",

"**/bin/**",

"**/obj/**",

"node_modules/",

"packages/",

"/*.pfx",

"/*.key",

"/.env"

],

"allow": []

},

"build": {

"tool": "auto",

"configuration": "Debug",

"working_directory": "."

}

}

```

### Required keys
- `schema_version` (int)
- `project_root` (string; default `"."`)
- `ai.provider` (string)
- `ai.model` (string)

### Forbidden storage
- API keys MUST NOT appear in `config.json` or any file under `.exacta/`.
- If a key-like string is detected, the system MUST fail closed and surface a security error.

---

## `state.json` (Orchestrator State) — Schema (V1)

### Purpose
Allows crash recovery and safe resume/cancel behavior.

### Structure (minimal)
```

{

"schema_version": 1,

"project_id": "uuid",

"state": "Idle|ExtractingIntent|Planning|AwaitingApproval|Executing|Paused|Failed|Completed|Cancelling",

"active_plan_id": "uuid-or-null",

"active_execution_id": "uuid-or-null",

"last_updated_at": "ISO-8601"

}

```

### Requirements
- MUST be written atomically.
- MUST be updated before state transitions are considered committed.

---

## Plan Expiration Triggers (Canonical)

A pending plan MUST transition to `expired` when:
- any target file hash differs from the hash captured at plan creation time
- project configuration fingerprint changes
- session ends (app closes)
- plan pending timeout elapses (default 30 minutes)

A paused execution MUST revalidate:
- all target file hashes
- config fingerprint
before resume is allowed.

---

## Fingerprints (Canonical)

### File fingerprint
- SHA-256 of file bytes
- file size bytes
- encoding (if applicable)

### Config fingerprint
- SHA-256 of canonical JSON serialization of `config.json` with:
  - stable key ordering
  - normalized whitespace
  - no transient fields

---

## Logging and Privacy
- System MAY log hashes, sizes, counts, and paths.
- System MUST NOT log file contents.
- System MUST NOT log API keys.

---

## Invariants
- MUST be deterministic: same files + same config => same fingerprints.
- MUST be fail-closed: any ambiguity in config parsing invalidates plan/execution.
- MUST preserve user control: config overrides must be visible and logged (without secrets).