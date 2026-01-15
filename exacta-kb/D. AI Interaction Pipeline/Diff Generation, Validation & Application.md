# Diff Generation, Validation & Application

This document specifies the **diff generation contract**, **validation rules**, and **atomic application semantics** for Exacta App Studio.

---

## Purpose
Diffs are the mechanism by which file changes are proposed, validated, and applied. This document defines the diff format, validation requirements, and application guarantees.

---

## Diff Format Contract

### Unified Diff Specification
All diffs MUST conform to the Unified Diff format (RFC-compatible):

```

--- a/path/to/file.cs

+++ b/path/to/file.cs

@@ -10,6 +10,7 @@

context line

context line

-removed line

+added line

context line

```

### Required Elements

| Element | Format | Required |
| --- | --- | --- |
| **Source path** | `--- a/relative/path` | Yes |
| **Target path** | `+++ b/relative/path` | Yes |
| **Hunk header** | `@@ -start,count +start,count @@` | Yes |
| **Context lines** | Unprefixed lines | Yes (minimum 3) |
| **Removal lines** | `-` prefixed | If applicable |
| **Addition lines** | `+` prefixed | If applicable |

---

## Diff Validation Rules

### Syntax Validation

| Rule ID | Rule | Failure Behavior |
| --- | --- | --- |
| **DV-1** | Diff MUST be valid unified diff format | Reject diff; report parse error |
| **DV-2** | Hunk line counts MUST be accurate | Reject diff; report count mismatch |
| **DV-3** | Context lines MUST match source file | Reject diff; report context mismatch |
| **DV-4** | Encoding MUST be UTF-8 without BOM | Reject diff; report encoding error |

### Security Validation

| Rule ID | Rule | Failure Behavior |
| --- | --- | --- |
| **DS-1** | Paths MUST be relative (no absolute paths) | Reject diff; report absolute path |
| **DS-2** | Paths MUST NOT contain traversal sequences (`..`) | Reject diff; report traversal attempt |
| **DS-3** | Paths MUST be within project sandbox | Reject diff; report sandbox violation |
| **DS-4** | Content MUST NOT contain NUL bytes | Reject diff; report binary content |
| **DS-5** | Diff MUST NOT be wrapped in markdown fences | Reject diff; report format violation |

### Semantic Validation

| Rule ID | Rule | Failure Behavior |
| --- | --- | --- |
| **DM-1** | Target file MUST exist for modifications | Reject diff; report missing file |
| **DM-2** | Target file MUST NOT exist for creations | Reject diff; report existing file |
| **DM-3** | Hunks MUST apply cleanly (no fuzz) | Reject diff; report apply failure |

---

## Special Sentinels

### NO_CHANGES_REQUIRED
When the AI determines no file changes are needed:

```

NO_CHANGES_REQUIRED

```

**Recognition rules:**
- Exact string match (case-sensitive)
- No leading/trailing whitespace
- No surrounding text or formatting

---

## Application Semantics

### Atomic Application Guarantee
> **INV-DIFF-1: All-or-Nothing**  
> Diff application is atomic. Either all hunks in all diffs apply successfully, or no changes are made to the filesystem.

### Application Process

```

1. Create backup snapshot of all target files
2. Validate all diffs (syntax, security, semantic)
3. Verify all diffs apply cleanly (dry run)
4. Apply all diffs to working copies in memory
5. Run syntax validation on modified content
6. Write all changes to filesystem atomically
7. Verify written content matches expected
8. On any failure: restore from backup snapshot

```

### Rollback Guarantee
> **INV-DIFF-2: Always Reversible**  
> Every successful diff application creates a rollback point. Users can undo to any previous state.

---

## Pre-Apply Validation

Before applying diffs, the system performs:

| Check | Purpose |
| --- | --- |
| **File hash verification** | Ensure file hasn't changed since diff generation |
| **Lock acquisition** | Ensure exclusive access to target files |
| **Disk space check** | Ensure sufficient space for backup + changes |
| **Permission check** | Ensure write access to all targets |

---

## Post-Apply Validation

After applying diffs, the system performs:

| Check | Purpose |
| --- | --- |
| **Syntax validation** | Parse modified files to verify syntax |
| **Hash verification** | Verify written content matches expected |
| **Build check** | Optionally verify project still builds |

---

## Invariants

> **INV-DIFF-3: No Partial Application**  
> If any diff in a set fails validation or application, no diffs in that set are applied.

> **INV-DIFF-4: Deterministic Application**  
> Applying the same diff to the same file content always produces the same result.

> **INV-DIFF-5: Fail-Closed Parsing**  
> If a diff cannot be parsed unambiguously, it is rejected. The parser never guesses intent.

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

## Does / Does Not

| **System DOES** | **System DOES NOT** |
| --- | --- |
| Validate all diffs before applying any | Apply diffs incrementally |
| Create backup before every apply | Overwrite without backup |
| Reject diffs with path traversal | Normalize suspicious paths |
| Require exact context match | Apply with fuzz factor |
| Rollback on any failure | Leave partial changes on error |