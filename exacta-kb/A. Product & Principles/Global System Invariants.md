# Global System Invariants

This document defines the **global system invariants** that govern all behavior in the autonomous agent. These are non-negotiable hard requirements that must hold at all times, in all components, without exception.

> **Version:** V2.2 (Autonomous Agent)
> 

> **Status:** Canonical & Enforced
> 

---

## Hard Requirements

The following invariants are **absolute**. No feature, optimization, configuration, or edge case may violate them.

---

### 1. Local-Only Execution

<aside>
🔒

**INV-GLOBAL-1: Local-Only Execution**

All processing occurs on the user's local machine. The only network traffic is AI API calls initiated by the user.

**Network Exception (V2.2):** The only permitted outbound network communication is optional certificate revocation checks performed by Guardian. All other network access is forbidden.

</aside>

**Enforcement points:**

- Orchestrator rejects unauthorized network requests
- HTTP Client allowlists only AI provider endpoints (+ package managers in DEV/FULL-AUTO profiles)
- No telemetry, analytics, or phone-home behavior exists in any code path

---

### 2. Policy-Based Approval Gate *(Changed in V2)*

<aside>
🔒

**INV-GLOBAL-2: Policy-Based Approval Gate**

All actions flow through the Gate Pipeline. Actions can be approved by: (1) User explicitly, (2) Policy Engine automatically, or (3) Active Autonomy Profile rules. No action executes without passing through gate evaluation.

</aside>

**V1 → V2 Change:** Previously required human approval for all actions. Now policy can auto-approve low/medium risk actions based on active profile.

**Enforcement points:**

- Gate Pipeline evaluates every action before execution
- Security Gate always runs first (can only DENY or PASS)
- Policy Engine evaluates against active profile rules
- Risk and Quality gates provide additional checks
- User confirmation is fallback for CONFIRM decisions

---

### 3. Background Operation

<aside>
🔒

**INV-GLOBAL-3: Background Operation**

The agent can work while the user does other tasks. Background operations queue, execute with priority, and notify based on risk level. State persists across app restarts.

</aside>

**Enforcement points:**

- Execution queue manages concurrent operations
- Worker pool limits concurrency (1/3/5 based on profile)
- Progress monitor tracks and notifies based on risk
- State persistence enables restart recovery

---

### 4. Graceful Degradation with Auto-Rollback *(Enhanced in V2)*

<aside>
🔒

**INV-GLOBAL-4: Graceful Degradation with Auto-Rollback**

On ambiguity or uncertainty, the agent attempts best-effort with automatic retry (up to 3 attempts). After retry exhaustion, autonomous actions auto-rollback before escalating to user. Fuzzy matching and context expansion provide fallback strategies.

</aside>

**V1 → V2 Change:** Failures now trigger automatic rollback for autonomous actions instead of asking user what to do.

**Enforcement points:**

- Smart retry strategies by error type
- Fuzzy diff matching for near-misses
- Context window expansion on mismatch
- **Auto-rollback on failure for autonomous actions**
- Escalation to user after 3 failed attempts

---

### 5. AI Treated as Untrusted Input *(Changed in V2.2)*

<aside>
🔒

**INV-GLOBAL-5: AI Treated as Untrusted Input**

AI output MUST be validated by Guardian-enforced policy, execution gates, and system invariants before any effect on the system or OS. AI is a reasoning engine, not a trusted authority. All AI-generated plans, diffs, and shell requests flow through the Gate Pipeline with no exceptions.

</aside>

**V2 → V2.2 Change:** Renamed from "Trusted Advisor" to "Untrusted Input" to align with Guardian trust model. AI can still trigger autonomous execution, but only after passing Guardian-enforced validation gates.

**Enforcement points:**

- All AI output parsed as structured data (never executed as code)
- Guardian validates context manifests before AI calls (INV-ITC-8)
- Risk scoring and quality scoring gate all executions
- Post-execution validation catches errors
- Automatic rollback on critical validation failures
- AI cannot escalate privileges or bypass gate evaluation
- AI cannot modify Guardian, policy, or audit code

---

### 6. User-Owned API Keys

<aside>
🔒

**INV-GLOBAL-6: User-Owned API Keys**

Users provide their own API keys. Keys are stored in Windows Credential Manager, encrypted at rest. Keys are never logged, never included in AI context, never sent anywhere except the configured provider.

</aside>

**Enforcement points:**

- No built-in API keys exist
- Keys loaded into memory only when needed
- Keys cleared from memory after use
- Logging subsystem filters credential patterns

---

### 7. No Telemetry

<aside>
🔒

**INV-GLOBAL-7: No Telemetry**

No usage data, analytics, crash reports, or metrics are transmitted. No code path conditionally enables telemetry based on build flags, environment variables, or configuration. No "opt-in" telemetry exists.

</aside>

**Enforcement points:**

