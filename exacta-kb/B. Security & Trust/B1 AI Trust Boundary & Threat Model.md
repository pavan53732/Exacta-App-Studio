# B1. AI Trust Boundary & Threat Model

This document defines the **trust boundary** between Exacta App Studio and the AI subsystem, and enumerates the **threat model** with prescribed mitigations.

> **Document ID:** B1
> 

> **Version:** V2 (Autonomous Agent)
> 

> **Status:** Canonical & Enforced
> 

---

## Purpose

The AI component is treated as a **trusted advisor with validation**. It suggests changes that are auto-executed when safe (per active policy profile), but always validated and with rollback capability. This document specifies exactly what the AI can and cannot do, and how the system defends against malicious or malformed AI outputs.

**V2 Changes:**

- AI can now request shell command execution (filtered by policy)
- AI can request self-upgrade operations (in PROFILE-FULL-AUTO only)
- Approval is now policy-based, not just risk-based

---

## Trust Boundary Definition

### What the AI **DOES**

| Capability | Description |
| --- | --- |
| **Receive context** | Receives project files, user messages, and system state as read-only input |
| **Produce structured output** | Emits intents, plans, and diffs as structured data |
| **Suggest file changes** | Proposes unified diffs with risk-based approval |
| **Answer questions** | Responds to user queries about the project |

### What the AI **DOES NOT**

| Restriction | Enforcement |
| --- | --- |
| **Execute commands directly** | AI requests are filtered through Shell Executor with allowlist/blocklist *(Changed in V2)* |
| **Access filesystem directly** | AI has no file handles; all file content is copied into prompt context |
| **Make network calls** | AI cannot initiate connections; only receives responses |
| **Persist state** | AI has no memory across sessions; context is rebuilt each turn |
| **Access credentials** | API keys are used by the HTTP client, never exposed to AI context |
| **Bypass Gate Pipeline** | All AI actions flow through policy evaluation *(New in V2)* |
| **Self-authorize upgrades** | Self-upgrade requires standard gate evaluation *(New in V2)* |

---

## Invariants

<aside>
🔒

**INV-TRUST-1: AI output is data, not code**

All AI responses are parsed as structured data. No AI output is ever `eval()`'d, executed as a script, or interpreted as commands.

</aside>

<aside>
🔒

**INV-TRUST-2: AI cannot bypass risk assessment**

All AI-generated plans pass through deterministic risk and quality scoring. The AI cannot bypass this assessment, escalate privileges, or force execution of high-risk operations.

</aside>

<aside>
🔒

**INV-TRUST-3: AI context is ephemeral**

Each AI interaction starts with a fresh context built from current project state. No AI-generated data persists except through the explicit diff-apply pipeline.

</aside>

---

## Threat Model

### Threat Categories

| Threat ID | Category | Description | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| **T-1** | Prompt Injection | Malicious content in project files attempts to hijack AI behavior | AI produces unintended output | All AI output passes through validation; risk-based approval gate |
| **T-2** | Path Traversal | AI suggests diffs targeting paths outside project root | Unauthorized file modification | File Gateway rejects all paths outside project sandbox |
| **T-3** | Malformed Diff | AI produces syntactically invalid or semantically dangerous diffs | File corruption, build failure | Diff parser rejects malformed input; syntax validation before apply |
| **T-4** | Resource Exhaustion | AI produces extremely large outputs or triggers infinite loops | System hang, memory exhaustion | Token limits, response size limits, timeout policies |
| **T-5** | Information Leakage | Sensitive data in project files sent to external AI API | Data exposure to third party | User owns API key and data routing decision; local LLM option available |
| **T-6** | Shell Command Injection *(V2)* | AI requests malicious shell commands via allowlisted patterns | Unauthorized system access, data destruction | Blocklist checked first; allowlist filtering; sandbox jail; resource limits; full audit |
| **T-7** | Replay Attack | Previously valid AI output replayed in different context | Stale or context-inappropriate changes | Each plan/diff is generated fresh; no caching of AI decisions |

