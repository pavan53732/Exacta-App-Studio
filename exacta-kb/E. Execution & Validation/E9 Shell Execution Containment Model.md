# E9. Shell Execution Containment Model

> **Document ID:** E9
> 

> **Version:** V2.1 (Guardian Architecture)
> 

> **Status:** Canonical & Enforced
> 

This is the **Master Specification** for OS-level shell execution containment — defining how shell commands are isolated at the operating system level to prevent sandbox escape.

> **Scope:** OS containment, Job Objects, token restrictions, filesystem filtering
> 

> **Related:** Shell Execution Contract (E7), Immutable Trust Core (C4)
> 

---

## 1. Core Invariants

<aside>
🔒

**INV-CONTAIN-1: OS-Level Isolation**

Shell commands MUST execute inside an OS-enforced security context that prevents modification of system files, registry hives, security configuration, or global network settings. Logical filtering (allowlist/blocklist) is insufficient alone.

</aside>

<aside>
🔒

**INV-CONTAIN-2: Non-Elevated Execution**

Shell commands MUST execute with a restricted, non-admin security token. Elevation is forbidden unless approved through an out-of-band human-controlled mechanism external to Core.

</aside>

<aside>
🔒

**INV-CONTAIN-3: Guardian Ownership**

All shell process spawning is performed by Guardian, not Core. Core may only request execution; Guardian decides and executes.

</aside>

---

## 2. Execution Stack

Shell commands execute through a layered containment model:

```
exacta-guardian.exe
    └── Restricted Runner (Guardian subprocess)
          └── Job Object (resource limits)
                └── Low-Privilege Token (capability restrictions)
                      └── Command Process (actual shell command)
```

Each layer adds constraints. Escape from inner layer is blocked by outer layer.

---

## 3. Security Token Restrictions

### Token Configuration

The shell process token MUST have:

| **Attribute** | **Required Value** |
| --- | --- |
| Integrity Level | Low or Medium (never High) |
| Administrator Group | Deny-only or Removed |
| SeDebugPrivilege | Removed |
| SeTcbPrivilege | Removed |
| SeBackupPrivilege | Removed |
| SeRestorePrivilege | Removed |
| SeTakeOwnershipPrivilege | Removed |
| SeLoadDriverPrivilege | Removed |

### Prohibited Capabilities

The restricted token CANNOT:

- Write to HKLM registry
- Write to HKCR registry
- Access `C:\\\\\\\\\\\\\\\\Windows` (write)
- Access `C:\\\\\\\\\\\\\\\\Program Files` (write)
- Access `C:\\\\\\\\\\\\\\\\Program Files (x86)` (write)
- Access network shares
- Create global objects
- Debug other processes
- Load kernel drivers

---

## 4. Job Object Limits

### Resource Constraints

| **Resource** | **PROFILE-DEV** | **PROFILE-FULL-AUTO** | **On Exceed** |
| --- | --- | --- | --- |
| CPU Time | 60 seconds | 300 seconds | Terminate process |
| Memory | 512 MB | 2 GB | Terminate process |
| Child Processes | 1 | 5 | Block spawn |
| Open Handles | 100 | 500 | Block open |
| Output Size | 1 MB | 10 MB | Truncate + warn |

### Job Object Flags

```
JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE     ← Kill all processes when Guardian exits
JOB_OBJECT_LIMIT_DIE_ON_UNHANDLED_EXCEPTION
JOB_OBJECT_LIMIT_ACTIVE_PROCESS        ← Limit child process count
JOB_OBJECT_LIMIT_PROCESS_TIME          ← CPU time limit
JOB_OBJECT_LIMIT_PROCESS_MEMORY        ← Memory limit
```

---

## 5. Filesystem Restrictions

### Allowed Paths (Whitelist)

Shell commands may ONLY access:

```
<ProjectRoot>\**              ← Project files
%TEMP%\ExactaShell\**         ← Temporary execution space
%LOCALAPPDATA%\Exacta\**      ← App-specific data
```

### Blocked Paths (Hardcoded Deny)

Shell commands may NEVER access:

```jsx
C:\Windows\**
C:\Program Files\**
C:\Program Files (x86)\**
C:\ProgramData\Exacta\**            ← All Exacta system paths
%USERPROFILE%\.ssh\**
%USERPROFILE%\.aws\**
%USERPROFILE%\.azure\**
\\*\**                               ← All network shares
```

### Protected Filesystem Zones *(New in V2.2)*

<aside>
🔒

**INV-CONTAIN-4: System Path Immunity**

The following zones are enforced by Guardian as **non-addressable by shell processes**, per INV-GLOBAL-15:

</aside>

```jsx
.exacta/                              ← Project control directory
C:\ProgramData\Exacta\               ← All system data
C:\ProgramData\Exacta\LegalHold\**   ← Legal hold evidence (V2.2)
Guardian install root                 ← Immutable trust core
Trust store                           ← Certificate chain
Policy root                           ← Safety policy
Upgrade verification root             ← Pending upgrades
Rollback archive                      ← Recovery snapshots
```

Any attempt to access these paths results in:

1. **Immediate process termination** (Job Object kill)
2. **Audit flag:** `ESC-SYSTEM-PATH`
3. **Security incident logged** with full command context
4. **Guardian alert** to operator

