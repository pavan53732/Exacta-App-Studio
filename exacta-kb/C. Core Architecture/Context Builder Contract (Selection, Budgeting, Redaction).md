# Context Builder Contract (Selection, Budgeting, Redaction)

## Purpose
Specify how context is assembled for AI calls in a deterministic, auditable way.

The Context Builder is a **security boundary** and a **determinism boundary**:
- It decides what the AI can see.
- It must be reproducible and explainable.
- It must never silently truncate or leak secrets.

---

## Scope
This contract applies to any AI call that consumes project context, including:
- intent extraction (limited project metadata only)
- plan generation
- diff generation
- regeneration after failures (context mismatch, syntax error, plan invalidation)

---

## Inputs

### Required Inputs
- `intent` (may be null for some system calls)
- `plan_step` (required for diff generation; optional for intent/plan phases)
- `project_index` (file tree, symbols, dependency graph, hashes)
- `constraints` (system, project, session, user)
- `token_budget` (model max input, output max, reserve, soft threshold)
- `project_root` and sandbox rules (allow/deny)

### Optional Inputs
- `active_file` (currently open file in UI, if applicable)
- `user_selected_targets` (explicit file/symbol selection if disambiguation occurred)
- `last_error` (for retries; e.g., syntax error details)

---

## Outputs

### Context Bundle (Canonical Output)
The Context Builder MUST produce:

1) `context_bundle` (ordered, typed blocks)
2) `context_manifest` (metadata for audit and reproducibility)
3) `redaction_report` (what was excluded and why)
4) `budget_report` (token accounting and decisions)

---

## Canonical Data Schemas (V1)

### ContextBlock
```

{

"block_id": "uuid",

"block_type": "system|constraints|project_meta|file|symbol|diff_hint|error_context",

"priority": "P0|P1|P2|P3",

"title": "string",

"content": "string",

"meta": {

"path": "relative/path/or-null",

"symbol": "string-or-null",

"hash": "sha256-or-null",

"encoding": "utf-8|utf-16le|utf-16be|ascii|windows-1252|unknown",

"byte_size": 0,

"line_count": 0,

"source": "index|filesystem|user|system"

}

}

```

### ContextBundle
```

{

"bundle_id": "uuid",

"bundle_version": 1,

"created_at": "ISO-8601",

"purpose": "intent|plan|diff",

"correlation_id": "uuid",

"model": {

"provider": "string",

"model": "string",

"max_input_tokens": 100000,

"max_output_tokens": 16000,

"response_token_reserve": 4000,

"soft_limit_threshold_pct": 80

},

"blocks": [ "ContextBlock..." ]

}

```

### ContextManifest
```

{

"bundle_id": "uuid",

"correlation_id": "uuid",

"purpose": "intent|plan|diff",

"selection": {

"target_files": ["string"],

"target_symbols": ["string"],

"included_files": [

{

"path": "string",

"hash": "sha256",

"encoding": "string",

"byte_size": 0,

"reason": "target|dependency|interface|caller|base_type|config|user_selected"

}

],

"excluded_candidates": [

{

"path": "string",

"reason": "deny_rule|binary|too_large|token_budget|outside_sandbox|secret_risk|duplicate"

}

]

},

"fingerprints": {

"project_index_fingerprint": "sha256",

"config_fingerprint": "sha256",

"bundle_fingerprint": "sha256"

}

}

```

### RedactionReport
```

{

"bundle_id": "uuid",

"redactions": [

{

"type": "path_excluded|pattern_redacted|block_removed|content_sliced",

"target": "string",

"reason": "secret|deny_rule|budget|binary|policy",

"details": "string"

}

]

}

```

### BudgetReport
```

{

"bundle_id": "uuid",

"estimated_input_tokens": 0,

"max_input_tokens": 0,

"soft_limit_tokens": 0,

"hard_limit_tokens": 0,

"reserve_output_tokens": 0,

"decision": "ok|warn_soft_limit|refuse_hard_limit",

"notes": ["string"]

}

```

---

## Determinism Rules (Hard)

### INV-CONTEXT-1: Stable Ordering
Blocks MUST be sorted deterministically by:
1. `priority` (P0 → P3)
2. `block_type` (fixed ordering list below)
3. deterministic key:
   - for files: `path` ascending (bytewise)
   - for symbols: `symbol` ascending
   - otherwise: `title` ascending

