# Build, Validation and Preview

This document defines how Exacta App Studio validates code, executes builds, and runs previews.

---

## Validation Layers

Code changes pass through multiple validation layers before being considered complete:

```

Diff Applied

│

▼

Syntax Validation (immediate)

│

▼

Build Execution (on demand or auto)

│

▼

Preview Execution (optional)

```

---

## Syntax Validation

### Purpose
Detect syntax errors immediately after applying a diff, before invoking the build system.

### Implementation
For C# files:
1. Parse the modified file using Roslyn
2. Check for syntax errors (parse errors)
3. Do not perform semantic analysis (too slow, requires full project)

### Timing
- Executed immediately after each diff is applied
- Blocks further execution if errors found

### On Syntax Error
1. Rollback the diff
2. Surface error to user with:
   - File path
   - Line number
   - Error message
3. Options:
   - Retry (regenerate diff)
   - Skip step (if optional)
   - Cancel plan

### Limitations
Syntax validation catches:
- Missing semicolons, braces, parentheses
- Invalid syntax constructs
- Malformed string literals

Syntax validation does not catch:
- Type errors
- Missing references
- Semantic errors
- Runtime errors

---

## Build Execution

### Build Tool Resolution
Build tool is determined by:
1. Explicit project configuration (highest priority)
2. Project file detection:
   - `.csproj` present: use `dotnet build` or `msbuild`
   - `.sln` present: use solution-level build
3. User selection (if ambiguous)

### Build Invocation

```

Build {

tool: string ("dotnet", "msbuild")

arguments: string[]

// ... existing code ...

working_directory: string

timeout_seconds: int

environment: Map<string, string>

}

```

### Build Process
1. Validate build tool is available (check PATH)
2. Set working directory to project root
3. Invoke build command
4. Capture stdout and stderr
5. Wait for completion or timeout
6. Parse exit code

### Timeout Handling
- Default timeout: 300 seconds (5 minutes)
- Configurable per project
- On timeout: kill process, treat as failure

---

## Error Classification

Build failures are classified into two categories:

### Code Errors
Errors caused by the generated code:
- Syntax errors (should be caught earlier)
- Type errors (missing types, wrong types)
- Missing references (undefined symbols)
- Semantic errors (incorrect logic structure)

**Attribution:** Linked to the most recent diff/step.  
**Recovery:** Rollback available, retry with new diff.

### Environment Errors
Errors caused by the build environment:
- Missing SDK
- Missing build tools
- Incorrect PATH
- Insufficient permissions
- Disk space issues
- Network issues (for package restore)

**Attribution:** Not attributed to code changes.  
**Recovery:** User must fix environment, then retry.

### Classification Logic

| Error Pattern | Classification |
| --- | --- |
| `error CS\d+` | Code error |
| `error MSB\d+` | Environment error (usually) |
| `SDK not found` | Environment error |
| `dotnet not found` | Environment error |
| `Access denied` | Environment error |
| `Disk full` | Environment error |
| Compilation errors with `[[file:line]`](file:line]`) links | Code error |
| Process timeout | Environment error |

### Ambiguous Errors
If classification is uncertain:
1. Default to code error
2. Offer rollback
3. Display full error output for user inspection

---

## Preview Execution

### Definition
Preview execution runs the built application for testing purposes.

### When Preview Is Offered
- After successful build
- User explicitly requests
- Never automatic (requires user action)

### Preview Process
1. Locate built executable
2. Configure isolation (see below)
3. Launch process
4. Monitor for errors/crashes
5. Allow user to interact
6. Terminate on user request or timeout

---

## Isolation Guarantees

### What Is Isolated

| Resource | Isolation Method |
| --- | --- |
| Working directory | Temp directory |
| User data | Redirected to temp |
| Configuration | Copied to temp |
| Registry (partial) | App-specific paths only |

### What Is NOT Isolated

| Resource | Reason |
| --- | --- |
| Network | No interception by default |
| System registry | No full virtualization |
| Other processes | No sandbox |
| Hardware access | No virtualization |

### User Responsibility
Users are warned that preview execution:
- May make real network calls
- May write to real file locations (if app ignores working directory)
- May interact with other running applications

### Confirmation Requirement
Before first preview execution in a session:
1. Display warning about isolation limits
2. Require explicit user confirmation
3. Record confirmation for session

---

## When Execution Stops

Execution halts immediately when:

### Validation Failures
- Syntax validation fails after diff apply
- File hash mismatch detected
- Path safety violation

### Build Failures
- Build returns non-zero exit code
- Build times out
- Build tool not found

### User Actions
- User requests cancellation
- User requests pause

### System Errors
- Disk full
- Permission denied
- Process crash

### AI Failures
- Provider unreachable after retries
- Invalid response after retries
- Rate limit exceeded

---

## Execution Never Stops For

Execution continues through:
- Warnings (non-fatal build output)
- Informational messages
- Deprecated API usage warnings

These are logged and surfaced but do not halt execution.

---

## Build Output Handling

### Capture
- stdout and stderr are captured separately
- Output is streamed to log in real-time
- Full output is retained for error analysis

### Display
- Summary shown to user (error count, warning count)
- Full output available on demand
- Errors highlighted with `[[file:line]`](file:line]`) links

### Storage
- Build output persisted with plan execution record
- Retained for debugging and audit
- Cleaned according to retention policy

---

## Incremental Builds

### Policy
Exacta App Studio does not manage incremental build state.
- Build tool (dotnet, msbuild) handles incrementality
- Clean builds are not forced by default
- User may request clean build explicitly

### When Clean Build Is Recommended
- After failed build with unclear errors
- After significant structural changes
- After environment changes

---

## Parallel Builds

### Policy
Parallel builds are not initiated by Exacta App Studio.
- Only one build runs at a time
- Build tools may use internal parallelism
- No concurrent plan executions

### Rationale
- Simplifies error attribution
- Prevents resource contention
- Ensures deterministic behavior

---

## Hard Invariants
This component enforces the following Global System Invariants:
- **INV-GLOBAL-1: Local-Only Execution**
- **INV-GLOBAL-2: Deterministic Orchestration**
- **INV-GLOBAL-3: Fail-Closed Behavior**
- **INV-GLOBAL-4: AI Treated as Untrusted Input**
- **INV-GLOBAL-5: User-Owned API Keys**
- **INV-GLOBAL-6: No Telemetry