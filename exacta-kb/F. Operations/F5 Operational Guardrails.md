# F5. Operational Guardrails

This document defines the **hard limits** that prevent resource exhaustion.

---

## System Limits

| Limit | Value | Behavior on Exceed |
| --- | --- | --- |
| **Max Context** | 128k Tokens | Soft warn @ 80%, Hard Refuse @ 100% |
| **Max Files** | 50 / Plan | Reject Plan |
| **Timeout** | 5 Minutes | Cancel Operation, Rollback |
| **Rate Limit** | 60 req/min | Queue & Delay |

---

## Runtime Prerequisites

- **.NET Desktop Runtime:** 8.0.1+ required.
- **WebView2:** Runtime 120+ required.

### Installer Prerequisites

- **Behavior:** Fail-fast if missing. No partial installs.