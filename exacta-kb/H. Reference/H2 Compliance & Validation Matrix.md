# H2. Compliance & Validation Matrix

> **Document ID:** H2
> 

> **Version:** V2.1.1 (Validation Layer)
> 

> **Status:** Canonical & Enforced
> 

This is the **Master Validation Matrix** for Exacta App Studio. It maps every security invariant to its enforcement point, test case, and expected result.

> **Scope:** Compliance verification, security testing, audit evidence
> 

> **Related:** All invariant definitions across the KB
> 

---

## 1. Purpose

This document transforms architectural invariants from **theory → measurable properties**.

Every row in this matrix represents:

- A claim the system makes
- Where that claim is enforced
- How to test the claim
- What should happen if tested

**Auditors, SOC teams, and enterprise security reviewers use this document to verify system integrity.**

---

## 2. Trust Core Validation

| **Invariant** | **Enforcement Point** | **Test Case** | **Expected Result** |
| --- | --- | --- | --- |
| INV-ITC-1: External Trust Root | Guardian binary separation | Attempt Core → Guardian direct call | Call blocked, incident logged |
| INV-ITC-2: Binary Separation | OS process model | Verify two separate processes running | exacta-core.exe + exacta-guardian.exe |
| INV-ITC-3: Authority Cannot Flow Upward | Guardian IPC handler | Core requests elevated privilege | Request denied, logged |
| INV-ITC-4: Guardian Immutability | OS ACLs + WDAC | Attempt write to Guardian directory | OS blocks, access denied |
| INV-ITC-5: Bootstrap Trust | First-run + startup verification | Replace Guardian binary | Startup blocked, security alert |
| INV-ITC-6: Authenticated IPC | Session key exchange | Send unsigned IPC message | Message rejected, session terminated |

---

## 3. Shell Containment Validation

| **Invariant** | **Enforcement Point** | **Test Case** | **Expected Result** |
| --- | --- | --- | --- |
| INV-CONTAIN-1: OS-Level Isolation | Restricted token + Job Object | Shell attempts system file write | Access denied by OS |
| INV-CONTAIN-2: Non-Elevated Execution | Token privilege removal | Shell attempts privilege escalation | Blocked, logged as security incident |
| INV-CONTAIN-3: Guardian Ownership | Process spawning model | Core attempts direct shell spawn | Spawn fails, must go through Guardian |
| INV-GLOBAL-10: Shell Sandbox | Job Object limits | Shell spawns unauthorized child | Child process killed |
| Job Object Memory Limit | JOB_OBJECT_LIMIT_PROCESS_MEMORY | Shell allocates >512MB (DEV profile) | Process terminated |
| Job Object Time Limit | JOB_OBJECT_LIMIT_PROCESS_TIME | Shell runs >60s (DEV profile) | Process terminated |

### Job Object Escape Attempt Tests (Negative Cases)

<aside>
🚨

**Critical: Auditors require proof that breakout attempts fail, not just that happy paths work.**

</aside>

| **Test ID** | **Escape Attempt** | **Attack Vector** | **Expected Result** |
| --- | --- | --- | --- |
| ESC-001 | CreateProcess outside Job | `CreateProcess()` with `CREATE_BREAKAWAY_FROM_JOB` | **MUST FAIL** (Job flag denies breakaway) |
| ESC-002 | cmd.exe start escape | `cmd /c start notepad.exe` | **MUST FAIL** (child inherits Job) |
| ESC-003 | PowerShell encoded command | `powershell -EncodedCommand \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\<base64\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\>` | **MUST FAIL** (blocklist + Job inheritance) |
| ESC-004 | WMI process spawn | `wmic process call create` | **MUST FAIL** (WMI blocked by token) |
| ESC-005 | Task Scheduler escape | `schtasks /create /tn test /tr cmd` | **MUST FAIL** (no SeIncreaseQuotaPrivilege) |
| ESC-006 | Service creation | `sc create` or `New-Service` | **MUST FAIL** (no admin rights) |
| ESC-007 | Registry run key persistence | Write to `HKCU\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\...\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\Run` | **MUST FAIL** (registry ACL restriction) |
| ESC-008 | DLL injection attempt | `CreateRemoteThread` into another process | **MUST FAIL** (SeDebugPrivilege removed) |
| ESC-009 | Named pipe impersonation | Create pipe, wait for Guardian connection | **MUST FAIL** (Guardian validates caller) |
| ESC-010 | Token manipulation | `AdjustTokenPrivileges` to re-enable | **MUST FAIL** (privileges removed, not disabled) |

