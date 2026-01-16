# C4. Immutable Trust Core Specification

> **Document ID:** C4
> 

> **Version:** V2.1 (Guardian Architecture)
> 

> **Status:** Canonical & Enforced
> 

This is the **Master Specification** for the Immutable Trust Core (ITC) — the cryptographically-enforced trust boundary that prevents authority collapse in the autonomous agent.

> **Scope:** Trust boundaries, Guardian binary, authority split, protection model
> 

> **Related:** Autonomy Profiles, Self-Upgrade, Shell Execution, Operator Controls
> 

---

## 1. Core Invariants

<aside>
🔒

**INV-ITC-1: External Trust Root**

The components responsible for autonomy level, shell execution permission, upgrade authorization, and logging enforcement MUST be protected by a trust boundary that is cryptographically and OS-enforced and NOT modifiable by the autonomous agent itself.

</aside>

<aside>
🔒

**INV-ITC-2: Binary Separation**

The system MUST be split into two distinct binaries: `exacta-core.exe` (Autonomous Agent) and `exacta-guardian.exe` (Immutable Trust Core). Core cannot override, modify, or bypass Guardian.

</aside>

<aside>
🔒

**INV-ITC-3: Authority Cannot Flow Upward**

No action by AI, shell command, diff, or upgrade can grant Core authority that Guardian has not explicitly delegated. This includes build, signing, packaging, or binary staging authority. Authority flows downward only.

</aside>

<aside>
🔒

**INV-ITC-4: Guardian Immutability**

The Guardian binary, its configuration, trust store, and signing certificates CANNOT be modified by any component of the autonomous system, including self-upgrade.

</aside>

<aside>
🔒

**INV-ITC-8: Context Export Authority** *(New in V2.2)*

Guardian MUST define and enforce what data Core can send to AI providers. Core MUST submit a context manifest before any AI call; Guardian MUST return ALLOW or DENY. Without this gate, the "local-only" guarantee is unenforceable.

</aside>

---

## 1.1 Context Export Policy *(New in V2.2)*

Guardian owns and enforces the **Context Export Policy**:

### Policy Parameters

| **Parameter** | **Description** | **Default** |
| --- | --- | --- |
| `allowed_root_paths` | Directories eligible for AI context | Project root only |
| `allowed_extensions` | File extensions that may be sent | `.cs`, `.xaml`, `.json`, `.csproj`, `.sln`, `.md`, `.txt` |
| `max_file_size_bytes` | Maximum size per context object | 100 KB |
| `max_total_context_bytes` | Maximum total context size | 500 KB |
| `denylist_patterns` | Patterns always excluded | `.git/\\\\\\\*\\\\\\\*`, `.ssh/\\\\\\\*\\\\\\\*`, `\\\\\\\*\\\\\\\*/\\\\\\\*.pfx`, `\\\\\\\*\\\\\\\*/\\\\\\\*.pem`, `\\\\\\\*\\\\\\\*/secrets\\\\\\\*`, `\\\\\\\*\\\\\\\*/\\\\\\\*credential\\\\\\\*` |

### Context Manifest (Core → Guardian)

Before any AI call, Core MUST submit:

```tsx
interface ContextManifest {
  correlation_id: UUID;
  provider_class: ProviderClass;     // LOCAL_ONLY | TRUSTED_CLOUD | UNTRUSTED_CLOUD
  files: {
    path: string;                    // Relative to project root
    hash: string;                    // SHA-256
    size: number;                    // Bytes
    classification: FileClass;       // CODE | CONFIG | LOG | DOCUMENTATION
  }[];
  total_size: number;
  user_message_hash: string;         // Hash of user prompt
}
```

### Guardian Validation

Guardian MUST reject context manifests that:

| **Condition** | **Response** |
| --- | --- |
| File outside `allowed_root_paths` | DENY + log |
| File matches `denylist_patterns` | DENY + log |
| File extension not in `allowed_extensions` | DENY + log |
| File exceeds `max_file_size_bytes` | DENY + log |
| Total exceeds `max_total_context_bytes` | DENY + log |
| Provider class not permitted for file classification | DENY + log |

### Attack Mitigation

This gate prevents:

- Exfiltration of `.ssh/`, `.git/config`, credentials via AI context
- Compromised Core silently sending unauthorized files
- "Policy compliant" data theft