---

## Defense-in-Depth Layers

```jsx
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Input Sanitization                                │
│  - Project files are read-only copies in AI context         │
│  - User input is escaped and structured                     │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: Output Validation                                 │
│  - AI responses parsed as structured data                   │
│  - Diff parser rejects malformed/dangerous patterns         │
│  - Path validator enforces sandbox boundaries               │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: Risk Assessment & Auto-Approval                   │
│  - Risk scoring (0-100) determines execution path           │
│  - Quality scoring (0.0-1.0) validates plan completeness    │
│  - High-risk operations require user confirmation           │
├─────────────────────────────────────────────────────────────┤
│  Layer 4: Execution Isolation                               │
│  - AI has no execution capability                           │
│  - Orchestrator controls all file and process operations    │
│  - Build tools run in subprocess with limited permissions   │
├─────────────────────────────────────────────────────────────┤
│  Layer 5: Rollback Capability                               │
│  - All file changes are reversible                          │
│  - State snapshots before each apply operation              │
│  - User can undo to any previous state                      │
└─────────────────────────────────────────────────────────────┘
```

---

## AI Output Validation Rules

All AI-generated output MUST pass these checks before further processing:

| Check | Failure Behavior | Rationale |
| --- | --- | --- |
| **JSON schema validation** | Reject entire response | Ensures structured, parseable output |
| **Path canonicalization** | Reject affected diff hunks | Prevents traversal attacks |
| **Response size limit** | Truncate and warn user | Prevents resource exhaustion |
| **Encoding validation** | Reject affected content | Prevents NUL byte injection, encoding attacks |
| **Sentinel detection** | Special handling | Recognizes NO_CHANGES_REQUIRED and similar |

---

## API Key Isolation

| Guarantee | Implementation |
| --- | --- |
| API keys are never sent to AI context | Keys stored in secure credential store; used only by HTTP client |
| API keys are never logged | Logging subsystem explicitly filters credential patterns |
| API keys are user-provided | No built-in keys; user controls data routing |

---

## Graceful Degradation on Validation Failure

When any validation fails, the system:

1. **Rejects** the AI output entirely (no partial acceptance)
2. **Logs** the failure with full context for debugging
3. **Attempts smart retry** (up to 3 attempts with different strategies)
4. **Notifies** the user with actionable error message if retries exhausted
5. **Does not fall back** to unsafe alternative behavior

<aside>
⚠️

**Hard Requirement:** Validation failures trigger automatic retry with smart strategies. After 3 failed attempts, the operation escalates to the user. No unsafe fallback behavior is permitted.

</aside>

---

## Hard Invariants

This component enforces the following Global System Invariants:

- **INV-GLOBAL-1: Local-Only Execution**
- **INV-GLOBAL-2: Policy-Based Approval Gate** *(Changed in V2)*
- **INV-GLOBAL-3: Background Operation**
- **INV-GLOBAL-4: Graceful Degradation with Auto-Rollback** *(Enhanced in V2)*
- **INV-GLOBAL-5: AI Treated as Trusted Advisor**
- **INV-GLOBAL-6: User-Owned API Keys**
- **INV-GLOBAL-7: No Telemetry**
- **INV-GLOBAL-8: All Changes Reversible**
- **INV-GLOBAL-9: Complete Audit Trail** *(Enhanced in V2)*
- **INV-GLOBAL-10: Shell Execution Sandbox** *(New in V2)*
- **INV-GLOBAL-11: Self-Improving, Never Self-Authorizing** *(New in V2)*

---

## Security Audit Points

The following points MUST be verified during security review:

- [ ]  AI output is never executed as code
- [ ]  All file paths are validated against project sandbox
- [ ]  All diffs pass through the unified diff parser
- [ ]  Risk-based approval gate cannot be bypassed programmatically
- [ ]  API keys are never exposed in logs or AI context
- [ ]  Rollback is always available after any apply operation
- [ ]  Resource limits are enforced on AI responses