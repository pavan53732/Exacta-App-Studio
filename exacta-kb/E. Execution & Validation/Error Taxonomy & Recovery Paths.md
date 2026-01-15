# Error Taxonomy & Recovery Paths

This document defines the **canonical error categories**, **error codes**, and **prescribed recovery actions** for Exacta App Studio.

---

## Purpose
All errors in the system are classified into a fixed taxonomy. Each error category has defined severity, user messaging, and recovery paths. This document serves as the authoritative reference for error handling.

---

## Error Structure

```

interface SystemError {

code: ErrorCode;                // Canonical error code

category: ErrorCategory;        // Taxonomy category

severity: ErrorSeverity;        // fatal | error | warning

message: string;                // User-facing message

technicalDetail: string;        // Developer-facing detail

recoveryPath: RecoveryPath;     // Prescribed recovery

context: Record<string, any>;   // Contextual data

timestamp: ISO8601String;       // When error occurred

correlationId: string;          // Links to related logs

}

```

---

## Error Categories

| Category | Code Prefix | Description | Typical Severity |
| --- | --- | --- | --- |
| **Validation** | VAL- | Input or output failed validation | Error |
| **FileSystem** | FS- | File operations failed | Error |
| **AI** | AI- | AI service errors | Error |
| **Build** | BLD- | Build/compilation failures | Error |
| **State** | ST- | Invalid state transitions | Fatal |
| **Resource** | RES- | Resource exhaustion | Error |
| **Security** | SEC- | Security boundary violations | Fatal |
| **Configuration** | CFG- | Configuration errors | Error |

---

## Error Codes Reference

### Validation Errors (VAL-)

| Code | Message | Recovery Path |
| --- | --- | --- |
| **VAL-001** | Invalid intent: could not parse user request | Rephrase request with clearer intent |
| **VAL-002** | Constraint violation: [constraint] | Modify request to satisfy constraint |
| **VAL-003** | Invalid diff format | Report to support; AI response malformed |
| **VAL-004** | Plan validation failed: [reason] | Review plan; request modifications |
| **VAL-005** | Context mismatch: file changed since plan creation | Regenerate plan with current file state |

### FileSystem Errors (FS-)

| Code | Message | Recovery Path |
| --- | --- | --- |
| **FS-001** | File not found: [path] | Verify file exists; check path spelling |
| **FS-002** | Permission denied: [path] | Check file permissions; run as appropriate user |
| **FS-003** | Path outside project sandbox | Use paths within project directory only |
| **FS-004** | Disk space insufficient | Free disk space; reduce operation scope |
| **FS-005** | File locked by another process | Close other applications using the file |

### AI Errors (AI-)

| Code | Message | Recovery Path |
| --- | --- | --- |
| **AI-001** | API key invalid or expired | Verify API key in settings |
| **AI-002** | API rate limit exceeded | Wait and retry; check usage limits |
| **AI-003** | API service unavailable | Check internet connection; retry later |
| **AI-004** | Response exceeded token limit | Reduce request scope; split into smaller tasks |
| **AI-005** | Response parse failure | Retry request; report if persistent |

### Build Errors (BLD-)

| Code | Message | Recovery Path |
| --- | --- | --- |
| **BLD-001** | Build tool not found: [tool] | Install required SDK/tool |
| **BLD-002** | Compilation error | Review error details; fix source code |
| **BLD-003** | Missing dependency: [package] | Install missing package |
| **BLD-004** | Build timeout exceeded | Optimize build; increase timeout |
| **BLD-005** | Output generation failed | Check build configuration |

### State Errors (ST-)

| Code | Message | Recovery Path |
| --- | --- | --- |
| **ST-001** | Invalid state transition: [from] → [to] | Report bug; restart application |
| **ST-002** | State corruption detected | Restart application; report if persistent |
| **ST-003** | Session expired | Start new session |

### Resource Errors (RES-)

| Code | Message | Recovery Path |
| --- | --- | --- |
| **RES-001** | Token budget exceeded | Reduce context size; split request |
| **RES-002** | Memory limit exceeded | Close other applications; reduce scope |
| **RES-003** | Timeout exceeded | Reduce operation complexity; retry |

### Security Errors (SEC-)

| Code | Message | Recovery Path |
| --- | --- | --- |
| **SEC-001** | Path traversal attempt blocked | Use valid relative paths only |
| **SEC-002** | Sandbox violation blocked | Keep operations within project directory |
| **SEC-003** | Credential exposure prevented | Report incident; rotate credentials |

### Configuration Errors (CFG-)

| Code | Message | Recovery Path |
| --- | --- | --- |
| **CFG-001** | Configuration file corrupted | Delete and recreate configuration |
| **CFG-002** | Required setting missing: [setting] | Add required setting in configuration |
| **CFG-003** | Invalid configuration value | Correct value in configuration file |

---

## Recovery Path Types

| Type | Description | User Action Required |
| --- | --- |
| **Retry** | Transient failure; retry may succeed | Click retry or wait |
| **Modify** | User input needs adjustment | Change request and resubmit |
| **Configure** | Settings need correction | Update configuration |
| **Install** | Missing dependency | Install required component |
| **Report** | System bug or unexpected state | File issue with diagnostics |
| **Restart** | Application state corrupted | Restart application |

---

## Severity Levels

| Severity | Meaning | Behavior |
| --- | --- | --- |
| **Fatal** | Unrecoverable; session must end | Application closes or resets |
| **Error** | Operation failed; can retry | Operation cancelled; user notified |
| **Warning** | Degraded but functional | Operation continues with notification |

---

## Invariants

> **INV-ERR-1: All Errors Categorized**  
> Every error produced by the system has a category and code. There are no "unknown" errors in production.

> **INV-ERR-2: All Errors Have Recovery**  
> Every error code has a defined recovery path. Users are never left with an error and no guidance.

> **INV-ERR-3: All Errors Logged**  
> Every error is logged with full context, timestamp, and correlation ID.

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
| Show user-friendly error messages | Expose raw stack traces to users |
| Provide recovery guidance for every error | Show errors without next steps |
| Log technical details for debugging | Log sensitive data in error context |
| Categorize all errors consistently | Allow uncategorized exceptions to surface |
| Fail-closed on security errors | Allow continuation after security violation |