# Security, Privacy and Local-Only Guarantees

This document defines the security model, privacy guarantees, and local-only constraints of Exacta App Studio. These are not aspirational goals; they are hard requirements.

---

## Local-Only Execution

### Definition
All processing occurs on the user's local machine. The only network traffic is AI API calls initiated by the user.

### What Runs Locally
- Application UI
- Orchestrator and state machine
- Project indexer
- File operations
- Build execution
- Diff generation and validation
- All logging and persistence

### What Requires Network
- AI API calls (user-initiated, user-configured)
- Documentation retrieval (optional, user-initiated)

### Network Call Audit
Every network call made by Exacta App Studio:

| Call Type | Destination | User Control | Data Sent |
| --- | --- | --- | --- |
| AI API | User-configured endpoint | Full control | Prompt, context (no secrets) |
| Doc retrieval | Allowlisted domains only | Can disable | URL only |

**No other network calls are made.** If any other network activity is detected, it is a bug.

### Enforcement Invariant
**Invariant:** Any network call not routed through the AI Interface or Documentation Retriever is a fatal error and halts execution.
- Enforced by: Orchestrator (rejects unauthorized network requests)
- Verified by: Network call audit logging
- Violation response: Immediate execution halt, error surfaced to user

No code path may conditionally bypass this invariant based on build flags, environment variables, or configuration.

---

## User-Owned API Keys

### Ownership
- Users provide their own API keys
- Users are responsible for key security
- Users control which provider receives their requests
- Users bear the cost of API usage

### Key Storage
- Keys are stored in Windows Credential Manager
- Keys are encrypted at rest by OS
- Keys are never written to plain text files
- Keys are never included in logs
- Keys are never included in debug bundles

### Key Usage
- Keys are loaded into memory only when needed
- Keys are injected into HTTP headers at call time
- Keys are cleared from memory after use
- Keys are never sent to any destination other than the configured provider

### Key Lifecycle
```

User enters key in settings

│

▼

Key encrypted and stored in Credential Manager

│

▼

[On AI call]

│

▼

Key loaded into memory

│

▼

Key injected into Authorization header

│

▼

HTTP request sent to provider

│

▼

Key cleared from memory

```

---

## No Remote Storage