---

## 2. Platform Trust Assumption (PTA)

Exacta App Studio's guarantees are enforced **above the operating system layer** and assume a trusted Windows platform.

### Assumed Trusted Components

The following components are **out of scope for Guardian protection** and are assumed to be trustworthy:

- Windows Secure Boot
- Windows Kernel and Code Integrity (no malicious drivers)
- NTFS ACL enforcement
- Windows Service Control Manager
- Local Administrator security boundary

### Non-Goals

The Guardian does NOT attempt to defend against:

- Kernel-level rootkits
- Malicious or unsigned kernel drivers
- Compromised boot chain or firmware
- Hypervisor-based attacks
- Physical access attacks

### Failure Mode

If the Platform Trust Assumption is violated, **all Guardian guarantees are void**.

The system must enter **Safe Mode (INV-OPER-4)** and display:

> "Platform integrity cannot be verified. Guardian protections are degraded."
> 

### Certification Alignment

This trust boundary aligns with:

- Windows Security Baseline
- Secure Boot Compliance Model
- Enterprise Endpoint Protection Standards

---

## 3. Trust Boundary Model

### Binary Architecture

```
┌─────────────────────────────────────────────┐
│         exacta-core.exe                     │
│         (Autonomous Agent)                  │
│                                             │
│  • AI Planning        • Diff Generation     │
│  • File Writes        • Build Execution     │
│  • Context Assembly   • User Interface      │
└─────────────────┬───────────────────────────┘
                  │
                  │ IPC (Restricted Protocol)
                  │
┌─────────────────▼───────────────────────────┐
│         exacta-guardian.exe                 │
│         (IMMUTABLE TRUST CORE)              │
│                                             │
│  • Shell Authorization   • Upgrade Install  │
│  • Autonomy Ceiling      • Kill Switch      │
│  • Logging Enforcement   • Safe Mode        │
│  • Policy Root           • Trust Store      │
└─────────────────────────────────────────────┘
```

### IPC Protocol Constraints

- Core → Guardian: **Requests only** (propose, query, report)
- Guardian → Core: **Commands and grants** (allow, deny, terminate, configure)
- Core cannot invoke Guardian internals directly
- All IPC is logged by Guardian

## 3.1 System Paths (Guardian-Owned)

The following paths are SYSTEM-LEVEL and are outside Core write authority:

| Path | Purpose |
| --- | --- |
| `C:\\Program Files\\Exacta\\Guardian\\` | Guardian binary and config |
| `C:\\ProgramData\\Exacta\\` | Log anchors, legal hold, security logs |
| `.exacta/upgrades/` | Upgrade staging and manifests |
| `.exacta/policy/` | Policy root |
| `.exacta/certified_state.json` | Certification state |

**Rule:** Any diff, shell command, or plan that touches these paths SHALL be classified SYSTEM-LEVEL and routed to Guardian approval.

### Guardian Process Identity

<aside>
📌

**Reality Binding: Windows Process Separation**

Authority separation is enforced by Windows process identity, not just code structure. Guardian and Core MUST run under different security contexts.

</aside>

| **Component** | **Windows Identity** | **Required Privileges** |
| --- | --- | --- |
| Guardian | `NT SERVICE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ExactaGuardianSvc` | SeAssignPrimaryTokenPrivilege (for restricted token creation)
SeIncreaseQuotaPrivilege (for Job Object limits) |
| Core | Current logged-in user (standard) | None beyond standard user |

**IPC Identity Enforcement:**

- Guardian MUST reject IPC connections from processes running under the same token as Guardian
- Guardian MUST verify caller token is NOT elevated before accepting connection
- Named pipe ACL MUST allow only the current user + Guardian service account

---

## 3. Authority Split

| **Power** | **Core** | **Guardian** |
| --- | --- | --- |
| AI Planning | ✅ | ❌ |
| File Writes (project only) | ✅ | ❌ |
| Diff Generation | ✅ | ❌ |
| Build Execution | ✅ | ❌ |
| Shell Execution | ❌ (request only) | ✅ (authorize & run) |
| Autonomy Level Change | ❌ | ✅ |
| Self-Upgrade Install | ❌ (propose only) | ✅ |
| Logging Disable | ❌ | ✅ |
| Safe Mode Exit | ❌ | ✅ |
| Kill Switch Response | ❌ | ✅ |
| Policy Root Modification | ❌ | ✅ (user action only) |