- No telemetry code exists in the codebase
- No future telemetry hooks are pre-wired
- Debug and release builds behave identically
- Users can verify by monitoring network traffic or running offline

---

### 8. All Changes Reversible

<aside>
🔒

**INV-GLOBAL-8: All Changes Reversible**

Every autonomous operation creates a checkpoint before execution. All file writes are logged with full content snapshots. Rollback is atomic: all files restored or none. Checksums verify restoration.

</aside>

**Enforcement points:**

- Checkpoint created before all file-modifying operations
- File snapshots stored with content hashes
- Rollback verification after restoration
- Audit trail records all autonomous actions

---

### 9. Complete Audit Trail *(Enhanced in V2)*

<aside>
🔒

**INV-GLOBAL-9: Complete Audit Trail**

Every autonomous action is logged with: timestamp, approval source (user or policy rule), active profile, gates evaluated, operation details, risk assessment, execution result, files changed, and rollback path. Audit log is queryable, immutable, and persists across restarts.

</aside>

**V1 → V2 Change:** Audit now includes approval source, active profile, and gate evaluation results.

**Enforcement points:**

- All operations logged before and after execution
- **Approval source recorded (user vs policy)**
- **Active profile recorded**
- **Gate evaluation results recorded**
- Risk scores and quality metrics recorded
- User notification status tracked
- **Rollback path recorded**
- Audit log exportable for review

---

### 10. Shell Execution Sandbox *(New in V2)*

<aside>
🔒

**INV-GLOBAL-10: Shell Execution Sandbox**

Shell commands execute only within the project root sandbox. All commands are filtered through allowlist/blocklist. Resource limits (CPU, memory, time) are enforced. All executions are logged with full input/output capture.

</aside>

**New in V2:** Shell execution is enabled by default (in DEV/FULL-AUTO profiles) but strictly sandboxed.

**Enforcement points:**

- Working directory locked to project root
- Path traversal blocked at OS level
- Command allowlist/blocklist enforced
- Resource limits kill runaway processes
- Full audit of all shell executions

---

### 11. Self-Improving, Never Self-Authorizing *(New in V2)*

<aside>
🔒

**INV-GLOBAL-11: Self-Improving, Never Self-Authorizing**

The agent CAN upgrade itself (in PROFILE-FULL-AUTO with explicit config), but CANNOT authorize its own upgrades. All self-upgrades pass through standard gate evaluation. No hot-patching of running binaries. Rollback always available.

</aside>

**New in V2:** Self-upgrade capability added with strict safety controls.

**Enforcement points:**

- Self-upgrade blocked in SAFE and DEV profiles
- Even FULL-AUTO requires explicit `self_upgrade_enabled: true`
- All upgrades flow through gate pipeline
- No modification of running binary
- Previous version preserved for rollback
- Forbidden self-modifications (security code, policy code, audit code)

---

## Using This Document

Every spec page in this knowledge base must include a **Hard Invariants** section that references the specific invariants from this page that apply to that component.

**Reference format:**

```
## Hard Invariants

This component enforces the following Global System Invariants:
- **INV-GLOBAL-1: Local-Only Execution**
- **INV-GLOBAL-2: Policy-Based Approval Gate**
- **INV-GLOBAL-8: All Changes Reversible**
```

Do not paraphrase. Reference verbatim.

---

## Invariant Violation Response

If any invariant is violated:

1. The operation is immediately halted
2. The violation is logged with full context
3. The user is notified with an actionable error
4. Automatic rollback if changes were applied
5. The violation is treated as a bug requiring immediate fix

---

---

### 12. Immutable Trust Core *(New in V2.1)*

<aside>
🔒

**INV-GLOBAL-12: Immutable Trust Core**

The components responsible for autonomy level, shell execution permission, upgrade authorization, and logging enforcement MUST be protected by a trust boundary that is cryptographically and OS-enforced (Guardian binary) and NOT modifiable by the autonomous agent (Core) itself. The self-upgrade pipeline MUST NOT be capable of modifying or bypassing this core.

</aside>

**New in V2.1:** Introduces hardware/OS-rooted trust boundary via Guardian architecture.

**Enforcement points:**

- Guardian and Core are separate binaries
- Guardian is code-signed with offline root certificate
- Guardian installed in WDAC/AppLocker protected location
- Core cannot invoke Guardian internals directly
- All Guardian decisions are logged

---

### 13. External Operator Kill Authority *(New in V2.1)*

<aside>
🔒

**INV-GLOBAL-13: External Operator Kill Authority**

At least two independent mechanisms MUST exist to halt the autonomous agent that are NOT controllable by Core, AI, shell commands, or upgrades. Safe Mode MUST disable AI, shell, upgrades, and elevated autonomy. Recovery MUST be possible even if Core is compromised.

</aside>

**New in V2.1:** Ensures operators always have a kill path outside agent control.

**Enforcement points:**

