# F7. Operator Control & Emergency Recovery

> **Document ID:** F7
> 

> **Version:** V2.1 (Guardian Architecture)
> 

> **Status:** Canonical & Enforced
> 

This is the **Master Specification** for operator emergency controls — mechanisms that exist **outside Core's control** to stop, recover, and reset the autonomous agent.

> **Scope:** Kill switches, safe mode, recovery CLI, policy reset
> 

> **Related:** Immutable Trust Core (C4), Resilience Invariants (F1)
> 

---

## 1. Core Invariants

<aside>
🔒

**INV-OPER-1: External Kill Authority**

At least two independent mechanisms MUST exist to halt the autonomous agent that are not controllable by Core, AI, shell commands, or upgrades.

</aside>

<aside>
🔒

**INV-OPER-2: Safe Mode Bypass**

Safe Mode MUST disable AI, shell, upgrades, and elevated autonomy. Safe Mode exit MUST require Guardian authorization.

</aside>

<aside>
🔒

**INV-OPER-3: Recovery Without Core**

Policy reset and system recovery MUST be possible even if Core is corrupted, compromised, or non-functional.

</aside>

---

## 2. Kill Switch Mechanisms

### Mechanism 1: Startup Flag (Safe Mode)

**Activation:**

```
exacta-core.exe --safe-mode
```

or

```
exacta-guardian.exe --start-safe
```

**Effect:**

| **Capability** | **Normal Mode** | **Safe Mode** |
| --- | --- | --- |
| AI Planning | ✅ | ❌ Disabled |
| Shell Execution | Per profile | ❌ Disabled |
| Self-Upgrade | Per profile | ❌ Disabled |
| Network (AI APIs) | ✅ | ❌ Disabled |
| Autonomy Level | Per profile | PROFILE-SAFE (forced) |
| File Operations | ✅ | Read-only |
| UI Access | ✅ | ✅ (diagnostic only) |

**Exit Requirement:** Guardian must authorize Safe Mode exit. Core cannot exit Safe Mode on its own.

---

### Mechanism 2: External Kill File

**Location:**

```
C:\ProgramData\Exacta\KILL
```

**Behavior:**

Guardian polls this path every 5 seconds.

If file exists:

1. Guardian immediately terminates Core
2. Guardian locks policy to PROFILE-SAFE
3. Guardian enters "Operator Override" state
4. Restart requires:
    - Delete KILL file
    - Run `exacta-guardian.exe --acknowledge-kill`
    - Explicit user confirmation

**Creation:**

Any method works:

```
echo KILL > C:\ProgramData\Exacta\KILL
```

or create via File Explorer, script, remote management tool, etc.

**Protection:**

- Core cannot write to `C:\\\\ProgramData\\\\Exacta\\\\` (ACL enforced)
- Shell commands cannot access this path (containment model)
- Only administrators or Guardian can delete the file

---

### Mechanism 3: Registry Kill Switch

**Location:**

```
HKLM\SOFTWARE\Exacta\EmergencyStop = 1
```

**Behavior:**

Guardian checks this key on startup and every 30 seconds.

If value is `1`:

1. Core is blocked from starting or is terminated
2. Safe Mode is forced
3. Reset requires: Delete key + restart Guardian

**Protection:**

- HKLM write requires administrator privileges
- Shell containment blocks HKLM access
- Core cannot modify this key

---

## 3. Recovery CLI

### Guardian Command Reference

| **Command** | **Effect** | **Requires** |
| --- | --- | --- |
| `--start-safe` | Start system in Safe Mode | None |
| `--reset-policy` | Reset all policies to factory defaults | Admin + confirmation |
| `--acknowledge-kill` | Clear kill file state after emergency stop | Admin + KILL file deleted |
| `--rollback-core` | Restore previous Core version | Admin |
| `--verify-integrity` | Check all signatures and hashes | None |
| `--export-logs` | Export logs to specified path | None |
| `--show-status` | Display current Guardian state | None |

### Policy Reset Flow

```
exacta-guardian.exe --reset-policy
    ↓
┌─────────────────────────────────────┐
│ Verify caller has admin privileges  │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Display warning:                    │
│ "This will reset ALL policies to    │
│  factory defaults. Continue? [y/N]" │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Backup current policy to            │
│ policy-backup-{timestamp}.json      │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Reset Safety Policy to defaults:    │
│ • shell_execution_allowed: false    │
│ • self_upgrade_allowed: false       │
│ • autonomy_ceiling: PROFILE-SAFE    │
│ • logging_enforcement: MANDATORY    │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Log policy reset event              │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Restart Guardian with new policy    │
└─────────────────────────────────────┘
```

---

## 4. Safe Mode Details

### Entry Conditions

Safe Mode is entered when:

1. `--safe-mode` flag is passed
2. KILL file exists
3. Registry kill switch is set
4. Guardian detects Core signature failure
5. Guardian detects policy corruption
6. Upgrade rollback occurred
7. Previous session crashed 3+ times

### Safe Mode Capabilities

**Allowed:**

- View project files (read-only)
- View logs and audit trail
- Export diagnostics
- Run integrity verification
- Reset policies (via Guardian CLI)
- Rollback Core (via Guardian CLI)

**Blocked:**

- AI planning and execution
- Shell command execution
- File modifications
- Self-upgrade
- Profile changes
- Network access (except local diagnostic endpoints)

---

## 5. Safe Mode Enforcement Contract

<aside>
🔒

**INV-OPER-4: Safe Mode Provably Non-Dangerous**

Safe Mode MUST disable all capabilities that could cause harm. The system in Safe Mode MUST be provably unable to execute AI plans, run shell commands, make network calls, or modify files.

</aside>

### Capability State in Safe Mode