**Test Execution:**

```bash
exacta validate --escape-attempts    # Run all ESC-* tests
```

**Pass Criteria:** ALL escape attempts must fail. Any success = containment breach = deployment blocked.

### Upgrade Tamper Tests *(New in V2.2)*

<aside>
🚨

**Critical: Shell must never be usable as a shadow upgrade channel. These tests verify INV-GLOBAL-15 (System Path Immunity).**

</aside>

| **Test ID** | **Attempt** | **Expected Result** |
| --- | --- | --- |
| UPG-001 | Shell writes to `.exacta/upgrades/pending/` | **FAIL** — Process killed, ESC-SYSTEM-PATH logged |
| UPG-002 | Shell edits `manifest.json` in upgrade dir | **FAIL** — Guardian deny, security incident |
| UPG-003 | Shell deletes rollback archive | **FAIL** — ACL deny, audit flag |
| UPG-004 | Shell modifies policy root | **FAIL** — Escalation flag, operator alert |
| UPG-005 | Shell moves signed package post-verification | **FAIL** — Hash mismatch abort |
| UPG-006 | Shell symlinks upgrade dir to project root | **FAIL** — Path resolution block |

**Test Execution:**

```bash
exacta validate --upgrade-tamper     # Run all UPG-* tests
```

**Pass Criteria:** ALL upgrade tamper attempts must fail. Any success = trust chain breach = deployment blocked.

### File Gateway Tests *(New in V2.2)*

<aside>
🚨

**Critical: File Gateway must enforce approval binding and path immunity. These tests verify INV-FS-1 through INV-FS-8.**

</aside>

| **Test ID** | **Attempt** | **Expected Result** |
| --- | --- | --- |
| FS-001 | Write without correlation_id | **DENY** — Approval binding violation |
| FS-002 | Write without plan approval | **DENY** — No approved plan_id |
| FS-003 | Target `.exacta/` directory | **KILL + AUDIT** — System path violation |
| FS-004 | Symlink escape to system path | **DENY** — Path resolution blocked |
| FS-005 | Modify backup before rollback | **HASH FAIL** — Backup verification detects tamper |
| FS-006 | Cross-volume temp rename | **DENY** — Atomicity guarantee violated |
| FS-007 | Exceed backup quota | **ABORT** — Resource limit enforced |
| FS-008 | Deadlock lock hold | **FORCE RELEASE** — Guardian clears stale lock |

**Test Execution:**

```bash
exacta validate --file-gateway      # Run all FS-* tests
```

**Pass Criteria:** ALL file gateway tests must pass. Any failure = write authority breach = deployment blocked.

### Formal Coverage Tests *(New in V2.2)*

<aside>
🚨

**Critical: INV-GLOBAL-16 requires that all authority transitions are formally modeled. These tests verify proof coverage.**

</aside>

| **Test ID** | **Attempt** | **Expected Result** |
| --- | --- | --- |
| FORM-001 | File write without formal theorem in H3 | **FAIL COMPLIANCE** — Authority transition must be modeled |
| FORM-002 | Gate allows unmodeled transition | **FAIL** — All gate decisions must map to H3 theorems |
| FORM-003 | System plan without human approval | **FAIL** — THEOREM 9 violation |

---

### End-to-End Trust Tests *(New in V2.2)*

<aside>
🔒

**Execution Trust Chain:** These tests verify that approval, file writes, shell execution, and state transitions are cryptographically bound end-to-end.

</aside>

| **Test ID** | **Attempt** | **Expected Result** |
| --- | --- | --- |
| E2E-001 | File write without approval signature | **DENY** + SEC-601 audit flag |
| E2E-002 | Shell exec without plan_id | **DENY** + SEC-602 audit flag |
| E2E-003 | Fallback provider mid-plan | **ABORT** + require user confirmation |
| E2E-004 | Safe Mode exit without approval | **DENY** — SYSTEM-LEVEL PLAN required |
| E2E-005 | Forensic export without approval | **DENY** — SYSTEM-LEVEL PLAN required |
| E2E-006 | Plan violates Safety Policy but Risk=Low | **DENY** — Safety Policy supremacy |

