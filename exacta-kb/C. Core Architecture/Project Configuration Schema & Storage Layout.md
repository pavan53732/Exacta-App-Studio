# Project Configuration Schema & Storage Layout

## Purpose
Define the canonical on-disk configuration schema and project-local storage layout.

## Storage Layout
- `{project}/.exacta/` (project state)
- `%APPDATA%/Exacta/` (user settings)
- `%LOCALAPPDATA%/Exacta/cache/` (cache)
- `%LOCALAPPDATA%/ExactaAppStudio/logs/` (logs)
- Windows Credential Manager (API keys)

## Config Files (Draft)
- `.exacta/config.json`
- `.exacta/state.json`
- `.exacta/plan-cache/`

## Schema
(TBD)

## Plan Expiration Triggers
- File hash drift
- Config changes
- Session end

## Invariants
- MUST NOT store secrets in plain text.
- MUST log config overrides.