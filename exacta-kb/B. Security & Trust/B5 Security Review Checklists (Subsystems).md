# B5. Security Review Checklists (Subsystems)

## Purpose

Define repeatable, auditable security review checklists per subsystem.

> **Document ID:** B5
> 

> **Version:** V2 (Autonomous Agent)
> 

> **Status:** Canonical & Enforced
> 

A "security review" is complete only when:

- every checklist item is explicitly marked Pass/Fail/NA
- evidence is recorded (test case, log excerpt, code location)
- failures are either fixed or explicitly accepted with written rationale (rare)

### Hard Invariants

This document adheres to:

- **INV-GLOBAL-1:** Local-Only Execution
- **INV-GLOBAL-2:** Policy-Based Approval Gate *(Changed in V2)*
- **INV-GLOBAL-3:** Background Operation
- **INV-GLOBAL-4:** Graceful Degradation with Auto-Rollback *(Enhanced in V2)*
- **INV-GLOBAL-5:** AI Treated as Trusted Advisor
- **INV-GLOBAL-6:** User-Owned API Keys
- **INV-GLOBAL-7:** No Telemetry
- **INV-GLOBAL-8:** All Changes Reversible
- **INV-GLOBAL-9:** Complete Audit Trail *(Enhanced in V2)*
- **INV-GLOBAL-10:** Shell Execution Sandbox *(New in V2)*
- **INV-GLOBAL-11:** Self-Improving, Never Self-Authorizing *(New in V2)*

---

## Global Rules (Apply to Every Subsystem)

**G0. Trust Model**

- [ ]  Identify all **untrusted inputs** to the subsystem (UI strings from external sources, filesystem content, network responses, **AI outputs before validation**).
- [ ]  Identify all **trusted inputs** (compile-time constants, validated config, deterministic state).
- [ ]  Confirm the subsystem treats AI output as **validated untrusted input** *(Corrected in V2.2)* — AI outputs are validated but remain adversarial until proven safe. Validation does not confer trust; it only enforces safety constraints.

**Rationale:** B1 (Trust Boundary) classifies AI as untrusted input. Calling validated AI output "trusted" weakens review rigor and may cause reviewers to skip fuzzing, injection testing, and adversarial validation. AI outputs are constrained, not trusted.

### G1. Graceful Degradation

- [ ]  On ambiguity, corruption, or validation failure, subsystem attempts **smart retry** (up to 3 attempts) before escalating.
- [ ]  Error surfaced includes:
    - canonical error code
    - actionable recovery steps
    - retry attempt count
- [ ]  Retries follow policy (exponential backoff, risk-based escalation).
- [ ]  High-risk operations require confirmation before retry.

### G2. Autonomous Execution Safety

- [ ]  Given same inputs and risk context, subsystem behavior is predictable.
- [ ]  Ordering rules are explicit (no hash-map iteration ordering leaks).
- [ ]  Any randomness is prohibited or explicitly controlled and logged.
- [ ]  Risk assessment is deterministic and reproducible.

### G3. Secrets / Redaction

- [ ]  No secrets in logs.
- [ ]  No secrets in IPC payloads.
- [ ]  No secrets in diagnostic bundles.
- [ ]  Verify redaction filters are applied before persistence/export.

### G4. Sandbox / Path Safety

- [ ]  All paths are canonicalized.
- [ ]  Project root jail enforced.
- [ ]  No path traversal (`..`), no absolute paths, no UNC/network paths (unless explicitly allowed).

### G5. Resource Exhaustion

- [ ]  Token limits enforced.
- [ ]  File size and count limits enforced.
- [ ]  Timeouts enforced.
- [ ]  Memory bounds enforced or safe degradation applied.

### G6. Auditability

- [ ]  Every mutation is logged with correlation id (without contents).
- [ ]  Before/after or rollback information exists where mutation occurs.

---

## Evidence Format (Required)

For each checklist item record:

- **Status:** Pass / Fail / NA
- **Evidence:** file + function/class name, test name, or reproduction steps
- **Notes:** why NA or what remains

---

# Subsystem Checklists

---

## 1) AI Interface

### Threats Considered

- [ ]  Prompt injection from project files
- [ ]  Malformed JSON / schema violations from AI
- [ ]  Oversized responses (resource exhaustion)
- [ ]  Provider outages / timeouts / rate limits
- [ ]  Model capability mismatch (streaming, JSON mode, token limits)
- [ ]  Data exfiltration risk (sensitive code / secrets)

### Trust Boundary (Inputs/Outputs)

- [ ]  Inputs to AI Interface are limited to:
    - validated context bundle
    - user request text
    - deterministic system state summary
