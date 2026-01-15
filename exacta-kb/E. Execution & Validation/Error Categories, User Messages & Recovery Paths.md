# Error Categories, User Messages & Recovery Paths

This document defines how failures are surfaced to users. It specifies error taxonomy, message guidelines, and recovery paths.

---

## Error Taxonomy

All errors are classified into one of six categories:

| Category | Source | User Action Required |
| --- | --- | --- |
| Intent Error | Intent extraction failed | Rephrase request |
| Plan Error | Plan generation or validation failed | Modify request or approve alternative |
| Diff Error | Diff generation or application failed | Retry or manual edit |
| Build Error | Compilation failed | Fix code or environment |
| Environment Error | External tooling or system issue | Fix environment |
| System Error | Internal failure | Report bug or restart |

---

## Intent Errors

### Error Types

| Error | User Message | Recovery |
| --- | --- | --- |
| Unknown intent type | "Request not recognized. Supported actions: create project, add feature, fix bug, build." | Rephrase using supported terms |
| Low confidence | "Not sure what you mean. Did you mean: [suggestions]?" | Confirm or rephrase |
| Composite intent | "Please make one request at a time. Try asking for [X] first." | Split into separate requests |
| Conflicting constraints | "Your requirements conflict: [details]. Please clarify." | Remove or clarify constraints |
| Ambiguous target | "Multiple matches found for [target]. Which do you mean: [options]?" | Select specific target |

### Retry Policy

| Condition | Retries Allowed |
| --- | --- |
| Unknown intent | 0 (requires user input) |
| Low confidence | 0 (requires user confirmation) |
| Composite intent | 0 (requires user to split) |
| Conflicting constraints | 0 (requires user clarification) |
| Ambiguous target | 0 (requires user selection) |

---

## Plan Errors

### Error Types

| Error | User Message | Recovery |
| --- | --- | --- |
| Validation failed | "Plan could not be validated: [specific reason]." | AI regenerates or user modifies |
| Incomplete plan | "Plan is missing required steps: [list]." | AI regenerates with feedback |
| Exceeds limits | "Plan is too large. Maximum [N] steps allowed." | User simplifies request |
| Forbidden operation | "Plan includes forbidden operation: [details]." | AI regenerates without forbidden step |
| Cycle detected | "Plan contains circular dependencies." | AI regenerates with linear structure |

### Retry Policy

| Condition | Retries Allowed |
| --- | --- |
| Validation failed | 2 (AI regenerates) |
| Incomplete plan | 2 (AI regenerates) |
| Exceeds limits | 0 (requires user simplification) |
| Forbidden operation | 1 (AI regenerates) |
| Cycle detected | 1 (AI regenerates) |

---

## Diff Errors

### Error Types

| Error | User Message | Recovery |
| --- | --- | --- |
| Invalid format | "Generated code changes are malformed. Retrying..." | Automatic retry |
| Context mismatch | "File has changed since planning. Regenerating..." | Automatic retry |
| Path violation | "Change targets forbidden location: [path]." | AI regenerates or user modifies |
| Binary file | "Cannot modify binary file: [file]. Binary files are read-only." | User removes from scope |
| Encoding error | "File encoding mismatch. Expected [X], found [Y]." | User fixes encoding or excludes file |
| Syntax error post-apply | "Applied changes break syntax: [error]. Rolling back." | Automatic rollback + retry |

### Retry Policy

| Condition | Retries Allowed |
| --- | ---:|
| Invalid format | 1 |
| Context mismatch | 1 |
| Path violation | 1 |
| Binary file | 0 (requires user action) |
| Encoding error | 0 (requires user action) |
| Syntax error | 1 (with error feedback) |

---

## Build Errors

### Error Types

| Error | User Message | Recovery |
| --- | --- | --- |
| Compilation error | "Build failed: [compiler message]. [N] errors, [M] warnings." | User reviews errors, optionally rolls back |
| Missing reference | "Build failed: missing reference [name]." | User adds reference or modifies plan |
| Type error | "Build failed: type error in [[file:line](file:line)]." | User reviews or rolls back |

### Build Error Attribution
Build errors are attributed to:
1. Most recent diff (if error location matches changed code)
2. Environment (if error is SDK/tooling related)
3. Pre-existing (if error location was not changed)