**Rationale:** Prevents shell from becoming a shadow upgrade channel that bypasses E10's cryptographic trust chain.

### Enforcement Mechanism

- **Primary:** Restricted token with deny ACEs
- **Secondary:** Guardian validates paths before execution
- **Tertiary:** Minifilter driver (optional, for high-security deployments)

---

## 6. Network Restrictions

### Default State

Shell processes have **no network access** by default.

### Exceptions (Guardian-controlled)

Guardian may grant network access for specific commands:

- `nuget restore` → [nuget.org](http://nuget.org) only
- `npm install` → [registry.npmjs.org](http://registry.npmjs.org) only
- `dotnet restore` → [nuget.org](http://nuget.org) only

Network grants are:

- Per-command (not persistent)
- Logged with full detail
- Revocable by Safety Policy

---

## 7. Shell Request Schema *(New in V2.2)*

<aside>
🔒

**INV-SHELL-9: Plan-Bound Execution**

Guardian SHALL NOT execute any shell command unless it is bound to an approved plan step and verified by Guardian signature.

</aside>

### Request Schema

```tsx
interface ShellRequest {
  correlation_id: UUID;
  plan_id: UUID;
  step_id: UUID;
  approved_capabilities: string[];
  command: string;
  args: string[];
  approval_signature: string; // Guardian signature over (plan_id, step_id, command, args)
}
```

### Verification

Before executing any shell command, Guardian MUST:

1. **Verify approval_signature** using Guardian's own signing key
2. **Check plan_id** exists in Approval Gate registry
3. **Verify approved_capabilities** includes `shell_execution`
4. **Validate command** against E7 allowlist/blocklist

**Verification failure → DENY + SEC-602 audit flag**

---

## 8. Execution Flow

```jsx
Core requests shell execution
    ↓
┌─────────────────────────────────────┐
│ Guardian receives request           │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Verify approval signature (V2.2)    │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Safety Policy check                 │
│ (shell_execution_allowed?)          │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Blocklist check (E7 rules)          │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Path validation (all args)          │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Create Job Object with limits       │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Create restricted token             │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Spawn process in Job with token     │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Monitor execution                   │
│ (enforce limits, capture output)    │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Return result to Core               │
│ (redacted output, exit code)        │
└─────────────────────────────────────┘
```

---

## 9. Failure Modes

| **Scenario** | **System Behavior** |
| --- | --- |
| Command attempts privilege escalation | OS blocks (restricted token). Logged as security incident. |
| Command attempts system file access | OS blocks (token ACLs). Command fails. Logged. |
| Command exceeds memory limit | Job Object terminates process. Logged. |
| Command exceeds time limit | Job Object terminates process. Logged. |
| Command spawns unauthorized children | Job Object blocks spawn. Logged. |
| Guardian crashes during execution | Job Object kills all child processes (KILL_ON_JOB_CLOSE). |
| Command attempts network access | Blocked unless explicitly granted. Logged. |

---

## 10. Comparison: Logical vs OS Containment

| **Control Type** | **E7 (Logical)** | **E9 (OS-Level)** |
| --- | --- | --- |
| Allowlist/Blocklist | ✅ | ✅ (in addition) |
| Path validation | ✅ | ✅ (in addition) |
| Restricted token | ❌ | ✅ |
| Job Object limits | ❌ | ✅ |
| Registry protection | ❌ | ✅ |
| System file protection | ❌ | ✅ |
| Process tree control | ❌ | ✅ |
| Survives clever bypass | ❌ | ✅ |

**E7 defines WHAT can run. E9 ensures HOW it runs cannot escape.**

---

## 11. Logging Responsibility Clarification

<aside>
📌

**Consistency Note (V2.1):** This section clarifies the logging model across E9 and F4.

</aside>

| **Activity** | **Owner** | **Rationale** |
| --- | --- | --- |
| Write shell execution log entries | Guardian | Guardian executes shells, has full context |
| Write Core operation log entries | Core | Core has operational context for AI/file ops |
| Seal all logs (hash chain) | Guardian | Tamper prevention |
| Write external log anchors | Guardian | Tamper evidence outside Core's reach |

**Summary:** Core writes logs for Core operations. Guardian writes logs for Guardian operations (shell, upgrades, policy). Guardian seals ALL logs regardless of who wrote them.

---

## 12. Implementation Checkpoints

- [ ]  Guardian spawns all shell processes (Core never spawns directly)
- [ ]  Restricted token created with all dangerous privileges removed
- [ ]  Job Object created with resource limits before process spawn
- [ ]  Process assigned to Job Object before execution begins
- [ ]  Filesystem access validated at Guardian level and enforced by token
- [ ]  Network access blocked by default
- [ ]  All executions logged with full context
- [ ]  KILL_ON_JOB_CLOSE flag set on all Job Objects
- [ ]  Shell requests include approval_signature (V2.2)
- [ ]  Guardian verifies approval signature before execution (V2.2)

---

## Hard Invariants

This component enforces the following Global System Invariants:

- **INV-GLOBAL-10: Shell Execution Sandbox**
- **INV-GLOBAL-12: Immutable Trust Core**
- **INV-GLOBAL-1: Local-Only Execution**
- **INV-GLOBAL-9: Complete Audit Trail**