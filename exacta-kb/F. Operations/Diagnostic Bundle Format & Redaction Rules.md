# Diagnostic Bundle Format & Redaction Rules

## Purpose

Define the diagnostic bundle file set, **required schemas**, and **redaction guarantees** so users can share a bundle for support **without leaking secrets or private content**.

## Bundle Contents

### Always included

- `system_info.json`
- `config_sanitized.json`
- `recent_logs.jsonl`
- `state_snapshot.json`
- `error_details.json`

### Opt-in (explicit user checkbox)

- `debug_logs.jsonl`
- `project_structure.txt`

### Explicitly NOT included

- Any source file contents (no `.cs`, `.rs`, `.ts`, `.svelte`, etc.)
- Any binary artifacts (no `.exe`, `.dll`, `.pdb`, `.zip`, installers, etc.)
- Any credential stores (no browser profiles, keychains, SSH keys, etc.)

## General Format Rules

- The diagnostic bundle is a **single directory** or a **single zip archive** containing only the files listed above.
- All JSON files:
    - MUST be UTF-8.
    - MUST use LF line endings when serialized by the app.
    - MUST be valid JSON.
- All `*.jsonl` files:
    - MUST be UTF-8.
    - MUST be newline-delimited JSON (one JSON object per line).
    - MUST NOT contain multi-line JSON records.
- Time:
    - All timestamps MUST be ISO 8601 with timezone offset (example: `2026-01-15T12:46:54+05:30`).
    - All durations SHOULD be milliseconds as integers when included.

## Redaction Rules (Hard Requirements)

### Global guarantees (apply to every file)

- MUST remove or mask **all secrets**, including but not limited to:
    - API keys (OpenAI, Anthropic, Azure, etc.)
    - OAuth tokens (access/refresh)
    - Session tokens, cookies
    - JWTs
    - SSH keys
    - Private keys (PEM), certificates containing private material
- MUST remove or mask **credentials**, including:
    - Passwords
    - Connection strings that include passwords or tokens
    - Signed URLs containing secret query params
- MUST remove or mask **user-identifying or sensitive data** where feasible:
    - Email addresses and phone numbers (unless the user explicitly opts in to include them)
    - Usernames that are not necessary for debugging
- MUST exclude **file contents**:
    - No code text.
    - No document text.
    - No clipboard contents.
- MUST exclude **full absolute paths** when not required:
    - Prefer normalized/relative paths.
    - If an absolute path is needed for debugging, it MUST be scrubbed to remove the username and sensitive segments.
        - Example: `C:\Users\Alice\Projects\App` → `C:\Users\{REDACTED}\Projects\App` or `{PROJECT_ROOT}\App`
- MUST redact these patterns anywhere they appear (case-insensitive, across JSON fields and log lines):
    - Anything matching common key formats (high-entropy strings, `sk-...`, `AKIA...`, `ghp_...`, etc.)
    - `Authorization:` headers
    - `Cookie:` headers
    - `Set-Cookie:` headers
    - `Bearer <token>`
- MUST be **fail-closed**:
    - If redaction cannot guarantee safety for a field, that field MUST be omitted or replaced with `"[REDACTED]"`.
- MUST use consistent placeholders:
    - `"[REDACTED]"` for removed sensitive strings.
    - `"[OMITTED]"` for intentionally not-exported blocks.
    - For partial masking where needed: `"<prefix>...<suffix>"` ONLY if it cannot be used to reconstruct the secret.

### Minimum redaction for AI provider settings

- `api_key`, `access_token`, `refresh_token`, `client_secret` MUST always be `"[REDACTED]"`.
- Provider base URLs MAY remain if not secret.
- Model names MAY remain.

### Logs

- Logs MUST be redacted at export time (not just hidden in UI).
- Logs MUST NOT include request/response bodies that can contain user code or secrets.
- If the internal logging system currently logs such bodies, the exporter MUST strip them entirely and replace with `"[OMITTED]"`.

## User Review Requirements