- [ ]  Outputs are validated for safety constraints (path safety, resource limits) but trusted as advisor recommendations.

### Validation Rules

- [ ]  Response schema validation for intent/plan/diff is strict.
- [ ]  Unknown fields are ignored only if safe; unknown required fields cause rejection.
- [ ]  Response size limit enforced (truncate is NOT allowed unless explicitly specified; prefer refusal).

### Graceful Degradation Behavior

- [ ]  On parse failure → retry up to 3 times with exponential backoff.
- [ ]  On low confidence intent → assess risk; if high risk, escalate to user; if low/medium risk, proceed with notification.
- [ ]  On provider errors → retry with backoff; escalate after 3 failures.

### Logging / Redaction

- [ ]  Full prompts are not logged by default.
- [ ]  Full responses are not logged by default.
- [ ]  API keys never logged and never passed into AI context.

### Fuzz / Negative Tests

- [ ]  AI returns non-JSON where JSON expected → rejected
- [ ]  AI returns JSON with missing fields → rejected
- [ ]  AI returns huge output → rejected with Resource error
- [ ]  AI suggests absolute paths / traversal → rejected downstream and reported clearly

---

## 2) Diff Parser

### Threats Considered

- [ ]  Path traversal in diff headers
- [ ]  Absolute paths / UNC paths
- [ ]  Markdown fences / ANSI codes (parser confusion)
- [ ]  NUL bytes / binary content injection
- [ ]  Incorrect hunk counts (corruption)
- [ ]  Multi-file diff where single-file expected

### Trust Boundary (Inputs/Outputs)

- [ ]  Input: AI-produced diff text (untrusted)
- [ ]  Output: parsed diff structure (trusted only after validation)

### Validation Rules

- [ ]  Only unified diff accepted (exact spec).
- [ ]  Reject if any forbidden constructs present.
- [ ]  Verify context lines match file content exactly (no fuzz).
- [ ]  Verify hunk line counts correct.
- [ ]  Reject if trailing newline missing (if required by policy).
- [ ]  Reject multi-file diffs (unless explicitly supported in that operation).

### Graceful Degradation Behavior

- [ ]  Parser never guesses; ambiguous diffs trigger AI clarification request (auto-retry up to 3 times).
- [ ]  No fuzzy patching.
- [ ]  Smart retry with exponential backoff (3 attempts before user escalation).

### Logging / Redaction

- [ ]  Log diff metadata only (paths, counts, hashes) not full content by default.
- [ ]  If full diff logging exists, it must be opt-in and stored locally only.

### Fuzz / Negative Tests

- [ ]  Randomized diff headers (garbage) → rejected
- [ ]  Diffs containing `..` in paths → rejected
- [ ]  Diffs with `diff --git` headers → rejected
- [ ]  Diffs with NUL bytes → rejected
- [ ]  Incorrect hunk counts → rejected

---

## 3) File Gateway

### Threats Considered

- [ ]  Write outside sandbox (path traversal, symlink escape)
- [ ]  TOCTOU between validation and write
- [ ]  Partial writes / corruption on crash/power loss
- [ ]  File lock contention / antivirus interference
- [ ]  Encoding corruption
- [ ]  Rollback tampering or mismatch

### Trust Boundary (Inputs/Outputs)

- [ ]  Inputs: validated diff structures + orchestrator authorization (trusted gate)
- [ ]  Outputs: atomic filesystem mutations and rollback entries

### Validation Rules

- [ ]  Canonicalize path, then verify within root.
- [ ]  Deny rules enforced (bin/obj/.git/etc).
- [ ]  Symlinks/junctions handled explicitly (default: do not follow).
- [ ]  File hash verified before write (drift detection).
- [ ]  Encoding preserved.

### Graceful Degradation Behavior

- [ ]  If hash mismatch (drift detected) → retry index refresh and revalidation (up to 3 times).
- [ ]  If lock cannot be acquired → retry with exponential backoff (3 attempts); escalate if high-risk.
- [ ]  If atomic write cannot complete → rollback immediately and retry (up to 3 times before escalation).

### Logging / Redaction

- [ ]  Log path + operation + before/after hash (not content).
- [ ]  Rollback entries stored safely (no secrets introduced).
- [ ]  No writes outside root even in debug builds.

### Fuzz / Negative Tests

- [ ]  Attempt to write `../` path → blocked
- [ ]  Attempt to write to `C:\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\Windows\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\...` → blocked
- [ ]  Simulate lock held → fail with FS-005
- [ ]  Simulate crash mid-write → verify atomicity guarantees

---

## 4) Orchestrator / State Machine

### Threats Considered