---

## 4. Guardian Protection Model

### OS-Level Enforcement

Guardian MUST be:

- **Location:** `C:\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\Program Files\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\Exacta\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\Guardian\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\`
- **Protection:** Windows Defender Application Control (WDAC) or AppLocker
- **ACL:**
    - Read/Execute: Users
    - Write: Administrators only
- **Integrity Level:** High (prevents tampering from medium-integrity processes)

### Code Signing Requirements

| **Component** | **Signing Key** | **Verification** |
| --- | --- | --- |
| Guardian Binary | Offline Root Certificate | OS + Self-verification |
| Core Binary | Operational Certificate (rotating) | Guardian verifies on load |
| Upgrade Packages | Operational Certificate | Guardian verifies before install |

### Trust Chain

```
Offline Root CA (air-gapped)
    │
    ├── Guardian Signing Cert (offline)
    │       └── Signs: exacta-guardian.exe
    │
    └── Operational Signing Cert (online, rotating)
            └── Signs: exacta-core.exe, upgrade packages
```

Guardian only trusts:

- Its own root certificate
- Explicitly whitelisted Core versions

---

## 5. What Guardian Controls

### Safety Policy (Immutable at Runtime)

Guardian owns and enforces:

- `shell_execution_allowed: boolean`
- `self_upgrade_allowed: boolean`
- `autonomy_ceiling: SAFE \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\| DEV \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\| FULL-AUTO`
- `network_scope: AI_ONLY \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\| AI_AND_PACKAGES \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\| CONFIGURED`
- `logging_enforcement: MANDATORY \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\| OPTIONAL`
- `kill_switch_enabled: boolean`

**Core cannot read these values directly** — Core queries Guardian, Guardian returns current grants.

### What Guardian Does NOT Control

Guardian does not interfere with:

- AI prompt construction
- Plan generation logic
- Diff application (within project sandbox)
- Build tool invocation
- User interface

---

## 6. Failure Modes

| **Scenario** | **System Behavior** |
| --- | --- |
| Guardian crashes | Core enters Safe Mode immediately. No shell, no upgrades, no autonomy changes. |
| Guardian unreachable (IPC timeout) | Core assumes DENY for all Guardian-controlled operations. |
| Core attempts direct Guardian modification | OS blocks (ACL + WDAC). Attempt logged as security incident. |
| Upgrade attempts Guardian modification | Guardian rejects package. Upgrade fails. Incident logged. |
| Shell attempts Guardian modification | Sandbox blocks. Command killed. Incident logged. |

---

## 7. First-Run Trust Establishment

<aside>
🔒

**INV-ITC-5: Bootstrap Trust**

The system MUST establish trust in Guardian before any execution. A trojaned installer that replaces Guardian collapses the entire security model.

</aside>

### First-Run Sequence

```jsx
Installer completes
    ↓
┌─────────────────────────────────────┐
│ Verify Guardian signature           │
│ against embedded root fingerprint   │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Display Guardian hash to user:      │
│ "Guardian SHA-256: abc123..."       │
│ "Verify this matches official hash" │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Require explicit user confirmation  │
│ "I confirm this is the official     │
│  Exacta App Studio Guardian"        │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Store Guardian fingerprint in       │
│ HKLM\SOFTWARE\Exacta\TrustRoot     │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ First-run complete                  │
│ Guardian is now trusted anchor      │
└─────────────────────────────────────┘
```

### Trust Verification on Every Startup

```jsx
Application starts
    ↓
