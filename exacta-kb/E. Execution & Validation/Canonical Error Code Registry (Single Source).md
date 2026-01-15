# Canonical Error Code Registry (Single Source)

## Purpose
Provide a single canonical registry of all error codes.

This document is the **single source of truth** for:
- error code strings
- category + severity
- user-facing message templates
- recovery paths
- retry policies (including retry counts and backoff rules)

All UI, CLI, logs, and IPC responses MUST reference error codes from this registry.

---

## Cross-References
- **Error Taxonomy & Recovery Paths** (canonical categories/prefixes)[^[Error Taxonomy & Recovery Paths](https://www.notion.so/Error-Taxonomy-Recovery-Paths-320679abe06f4295959f940492e4ee16?pvs=21)]
- **Error Categories, User Messages & Recovery Paths** (message style + retry rules)[^[Error Categories, User Messages & Recovery Paths](https://www.notion.so/Error-Categories-User-Messages-Recovery-Paths-28dce217e52743a6882caab8e099fde7?pvs=21)]
- **IPC Contract & Backend Command Surface** (IPC-xxx protocol errors)[^[IPC Contract & Backend Command Surface](https://www.notion.so/IPC-Contract-Backend-Command-Surface-e9258782b5f34444a9a645d2aa8abb99?pvs=21)]

---

## Error Object (Canonical Shape)
Every error instance MUST be representable as:

```

{

"code": "VAL-004",

"category": "Validation",

"severity": "error",

"message": "Plan validation failed: missing required steps.",

"technical_detail": "Missing AddFeature checklist items: UI component, wiring.",

"recovery_path": "Modify",

"retryable": true,

"retry_policy": { "max_retries": 2, "backoff": "none" }

}

```

---

## Registry Columns (Canonical)
For each code:
- **Code**
- **Category**
- **Severity**
- **User message (template)**
- **Recovery path**
- **Retryable**
- **Retry policy**
- **Notes / Trigger**

---

# Registry (V1)

> Category prefixes and codes below match the KB taxonomy.[^[Error Taxonomy & Recovery Paths](https://www.notion.so/Error-Taxonomy-Recovery-Paths-320679abe06f4295959f940492e4ee16?pvs=21)]

## Protocol (IPC-xxx) — IPC-layer only
These are for envelope/schema/version problems (not "build failed").

| Code | Category | Severity | User message (template) | Recovery path | Retryable | Retry policy | Notes / Trigger |
| --- | --- | --- | --- | --- | --- | --- | --- |
| IPC-001 | Protocol | Fatal | `Internal protocol error. Please restart the app.` | Restart | false | none | Missing required envelope field |
| IPC-002 | Protocol | Fatal | `Incompatible UI/backend versions. Please update.` | Restart | false | none | Unsupported ipc_version or major mismatch |
| IPC-003 | Protocol | Error | `Unsupported action requested by UI.` | Report | false | none | Unknown command |
| IPC-004 | Protocol | Warning | `Received unknown event. Some UI updates may be missing.` | Report | false | none | Unknown event (UI ignores) |
| IPC-005 | Protocol | Fatal | `Internal protocol error (mismatched response). Restart required.` | Restart | false | none | Wrong request_id / invalid response shape |
| IPC-006 | Protocol | Error | `Request conflict detected. Retrying…` | Retry | true | max_retries=1, backoff=none | Duplicate request_id |
| IPC-007 | Protocol | Fatal | `Event stream corrupted. Restart required.` | Restart | false | none | seq gaps/duplicates for correlation_id |
| IPC-008 | Protocol | Error | `Operation timed out.` | Retry | true | max_retries=1, backoff=none | Request timeout_ms exceeded |
| IPC-009 | Protocol | Error | `Invalid request format.` | Modify | false | none | Payload schema validation failed |

---

## Validation (VAL-xxx)
| Code | Category | Severity | User message (template) | Recovery path | Retryable | Retry policy | Notes / Trigger |
| --- | --- | --- | --- | --- | --- | --- | --- |
| VAL-001 | Validation | Error | `Invalid intent: could not parse your request.` | Modify | false | none | Intent extraction failed to parse[^[Error Taxonomy & Recovery Paths](https://www.notion.so/Error-Taxonomy-Recovery-Paths-320679abe06f4295959f940492e4ee16?pvs=21)] |
| VAL-002 | Validation | Error | `Constraint violation: {constraint}.` | Modify | false | none | Generated plan/output violates constraints[^[Error Taxonomy & Recovery Paths](https://www.notion.so/Error-Taxonomy-Recovery-Paths-320679abe06f4295959f940492e4ee16?pvs=21)] |
| VAL-003 | Validation | Error | `Generated code changes are malformed.` | Report | true | max_retries=1, backoff=none | Diff parser rejects malformed diff[^[https://www.notion.so/320679abe06f4295959f940492e4ee16][^https://www.notion.so/28dce217e52743a6882caab8e099fde7]](https://www.notion.so/320679abe06f4295959f940492e4ee16][^https://www.notion.so/28dce217e52743a6882caab8e099fde7]) |
| VAL-004 | Validation | Error | `Plan validation failed: {reason}.` | Modify | true | max_retries=2, backoff=none | Plan invalid/incomplete[^[https://www.notion.so/320679abe06f4295959f940492e4ee16][^https://www.notion.so/28dce217e52743a6882caab8e099fde7]](https://www.notion.so/320679abe06f4295959f940492e4ee16][^https://www.notion.so/28dce217e52743a6882caab8e099fde7]) |
| VAL-005 | Validation | Error | `Context mismatch: files changed since plan creation.` | Modify | true | max_retries=1, backoff=none | Drift detected; requires regeneration[^[Error Taxonomy & Recovery Paths](https://www.notion.so/Error-Taxonomy-Recovery-Paths-320679abe06f4295959f940492e4ee16?pvs=21)] |

---

## FileSystem (FS-xxx)
| Code | Category | Severity | User message (template) | Recovery path | Retryable | Retry policy | Notes / Trigger |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FS-001 | FileSystem | Error | `File not found: {path}.` | Modify | false | none | Target file missing[^[Error Taxonomy & Recovery Paths](https://www.notion.so/Error-Taxonomy-Recovery-Paths-320679abe06f4295959f940492e4ee16?pvs=21)] |
| FS-002 | FileSystem | Error | `Permission denied: {path}.` | Configure | false | none | Cannot read/write due to permissions[^[Error Taxonomy & Recovery Paths](https://www.notion.so/Error-Taxonomy-Recovery-Paths-320679abe06f4295959f940492e4ee16?pvs=21)] |
| FS-003 | FileSystem | Fatal | `Blocked: path is outside the project sandbox.` | Modify | false | none | Sandbox boundary violation (security boundary)[^[Error Taxonomy & Recovery Paths](https://www.notion.so/Error-Taxonomy-Recovery-Paths-320679abe06f4295959f940492e4ee16?pvs=21)] |
| FS-004 | FileSystem | Error | `Disk space insufficient.` | Configure | false | none | Not enough disk for backup/apply[^[Error Taxonomy & Recovery Paths](https://www.notion.so/Error-Taxonomy-Recovery-Paths-320679abe06f4295959f940492e4ee16?pvs=21)] |
| FS-005 | FileSystem | Error | `File is locked by another process: {path}.` | Retry | true | max_retries=3, backoff=fixed_5s | Lock acquisition failed[^[https://www.notion.so/320679abe06f4295959f940492e4ee16][^https://www.notion.so/28dce217e52743a6882caab8e099fde7]](https://www.notion.so/320679abe06f4295959f940492e4ee16][^https://www.notion.so/28dce217e52743a6882caab8e099fde7]) |

---

## AI (AI-xxx)
| Code | Category | Severity | User message (template) | Recovery path | Retryable | Retry policy | Notes / Trigger |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AI-001 | AI | Error | `AI API key invalid or expired. Please update your key in Settings.` | Configure | false | none | 401/403 from provider[^[Error Taxonomy & Recovery Paths](https://www.notion.so/Error-Taxonomy-Recovery-Paths-320679abe06f4295959f940492e4ee16?pvs=21)] |
| AI-002 | AI | Error | `AI rate limit exceeded. Please wait and retry.` | Retry | true | max_retries=3, backoff=exponential | 429 from provider[^[https://www.notion.so/320679abe06f4295959f940492e4ee16][^https://www.notion.so/28dce217e52743a6882caab8e099fde7]](https://www.notion.so/320679abe06f4295959f940492e4ee16][^https://www.notion.so/28dce217e52743a6882caab8e099fde7]) |
| AI-003 | AI | Error | `AI service unavailable. Check your connection and try again.` | Retry | true | max_retries=3, backoff=exponential | 5xx or provider outage[^[Error Taxonomy & Recovery Paths](https://www.notion.so/Error-Taxonomy-Recovery-Paths-320679abe06f4295959f940492e4ee16?pvs=21)] |
| AI-004 | AI | Error | `AI response exceeded token limit. Reduce scope and retry.` | Modify | false | none | Output too large[^[Error Taxonomy & Recovery Paths](https://www.notion.so/Error-Taxonomy-Recovery-Paths-320679abe06f4295959f940492e4ee16?pvs=21)] |
| AI-005 | AI | Error | `AI response could not be parsed. Retrying…` | Retry | true | max_retries=1, backoff=none | Schema/JSON parse failure[^[https://www.notion.so/320679abe06f4295959f940492e4ee16][^https://www.notion.so/28dce217e52743a6882caab8e099fde7]](https://www.notion.so/320679abe06f4295959f940492e4ee16][^https://www.notion.so/28dce217e52743a6882caab8e099fde7]) |

---

## Build (BLD-xxx)
| Code | Category | Severity | User message (template) | Recovery path | Retryable | Retry policy | Notes / Trigger |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BLD-001 | Build | Error | `Build tool not found: {tool}. Install required SDK/build tools.` | Install | false | none | dotnet/msbuild missing[^[Error Taxonomy & Recovery Paths](https://www.notion.so/Error-Taxonomy-Recovery-Paths-320679abe06f4295959f940492e4ee16?pvs=21)] |
| BLD-002 | Build | Error | `Build failed: compilation error(s).` | Modify | false | none | Compiler errors; user decision needed[^[https://www.notion.so/320679abe06f4295959f940492e4ee16][^https://www.notion.so/28dce217e52743a6882caab8e099fde7]](https://www.notion.so/320679abe06f4295959f940492e4ee16][^https://www.notion.so/28dce217e52743a6882caab8e099fde7]) |
| BLD-003 | Build | Error | `Missing dependency: {package}.` | Install | false | none | Required dependency missing[^[Error Taxonomy & Recovery Paths](https://www.notion.so/Error-Taxonomy-Recovery-Paths-320679abe06f4295959f940492e4ee16?pvs=21)] |
| BLD-004 | Build | Error | `Build timeout exceeded.` | Retry | true | max_retries=1, backoff=none | Build exceeded configured timeout[^[Error Taxonomy & Recovery Paths](https://www.notion.so/Error-Taxonomy-Recovery-Paths-320679abe06f4295959f940492e4ee16?pvs=21)] |
| BLD-005 | Build | Error | `Output generation failed. Check build configuration.` | Configure | false | none | Packaging/artifact output failed[^[Error Taxonomy & Recovery Paths](https://www.notion.so/Error-Taxonomy-Recovery-Paths-320679abe06f4295959f940492e4ee16?pvs=21)] |

---

## State (ST-xxx)
| Code | Category | Severity | User message (template) | Recovery path | Retryable | Retry policy | Notes / Trigger |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ST-001 | State | Fatal | `Internal error: invalid state transition. Please restart.` | Restart | false | none | Orchestrator transition not in table[^[Error Taxonomy & Recovery Paths](https://www.notion.so/Error-Taxonomy-Recovery-Paths-320679abe06f4295959f940492e4ee16?pvs=21)] |
| ST-002 | State | Fatal | `Internal error: state corruption detected. Please restart.` | Restart | false | none | Persisted state invalid/corrupt[^[Error Taxonomy & Recovery Paths](https://www.notion.so/Error-Taxonomy-Recovery-Paths-320679abe06f4295959f940492e4ee16?pvs=21)] |
| ST-003 | State | Error | `Session expired. Start a new session.` | Restart | false | none | Session ended / stale state[^[Error Taxonomy & Recovery Paths](https://www.notion.so/Error-Taxonomy-Recovery-Paths-320679abe06f4295959f940492e4ee16?pvs=21)] |

---

## Resource (RES-xxx)
| Code | Category | Severity | User message (template) | Recovery path | Retryable | Retry policy | Notes / Trigger |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RES-001 | Resource | Error | `Token budget exceeded. Reduce scope and retry.` | Modify | false | none | Context too large[^[Error Taxonomy & Recovery Paths](https://www.notion.so/Error-Taxonomy-Recovery-Paths-320679abe06f4295959f940492e4ee16?pvs=21)] |
| RES-002 | Resource | Error | `Memory limit exceeded. Close other apps or reduce scope.` | Modify | false | none | Working memory exceeded[^[Error Taxonomy & Recovery Paths](https://www.notion.so/Error-Taxonomy-Recovery-Paths-320679abe06f4295959f940492e4ee16?pvs=21)] |
| RES-003 | Resource | Error | `Timeout exceeded. Reduce operation complexity and retry.` | Retry | true | max_retries=1, backoff=none | Non-AI timeouts (internal)[^[Error Taxonomy & Recovery Paths](https://www.notion.so/Error-Taxonomy-Recovery-Paths-320679abe06f4295959f940492e4ee16?pvs=21)] |

---

## Security (SEC-xxx)
| Code | Category | Severity | User message (template) | Recovery path | Retryable | Retry policy | Notes / Trigger |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEC-001 | Security | Fatal | `Blocked: path traversal attempt detected.` | Modify | false | none | `..` traversal blocked[^[Error Taxonomy & Recovery Paths](https://www.notion.so/Error-Taxonomy-Recovery-Paths-320679abe06f4295959f940492e4ee16?pvs=21)] |
| SEC-002 | Security | Fatal | `Blocked: sandbox boundary violation detected.` | Modify | false | none | Operation attempts outside project root[^[Error Taxonomy & Recovery Paths](https://www.notion.so/Error-Taxonomy-Recovery-Paths-320679abe06f4295959f940492e4ee16?pvs=21)] |
| SEC-003 | Security | Fatal | `Credential exposure prevented. Rotate credentials and review logs.` | Report | false | none | Secret detected where it must not be[^[Error Taxonomy & Recovery Paths](https://www.notion.so/Error-Taxonomy-Recovery-Paths-320679abe06f4295959f940492e4ee16?pvs=21)] |

---

## Configuration (CFG-xxx)
| Code | Category | Severity | User message (template) | Recovery path | Retryable | Retry policy | Notes / Trigger |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CFG-001 | Configuration | Error | `Configuration file corrupted. Delete and recreate configuration.` | Configure | false | none | Config JSON unreadable/corrupt[^[Error Taxonomy & Recovery Paths](https://www.notion.so/Error-Taxonomy-Recovery-Paths-320679abe06f4295959f940492e4ee16?pvs=21)] |
| CFG-002 | Configuration | Error | `Required setting missing: {setting}.` | Configure | false | none | Missing required key[^[Error Taxonomy & Recovery Paths](https://www.notion.so/Error-Taxonomy-Recovery-Paths-320679abe06f4295959f940492e4ee16?pvs=21)] |
| CFG-003 | Configuration | Error | `Invalid configuration value: {setting}.` | Configure | false | none | Bad value type/range[^[Error Taxonomy & Recovery Paths](https://www.notion.so/Error-Taxonomy-Recovery-Paths-320679abe06f4295959f940492e4ee16?pvs=21)] |

---

# Canonical Retry Policies (Global Rules)

## Backoff Definitions
- `none`: immediate retry
- `fixed_5s`: wait 5 seconds between retries
- `exponential`: 1s → 2s → 4s (cap at 30s unless provider gives Retry-After)

## Global Rules
- The system MUST NOT retry any error that requires user choice (e.g., compilation errors, invalid plan beyond allowed retries).
- Retries MUST be logged with:
  - original code
  - attempt number
  - delay/backoff used

---

# Notes (Implementation)
- UI messages may be slightly reworded, but MUST preserve the same meaning and required remediation.
- CLI exit codes SHOULD map to these error categories:
  - 0 success
  - non-zero for error/fatal, with printed canonical `code` (exact code string)