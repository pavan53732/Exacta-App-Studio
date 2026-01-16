# F6. CLI Interface Contract

This document defines the **command-line interface** for headless operation.

---

## CLI Commands

The `exacta` CLI provides headless operation.

<aside>
🔒

**CLI Does Not Bypass Governance**

CLI commands are subject to the same Approval Gate pipeline, Safety Policy enforcement, and SYSTEM-LEVEL PLAN rules as UI actions. CLI is a convenience interface, not a privilege escalation path.

</aside>

| Command | Description |
| --- | --- |
| `exacta open \<path\>` | Sets project root |
| `exacta plan "query"` | Generates plan (JSON output) |
| `exacta apply \<plan_id\>` | Executes plan (with full gate re-evaluation) |
| `exacta approve \<plan_id\>` | Records explicit human approval and signs plan with Guardian key *(V2.1)* |

---

## `exacta apply` Semantics *(V2.1)*

The `apply` command SHALL:

1. **Re-run full Approval Gate pipeline** — Security → Policy → Risk → Quality gates evaluated fresh
2. **Verify Safety Policy hash binding** — Plan's recorded `safety_policy_hash` must match current Safety Policy
3. **Enforce SYSTEM-LEVEL PLAN rules** — If plan is classified SYSTEM-LEVEL, require prior `exacta approve`
4. **Refuse execution if human approval is missing or stale** — Plans requiring confirmation cannot be CLI-applied without `approve`

```bash
# Typical workflow for SYSTEM-LEVEL plans:
exacta plan "add shell build step"   # Generates plan, outputs plan_id
exacta approve abc123                 # Human approves, Guardian signs
exacta apply abc123                   # Executes with verified approval
```

---

## `exacta approve` Semantics *(V2.1)*

The `approve` command:

1. **Requires interactive terminal** — Cannot be piped or scripted without TTY
2. **Displays plan summary** — Shows risk, quality, affected files
3. **Records operator identity** — Logs who approved
4. **Signs approval record** — Guardian cryptographically binds approval to plan
5. **Sets approval timestamp** — Approval expires per plan TTL

---

## Exit Codes *(Expanded V2.1)*

| Code | Meaning | Description |
| --- | --- | --- |
| **0** | Success | Command completed successfully |
| **10** | Policy Denied | Active profile or policy rule denied the action |
| **20** | Safety Ceiling Violation | Action exceeds Safety Policy ceiling (Guardian-enforced) |
| **30** | Approval Required | SYSTEM-LEVEL or high-risk plan requires `exacta approve` first |
| **40** | Verification Failed | Safety Policy hash mismatch, model drift, or approval expired |
| **50** | Execution Failed | Plan execution failed (diff apply, build, etc.) |
| **60** | System Fault | Internal error, Guardian unreachable, or invariant violation |

**Exit code design rationale:**

- **10-29:** Policy/approval issues (operator can resolve)
- **30-49:** Verification/binding issues (may require re-plan)
- **50-59:** Execution issues (may require rollback)
- **60+:** System issues (may require support)