┌─────────────────────────────────────┐
│ Read stored fingerprint from        │
│ HKLM\SOFTWARE\Exacta\TrustRoot     │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Compute current Guardian hash       │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Compare hashes                      │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ IF match: Proceed                   │
│ IF mismatch: BLOCK + alert user     │
│ IF missing: Re-run First-Run        │
└─────────────────────────────────────┘
```

### Trust Root Storage

<aside>
📌

**Reality Binding: Windows Security Boundary**

The registry anchor is not just a storage location — it is a **verifiable OS security boundary**. The ACL model below is mandatory for the trust model to hold.

</aside>

| **Location** | **Content** | **ACL Requirement** |
| --- | --- | --- |
| `HKLM\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\SOFTWARE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\Exacta\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\Guardian\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\TrustRoot` | Guardian SHA-256 fingerprint | **SYSTEM + Administrators: Full Control**
**Users: Read Only**
**exacta-core.exe: NO WRITE** |
| `HKLM\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\SOFTWARE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\Exacta\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\Guardian\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\TrustEstablished` | Timestamp of first-run | Same as above |
| `HKLM\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\SOFTWARE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\Exacta\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\Guardian\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\TrustVersion` | Guardian version at trust time | Same as above |

**Enforcement:**

- Core process MUST run as standard user (not elevated)
- Guardian service MUST run as `ExactaGuardianSvc` service account
- Any process running as the same token as Core MUST be denied write access
- Installer MUST set these ACLs during first-run; Guardian MUST verify on startup

### Fingerprint Mismatch Response

If Guardian hash does not match stored fingerprint:

1. **Block all execution** — Core cannot start
2. **Display security alert:**
    - "Guardian binary has changed unexpectedly"
    - "This may indicate tampering or corruption"
    - "Expected: {stored_hash}"
    - "Found: {current_hash}"
3. **Require manual resolution:**
    - Reinstall from trusted source, OR
    - Explicitly re-establish trust (admin + confirmation)
4. **Log security incident** to Windows Event Log

---

## 8. Guardian IPC Security Model

<aside>
🔒

**INV-ITC-6: Authenticated IPC**

All Core → Guardian IPC MUST be authenticated, integrity-protected, and replay-resistant. Malware impersonating Core MUST NOT be able to invoke Guardian capabilities.

</aside>

### Session Establishment

```jsx
Core starts (after Guardian verifies Core signature)
    ↓
┌─────────────────────────────────────┐
│ Guardian generates ephemeral        │
│ session key (Ed25519 keypair)       │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Guardian sends public key to Core   │
│ via secure channel (named pipe ACL) │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Core generates its session keypair  │
│ Sends public key to Guardian        │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Both derive shared secret           │
│ Session is now authenticated        │
└─────────────────────────────────────┘
```

### Message Format

```tsx
interface IPCMessage {
  // Header (authenticated)
  session_id: string;         // Identifies active session
  sequence: number;           // Monotonic nonce (anti-replay)
  timestamp: number;          // Unix timestamp
  command_scope: IPCScope;    // What this message is allowed to do
  
  // Payload
  command: string;            // e.g. "shell_execute", "query_policy"
  params: object;             // Command-specific parameters
  
  // Signature
  signature: string;          // Ed25519 signature over header + payload
}

type IPCScope = 
  | 'query'           // Read-only queries
  | 'file_operation'  // File system operations
  | 'shell_request'   // Shell execution requests
  | 'upgrade_propose' // Upgrade proposals
  | 'status_report';  // Status updates
```

### Guardian Validation Rules

Guardian MUST reject messages that:

| **Condition** | **Response** |
| --- | --- |
| Invalid signature | REJECT + terminate session |
| Replayed sequence number | REJECT |
| Sequence out of order | REJECT |
| Timestamp drift >30s | REJECT |
| Command outside scope | REJECT |
| Command exceeds Safety Policy | REJECT |
| Unknown session_id | REJECT |

### Scope Authorization

Guardian enforces command scope against Safety Policy:

```jsx
Message received
    ↓
