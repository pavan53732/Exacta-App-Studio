# E7. Shell Execution Contract

This is the **Master Specification** for Shell Execution — defining how the autonomous agent executes shell commands safely.

> **Status:** Canonical & Enforced
> 

> **Scope:** Command execution, sandboxing, filtering, audit
> 

> **Related:** Autonomy Profiles, Safe Execution Engine, Rollback
> 

---

## 1. Core Invariants

- **INV-SHELL-1: Enabled by Default** — Shell execution is enabled by default in PROFILE-DEV and PROFILE-FULL-AUTO. Commands are policy-filtered, not blanket-blocked.
- **INV-SHELL-2: Sandbox Jail** — All shell commands execute with the project root as the working directory. Path traversal outside the sandbox is blocked at the OS level.
- **INV-SHELL-3: Command Filtering** — Every command is evaluated against allowlist/blocklist before execution. Unknown commands follow profile-specific behavior.
- **INV-SHELL-4: Resource Limits** — All shell processes have enforced CPU, memory, and time limits. Runaway processes are killed.
- **INV-SHELL-5: Full Audit** — Every executed command is logged with input, output, exit code, duration, and the policy rule that allowed it.
- **INV-SHELL-6: Reversibility** — Commands that modify state (files, registry, etc.) must have a recorded rollback strategy.

---

## 2. Execution Model

### Default Behavior by Profile

| Profile | Shell Enabled | Filtering Mode | Unknown Commands |
| --- | --- | --- | --- |
| **PROFILE-SAFE** | ❌ Blocked | N/A | DENY |
| **PROFILE-DEV** | ✅ Enabled | Allowlist + Blocklist | CONFIRM |
| **PROFILE-FULL-AUTO** | ✅ Enabled | Blocklist Only | ALLOW (if not blocked) |

---

## 3. Command Allowlist (Default)

These commands are pre-approved for autonomous execution:

### Build & Package Management

```
dotnet build, dotnet restore, dotnet publish, dotnet test
msbuild
nuget restore, nuget install
npm install, npm run, npm test
yarn install, yarn build, yarn test
```

### Development Tools

```
git status, git diff, git log, git branch
code (VS Code launcher)
```

### File Operations (within sandbox)

```
mkdir, rmdir, copy, move, del (with sandbox validation)
type, cat, more, head, tail
```

---

## 4. Command Blocklist (Always Denied)

These commands are **ALWAYS blocked**, regardless of profile:

### Dangerous System Commands

```
format, fdisk, diskpart
shutdown, restart
reg delete, regedit (write operations)
net user, net localgroup (modification)
```

### Network Exfiltration Risks

```
curl, wget, Invoke-WebRequest (unless explicitly allowlisted)
ftp, sftp, scp
nc, netcat, ncat
```

### Privilege Escalation

```
runas, sudo
secedit, gpedit
icacls (permission changes outside sandbox)
```

### Cryptographic/Destructive

```
cipher /w (secure wipe)
compact /c (compression - data risk)
BitLocker commands
```

---

## 5. Sandbox Enforcement

### Working Directory Lock

```tsx
interface ShellSandbox {
  working_directory: string;    // Always project root
  path_jail: string;            // Cannot access outside this
  env_inherit: boolean;         // false - clean environment
  env_allowlist: string[];      // PATH, DOTNET_ROOT, etc.
}
```

### Path Validation Rules

1. **Relative Paths:** Allowed if they resolve within project root.
2. **Absolute Paths:** Blocked unless explicitly in allowlist.
3. **Path Traversal:** Any `..` that escapes sandbox = **IMMEDIATE DENY**.
4. **Symlinks:** Commands following symlinks outside sandbox are blocked.

### Environment Isolation

- Shell inherits a **minimal, clean environment**.
- Only allowlisted env vars are passed through.
- No access to user's full PATH (prevents calling unexpected executables).

---

## 6. Resource Limits

| Resource | PROFILE-DEV | PROFILE-FULL-AUTO | On Exceed |
| --- | --- | --- | --- |
| **CPU Time** | 60 seconds | 300 seconds | Kill process |
| **Memory** | 512 MB | 2 GB | Kill process |
| **Child Processes** | 5 | 20 | Block spawn |
| **Open Files** | 100 | 500 | Block open |
| **Output Size** | 1 MB | 10 MB | Truncate + warn |

---

## 7. Execution Flow

```
Command Request
    ↓
┌─────────────────────────┐
│ 1. Parse & Normalize    │
│    (split args, expand) │
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│ 2. Blocklist Check      │
│    → DENY if matched    │
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│ 3. Allowlist Check      │
│    → ALLOW if matched   │
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│ 4. Path Validation      │
│    → DENY if escape     │
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│ 5. Policy Evaluation    │
│    → ALLOW/DENY/CONFIRM │
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│ 6. Execute in Sandbox   │
│    (with resource caps) │
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│ 7. Capture Output       │
│    → Log to Audit Trail │
└─────────────────────────┘
```

---

## 8. Output Handling

### Capture Schema

```tsx
interface ShellExecutionResult {
  correlation_id: UUID;
  command: string;
  args: string[];
  working_dir: string;
  exit_code: number;
  stdout: string;           // Truncated if > limit
  stderr: string;           // Truncated if > limit
  duration_ms: number;
  resource_usage: {
    cpu_ms: number;
    memory_peak_bytes: number;
  };
  policy_rule_matched: string;
  timestamp: string;
}
```

### Sensitive Output Redaction

- Output is scanned for secrets (API keys, passwords).
- Detected secrets are replaced with `[REDACTED]` in logs.
- Full output is available only in-memory during operation.

---

## 9. Rollback Strategy

For commands that modify state:

| Command Type | Rollback Strategy |
| --- | --- |
| File creation | Delete created files |
| File modification | Restore from backup snapshot |
| File deletion | Restore from backup snapshot |
| Package install | Uninstall package (best effort) |
| Build output | Clean build artifacts |

### Non-Reversible Commands

Some commands cannot be rolled back:

- External network requests (data already sent)
- Commands with side-effects outside sandbox

These require **CONFIRM** regardless of profile (unless explicitly overridden).

---

## 10. CLI Reference

```bash
exacta shell status              # Show shell execution status
exacta shell allowlist           # List allowed commands
exacta shell blocklist           # List blocked commands
exacta shell test "<command>"    # Test if command would be allowed
exacta shell history             # Show recent executions
```