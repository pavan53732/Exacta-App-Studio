# F2. Error System (Canonical Registry)

This document defines the **canonical error taxonomy** and critical error codes.

---

## Error Categories

All errors map to this taxonomy. The `Code` is stable and used in telemetry/support.

| Code Prefix | Category | Severity | Retry Strategy |
| --- | --- | --- | --- |
| **VAL-xxx** | Validation | Error | Auto-Regenerate (3x) |
| **FS-xxx** | File System | Error | Exponential Backoff (if locked) |
| **AI-xxx** | AI Provider | Error | Provider Fallback (up to 3) |
| **BLD-xxx** | Build | Error | Auto-Fix Code (3x) |
| **SEC-xxx** | Security | Fatal | **STOP** (No Retry) |
| **IPC-xxx** | Protocol | Fatal | Restart Required |

---

## Critical Error Codes

- **VAL-005 (Drift):** File changed since plan creation. *Action:* Reload file, Regenerate Diff.
- **FS-003 (Sandbox):** Path outside project root. *Action:* Block, Log Incident.
- **AI-002 (Rate Limit):** Provider overloaded. *Action:* Switch to fallback provider.
- **SEC-003 (Secret Leak):** Credential detected in output. *Action:* Block, Redact, Warn User.