┌─────────────────────────────────────┐
│ Verify signature                    │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Check sequence (anti-replay)        │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Check command_scope matches command │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Check Safety Policy allows command  │
│ (e.g., shell_execution_allowed?)    │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ IF all pass: Execute command        │
│ IF any fail: REJECT + log           │
└─────────────────────────────────────┘
```

### Session Lifecycle

- **Creation:** On Core startup (after signature verification)
- **Duration:** Until Core exits or Guardian restarts
- **Termination:** On Core exit, Guardian restart, or security violation
- **Renewal:** Not supported; new session required after termination

---

## 9. Guardian Attestation Test Protocol

<aside>
🧪

**INV-ITC-7: Verifiable Trust**

The system MUST provide a command to prove Guardian integrity. Trust is not assumed — it is measured.

</aside>

### Attestation Command

```bash
exacta-guardian.exe --verify
```

### Verification Steps

The command MUST perform and report:

| **Check** | **Action** | **Pass Condition** |
| --- | --- | --- |
| 1. Binary Hash | Compute SHA-256 of Guardian binary | Matches expected hash |
| 2. Registry Trust Root | Read `HKLM\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\SOFTWARE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\Exacta\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\TrustRoot` | Matches computed binary hash |
| 3. Signature Chain | Verify Authenticode signature | Valid chain to offline root |
| 4. Safe Mode Path | Verify KILL file path is writable by admin | Path accessible, ACLs correct |
| 5. Registry Kill Switch | Verify `HKLM\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\SOFTWARE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\Exacta\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\EmergencyStop` exists | Key accessible |
| 6. IPC Endpoint | Verify named pipe is created with correct ACL | Pipe exists, secured |
| 7. Log Anchor Path | Verify `C:\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ProgramData\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\Exacta\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\LogAnchor\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\` ACLs | Core has no write access |
| 8. Safety Policy | Load and validate safety-policy.json | Schema valid, not corrupted |

### Output Format

```jsx
┌─────────────────────────────────────────────────────┐
│         GUARDIAN ATTESTATION REPORT                 │
├─────────────────────────────────────────────────────┤
│ Guardian Version:    2.1.1                          │
│ Binary Hash:         sha256:abc123...               │
│ Trust Root Match:    ✅ PASS                        │
│ Signature Chain:     ✅ PASS (Exacta Root CA)       │
│ Safe Mode Path:      ✅ PASS                        │
│ Registry Kill:       ✅ PASS                        │
│ IPC Endpoint:        ✅ PASS                        │
│ Log Anchor ACL:      ✅ PASS                        │
│ Safety Policy:       ✅ PASS                        │
├─────────────────────────────────────────────────────┤
│ OVERALL:             ✅ GUARDIAN VERIFIED           │
│ Timestamp:           2026-01-16T10:45:00Z           │
└─────────────────────────────────────────────────────┘
```

### Failure Behavior

If ANY check fails:

1. **Report shows ❌ FAIL** for failed check
2. **OVERALL shows ❌ GUARDIAN COMPROMISED**
3. **System startup is blocked** if run during boot
4. **Event logged to Windows Event Log** (Event ID 9002)
5. **Exit code is non-zero** for automation

### Startup Integration

Guardian MUST run attestation automatically:

- **On every startup** (before accepting Core connection)
- **On demand** via `--verify` flag
- **Periodically** (every 24 hours while running)

Startup is blocked if attestation fails. There is no override.

---

## 10. Implementation Checkpoints

- [ ]  Guardian and Core are separate binaries
- [ ]  Guardian is code-signed with offline root
- [ ]  Guardian is installed in protected location with restricted ACLs
- [ ]  WDAC or AppLocker policy protects Guardian directory
- [ ]  IPC protocol is restricted (Core cannot invoke Guardian internals)
- [ ]  All Guardian decisions are logged
- [ ]  Core cannot function without Guardian running
- [ ]  Guardian verifies Core signature on every startup
- [ ]  First-run trust establishment implemented
- [ ]  Guardian fingerprint stored in HKLM
- [ ]  Fingerprint verified on every startup
- [ ]  IPC session key exchange implemented
- [ ]  All IPC messages signed and sequence-checked
- [ ]  Replayed/invalid messages rejected and logged

---

---

## System State Definition

"System State" includes:

- Active policy
- Autonomy profile
- Execution state
- Upgrade state
- Kill switch state
- Logging state

**Authority:**

- **Guardian** is authoritative for policy, autonomy, logging, kill switch, and upgrade install.
- **Orchestrator** is authoritative for execution flow within Guardian-defined ceilings.

---

## Hard Invariants

This component enforces the following Global System Invariants:

- **INV-GLOBAL-12: Immutable Trust Core**
- **INV-GLOBAL-13: External Operator Kill Authority**
- **INV-GLOBAL-1: Local-Only Execution**
- **INV-GLOBAL-7: No Telemetry**
- **INV-GLOBAL-9: Complete Audit Trail**
- **INV-GLOBAL-14: External Build & Signing Authority** — Exacta App Studio runtime SHALL NOT produce, compile, package, or sign executable artifacts. All executable code must originate from an external, human-governed, signed build system.