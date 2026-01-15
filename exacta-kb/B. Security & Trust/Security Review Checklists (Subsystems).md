# Security Review Checklists (Subsystems)

## Purpose
Define repeatable, auditable security review checklists per subsystem.

A "security review" is complete only when:
- every checklist item is explicitly marked Pass/Fail/NA
- evidence is recorded (test case, log excerpt, code location)
- failures are either fixed or explicitly accepted with written rationale (rare)

---

## Global Rules (Apply to Every Subsystem)

### G0. Trust Model
- [ ] Identify all **untrusted inputs** to the subsystem (UI strings, AI output, filesystem content, network responses).
- [ ] Identify all **trusted inputs** (compile-time constants, validated config, deterministic state).
- [ ] Confirm the subsystem treats AI output as **untrusted input** where applicable.

### G1. Fail-Closed
- [ ] On ambiguity, corruption, or validation failure, subsystem **refuses** or **halts** (no best-effort fallback).
- [ ] Error surfaced includes:
  - canonical error code
  - actionable recovery steps
- [ ] No silent retries beyond policy.

### G2. Determinism
- [ ] Given same inputs, subsystem output is deterministic.
- [ ] Ordering rules are explicit (no hash-map iteration ordering leaks).
- [ ] Any randomness is prohibited or explicitly controlled and logged.

### G3. Secrets / Redaction
- [ ] No secrets in logs.
- [ ] No secrets in IPC payloads.
- [ ] No secrets in diagnostic bundles.
- [ ] Verify redaction filters are applied before persistence/export.

### G4. Sandbox / Path Safety
- [ ] All paths are canonicalized.
- [ ] Project root jail enforced.
- [ ] No path traversal (`..`), no absolute paths, no UNC/network paths (unless explicitly allowed).

### G5. Resource Exhaustion
- [ ] Token limits enforced.
- [ ] File size and count limits enforced.
- [ ] Timeouts enforced.
- [ ] Memory bounds enforced or safe degradation applied.

### G6. Auditability
- [ ] Every mutation is logged with correlation id (without contents).
- [ ] Before/after or rollback information exists where mutation occurs.

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
- [ ] Prompt injection from project files
- [ ] Malformed JSON / schema violations from AI
- [ ] Oversized responses (resource exhaustion)
- [ ] Provider outages / timeouts / rate limits
- [ ] Model capability mismatch (streaming, JSON mode, token limits)
- [ ] Data exfiltration risk (sensitive code / secrets)

### Trust Boundary (Inputs/Outputs)
- [ ] Inputs to AI Interface are limited to:
  - validated context bundle
  - user request text
  - deterministic system state summary
- [ ] Outputs are treated as data only (never executed), and always validated.

### Validation Rules
- [ ] Response schema validation for intent/plan/diff is strict.
- [ ] Unknown fields are ignored only if safe; unknown required fields cause rejection.
- [ ] Response size limit enforced (truncate is NOT allowed unless explicitly specified; prefer refusal).

### Fail-Closed Behavior
- [ ] On parse failure → reject response and follow retry policy.
- [ ] On low confidence intent → do not proceed without user confirmation.
- [ ] On provider errors → no "fallback provider" in V1 unless explicitly configured.

### Logging / Redaction
- [ ] Full prompts are not logged by default.
- [ ] Full responses are not logged by default.
- [ ] API keys never logged and never passed into AI context.

### Fuzz / Negative Tests
- [ ] AI returns non-JSON where JSON expected → rejected
- [ ] AI returns JSON with missing fields → rejected
- [ ] AI returns huge output → rejected with Resource error
- [ ] AI suggests absolute paths / traversal → rejected downstream and reported clearly

---

## 2) Diff Parser

### Threats Considered
- [ ] Path traversal in diff headers
- [ ] Absolute paths / UNC paths
- [ ] Markdown fences / ANSI codes (parser confusion)
- [ ] NUL bytes / binary content injection
- [ ] Incorrect hunk counts (corruption)
- [ ] Multi-file diff where single-file expected

### Trust Boundary (Inputs/Outputs)
- [ ] Input: AI-produced diff text (untrusted)
- [ ] Output: parsed diff structure (trusted only after validation)

### Validation Rules
- [ ] Only unified diff accepted (exact spec).
- [ ] Reject if any forbidden constructs present.
- [ ] Verify context lines match file content exactly (no fuzz).
- [ ] Verify hunk line counts correct.
- [ ] Reject if trailing newline missing (if required by policy).
- [ ] Reject multi-file diffs (unless explicitly supported in that operation).

### Fail-Closed Behavior
- [ ] Parser never guesses; ambiguous diffs are rejected.
- [ ] No fuzzy patching.
- [ ] Single retry only where policy allows.

### Logging / Redaction
- [ ] Log diff metadata only (paths, counts, hashes) not full content by default.
- [ ] If full diff logging exists, it must be opt-in and stored locally only.

### Fuzz / Negative Tests
- [ ] Randomized diff headers (garbage) → rejected
- [ ] Diffs containing `..` in paths → rejected
- [ ] Diffs with `diff --git` headers → rejected
- [ ] Diffs with NUL bytes → rejected
- [ ] Incorrect hunk counts → rejected

---

## 3) File Gateway

