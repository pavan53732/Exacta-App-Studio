# F6. CLI Interface Contract

This document defines the **command-line interface** for headless operation.

---

## CLI Commands

The `exacta` CLI provides headless operation.

| Command | Description |
| --- | --- |
| `exacta open <path>` | Sets project root |
| `exacta plan "query"` | Generates plan (JSON output) |
| `exacta apply <plan_id>` | Executes plan |

---

## Exit Codes

- **0** = Success
- **1** = Error (prints JSON error object)