Attribution is shown to user: "This error is likely caused by: [attribution]."

### Retry Policy

| Condition | Retries Allowed |
| --- | --- |
| Compilation error | 0 (requires user decision) |
| Missing reference | 0 (requires user action) |
| Type error | 0 (requires user decision) |

---

## Environment Errors

### Error Types

| Error | User Message | Recovery |
| --- | --- | --- |
| SDK not found | "Required SDK not found: [name]. Please install from [link]." | User installs SDK |
| Build tool missing | "Build tool not found: [tool]. Check PATH or install." | User fixes PATH or installs |
| Permission denied | "Access denied to [path]. Check file permissions." | User fixes permissions |
| Disk full | "Disk full. Free space and retry." | User frees space |
| File locked | "File [name] is locked by another process. Close other applications." | User closes conflicting app |
| Network timeout | "AI provider unreachable. Check network and API key." | User fixes network or key |

### Retry Policy

| Condition | Retries Allowed |
| --- | ---:|
| SDK not found | 0 (requires install) |
| Build tool missing | 0 (requires install) |
| Permission denied | 0 (requires fix) |
| Disk full | 0 (requires cleanup) |
| File locked | 3 (with 5s delay) |
| Network timeout | 3 (with exponential backoff) |

---

## System Errors

### Error Types

| Error | User Message | Recovery |
| --- | --- | --- |
| State corruption | "Internal error: state corrupted. Reset recommended." | User resets orchestrator state |
| Index corruption | "Index corrupted. Rebuilding..." | Automatic rebuild |
| Unexpected exception | "Unexpected error occurred. Details logged." | User reports bug |
| Rollback failed | "Rollback failed: [reason]. Manual recovery may be needed." | User manually restores files |

### Retry Policy

| Condition | Retries Allowed |
| --- | --- |
| State corruption | 0 (requires reset) |
| Index corruption | 1 (automatic rebuild) |
| Unexpected exception | 0 (requires investigation) |
| Rollback failed | 0 (requires manual intervention) |

---

## User Message Guidelines

### Message Structure
Every error message must include:
1. **What failed:** Clear statement of the failure
2. **Why it failed:** Specific reason or error details
3. **What to do:** Actionable recovery step

### Example Format

```

[What] Build failed.

[Why] 3 compilation errors in UserService.cs.

[Action] Review errors below and fix, or rollback changes.

```

### Forbidden Message Patterns

| Pattern | Reason |
| --- | --- |
| "Something went wrong" | Not actionable |
| "Unknown error" | Not informative |
| "Please try again later" | No guidance |
| Technical jargon without explanation | Not user-friendly |
| Stack traces in primary message | Overwhelming |

Technical details are available on demand but not shown by default.

---

## When Manual Intervention Is Required

Manual intervention is required when:

| Condition | Manual Action |
| --- | --- |
| Rollback failed | User restores files from backup or VCS |
| State corrupted beyond repair | User deletes `.exacta/` directory |
| Environment broken | User reinstalls SDK/tools |
| All retries exhausted | User modifies request or code manually |
| Unrecoverable system error | User restarts application |

### Manual Recovery Guidance
When manual intervention is required, the system provides:
1. List of affected files
2. Last known good state (if available)
3. Suggested recovery steps
4. Option to export debug bundle

---

## Error Escalation

Errors escalate through this hierarchy:

```

1. Automatic retry (if allowed)
    
    │
    
    ▼
    
2. User-assisted retry (clarification, selection)
    
    │
    
    ▼
    
3. User decision (rollback, skip, abort)
    
    │
    
    ▼
    
4. Manual intervention (fix environment, manual edit)
    
    │
    
    ▼
    
5. Bug report (if system error)

```

No error results in silent failure. Every error is surfaced with a recovery path.

---

## Hard Invariants
This component enforces the following Global System Invariants:
- **INV-GLOBAL-1: Local-Only Execution**
- **INV-GLOBAL-2: Deterministic Orchestration**
- **INV-GLOBAL-3: Fail-Closed Behavior**
- **INV-GLOBAL-4: AI Treated as Untrusted Input**
- **INV-GLOBAL-5: User-Owned API Keys**
- **INV-GLOBAL-6: No Telemetry