### Threats Considered
- [ ] Write outside sandbox (path traversal, symlink escape)
- [ ] TOCTOU between validation and write
- [ ] Partial writes / corruption on crash/power loss
- [ ] File lock contention / antivirus interference
- [ ] Encoding corruption
- [ ] Rollback tampering or mismatch

### Trust Boundary (Inputs/Outputs)
- [ ] Inputs: validated diff structures + orchestrator authorization (trusted gate)
- [ ] Outputs: atomic filesystem mutations and rollback entries

### Validation Rules
- [ ] Canonicalize path, then verify within root.
- [ ] Deny rules enforced (bin/obj/.git/etc).
- [ ] Symlinks/junctions handled explicitly (default: do not follow).
- [ ] File hash verified before write (drift detection).
- [ ] Encoding preserved.

### Fail-Closed Behavior
- [ ] If hash mismatch → reject apply.
- [ ] If lock cannot be acquired → fail with actionable error.
- [ ] If atomic write cannot complete → rollback and fail.

### Logging / Redaction
- [ ] Log path + operation + before/after hash (not content).
- [ ] Rollback entries stored safely (no secrets introduced).
- [ ] No writes outside root even in debug builds.

### Fuzz / Negative Tests
- [ ] Attempt to write `../` path → blocked
- [ ] Attempt to write to `C:\Windows\...` → blocked
- [ ] Simulate lock held → fail with FS-005
- [ ] Simulate crash mid-write → verify atomicity guarantees

---

## 4) Orchestrator / State Machine

### Threats Considered
- [ ] Invalid state transitions (race conditions)
- [ ] Bypass of approval gate
- [ ] Out-of-order execution or duplicate step execution
- [ ] Resume without drift revalidation
- [ ] Cancellation during unsafe boundary

### Trust Boundary (Inputs/Outputs)
- [ ] Inputs: UI IPC requests, AI outputs (validated), filesystem/index signals
- [ ] Outputs: authorizations to File Gateway, Build Executor, and emitted events

### Validation Rules
- [ ] All transitions must be in transition table.
- [ ] Approval required before Executing.
- [ ] Step order must be enforced exactly.
- [ ] Dependencies (if unsupported in V1) must be rejected.

### Fail-Closed Behavior
- [ ] Any unexpected transition attempt → ST-001 fatal.
- [ ] Any ambiguity in allowed action → reject.

### Logging / Redaction
- [ ] Every transition logged with correlation id.
- [ ] Approval actions logged with timestamp (no secrets).

### Fuzz / Negative Tests
- [ ] Random IPC command sequence → must not reach illegal state
- [ ] Attempt Execute without approval → rejected
- [ ] Attempt Resume without passing drift checks → rejected

---

## 5) Project Indexer

### Threats Considered
- [ ] Symlink loops / traversal runaway
- [ ] Unbounded file counts / depth (resource exhaustion)
- [ ] Stale index leading to wrong edits
- [ ] Secret leakage via index content
- [ ] Parser crashes on malformed source files

### Trust Boundary (Inputs/Outputs)
- [ ] Inputs: filesystem contents (untrusted)
- [ ] Outputs: structured index metadata (trusted only after build rules)

### Validation Rules
- [ ] Enforce file limits (count, size, depth).
- [ ] Only index allowlisted file types.
- [ ] Binary detection enforced.
- [ ] Hashes computed deterministically.
- [ ] Any AST parsing failures handled without crashing.

### Fail-Closed Behavior
- [ ] If index is stale for a target file → drift check must block apply.
- [ ] If parsing is uncertain → degrade (e.g., signatures only) or skip with warning.

### Logging / Redaction
- [ ] Index logs contain file paths and hashes, not contents.
- [ ] Index never stores secrets (avoid indexing `.env`, `.pfx`, etc.).

### Fuzz / Negative Tests
- [ ] Deep directory nesting → enforce max depth
- [ ] Huge file → skipped/excluded per policy
- [ ] Malformed syntax files → indexer survives without crash

---

## 6) Build Executor

### Threats Considered
- [ ] Command injection via arguments/paths
- [ ] Running untrusted executables
- [ ] Environment drift / missing tools
- [ ] Infinite build hangs (timeout)
- [ ] Uncontrolled network activity (package restore)

### Trust Boundary (Inputs/Outputs)
- [ ] Inputs: validated build config + project root
- [ ] Outputs: process execution result + logs

### Validation Rules
- [ ] Resolve tool from explicit config first, then deterministic detection.
- [ ] Working directory must be project root.
- [ ] Arguments must be constructed from trusted templates (no raw concatenation).
- [ ] Timeout enforced and kills process.

### Fail-Closed Behavior
- [ ] Tool not found → BLD-001.
- [ ] Timeout → BLD-004.
- [ ] Non-zero exit → BLD-002 (or classified) with clear remediation.

### Logging / Redaction
- [ ] Capture stdout/stderr locally.
- [ ] Redact secrets from environment and logs.
- [ ] Do not upload logs automatically.

### Fuzz / Negative Tests
- [ ] Build tool missing → correct error and recovery
- [ ] Build hangs → timeout triggers kill
- [ ] Malicious project path with special characters → no command injection

---

## Review Completion Checklist (Meta)
- [ ] All global rules G0–G6 reviewed for each subsystem.
- [ ] All "Fail" items have linked issues or fixes.
- [ ] At least one negative test exists per threat category.
- [ ] Review results are stored locally and referenced in release readiness.