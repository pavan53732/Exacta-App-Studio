# Operational Limits & Guardrails

This document defines the **operational limits**, **guardrails**, and **override policies** for Exacta App Studio.

---

## Purpose
Operational limits protect the system from resource exhaustion, runaway operations, and degraded user experience. This document defines the limits, their rationale, and when/how they can be adjusted.

---

## Token Limits

### Context Window Limits

| Limit | Default Value | Configurable | Rationale |
| --- | ---:| --- | --- |
| **Max input tokens** | 100,000 | Yes (per model) | Model context window constraint |
| **Max output tokens** | 16,000 | Yes (per model) | Response size constraint |
| **Response token reserve** | 4,000 | Yes | Ensure space for complete response |
| **Soft limit threshold** | 80% | Yes | Trigger warning before hard limit |

### Limit Enforcement

| Threshold | Behavior |
| --- | --- |
| **Below soft limit** | Normal operation |
| **At soft limit (80%)** | Warning displayed; suggest reducing scope |
| **At hard limit (100%)** | Operation blocked; require scope reduction |

---

## File System Limits

| Limit | Default Value | Configurable | Rationale |
| --- | ---:| --- | --- |
| **Max file size (indexing)** | 1 MB | Yes | Memory and token efficiency |
| **Max files per project** | 10,000 | Yes | Indexing performance |
| **Max directory depth** | 20 | Yes | Prevent runaway traversal |
| **Max files per operation** | 50 | Yes | Limit blast radius |
| **Max diff size** | 100 KB | Yes | Prevent oversized changes |

---

## Timeout Policies

| Operation | Default Timeout | Configurable | On Timeout |
| --- | ---:| --- | --- |
| **AI API call** | 120 seconds | Yes | Cancel and report error |
| **Build execution** | 300 seconds | Yes | Cancel build process |
| **File operation** | 30 seconds | No | Cancel and rollback |
| **Plan validity** | 30 minutes | Yes | Expire plan; require regeneration |
| **Indexing (per file)** | 5 seconds | No | Skip file with warning |

---

## Rate Limits

| Resource | Limit | Window | On Exceed |
| --- | ---:| ---:| --- |
| **AI requests** | 60 | 1 minute | Queue and delay |
| **File writes** | 100 | 1 minute | Block until window resets |
| **Build invocations** | 10 | 1 minute | Queue and delay |

---

## Memory Limits

| Limit | Default Value | On Exceed |
| --- | ---:| --- |
| **Max working memory** | 2 GB | Warn user; suggest closing tabs |
| **Max index cache** | 500 MB | Evict oldest entries |
| **Max undo history** | 100 MB | Prune oldest states |

---

## Guardrail Categories

### Hard Guardrails (Never Overridable)

| Guardrail | Description | Enforcement |
| --- | --- | --- |
| **Sandbox boundary** | No file access outside project root | File Gateway |
| **Approval gate** | No execution without user approval | Orchestrator |
| **Local-only execution** | No network calls except AI API | HTTP Client |
| **No telemetry** | No data sent to external services | Application-wide |
| **Credential isolation** | API keys never in AI context | Context Builder |

### Soft Guardrails (User-Configurable)

| Guardrail | Default | Override Location |
| --- | ---:| --- |
| **File size limit** | 1 MB | Project settings |
| **Token warning threshold** | 80% | Application settings |
| **Build timeout** | 5 minutes | Project settings |
| **Max files per operation** | 50 | Application settings |

---

## Override Policies

### Override Requirements
1. **Explicit action** — User must explicitly change setting
2. **Warning display** — System explains risks before allowing override
3. **Audit logging** — All overrides are logged
4. **Scope limitation** — Overrides apply per-project or per-session only

### Non-Overridable Limits
The following limits CANNOT be overridden:
- Sandbox boundary enforcement
- Approval gate requirement
- Local-only execution policy
- No telemetry policy
- Credential isolation

---

## Degraded Mode Behavior

When limits are approached:

| Condition | System Response |
| --- | --- |
| **Memory pressure** | Warn user; suggest reducing scope |
| **Token limit approaching** | Show percentage; offer to reduce context |
| **Timeout approaching** | Show progress; offer to cancel |
| **Rate limit hit** | Queue request; show wait time |

---

## Invariants

> **INV-LIMIT-1: Fail-Safe Defaults**  
> All limits have safe defaults. A fresh installation with no configuration is fully functional and protected.

> **INV-LIMIT-2: No Silent Degradation**  
> When a limit is reached, the user is always informed. The system never silently reduces functionality.

> **INV-LIMIT-3: Hard Limits Are Hard**  
> Hard guardrails cannot be overridden by any configuration, environment variable, or user action.

---

## Hard Invariants
This component enforces the following Global System Invariants:
- **INV-GLOBAL-1: Local-Only Execution**
- **INV-GLOBAL-2: Deterministic Orchestration**
- **INV-GLOBAL-3: Fail-Closed Behavior**
- **INV-GLOBAL-4: AI Treated as Untrusted Input**
- **INV-GLOBAL-5: User-Owned API Keys**
- **INV-GLOBAL-6: No Telemetry**

---

## Does / Does Not

| **System DOES** | **System DOES NOT** |
| --- | --- |
| Enforce all limits at runtime | Allow limits to be bypassed via config |
| Warn before hitting hard limits | Fail silently at limits |
| Allow user to adjust soft limits | Allow override of hard guardrails |
| Log all limit events | Suppress limit warnings |
| Provide safe defaults | Require configuration before use |