- [ ]  Invalid state transitions (race conditions)
- [ ]  Bypass of risk-based approval gate
- [ ]  Out-of-order execution or duplicate step execution
- [ ]  Resume without drift revalidation
- [ ]  Cancellation during unsafe boundary

### Trust Boundary (Inputs/Outputs)

- [ ]  Inputs: UI IPC requests, AI outputs (validated), filesystem/index signals
- [ ]  Outputs: authorizations to File Gateway, Build Executor, and emitted events

### Validation Rules

- [ ]  All transitions must be in transition table.
- [ ]  Risk-based approval required before Executing (low/medium auto-execute, high requires confirmation).
- [ ]  Step order must be enforced exactly.
- [ ]  Dependencies (if unsupported in V1) must be rejected or gracefully degraded.

### Graceful Degradation Behavior

- [ ]  Any unexpected transition attempt → ST-001 with retry if safe state.
- [ ]  Any ambiguity in allowed action → assess risk and retry with clarification (up to 3 times).
- [ ]  Risk assessment bypassed → fatal violation (no retry).
- [ ]  Quality scoring must be deterministic; non-determinism triggers re-assessment.

### Logging / Redaction

- [ ]  Every transition logged with correlation id.
- [ ]  Risk/quality assessment decisions logged with scores and rationale.
- [ ]  Auto-execution decisions logged with timestamp (no secrets).

### Fuzz / Negative Tests

- [ ]  Random IPC command sequence → must not reach illegal state
- [ ]  Attempt Execute without risk assessment → rejected
- [ ]  Attempt Execute high-risk action without user confirmation → rejected
- [ ]  Attempt Resume without passing drift checks → rejected

---

## 5) Project Indexer

### Threats Considered

- [ ]  Symlink loops / traversal runaway
- [ ]  Unbounded file counts / depth (resource exhaustion)
- [ ]  Stale index leading to wrong edits
- [ ]  Secret leakage via index content
- [ ]  Parser crashes on malformed source files

### Trust Boundary (Inputs/Outputs)

- [ ]  Inputs: filesystem contents (untrusted)
- [ ]  Outputs: structured index metadata (trusted only after build rules)

### Validation Rules

- [ ]  Enforce file limits (count, size, depth).
- [ ]  Only index allowlisted file types.
- [ ]  Binary detection enforced.
- [ ]  Hashes computed deterministically.
- [ ]  Any AST parsing failures handled without crashing.

### Graceful Degradation Behavior

- [ ]  If index is stale for a target file → auto-refresh index and retry (up to 3 times).
- [ ]  If parsing is uncertain → degrade gracefully (e.g., signatures only) and log warning; retry with alternative parser if available.

### Logging / Redaction

- [ ]  Index logs contain file paths and hashes, not contents.
- [ ]  Index never stores secrets (avoid indexing `.env`, `.pfx`, etc.).

### Fuzz / Negative Tests

- [ ]  Deep directory nesting → enforce max depth
- [ ]  Huge file → skipped/excluded per policy
- [ ]  Malformed syntax files → indexer survives without crash

---

## 6) Build Executor

### Threats Considered

- [ ]  Command injection via arguments/paths
- [ ]  Running untrusted executables
- [ ]  Environment drift / missing tools
- [ ]  Infinite build hangs (timeout)
- [ ]  Uncontrolled network activity (package restore)

### Trust Boundary (Inputs/Outputs)

- [ ]  Inputs: validated build config + project root
- [ ]  Outputs: process execution result + logs

### Validation Rules

- [ ]  Resolve tool from explicit config first, then deterministic detection.
- [ ]  Working directory must be project root.
- [ ]  Arguments must be constructed from trusted templates (no raw concatenation).
- [ ]  Timeout enforced and kills process.

### Graceful Degradation Behavior

- [ ]  Tool not found → BLD-001; suggest installation steps; retry after delay if tool path changes.
- [ ]  Timeout → BLD-004; retry with extended timeout (up to 3 times).
- [ ]  Non-zero exit → BLD-002 (or classified) with clear remediation; auto-retry if transient error detected (network, lock contention).

### Logging / Redaction

- [ ]  Capture stdout/stderr locally.
- [ ]  Redact secrets from environment and logs.
- [ ]  Do not upload logs automatically.

### Fuzz / Negative Tests

- [ ]  Build tool missing → correct error and recovery
- [ ]  Build hangs → timeout triggers kill
- [ ]  Malicious project path with special characters → no command injection

---

---

## 7) Shell Executor *(New in V2)*

### Threats Considered

- [ ]  Command injection via arguments/paths
- [ ]  Path traversal to escape sandbox
- [ ]  Blocklisted command bypass
- [ ]  Resource exhaustion (CPU, memory, time)
- [ ]  Symlink escape from project root
- [ ]  Environment variable leakage

