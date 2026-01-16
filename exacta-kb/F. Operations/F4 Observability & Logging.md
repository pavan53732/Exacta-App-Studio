# F4. Observability & Logging

This document defines the **logging schema**, **redaction rules**, and **diagnostic bundle** format.

---

## Log Schema

```tsx
interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  correlation_id: UUID;
  component: string;
  message: string; // REDACTED content only
}
```

---

## Redaction Rules

**Never Log:** API Keys (`sk-...`), Passwords, Full Source Code.

**Redaction:** Replace secrets with `[REDACTED:SECRET]`.

---

## Diagnostic Bundle

Users can export a safe debug bundle containing:

- `system_info.json` (OS, .NET version)
- `config_sanitized.json` (No keys)
- `recent_logs.jsonl` (Redacted)
- `error_details.json` (Stack trace of last error)