### What Is Stored Locally
- Project files (user's responsibility)
- Orchestrator state
- Project index
- Rollback data
- Execution logs
- User settings
- API key references

### What Is Never Stored Remotely
- Source code
- Project structure
- User settings
- API keys
- Execution history
- Error reports
- Usage statistics

### Storage Locations

| Data | Location | Persistence |
| --- | --- | --- |
| Project state | `{project}/.exacta/` | Per-project |
| User settings | `%APPDATA%\Exacta\` | Per-user |
| API keys | Windows Credential Manager | Per-user |
| Logs | `%APPDATA%\Exacta\logs\` | Rolling |
| Cache | `%LOCALAPPDATA%\Exacta\cache\` | Clearable |

---

## No Telemetry

### Definition
Telemetry is the automatic collection and transmission of usage data. Exacta App Studio performs **no telemetry**.

### What Is Not Collected
- Usage statistics
- Feature usage
- Error rates
- Performance metrics
- User behavior
- Session information
- Hardware information
- OS information

### What Is Not Transmitted
- Crash reports
- Error logs
- Usage analytics
- "Phone home" pings
- Update checks (manual only)
- License verification

### Verification
Users can verify no telemetry by:
- Monitoring network traffic
- Running in offline mode (AI calls will fail, nothing else should)
- Inspecting source code (when available)

### Build Flag Guarantee
**Invariant:** No code path conditionally enables telemetry based on build flags, environment variables, or configuration.
- Debug builds behave identically to release builds regarding telemetry
- No "opt-in" telemetry exists
- No future telemetry hooks are pre-wired

---

## No Background Uploads

### Definition
No data is uploaded without explicit user action.

### What Requires User Action
- Every AI API call
- Every documentation fetch
- Debug bundle sharing (if implemented)

### What Never Happens Automatically
- Sync to cloud storage
- Backup to remote server
- Analytics transmission
- Error reporting
- Usage reporting
- Update downloads

### Background Process Constraints
- File watcher: local only, no network
- Index builder: local only, no network
- Build executor: local only, no network (except package restore, which is user-initiated)

### Package Restore Constraint
**Invariant:** Exacta App Studio does not auto-add or auto-restore packages without explicit plan approval.
- Package additions must be part of an approved plan
- Package restore is only triggered by explicit build step
- No implicit dependency resolution during indexing or context assembly

---

## Sandbox Boundaries

### Project Sandbox
Exacta App Studio operates within a project sandbox:

**Inside sandbox (allowed):**
- Project root directory
- Subdirectories of project root
- User-approved external paths

**Outside sandbox (forbidden):**
- System directories
- Other users' directories
- Network shares (by default)
- Removable media (by default)

### Process Sandbox
Exacta App Studio process isolation:

**What the process can do:**
- Read/write within project sandbox
- Execute build tools
- Make network calls to configured endpoints
- Access Windows Credential Manager

**What the process cannot do:**
- Elevate privileges without user consent
- Access other users' data
- Modify system files
- Install system-wide components

### Preview Sandbox
When running built applications in preview:

**Isolated:**
- Working directory
- User data directory (redirected)

**Not isolated:**
- Network access
- System registry (partially)
- Other processes

### Preview Approval Gate
**Invariant:** Preview execution requires explicit per-project user acknowledgment of isolation limits.
- First preview in a project triggers a **hard approval gate**
- User must explicitly confirm understanding of:
  - Network access is not isolated
  - Registry writes may persist
  - Other processes may be affected
- Acknowledgment is recorded per-project
- Preview is blocked until acknowledgment is given

This is not a dismissible warning; it is a required gate.

---

## Threat Model

### Threats Addressed

| Threat | Mitigation |
| --- | --- |
| Data exfiltration via AI | Context sanitization, no secrets in prompts |
| API key theft | Credential Manager storage, memory clearing |
| Unauthorized file access | Project root jail, path validation |
| Code injection via AI | Diff validation, syntax checking, user approval |
| Supply chain attack | No auto-updates, manual verification |

### Threats Not Addressed (User Responsibility)

| Threat | Reason |
| --- | --- |
| Malicious AI provider | User chooses provider |
| Compromised build tools | User installs tools |
| OS-level compromise | Outside application scope |
| Physical access attacks | Outside application scope |

---

## Security Principles

### Principle of Least Privilege
- Request only necessary permissions
- Access only required files
- Store only essential data
- Transmit only required context

### Defense in Depth
- Multiple validation layers
- Path safety at multiple points
- User approval gates
- Rollback capability

### Fail Secure
- On error: deny, don't allow
- On ambiguity: ask, don't guess
- On conflict: stop, don't proceed

### Transparency
- All operations are logged
- All network calls are visible
- All file changes are auditable
- No hidden behaviors

---

## Compliance Considerations

### What Exacta App Studio Helps With
- Local data processing (no cloud transfer)
- User control over data
- Auditability of operations
- No third-party data sharing (except user-chosen AI provider)

### What Users Must Handle
- AI provider compliance (user's contract with provider)
- Source code IP protection
- Access control to the machine
- Backup and disaster recovery

---

## Incident Response

### If a Security Issue Is Found
1. Document the issue with reproduction steps
2. Assess severity and impact
3. Develop fix with minimal changes
4. Test fix thoroughly
5. Release update with clear changelog
6. Notify users of severity

### User Actions on Security Issue
1. Stop using affected feature
2. Review logs for exploitation
3. Rotate API keys if potentially exposed
4. Update to patched version
5. Report any observed exploitation

---

## Hard Invariants
This component enforces the following Global System Invariants:
- **INV-GLOBAL-1: Local-Only Execution**
- **INV-GLOBAL-2: Deterministic Orchestration**
- **INV-GLOBAL-3: Fail-Closed Behavior**
- **INV-GLOBAL-4: AI Treated as Untrusted Input**
- **INV-GLOBAL-5: User-Owned API Keys**
- **INV-GLOBAL-6: No Telemetry**