### Trust Boundary (Inputs/Outputs)

- [ ]  Inputs: AI-requested commands (untrusted), user-requested commands (semi-trusted)
- [ ]  Outputs: Process execution result + logs

### Validation Rules

- [ ]  Command parsed and normalized before execution.
- [ ]  Blocklist checked first (always deny dangerous commands).
- [ ]  Allowlist checked second (allow known-safe commands).
- [ ]  Path arguments validated against project root.
- [ ]  Working directory locked to project root.
- [ ]  Environment isolated (minimal, clean).

### Graceful Degradation Behavior

- [ ]  Unknown command in PROFILE-DEV → CONFIRM.
- [ ]  Unknown command in PROFILE-FULL-AUTO → ALLOW (if not blocked).
- [ ]  Resource limit exceeded → kill process immediately.
- [ ]  Path traversal detected → DENY (no retry).

### Logging / Redaction

- [ ]  Log command, args, exit code, duration (not full output by default).
- [ ]  Scan output for secrets before logging.
- [ ]  Full output available in-memory only during operation.

### Fuzz / Negative Tests

- [ ]  Command with `../` in path → rejected
- [ ]  Blocklisted command (e.g., `format`) → rejected
- [ ]  Command exceeding CPU limit → killed
- [ ]  Command with secret in output → redacted in logs

---

## 8) Self-Upgrade Pipeline *(New in V2)*

### Threats Considered

- [ ]  Unauthorized self-modification
- [ ]  Hot-patching running binary
- [ ]  Modifying security/policy/audit code
- [ ]  Signature bypass for external upgrades
- [ ]  Incomplete upgrade leaving corrupt state

### Trust Boundary (Inputs/Outputs)

- [ ]  Inputs: Upgrade plan (from AI or version check), signed artifacts (from approved sources)
- [ ]  Outputs: New binary, rollback capability

### Validation Rules

- [ ]  Self-upgrade blocked in PROFILE-SAFE and PROFILE-DEV.
- [ ]  Even PROFILE-FULL-AUTO requires explicit `self_upgrade_enabled: true`.
- [ ]  All upgrades flow through Gate Pipeline (never self-authorizing).
- [ ]  Signature validation required for external upgrades.
- [ ]  Forbidden modifications checked before application.

### Graceful Degradation Behavior

- [ ]  Build failure → rollback to previous version.
- [ ]  Integrity check failure → rollback.
- [ ]  Startup failure after upgrade → automatic rollback.
- [ ]  Self-test failure → automatic rollback.

### Logging / Redaction

- [ ]  Log upgrade trigger, type, version change, result.
- [ ]  Log approval source (policy rule or user).
- [ ]  Log rollback if performed.

### Fuzz / Negative Tests

- [ ]  Attempt self-upgrade in PROFILE-SAFE → rejected
- [ ]  Attempt to modify security code → rejected with alert
- [ ]  Upgrade with invalid signature → rejected
- [ ]  Simulate startup failure → automatic rollback

---

## 9) Policy Engine / Gate Pipeline *(New in V2)*

### Threats Considered

- [ ]  Gate bypass via code path
- [ ]  Policy rule manipulation
- [ ]  Profile switch during operation
- [ ]  Decision logging tampering

### Trust Boundary (Inputs/Outputs)

- [ ]  Inputs: Action request, active profile, policy rules
- [ ]  Outputs: ALLOW/DENY/CONFIRM decision, audit log entry

### Validation Rules

- [ ]  All actions flow through Gate Pipeline (no bypass).
- [ ]  Gates evaluated in strict priority order.
- [ ]  Security Gate always runs first.
- [ ]  Profile cannot change mid-operation.
- [ ]  Every decision logged.

### Graceful Degradation Behavior

- [ ]  Unknown gate result → DENY (fail-closed).
- [ ]  Policy evaluation error → DENY (fail-closed).
- [ ]  No retry for security violations.

### Logging / Redaction

- [ ]  Log every gate evaluation with result.
- [ ]  Log final decision with deciding gate.
- [ ]  Log approval source (user vs policy).
- [ ]  Log active profile.

### Fuzz / Negative Tests

- [ ]  Attempt action without gate evaluation → not possible
- [ ]  Attempt profile switch mid-operation → blocked
- [ ]  All gates return unknown → DENY

---

## Review Completion Checklist (Meta)

- [ ]  All global rules G0–G6 reviewed for each subsystem.
- [ ]  All "Fail" items have linked issues or fixes.
- [ ]  At least one negative test exists per threat category.
- [ ]  Review results are stored locally and referenced in release readiness.
- [ ]  **V2 subsystems (Shell Executor, Self-Upgrade, Policy Engine) included.** *(New in V2)*