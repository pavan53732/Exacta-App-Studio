# File System Safety and Diff Engine

This document defines how Exacta App Studio interacts with the file system. All file operations are designed to prevent data corruption and enable recovery.

---

## Project Root Jail

### Definition
The **project root** is the top-level directory containing the project configuration file. All file operations are restricted to this directory and its descendants.

### Enforcement
- All file paths are resolved to absolute paths
- All absolute paths are validated to be within the project root
- Any path that resolves outside the project root is **rejected**
- This includes paths that use `..` to escape the root

### Rejection Examples

| Path | Reason | Action |
| --- | --- | --- |
| `../other-project/file.cs` | Escapes project root | Rejected |
| `C:\Windows\System32\file.dll` | Absolute path outside root | Rejected |
| `src\..\..\passwords.txt` | Resolves outside root | Rejected |
| `\\server\share\file.cs` | Network path | Rejected |

---

## Path Allow/Deny Rules

### Default Rules
**Allowed by default:**
- All paths within project root
- Source files (`.cs`, `.xaml`, `.json`, `.xml`, etc.)
- Configuration files
- Resource files

**Denied by default:**
- Build output directories (`bin/`, `obj/`)
- Package directories (`packages/`, `node_modules/`)
- Hidden directories (`.git/`, `.vs/`)
- System directories
- Secrets directories (configurable)

### User Configuration
Users may customize rules via project configuration:

```
file_rules:
deny:
- "secrets/"
- "*.key"
- "*.pfx"
allow:
- "bin/custom-tool/"  # Override default deny
```

### Rule Evaluation Order
1. Check if path is within project root (reject if not)
2. Check explicit deny rules (reject if match)
3. Check explicit allow rules (allow if match)
4. Apply default rules

---

## Symlinks and Junctions

### Default Behavior
Symlinks and NTFS junctions are **not followed** by default.

### Rationale
- Symlinks can point outside the project root
- Following symlinks creates unpredictable behavior
- Symlinks complicate rollback and atomic operations

### Detection
Before any file operation:
1. Check if target is a symlink or junction
2. If yes, reject the operation
3. Log the rejection with explanation

### Circular Reference Protection
The file scanner detects circular references (symlink loops) and:
1. Stops traversal at the loop point
2. Logs a warning
3. Does not crash or hang

---

## Atomic Write Strategy

All file writes use an atomic strategy to prevent corruption.

### Write Process
```
1. Generate temp file path: {target}.tmp.{guid}
2. Acquire exclusive lock on target file
3. Write content to temp file
4. Flush to disk (fsync)
5. Verify temp file content (read back and compare hash)
6. Rename temp file to target (atomic on NTFS)
7. Release lock
8. Delete temp file if rename failed
```

### Failure Modes

| Failure Point | State After | Recovery |
| --- | --- | --- |
| Step 2 (lock) | No change | Retry or fail |
| Step 3 (write) | Temp file may exist | Delete temp, retry |
| Step 4 (flush) | Temp file exists | Delete temp, retry |
| Step 5 (verify) | Temp file exists | Delete temp, retry |
| Step 6 (rename) | Original unchanged | Delete temp, fail |
| Step 7 (unlock) | Success | None needed |

### Windows-Specific Considerations
- NTFS rename is atomic when source and destination are on same volume
- Exclusive lock prevents other processes from modifying during write
- Antivirus may interfere; retry with backoff if access denied

---

## Diff Format Requirements

Exacta App Studio uses **unified diff format** exclusively.

### Required Format
```
--- a/path/to/file.cs
+++ b/path/to/file.cs
@@ -10,7 +10,8 @@
context line
context line
-removed line
+added line
+added line 2
context line
context line
```

### Strict Requirements

| Requirement | Reason |
| --- | --- |
| Valid unified diff header | Parser validation |
| Relative paths only | Security |
| No `..` in paths | Prevent escape |
| Context lines must match | Verify correct location |
| Line counts must be accurate | Detect corruption |
| Trailing newline required | Prevent file corruption |
| No markdown fences | Parser clarity |
| UTF-8 encoding | Consistency |

### Rejected Formats
- Context diff
- Side-by-side diff
- Git diff with binary markers
- Diffs with ANSI color codes
- Diffs wrapped in markdown code blocks

---

## Fuzzy Patching