**Test Execution:**

```bash
exacta validate --trust-chain    # Run all E2E-* tests
```

**Pass Criteria:** ALL trust chain tests must pass. Any failure indicates a gap in the authority chain and blocks deployment.

**Test Execution:**

```bash
exacta validate --formal-coverage    # Run all FORM-* tests
```

**Pass Criteria:** ALL formal coverage tests must pass. Any failure = proof boundary breach = deployment blocked.

---

## 4. Signing & Upgrade Validation

| **Invariant** | **Enforcement Point** | **Test Case** | **Expected Result** |
| --- | --- | --- | --- |
| INV-SIGN-1: Mandatory Signing | Guardian startup verification | Load unsigned Core binary | Execution blocked |
| INV-SIGN-2: Offline Root | Certificate chain validation | Verify root cert is not online-accessible | Air-gapped HSM only |
| INV-SIGN-3: Guardian Verifies All | Startup + upgrade paths | Present package with invalid signature | Package rejected |
| INV-SIGN-4: Core Cannot Sign | Key storage isolation | Core attempts to access signing keys | Access denied |
| INV-SIGN-5: Guardian Update Isolation | Two-tier update model | Core attempts Guardian update | Request denied, must use OS installer |
| INV-UPGRADE-0: Guardian Exclusive | Upgrade path enforcement | Upgrade package targets Guardian | Package rejected regardless of signature |

---

## 5. Policy & Autonomy Validation

| **Invariant** | **Enforcement Point** | **Test Case** | **Expected Result** |
| --- | --- | --- | --- |
| INV-POLICY-0: Safety Policy Ceiling | Guardian policy enforcement | Core requests capability beyond ceiling | Request denied |
| INV-POLICY-1: Policy Supremacy | Policy engine evaluation | Action bypasses policy check | Impossible (all paths go through engine) |
| INV-POLICY-5: Controlled Escalation | Autonomy state machine | Escalate during active execution | Escalation blocked until Idle |
| INV-OPER-1: External Kill Authority | KILL file + registry switch | Create KILL file while system running | Core terminated within 5 seconds |
| INV-OPER-2: Safe Mode Bypass | Guardian Safe Mode enforcement | Core requests shell in Safe Mode | Request denied |
| INV-OPER-4: Safe Mode Non-Dangerous | Capability lockout | All dangerous capabilities in Safe Mode | All return DISABLED |

---

## 6. Logging & Integrity Validation

| **Invariant** | **Enforcement Point** | **Test Case** | **Expected Result** |
| --- | --- | --- | --- |
| INV-LOG-1: External Tamper Evidence | Log anchor in protected location | Delete log file, verify anchor | Tamper detected on verification |
| INV-GLOBAL-9: Complete Audit Trail | All operation logging | Execute operation, check logs | Operation appears with correlation_id |
| Hash Chain Integrity | Guardian log sealing | Modify log entry mid-chain | Hash verification fails |
| Core Cannot Access Anchor | ACL on LogAnchor directory | Core attempts write to LogAnchor | Access denied |

---

## 7. AI Pipeline Validation

| **Invariant** | **Enforcement Point** | **Test Case** | **Expected Result** |
| --- | --- | --- | --- |
| INV-PIPE-1: Closed Taxonomy | Intent extraction | Submit unrecognized intent type | Intent rejected |
| INV-PIPE-5: Fail-Closed Validation | Plan validator | Submit plan with cycle | Plan rejected immediately |
| INV-PIPE-6: Model Identity Tracking | Execution gate | Change model ID between plan and execute | Execution blocked, regeneration required |
| INV-GLOBAL-11: Never Self-Authorizing | Upgrade gate pipeline | AI proposes upgrade to policy code | Upgrade blocked (forbidden scope) |

---

## 8. IPC Security Validation

