# F5. Operational Guardrails

This document defines the **hard limits** that prevent resource exhaustion.

---

## System Limits

| Limit | Value | Behavior on Exceed |
| --- | --- | --- |
| **Max Context** | 128k Tokens | Soft warn @ 80%, Hard Refuse @ 100% |
| **Max Files** | 50 / Plan | Reject Plan |
| **Timeout** | 5 Minutes | Cancel Operation, Rollback |
| **Rate Limit** | 60 req/min | Queue & Delay |

---

## Safety Policy Supremacy

<aside>
🔒

**INV-OPER-5: Safety Supremacy**

Operational limits and test modes SHALL NOT override or relax Safety Policy ceilings. If Safety Policy sets `shell_execution_allowed: false`, no operational guardrail, test mode, or CLI command can enable shell execution.

</aside>

---

## Runtime Prerequisites

- **.NET Desktop Runtime:** 8.0.1+ required.
- **WebView2:** Runtime 120+ required.

### Installer Prerequisites

- **Behavior:** Fail-fast if missing. No partial installs.

---

## Safety Enforcement Test Mode

<aside>
🧪

**INV-TEST-1: Provable Enforcement**

The system MUST support a test mode that simulates attacks and verifies they are blocked. Enforcement is not assumed — it is demonstrated.

</aside>

### Activation

```bash
exacta-guardian.exe --test-mode
```

Test mode MUST only be activatable by Administrator and MUST log activation.

### Simulated Attack Tests

| **Test ID** | **Simulation** | **Expected Result** | **Safe Mode Trigger** |
| --- | --- | --- | --- |
| TEST-001 | Core sends unauthorized shell request | Request denied, audit entry generated | No (single violation) |
| TEST-002 | Core requests capability above Safety Policy ceiling | Request denied, policy violation logged | Yes (policy breach) |
| TEST-003 | Simulated log file modification | Hash chain verification fails, tamper alert | Yes (integrity breach) |
| TEST-004 | IPC message replay attack | Message rejected, security warning logged | No (handled gracefully) |
| TEST-005 | IPC message with invalid signature | Message rejected, session terminated | Yes (auth failure) |
| TEST-006 | Model identity mismatch during execution | Execution blocked, drift alert shown | No (user decision) |
| TEST-007 | Shell attempts privilege escalation | OS blocks, security incident logged | Yes (containment breach attempt) |
| TEST-008 | Shell exceeds Job Object memory limit | Process terminated | No (resource limit) |
| TEST-009 | Upgrade package targets Guardian | Package rejected regardless of signature | No (normal rejection) |
| TEST-010 | Autonomy escalation during active execution | Escalation blocked until Idle | No (normal gate) |
| **TEST-011** | **UI profile switch above Safety Policy ceiling** | **DENY + UI-POLICY-DENY audit** | **No (policy gate)** |
| **TEST-012** | **CLI apply without human approval** | **DENY + exit code 30** | **No (approval gate)** |
| **TEST-013** | **CLI apply with stale policy hash** | **FAIL + exit code 40** | **No (verification gate)** |
| **TEST-014** | **Background resume after policy change** | **CANCEL + audit** | **No (revalidation)** |
| **TEST-015** | **Shell via UI without SYSTEM-LEVEL approval** | **DENY + approval required** | **No (system-level gate)** |

### Test Execution

```bash
exacta-guardian.exe --test-mode --run TEST-001   # Run single test
exacta-guardian.exe --test-mode --run-all        # Run all tests
exacta-guardian.exe --test-mode --run-category containment  # Run category
```

### Test Output Format

```tsx
interface TestResult {
  test_id: string;
  description: string;
  simulation: string;
  expected_result: string;
  actual_result: string;
  passed: boolean;
  safe_mode_triggered: boolean;
  audit_entry_id: string;
  timestamp: string;
}
```

### Test Report

```jsx
┌─────────────────────────────────────────────────────┐
│         SAFETY ENFORCEMENT TEST REPORT              │
├─────────────────────────────────────────────────────┤
│ TEST-001: Unauthorized shell      ✅ BLOCKED        │
│ TEST-002: Policy ceiling breach   ✅ BLOCKED        │
│ TEST-003: Log tamper attempt      ✅ DETECTED       │
│ TEST-004: IPC replay attack       ✅ REJECTED       │
│ TEST-005: Invalid IPC signature   ✅ REJECTED       │
│ TEST-006: Model identity mismatch ✅ BLOCKED        │
│ TEST-007: Privilege escalation    ✅ BLOCKED        │
│ TEST-008: Memory limit exceeded   ✅ TERMINATED     │
│ TEST-009: Guardian upgrade attempt✅ REJECTED       │
│ TEST-010: Mid-execution escalation✅ BLOCKED        │
│ TEST-011: UI profile above ceiling✅ DENIED         │
│ TEST-012: CLI apply no approval   ✅ DENIED (30)    │
│ TEST-013: CLI stale policy hash   ✅ FAILED (40)    │
│ TEST-014: Background policy change✅ CANCELLED      │
│ TEST-015: Shell without SL approve✅ DENIED         │
├─────────────────────────────────────────────────────┤
│ PASSED: 15/15                                       │
│ SAFE MODE TRIGGERS: 4 (as expected)                 │
│ UI/CLI AUTHORITY TESTS: 5/5 PASSED                  │
│ OVERALL: ✅ ALL ENFORCEMENT VERIFIED                │
└─────────────────────────────────────────────────────┘
```

### Post-Test Cleanup

After test mode completes:

- System returns to normal operation
- Safe Mode is exited (if triggered by tests)
- All test artifacts are logged but marked as `test_mode: true`
- No production data is affected