Block type ordering (when priority ties):
1. `system`
2. `constraints`
3. `project_meta`
4. `file`
5. `symbol`
6. `error_context`
7. `diff_hint`

### INV-CONTEXT-2: Same Inputs → Same Bundle
Given the same:
- project_index_fingerprint
- config_fingerprint
- intent + step (IDs + content)
- constraints (serialized canonical form)
- budget parameters

…the Context Builder MUST emit identical:
- selected files/symbols
- block ordering
- bundle_fingerprint

### INV-CONTEXT-3: No Silent Truncation
The system MUST NOT silently drop content to fit the model.
If context cannot fit:
- it MUST either apply defined slicing rules (below) OR
- it MUST refuse with an actionable error.

### INV-CONTEXT-4: Secrets Never Sent
Secret-bearing material MUST be excluded or redacted according to the rules below.
If the system cannot prove it has removed secrets, it MUST refuse.

---

## Budgeting Rules (Soft/Hard)

### Definitions
- `hard_limit_tokens` = `max_input_tokens - response_token_reserve`
- `soft_limit_tokens` = `floor(hard_limit_tokens * soft_limit_threshold_pct / 100)`

### Enforcement
- If estimated input ≤ soft_limit_tokens:
  - Decision = `ok`
- If soft_limit_tokens < estimated input ≤ hard_limit_tokens:
  - Decision = `warn_soft_limit`
  - Context Builder MAY proceed but MUST add a warning in `budget_report.notes`
- If estimated input > hard_limit_tokens:
  - Decision = `refuse_hard_limit`
  - MUST refuse (no best-effort truncation)

### Token Estimation
V1 token estimation may be approximate, but MUST be deterministic.
- The same text MUST estimate to the same token count within the same version.
- Estimator version MUST be recorded in `budget_report.notes`.

---

## Selection Algorithm (Deterministic)

### Step 0: Establish Candidates
Build a candidate set from:
- explicit target file(s) from plan step (highest priority)
- explicit target symbol(s) from plan step
- user_selected_targets (if present)
- index-derived related items (dependencies, interfaces, base types, callers)

### Step 1: Apply Hard Exclusions (Fail-Closed)
Reject any candidate that is:
- outside project root jail
- matched by deny rules
- binary
- unknown/unsupported encoding
- classified as "secret risk" (see Redaction rules)

Hard exclusions MUST appear in `excluded_candidates` with reason.

### Step 2: Rank Remaining Candidates
Rank score is deterministic and computed as:

- Base weights:
  - Target file: +100
  - Target symbol definition file: +90
  - Direct dependency of target symbol: +60
  - Interface/base type of target symbol: +55
  - Caller/callee one hop: +40
  - Config/build files relevant to step: +30
  - Everything else: +0

- Penalties:
  - File size penalty: `-min(30, floor(byte_size / 200_000))`
  - Distance penalty (graph hops > 1): `-10 * (hops - 1)`
  - Duplicate signal penalty: `-5` if already represented by another included block

Tie-breakers (in order):
1. higher score
2. lower hop distance
3. smaller byte_size
4. lexicographic `path`

### Step 3: Assemble Blocks by Priority
- P0 blocks (always included if they fit):
  - system block (rules for the call)
  - constraints block (active constraints in canonical form)
  - target file (full or sliced, per rules)
- P1 blocks:
  - direct dependencies (interfaces/base types)
  - symbol signatures needed for compilation
- P2 blocks:
  - callers/callees, secondary config files
- P3 blocks:
  - any optional context (normally omitted in V1)

### Step 4: Fit-to-Budget (Slicing Rules)
If the bundle exceeds budget, apply in this exact order:

1. Remove all P3 blocks
2. Remove P2 blocks in reverse-ranked order
3. Slice P1 blocks (see slicing)
4. Slice target file block (last resort, see slicing)
5. If still too large: refuse (hard limit)

---

## Slicing Rules (Deterministic)

### File Block Slicing Levels
A file block may be included as one of:
- `FULL_FILE`
- `TARGET_REGION_ONLY` (preferred when available)
- `SIGNATURES_ONLY`
- `SUMMARY_ONLY` (last resort; V1 SHOULD avoid unless absolutely necessary)