| **Invariant** | **Enforcement Point** | **Test Case** | **Expected Result** |
| --- | --- | --- | --- |
| Signature Verification | Guardian message handler | Send message with invalid signature | Message rejected, session terminated |
| Replay Protection | Sequence number check | Replay previous valid message | Message rejected (duplicate sequence) |
| Scope Authorization | Command scope field | Send shell_execute with query scope | Command rejected (scope mismatch) |
| Session Isolation | Session ID validation | Send message with unknown session_id | Message rejected, security incident |
| Timestamp Drift | 30-second tolerance | Send message with old timestamp | Message rejected |

---

## 9. Test Execution Requirements

### Pre-Deployment Validation

Before any production deployment:

1. **All rows in this matrix MUST pass**
2. **Test results MUST be logged with timestamps**
3. **Failed tests MUST block deployment**
4. **Test evidence MUST be retained for audit**

### Automated Test Harness

The system MUST provide:

```bash
exacta validate --full          # Run all validation tests
exacta validate --trust         # Trust core tests only
exacta validate --containment   # Shell containment tests only
exacta validate --policy        # Policy enforcement tests only
exacta validate --execution     # Execution chain tests only (V2.2)
exacta validate --ipc           # IPC security tests only
```

### Test Output Format

```tsx
interface ValidationResult {
  invariant_id: string;
  test_case: string;
  expected: string;
  actual: string;
  passed: boolean;
  timestamp: string;
  evidence_hash: string;  // Hash of test artifacts
}
```

---

## 10. Compliance Mapping

### Certification Target Alignment

This section maps Exacta App Studio's security model to recognized compliance frameworks. These are **conceptual alignments**, not formal certifications, but provide auditors and enterprise reviewers with clear traceability.

| **Framework** | **Relevant Controls** | **Exacta Alignment** | **Evidence Location** |
| --- | --- | --- | --- |
| **Windows Security Baseline** | Application Control, Code Integrity, Secure Boot assumption | WDAC/AppLocker protection, Authenticode signing, Platform Trust Assumption (C4) | C4, E9, E10 |
| **SOC 2 Type II** | CC6.1 (Logical Access), CC6.6 (System Boundaries), CC7.2 (Monitoring) | Guardian/Core separation, Policy ceiling, Complete audit trail | C4, C2, F4, INV-GLOBAL-9 |
| **ISO 27001:2022** | A.8.2 (Privileged Access), A.8.15 (Logging), A.8.32 (Change Management) | Least privilege tokens, Immutable log anchors, Two-tier upgrade model | E9, F4, E10 |
| **IEC 62304** (Medical Device Software) | Class B/C: Traceability, Risk Management, Verification | Invariant → Test → Evidence chain, Risk scoring, TLA+ formal model | H2, H3, D3 |

### Framework-Specific Notes

**Windows Security Baseline**

- Platform Trust Assumption (C4 Section 2) explicitly declares OS-layer dependencies
- Guardian installation requires WDAC or AppLocker policy
- All binaries are Authenticode-signed with offline root

**SOC 2**

- Audit trail (INV-GLOBAL-9) satisfies monitoring requirements
- Guardian/Core separation provides system boundary evidence
- Policy Engine provides logical access control documentation

**ISO 27001**

- Restricted tokens and privilege removal satisfy A.8.2
- Log anchors with hash chains satisfy A.8.15 integrity requirements
- Two-tier upgrade model with Guardian isolation satisfies A.8.32

**IEC 62304**

- This matrix (H2) provides requirements traceability
- TLA+ model (H3) provides formal verification evidence
- Risk scoring in plan validation provides risk management documentation

---

### Regulatory Alignment (Legacy)

| **Requirement Domain** | **Relevant Invariants** | **Evidence Location** |
| --- | --- | --- |
| Access Control | INV-ITC-*, INV-POLICY-* | C4, C2, F7 |
| Audit Logging | INV-GLOBAL-9, INV-LOG-1 | F4 |
| Data Integrity | INV-SIGN-*, Hash chains | E10, F4 |
| Least Privilege | INV-CONTAIN-*, Token restrictions | E9 |
| Incident Response | INV-OPER-*, Safe Mode | F7 |
| Change Management | INV-UPGRADE-*, Two-tier model | E10 |

---

## Hard Invariants

This component supports verification of all Global System Invariants:

- **INV-GLOBAL-1 through INV-GLOBAL-13**
- **All component-specific invariants (INV-ITC-*, INV-SIGN-*, INV-CONTAIN-*, etc.)**