### Policy: No Fuzzy Patching
Exacta App Studio does **not** use fuzzy patch matching.

### Rationale
- Fuzzy matching can apply patches to wrong locations
- "Close enough" matches cause subtle bugs
- Fail-closed is safer than best-effort

### Behavior
If context lines do not match exactly:
1. Patch is rejected
2. Error is surfaced to user
3. Re-contextualization is offered (re-fetch file, regenerate diff)

### Single Retry
On context mismatch:
1. Re-read target file
2. Re-request diff from AI with fresh content
3. If second diff also fails: fail-closed, require user intervention

---

## Rollback Mechanisms

### Rollback Stack
Before any file modification, the original content is preserved:

```
RollbackEntry {
file_path: string
original_content: bytes
original_hash: SHA256
timestamp: datetime
plan_id: UUID
step_id: UUID
}
```

### Rollback Scope
- **Per-step:** Rollback a single step's changes
- **Per-plan:** Rollback all changes from a plan
- **No cross-plan rollback:** Each plan's rollback is independent

### Rollback Process
1. Read rollback entries for target scope (step or plan)
2. For each entry, in reverse order:
   - Verify current file hash (detect external changes)
   - If hash matches post-change: restore original content
   - If hash differs: conflict detected, require user resolution
3. Remove rollback entries after successful restore

### Persistence
- Rollback data is persisted to disk immediately after capture
- Rollback data survives app restart
- Rollback data is cleaned after:
  - Successful plan completion (configurable retention)
  - User explicitly discards
  - Retention limit reached

### Retention Limits
- Default: 10 most recent plans
- Configurable: 1-100 plans
- Oldest plans are compacted or discarded with warning

---

## Encoding Handling

### Detection
File encoding is detected via:
1. BOM (Byte Order Mark) if present
2. Explicit project configuration
3. Heuristic detection (fallback)

### Supported Encodings
- UTF-8 (with and without BOM)
- UTF-16 LE/BE
- ASCII
- Windows-1252 (legacy)

### Encoding Preservation
- Files are written in their original encoding
- Encoding is recorded in the rollback entry
- Encoding mismatch between diff and file: rejected

### Unsupported Encodings
If encoding cannot be determined or is unsupported:
1. File is marked as uneditable
2. AI is not asked to generate diffs for this file
3. User is informed

---

## Binary File Handling

### Detection
Binary files are detected via:
1. MIME type detection (magic bytes)
2. Presence of NUL bytes in first 8KB
3. File extension heuristics

### Policy
Binary files are **not editable** by the AI:
- No diffs generated for binary files
- No AI context includes binary content
- User is informed if an operation targets a binary file

### Supported Operations
Binary files may be:
- Created (copied from template)
- Deleted (with confirmation)
- Moved/renamed

Binary files may not be:
- Modified via diff
- Included in AI context

---

## File Locking

### Lock Acquisition
Before any write operation:
1. Attempt to acquire exclusive write lock
2. If lock fails: wait up to 5 seconds with backoff
3. If still locked: fail the operation

### Lock Conflicts
Common conflict scenarios:

| Scenario | Behavior |
| --- | --- | --- |
| File open in editor | Wait, then fail |
| File locked by build | Wait, then fail |
| File locked by antivirus | Wait, then fail |
| File locked by another process | Wait, then fail |

### User Guidance
On lock failure, the error message includes:
- Which file is locked
- Suggestion to close other applications
- Option to retry

---

## Long Path Support

### Windows Long Paths
Windows traditionally limits paths to 260 characters. Exacta App Studio:
- Enables long path support via manifest
- Uses `\\?\` prefix for paths approaching limit
- Warns user if paths exceed safe length

### Path Length Limits

| Limit | Value | Action |
| --- | --- | --- |
| Safe | < 200 chars | Normal operation |
| Warning | 200-259 chars | Warn user |

---

## Hard Invariants
This component enforces the following Global System Invariants:
- **INV-GLOBAL-1: Local-Only Execution**
- **INV-GLOBAL-2: Deterministic Orchestration**
- **INV-GLOBAL-3: Fail-Closed Behavior**
- **INV-GLOBAL-4: AI Treated as Untrusted Input**
- **INV-GLOBAL-5: User-Owned API Keys**
- **INV-GLOBAL-6: No Telemetry