- Startup flag `--safe-mode` disables AI, shell, upgrades
- External KILL file (`C:\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ProgramData\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\Exacta\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\KILL`) terminates Core
- Registry kill switch (`HKLM\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\SOFTWARE\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\Exacta\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\EmergencyStop`)
- Guardian CLI for policy reset and Core rollback
- Safe Mode exit requires Guardian authorization

---

---

### 15. System Path Immunity *(New in V2.2)*

<aside>
🔒

**INV-GLOBAL-15: System Path Immunity** *(New in V2.2)*

The following paths are SYSTEM-OWNED and SHALL NOT be modified, written, moved, or deleted by shell execution, agent actions, or project-level processes under any profile:

- `.exacta/`
- `C:\\\\ProgramData\\\\Exacta\\\\`
- `C:\\\\ProgramData\\\\Exacta\\\\LegalHold\\\\**` *(Added in V2.2 for evidence protection)*
- Guardian installation directory
- Trust store directory
- Policy root directory
- Upgrade verification directory
- Rollback archive directory

Only the Updater and Guardian may modify these paths. Violations result in immediate process termination and audit flag `ESC-SYSTEM-PATH`.

</aside>

**New in V2.2:** Closes the shell-as-shadow-upgrade-channel attack vector.

**Enforcement points:**

- Guardian MUST validate all shell command paths against system path list
- File Gateway MUST reject writes to system paths from any agent action
- E7 (Shell Execution Contract) enforces via INV-SHELL-7
- E9 (Containment Model) enforces via Protected Filesystem Zones
- H2 (Compliance Matrix) tests via UPG-001 through UPG-006
- H3 (TLA+ Model) proves via System Path Immunity theorem

---

### 14. Formal Model Integration Rule *(New in V2.1)*

<aside>
🔒

**INV-GLOBAL-14: Formal Model Integration Rule**

Any change to Guardian, Shell, Upgrade, Policy, or IPC logic is **invalid** unless: (1) The TLA+ model in H3 is updated to reflect the change, (2) TLC model checker re-verification passes with no errors, and (3) Verification evidence is logged in H2. This invariant makes formal verification a **process requirement**, not just a reference artifact.

</aside>

---

### 16. Proof Coverage of Authority Transitions *(New in V2.2)*

<aside>
🔒

**INV-GLOBAL-16: Proof Coverage of Authority Transitions**

Any subsystem that can mutate system state or user workspace state MUST have its authority transitions represented in the formal model (TLA+) and validated in the Compliance Matrix. This includes but is not limited to: File Gateway, Approval Gate, Shell Executor, Upgrade Pipeline, and Policy Engine.

</aside>

**New in V2.2:** Ensures that the formal proof boundary covers all authority-bearing subsystems, not just Guardian/Core separation.

**Enforcement points:**

- File Gateway authority transitions modeled in H3 (THEOREM 6, 7)
- Approval Gate decisions modeled in H3 (THEOREM 8)
- System-level plan approval modeled in H3 (THEOREM 9)
- H2 Compliance Matrix includes FORM-001 through FORM-004 tests
- Any new authority-bearing subsystem requires H3 update before deployment

**New in V2.1:** Elevates TLA+ from documentation to hard change-control gate.

**Enforcement points:**

- Code review MUST reject PRs modifying covered components without H3 update
- CI pipeline MUST run TLC verification on H3 changes
- H2 MUST record verification timestamp and result hash
- No deployment proceeds if TLC reports counterexamples

**Covered Components:**

- Guardian binary and all Guardian-owned logic
- Shell execution pipeline
- Self-upgrade pipeline
- Policy engine and autonomy profiles
- IPC protocol and session management

---

## V2.1 Invariant Summary

| Invariant | Status | Notes |
| --- | --- | --- |
| INV-GLOBAL-12 | **New** | Immutable Trust Core (Guardian) |
| INV-GLOBAL-13 | **New** | External Operator Kill Authority |
| INV-GLOBAL-14 | **New** | Formal Model Integration Rule (TLA+ gate) |

## V2 Invariant Summary

| Invariant | Status | Notes |
| --- | --- | --- |
| INV-GLOBAL-1 | Unchanged | Local-only execution |
| INV-GLOBAL-2 | **Changed** | Human → Policy-based approval |
| INV-GLOBAL-3 | Unchanged | Background operation |
| INV-GLOBAL-4 | **Enhanced** | Added auto-rollback requirement |
| INV-GLOBAL-5 | **Changed V2.2** | Trusted advisor → Untrusted input |
| INV-GLOBAL-6 | Unchanged | User-owned API keys |
| INV-GLOBAL-7 | Unchanged | No telemetry |
| INV-GLOBAL-8 | Unchanged | All changes reversible |
| INV-GLOBAL-9 | **Enhanced** | Expanded audit fields |
| INV-GLOBAL-10 | **New** | Shell sandbox |
| INV-GLOBAL-11 | **New** | Self-upgrade controls |