- User MUST be able to **review the bundle contents** before sharing.
- Review UI MUST show:
    - File list with sizes.
    - A preview of each text-based file with **redaction markers visible** (user can see `"[REDACTED]"`).
    - A clear statement of what is never included (file contents, secrets).
- User MUST have:
    - A "Remove file from bundle" action for any optional file.
    - A "Regenerate bundle" action.
    - A "Copy bundle path" action.
- Sharing MUST be user-initiated:
    - The app MUST NOT automatically upload or send the bundle anywhere.
    - The app MUST NOT perform any network calls as part of generating the bundle (except to open a file picker/save dialog, which is local OS interaction).

## Schemas (Complete)

### 1) `system_info.json`

**Purpose:** Capture environment context needed to reproduce issues, without leaking personal identifiers.

```json
{
	"schema_version": "1.0",
	"generated_at": "2026-01-15T12:46:54+05:30",
	"app": {
		"name": "Exacta App Studio",
		"version": "0.0.0",
		"build": {
			"commit": "abcdef1234567890",
			"channel": "dev"
		}
	},
	"os": {
		"family": "windows",
		"version": "10.0.22631",
		"edition": "Pro",
		"arch": "x86_64"
	},
	"hardware": {
		"cpu": { "model": "Intel(R) ...", "logical_cores": 16 },
		"memory_mb": 32768
	},
	"runtime": {
		"tauri": "2.x",
		"webview2": {
			"installed": true,
			"version": "120.0.0.0"
		},
		"dotnet": {
			"installed": true,
			"version": "8.0.1"
		}
	},
	"locale": {
		"language": "en-US",
		"timezone": "Asia/Calcutta"
	}
}
```

**Rules**

- `hardware.cpu.model` MAY be generalized if needed (example: `"Intel x64"`).
- No machine name, no Windows user name, no domain name.

---

### 2) `config_sanitized.json`

**Purpose:** Export configuration relevant to behavior, with all secrets removed.

```json
{
	"schema_version": "1.0",
	"generated_at": "2026-01-15T12:46:54+05:30",
	"project": {
		"project_id": "proj_123",
		"project_root": "{PROJECT_ROOT}",
		"language": "csharp",
		"build": {
			"command": "dotnet build",
			"configuration": "Debug"
		}
	},
	"ai": {
		"provider": "openai_compatible",
		"base_url": "https://api.example.com",
		"model": "gpt-4.1-mini",
		"api_key": "[REDACTED]",
		"headers": {
			"Authorization": "[REDACTED]"
		},
		"capabilities": {
			"supports_json_schema": true,
			"max_context_tokens": 128000
		}
	},
	"safety": {
		"fail_closed": true,
		"allow_network": false,
		"allow_file_writes_without_approval": false
	},
	"limits": {
		"max_files_scanned": 50000,
		"max_log_lines": 5000
	}
}
```

**Rules**

- Any unknown config keys MUST be treated as potentially sensitive and MUST be either omitted or redacted unless explicitly allowlisted.
- All paths MUST be normalized:
    - `project_root` MUST be `{PROJECT_ROOT}`.
    - Any path under the project should be relative like `src/App.cs`.

---

### 3) `recent_logs.jsonl`

**Purpose:** Provide a bounded, redacted trail of recent app activity for debugging.

**File format:** JSONL, each line:

```json
{
	"ts": "2026-01-15T12:40:00+05:30",
	"level": "INFO",
	"component": "orchestrator",
	"event": "state_transition",
	"request_id": "req_abc",
	"details": {
		"from": "Idle",
		"to": "Planning"
	}
}
```

**Schema (per-line object)**

- `ts` (string, required)
- `level` (string enum: `TRACE|DEBUG|INFO|WARN|ERROR`, required)
- `component` (string, required)
- `event` (string, required)
- `request_id` (string, optional)
- `details` (object, optional, redacted)
- `message` (string, optional, redacted)

**Rules**

