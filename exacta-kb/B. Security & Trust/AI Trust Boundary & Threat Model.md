# AI Trust Boundary & Threat Model

This document defines the **trust boundary** between Exacta App Studio and the AI subsystem, and enumerates the **threat model** with prescribed mitigations.

---

## Purpose
The AI component is treated as an **untrusted advisor**. It can suggest, but never execute. This document specifies exactly what the AI can and cannot do, and how the system defends against malicious or malformed AI outputs.

---

## Trust Boundary Definition

### What the AI **DOES**

| Capability | Description |
| --- | --- |
| **Receive context** | Receives project files, user messages, and system state as read-only input |
| **Produce structured output** | Emits intents, plans, and diffs as structured data |
| **Suggest file changes** | Proposes unified diffs for user approval |
| **Answer questions** | Responds to user queries about the project |

### What the AI **DOES NOT**

| Restriction | Enforcement |
| --- | --- |
| **Execute commands** | Orchestrator never passes control flow to AI output |
| **Access filesystem directly** | AI has no file handles; all file content is copied into prompt context |
| **Make network calls** | AI cannot initiate connections; only receives responses |
| **Persist state** | AI has no memory across sessions; context is rebuilt each turn |
| **Bypass approval gate** | All AI-proposed changes require explicit user approval |
| **Access credentials** | API keys are used by the HTTP client, never exposed to AI context |

---

## Invariants

> **INV-TRUST-1: AI output is data, not code**  
> All AI responses are parsed as structured data. No AI output is ever `eval()`'d, executed as a script, or interpreted as commands.

> **INV-TRUST-2: AI cannot escalate privileges**  
> The AI's effective permissions are strictly less than the user's. The AI cannot request elevated access or bypass any gate the user has not explicitly approved.

> **INV-TRUST-3: AI context is ephemeral**  
> Each AI interaction starts with a fresh context built from current project state. No AI-generated data persists except through the explicit diff-apply pipeline.

---

## Threat Model

### Threat Categories

| Threat ID | Category | Description | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| **T-1** | Prompt Injection | Malicious content in project files attempts to hijack AI behavior | AI produces unintended output | All AI output passes through validation; user approval gate |
| **T-2** | Path Traversal | AI suggests diffs targeting paths outside project root | Unauthorized file modification | File Gateway rejects all paths outside project sandbox |
| **T-3** | Malformed Diff | AI produces syntactically invalid or semantically dangerous diffs | File corruption, build failure | Diff parser rejects malformed input; syntax validation before apply |
| **T-4** | Resource Exhaustion | AI produces extremely large outputs or triggers infinite loops | System hang, memory exhaustion | Token limits, response size limits, timeout policies |
| **T-5** | Information Leakage | Sensitive data in project files sent to external AI API | Data exposure to third party | User owns API key and data routing decision; local LLM option available |
| **T-6** | Confused Deputy | AI manipulates user into approving harmful changes | User-approved but unintended file changes | Diff preview shows exact changes; rollback always available |
| **T-7** | Replay Attack | Previously valid AI output replayed in different context | Stale or context-inappropriate changes | Each plan/diff is generated fresh; no caching of AI decisions |

---

## Defense-in-Depth Layers

```

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

│  Layer 3: Approval Gate                                     │

│  - No file writes without explicit user approval            │

│  - Diff preview shows exact changes before apply            │

│  - User can reject any or all proposed changes              │

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

## Fail-Closed Behavior
When any validation fails, the system:
1. **Rejects** the AI output entirely (no partial acceptance)
2. **Logs** the failure with full context for debugging
3. **Notifies** the user with an actionable error message
4. **Does not retry** automatically (user must explicitly retry)
5. **Does not fall back** to alternative behavior

> **Hard Requirement:** There is no "best effort" mode. If validation fails, the operation fails. The user is never silently given degraded behavior.

---

## Hard Invariants
This component enforces the following Global System Invariants:
- **INV-GLOBAL-1: Local-Only Execution**
- **INV-GLOBAL-2: Deterministic Orchestration**
- **INV-GLOBAL-3: Fail-Closed Behavior**
- **INV-GLOBAL-4: AI Treated as Untrusted Input**
- **INV-GLOBAL-5: User-Owned API Keys**
- **INV-GLOBAL-6: No Telemetry**

---

## Security Audit Points
The following points MUST be verified during security review:
- [ ] AI output is never executed as code
- [ ] All file paths are validated against project sandbox
- [ ] All diffs pass through the unified diff parser
- [ ] User approval gate cannot be bypassed programmatically
- [ ] API keys are never exposed in logs or AI context
- [ ] Rollback is always available after any apply operation
- [ ] Resource limits are enforced on AI responses