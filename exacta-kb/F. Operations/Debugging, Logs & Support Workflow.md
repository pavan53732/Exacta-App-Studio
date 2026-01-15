# Debugging, Logs & Support Workflow

This document specifies the **logging architecture**, **diagnostic data collection**, and **support workflow** for Exacta App Studio.

---

## Purpose
Debugging and support capabilities are essential for a safety-critical system. This document defines what is logged, how logs are structured, what diagnostic data can be collected, and how support escalation works, while preserving the **local-only guarantee**.

---

## Logging Architecture

### Log Levels

| Level | Usage | Default Enabled | Contains PII/Code |
| --- | --- | --- | --- |
| **ERROR** | Failures that block operation | Yes | May contain file paths |
| **WARN** | Recoverable issues, degraded behavior | Yes | May contain file paths |
| **INFO** | Significant state transitions, user actions | Yes | No |
| **DEBUG** | Detailed internal state | No | May contain code snippets |
| **TRACE** | Fine-grained execution flow | No | May contain full payloads |

---

### Log Entry Structure
Every log entry contains:

```

interface LogEntry {

timestamp: ISO8601String;      // UTC timestamp

level: LogLevel;               // ERROR | WARN | INFO | DEBUG | TRACE

component: string;             // e.g., "Orchestrator", "DiffParser", "FileGateway"

event: string;                 // Machine-readable event name

message: string;               // Human-readable description

context: Record<string, any>;  // Structured context data

correlationId: string;         // Links related log entries

sessionId: string;             // Links entries within a session

}

```

---

### Log Storage

| Property | Value |
| --- | --- |
| **Location** | `%LOCALAPPDATA%\ExactaAppStudio\logs\` |
| **Format** | JSON Lines (.jsonl) |
| **Rotation** | Daily, with 7-day retention (configurable) |
| **Max size** | 100 MB per file, 1 GB total (configurable) |
| **Encryption** | None by default; user can enable at-rest encryption |

---

## What Is Logged

### Always Logged (INFO level)

| Event | Data Captured |
| --- | --- |
| **Session start/end** | Session ID, start time, end time, exit reason |
| **State transitions** | From state, to state, trigger |
| **User actions** | Action type (approve, reject, cancel), timestamp |
| **Plan generation** | Plan ID, step count, constraint summary |
| **Diff application** | Files modified, success/failure status |
| **Build execution** | Build command, exit code, duration |
| **Error occurrences** | Error code, category, user-facing message |

### Never Logged

| Data Type | Reason |
| --- | --- |
| **API keys** | Security: credentials must not persist in logs |
| **Full AI prompts** | Privacy: may contain sensitive project code |
| **Full AI responses** | Privacy: may contain sensitive generated code |
| **File contents** | Privacy: user code should not be logged |
| **User passwords** | Security: no credential logging |

> **Hard Requirement:** The logging subsystem MUST filter patterns matching API keys, passwords, and other credentials. Logging credential-like strings is a security violation.

---

## Debugging Workflow

### Step 1: Identify the Issue
1. User observes unexpected behavior
2. User notes the approximate time and action being performed
3. User checks the **Activity Log** panel in the UI

### Step 2: Collect Diagnostic Data
The user can generate a **diagnostic bundle** via:
- UI: Settings → Support → Export Diagnostic Bundle
- CLI: `exacta --export-diagnostics`

**Diagnostic bundle contents:**

| File | Contents | Included by Default |
| --- | --- | --- |
| `system_info.json` | OS version, .NET version, app version | Yes |
| `config_sanitized.json` | Configuration with secrets redacted | Yes |
| `recent_logs.jsonl` | Last 1000 log entries (INFO and above) | Yes |
| `state_snapshot.json` | Current orchestrator state (no file contents) | Yes |
| `error_details.json` | Last error with stack trace | Yes |
| `debug_logs.jsonl` | DEBUG/TRACE level logs | No (opt-in) |
| `project_structure.txt` | File tree (names only, no contents) | No (opt-in) |

### Step 3: Self-Diagnosis
Before escalating, user should check:
1. **Error Taxonomy document** — Is this a known error with documented recovery?
2. **Log correlation** — Do log entries reveal the cause?
3. **State consistency** — Is the state machine in an expected state?

---

## Support Escalation Workflow

### Escalation Path

```

┌─────────────────────────────────────────────────────────┐

│  Level 0: Self-Service                                  │

│  - Check error taxonomy and recovery paths              │

│  - Review logs for obvious issues                       │

│  - Retry operation after addressing identified issue    │

├─────────────────────────────────────────────────────────┤

│  Level 1: Community Support                             │

│  - Post to community forum with diagnostic bundle       │

│  - Search existing issues for similar problems          │

├─────────────────────────────────────────────────────────┤

│  Level 2: Issue Filing                                  │

│  - File GitHub issue with diagnostic bundle             │

│  - Include reproduction steps                           │

│  - Attach sanitized logs                                │

├─────────────────────────────────────────────────────────┤

│  Level 3: Direct Support (if available)                 │

│  - Contact support with issue reference                 │

│  - Provide additional debug logs if requested           │

└─────────────────────────────────────────────────────────┘

```

---

## Privacy Preservation in Support

| **System DOES** | **System DOES NOT** |
| --- | --- |
| Allow user to review diagnostic bundle before sharing | Automatically upload any data |
| Redact API keys and credentials from exports | Include file contents in diagnostic bundles |
| Let user choose what to include in bundle | Require data sharing for basic functionality |
| Store all logs locally | Send logs to external servers |
| Provide offline documentation | Require internet for error lookup |

---

## Invariants

> **INV-LOG-1: Local-Only Logs**  
> All log data is stored locally. The application never transmits log data without explicit user action (manual export and share).

> **INV-LOG-2: Credential Filtering**  
> The logging subsystem filters credential patterns before write. If a credential appears in logs, this is a bug.

> **INV-LOG-3: User-Controlled Retention**  
> Users can delete logs at any time. The system does not prevent log deletion or require log retention.

---

## Log Analysis Tools
The application provides built-in tools for log analysis:

| Tool | Function |
| --- | --- |
| **Log Viewer** | Browse and filter log entries in UI |
| **Correlation Search** | Find all entries with a given correlation ID |
| **Error Summary** | Aggregate errors by category and frequency |
| **State Timeline** | Visualize state transitions over time |
| **Export Filtered** | Export subset of logs matching criteria |

---

## Diagnostic Commands

```

# Export diagnostic bundle

exacta --export-diagnostics --output

```

---

## Metrics (Local Only)
The system tracks operational metrics locally for self-diagnosis:

| Metric | Purpose |
| --- | --- |
| **Session count** | Usage pattern |
| **Error rate** | Stability indicator |
| **Build success rate** | Toolchain health |
| **Average plan size** | Complexity indicator |
| **Diff apply success rate** | File system health |

All metrics are stored locally and never transmitted. Users can view metrics in Settings → Diagnostics → Local Metrics.

---

## Hard Invariants
This component enforces the following Global System Invariants:
- **INV-GLOBAL-1: Local-Only Execution**
- **INV-GLOBAL-2: Deterministic Orchestration**
- **INV-GLOBAL-3: Fail-Closed Behavior**
- **INV-GLOBAL-4: AI Treated as Untrusted Input**
- **INV-GLOBAL-5: User-Owned API Keys**
- **INV-GLOBAL-6: No Telemetry