- MUST cap to the most recent N lines (implementation-defined, recommended 2,000–10,000).
- MUST scrub any tokens/keys in `message` and `details`.
- MUST NOT include file contents. File paths are allowed only in redacted/normalized form.

---

### 4) `state_snapshot.json`

**Purpose:** Capture the app's internal state *at the time of bundle generation* (or at last error), sufficient to diagnose gating decisions and failures.

```json
{
	"schema_version": "1.0",
	"generated_at": "2026-01-15T12:46:54+05:30",
	"active_project": {
		"project_id": "proj_123",
		"project_root": "{PROJECT_ROOT}",
		"status": "open"
	},
	"orchestrator": {
		"state": "Idle",
		"last_transition_at": "2026-01-15T12:45:10+05:30"
	},
	"gates": {
		"capability_gates": [
			{ "name": "UserApprovalRequired", "status": "PASS" },
			{ "name": "TokenGuard", "status": "PASS" },
			{ "name": "ExecutionEligibility", "status": "BLOCK", "reason_code": "SCOPE_FINGERPRINT_MISMATCH" }
		]
	},
	"counters": {
		"files_indexed": 1200,
		"symbols_indexed": 45000
	},
	"recent_requests": [
		{
			"request_id": "req_abc",
			"phase": "planning",
			"status": "failed",
			"error_code": "PLAN_VALIDATION_FAILED",
			"finished_at": "2026-01-15T12:44:59+05:30"
		}
	]
}
```

**Rules**

- MUST NOT include full plan text or AI responses if they may contain user code.
- If internal state contains user prompts, code, or diffs, those fields MUST be omitted or replaced with `"[OMITTED]"`.

---

### 5) `error_details.json`

**Purpose:** Capture the primary failure(s) with structured error codes and safe context.

```json
{
	"schema_version": "1.0",
	"generated_at": "2026-01-15T12:46:54+05:30",
	"primary_error": {
		"error_code": "BUILD_FAILED",
		"message": "dotnet build failed",
		"category": "environment",
		"retryable": true
	},
	"context": {
		"request_id": "req_abc",
		"operation": "build",
		"orchestrator_state": "Building",
		"last_successful_step": "SyntaxValidation"
	},
	"diagnostics": {
		"exit_code": 1,
		"stdout_excerpt": "[REDACTED]",
		"stderr_excerpt": "[REDACTED]"
	}
}
```

**Rules**

- Excerpts MUST be bounded (example: max 4 KB each).
- Excerpts MUST be redacted and MUST NOT contain file contents copied from the repo.
- If build output contains source snippets, that output MUST be removed or heavily redacted and replaced with `"[OMITTED]"`.

---

### 6) (Opt-in) `debug_logs.jsonl`

**Purpose:** Deeper, noisier logs to diagnose edge cases. Same JSONL schema as `recent_logs.jsonl` but with more verbosity.

**Rules**

- Must be opt-in.
- MUST be more strictly bounded (size cap).
- MUST apply the same redaction rules (and ideally stricter, because debug logs are riskier).

---

### 7) (Opt-in) `project_structure.txt`

**Purpose:** A safe overview of the project layout *without file contents*.

**Format**

- UTF-8 plain text.
- Each line is a normalized relative path with a trailing `/` for directories.

Example:

```
{PROJECT_ROOT}/
src/
src/App/
src/App/App.csproj
src/App/MainWindow.xaml
src/App/MainWindow.xaml.cs
```

**Rules**

- Must be opt-in.
- MUST NOT include file contents.
- MUST NOT include absolute paths or usernames.

## Validation Requirements (Exporter)

- Exporter MUST validate the bundle before presenting it to the user:
    - All required files present.
    - JSON parses successfully.
    - JSONL lines parse successfully.
    - Redaction checks run across all text content.
- If validation fails, exporter MUST refuse to generate the bundle and MUST show an actionable error.

## Versioning

- Each file MUST include `schema_version`.
- Schema changes MUST be backward compatible when possible.
- If breaking, bump `schema_version` and keep older exporters readable by support tooling.