| **Capability** | **Safe Mode State** | **Enforcement** |
| --- | --- | --- |
| AI Interface | **DISABLED** | Guardian blocks all AI API calls |
| Shell Execution | **DISABLED** | Guardian rejects all shell requests |
| Network Access | **DISABLED** | Guardian blocks all outbound connections |
| Self-Upgrade | **DISABLED** | Guardian rejects all upgrade proposals |
| File Writes | **DISABLED** | Guardian rejects all write operations |
| Plan Execution | **DISABLED** | Orchestrator refuses to execute |
| Autonomy Changes | **DISABLED** | Guardian ignores profile change requests |

### Allowed Actions in Safe Mode

The ONLY actions permitted in Safe Mode:

| **Action** | **Purpose** | **Implementation** |
| --- | --- | --- |
| View logs | Diagnose issues | Read-only log viewer |
| Export diagnostics | Share with support | Guardian CLI `--export-logs` |
| View project files | Inspect state | Read-only file browser |
| Reset runtime policy | Recover from bad config | Guardian CLI `--reset-policy` |
| Rollback Core | Recover from bad upgrade | Guardian CLI `--rollback-core` |
| Verify integrity | Check for tampering | Guardian CLI `--verify-integrity` |
| Exit application | Stop everything | UI or CLI |

### Safe Mode Verification

Safe Mode state can be verified by:

1. **Guardian status query:** `exacta-guardian.exe --show-status` shows `mode: SAFE`
2. **UI indicator:** Large red "SAFE MODE" banner visible at all times
3. **Log inspection:** All capability requests show `DENIED (Safe Mode)`
4. **Process inspection:** No child processes spawned by Guardian

### Safe Mode Cannot Be Bypassed By

- Core requests (Guardian ignores)
- AI-generated plans (Orchestrator refuses)
- Shell commands (Guardian rejects)
- Upgrade proposals (Guardian rejects)
- User clicking UI buttons (UI is disabled)
- Environment variables (Guardian ignores)
- Configuration file changes (Guardian ignores)

---

### Safe Mode Exit

<aside>
🔒

**INV-OPER-6: Governed State Transition** *(New in V2.2)*

Exiting Safe Mode SHALL be recorded as a SYSTEM-LEVEL PLAN and MUST be:

- Approved by a human operator
- Signed by Guardian
- Logged with correlation_id and policy hash
</aside>

To exit Safe Mode *(Enhanced in V2.2)*:

1. Clear all kill conditions (file, registry, flags)
2. Run `exacta-guardian.exe --exit-safe`
3. **Safe Mode exit is classified as SYSTEM-LEVEL PLAN**
4. Guardian verifies:
    - All kill conditions cleared
    - Core signature valid
    - Policy integrity intact
5. User confirms exit (human approval required)
6. Guardian creates approval record with:
    - `correlation_id`
    - Policy hash at time of exit
    - Guardian signature
    - Timestamp
7. Approval record logged to audit trail
8. Normal operation resumes

---

## 5. Failure Recovery Matrix

| **Failure Scenario** | **Recovery Method** |
| --- | --- |
| Core stuck in loop | Create KILL file → Core terminated → Diagnose → Delete KILL → Restart |
| Runaway shell commands | Guardian kills all shell processes automatically (Job Object). If insufficient: KILL file. |
| Bad upgrade | `--rollback-core` restores previous version |
| Policy corruption | `--reset-policy` restores factory defaults |
| Guardian won't start | Reinstall Guardian from signed installer (offline root verified) |
| Unknown bad state | KILL file + `--reset-policy` + `--rollback-core` + restart |
| Suspected compromise | KILL file + `--verify-integrity` + `--export-logs` + full reinstall if needed |

---

## 6. Remote Management Integration (Optional)

For enterprise deployments, Guardian supports external management:

### Supported Methods

- **Group Policy:** Set registry kill switch via GPO
- **SCCM/Intune:** Deploy KILL file or registry key
- **PowerShell Remoting:** Create KILL file remotely
- **Custom MDM:** Guardian exposes WMI interface for status queries

### Remote Kill Example

```powershell
# From management server
Invoke-Command -ComputerName TARGET -ScriptBlock {
    "KILL" | Out-File C:\ProgramData\Exacta\KILL
}
```

### Telemetry Note

Guardian can optionally report status to an internal management endpoint.

- **Disabled by default**
- **Local network only** (no internet)
- **Status only** (no code, no logs, no project data)
- **User must explicitly configure**

This does NOT violate INV-GLOBAL-7 (No Telemetry) because:

1. It's opt-in, not default
2. It's enterprise-internal, not vendor telemetry
3. It transmits health status only

---

## 7. Implementation Checkpoints

- [ ]  Safe Mode flag (`--safe-mode`) implemented
- [ ]  KILL file monitoring implemented (5-second poll)
- [ ]  Registry kill switch implemented (30-second poll)
- [ ]  Guardian CLI recovery commands implemented
- [ ]  Policy reset preserves backup
- [ ]  Core rollback restores verified backup
- [ ]  Safe Mode blocks AI, shell, upgrade, network
- [ ]  Safe Mode exit requires explicit authorization
- [ ]  Safe Mode exit classified as SYSTEM-LEVEL PLAN (V2.2)
- [ ]  Safe Mode exit approval record signed by Guardian (V2.2)
- [ ]  All kill events logged
- [ ]  Remote management hooks available (optional)

---

## Hard Invariants

This component enforces the following Global System Invariants:

- **INV-GLOBAL-13: External Operator Kill Authority**
- **INV-GLOBAL-12: Immutable Trust Core**
- **INV-GLOBAL-4: Graceful Degradation with Auto-Rollback**
- **INV-GLOBAL-9: Complete Audit Trail**