V1 default:
- For target file: `FULL_FILE` if within budget
- For non-target files: `SIGNATURES_ONLY` if needed to fit

### How to Slice Without Ambiguity
- `TARGET_REGION_ONLY` may only be used if `project_index` can provide:
  - start_line and end_line for the exact symbol(s) referenced
- `SIGNATURES_ONLY` means:
  - include type/method signatures only (no bodies)
- If index cannot provide reliable slicing boundaries:
  - do NOT guess
  - either include full file or exclude

All slicing actions MUST be written to `redaction_report` as `content_sliced`.

---

## Redaction / Exclusion Rules

### Never-Send Paths (Default Deny)
These paths MUST be excluded from AI context:
- `.git/**`
- `.vs/**`
- `**/bin/**`
- `**/obj/**`
- `node_modules/**`
- `packages/**`
- `**/*.pfx`
- `**/*.key`
- `**/*.pem`
- `**/*.env`

### Secret Patterns (Must Redact or Exclude)
The system MUST apply pattern scanning to any text that would be sent.
If a high-confidence secret pattern is detected, the system MUST:
- exclude the entire block OR
- redact the matched spans (only if redaction is deterministic and safe)

If uncertainty exists: refuse.

Examples of patterns (non-exhaustive):
- `BEGIN PRIVATE KEY`
- `BEGIN RSA PRIVATE KEY`
- `sk-` prefixed API keys (OpenAI-style)
- `Authorization: Bearer`
- `password=`, `api_key=`, `token=`

### Logging Restrictions
- Context Builder MUST NOT log file contents.
- It MAY log:
  - file paths (unless user disables)
  - hashes
  - sizes
  - selection reasons
  - redaction counts/types

---

## Failure Modes (Fail-Closed)

### REFUSE: ContextTooLarge
If required P0 blocks cannot fit within hard limit even after slicing:
- return refusal
- include `BudgetReport` with `refuse_hard_limit`
- advise user to narrow scope (choose file/symbol)

### REFUSE: SecretRisk
If a secret is detected and cannot be safely removed:
- refuse
- instruct user to move secrets out of project or add deny rules

### REFUSE: AmbiguousTarget
If step references a symbol name with multiple matches and no user selection:
- refuse
- present the disambiguation list (outside this document's scope)
- Context Builder must not guess

---

## Examples

### Good Example: Small Targeted Edit
Input:
- Step targets: `src/MainWindow.xaml`
- Constraints: MUST_NOT add dependencies
- Budget: within limits

Result:
- P0: system + constraints + full file
- P1/P2: none
- budget ok
- no redactions

### Good Example: Large Repo, Minimal Context
Input:
- Step targets: `Services/UserService.cs` and symbol `LoginAsync`
- Repo is huge

Result:
- P0: system + constraints + sliced TARGET_REGION_ONLY from `UserService.cs`
- P1: interface signatures only from `IUserService.cs`
- P2 removed due to budget
- budget warn_soft_limit or ok

### Bad Example: Secret in `.env`
Input:
- Candidate includes `.env`

Result:
- `.env` excluded by path rule
- redaction_report includes `path_excluded`
- If secrets also appear in target file: refuse SecretRisk

---

## Edge Cases (Required Behaviors)

1) Duplicate candidates:
- MUST dedupe by normalized relative path.

2) File changed between index and read:
- MUST prefer filesystem read as source-of-truth
- MUST update manifest hashes accordingly
- MUST not proceed if cannot read deterministically

3) Unsupported encoding:
- Exclude file and record reason.
- If target file is unsupported: refuse.

4) Binary detection uncertainty:
- If cannot determine reliably, treat as binary and exclude (fail-closed).

---

## Hard Invariants
This component enforces:
- **INV-GLOBAL-1: Local-Only Execution**
- **INV-GLOBAL-2: Deterministic Orchestration**
- **INV-GLOBAL-3: Fail-Closed Behavior**
- **INV-GLOBAL-4: AI Treated as Untrusted Input**
- **INV-GLOBAL-5: User-Owned API Keys**
- **INV-GLOBAL-6: No Telemetry**