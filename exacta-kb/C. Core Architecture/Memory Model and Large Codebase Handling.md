# Memory Model and Large Codebase Handling

This document explains how Exacta App Studio manages context and edits the correct files in large codebases, without relying on AI memory or loading entire projects into context.

---

## Why AI Has No Persistent Memory

AI models used by Exacta App Studio are stateless by design:
- **No session memory:** Each AI call is independent
- **No user memory:** AI does not learn user preferences
- **No project memory:** AI does not remember previous edits

**Rationale:**
1. **Predictability:** Stateless AI produces consistent behavior across sessions
2. **Privacy:** No user data is retained in AI systems
3. **Control:** The system controls what information AI receives
4. **Auditability:** Every AI input can be logged and reproduced

---

## Project Index as System Memory

Instead of relying on AI memory, Exacta App Studio maintains a **Project Index** — a structured, queryable representation of the codebase.

The Project Index is the system's memory. It is:
- **Deterministic:** Built from source files using defined rules
- **Auditable:** Can be inspected and verified
- **Updateable:** Refreshed when files change
- **Selective:** Provides only relevant context to AI

---

## Project Index Components

### 1. File Tree Index
A complete map of the project structure:
- File paths (relative to project root)
- File types (source, config, resource, generated)
- File sizes
- Last modified timestamps
- Content hashes (SHA-256)

**Purpose:** Know what files exist and detect external changes.

---

### 2. AST Parsing
For supported languages (C#, and later Rust), source files are parsed to Abstract Syntax Tree (AST) level using language tooling:
- **C#:** Roslyn APIs
- **Rust (future):** rust-analyzer

AST parsing extracts:
- Namespaces and modules
- Type definitions (classes, structs, enums, interfaces)
- Method signatures and bodies
- Property definitions
- Field declarations
- Attribute/annotation usage

**Purpose:** Understand code structure, not just text.

---

### 3. Symbol Tables
A queryable index of all named entities:

| Symbol Type | Indexed Data |
| --- | --- |
| Type | Name, kind, file, line, namespace |
| Method | Name, parameters, return type, containing type |
| Property | Name, type, containing type |
| Field | Name, type, containing type |
| Interface | Name, members, implementing types |

**Purpose:** Answer questions like "Where is UserService defined?" or "What methods does IAuthProvider have?"

---

### 4. Dependency Graph
Relationships between code elements:
- Type inheritance (class A extends class B)
- Interface implementation (class A implements interface B)
- Method calls (method A calls method B)
- Type references (method A uses type B)
- File dependencies (file A imports file B)

**Purpose:** Know what else might need to change when editing a symbol.

---

## Context Resolution

When AI needs to generate code, it does not receive the entire codebase. Instead, the system performs **context resolution**.

### Step 1: Identify Target
From the plan step, determine:
- Target file(s)
- Target symbol(s) (type, method, etc.)
- Operation type (add, modify, delete)

### Step 2: Gather Relevant Context
Query the Project Index for:
- Target file content
- Related symbols (interfaces, base classes, callers)
- Dependent files (if cross-file edit)
- Relevant types and signatures

### Step 3: Assemble Context Window
Combine gathered context into a prompt, respecting token limits:
- Primary: Target file/symbol (always included)
- Secondary: Direct dependencies (included if space permits)
- Tertiary: Indirect dependencies (summarized or omitted)

### Step 4: Validate Fit
If context exceeds token limits:
1. First fallback: Section-level slicing (include only relevant methods)
2. Second fallback: Multi-call chunking with deterministic stitching
3. Final fallback: Refuse operation with explanation

The system never truncates silently.

---

## Retrieval vs Recall

| Approach | Description | Used By |
| --- | --- | --- |
| **Recall** | AI remembers from training or session | Not used |
| **Retrieval** | System fetches and provides relevant context | Exacta App Studio |

Retrieval is explicit and controlled. The system decides what AI sees.

---

## Why Large Context Windows Alone Fail

Modern AI models support large context windows (100k+ tokens). Why not just load the entire project?

### Problems with Large Context
1. **Noise:** Irrelevant code dilutes attention on the target
2. **Cost:** Token usage scales linearly with context size
3. **Latency:** Larger prompts take longer to process
4. **Hallucination:** More context increases chances of confusion
5. **Limits:** Even large windows have limits; 100k tokens is roughly 75k lines

### Selective Context Advantages
1. **Precision:** AI focuses on exactly what's needed
2. **Efficiency:** Lower token usage, faster responses
3. **Accuracy:** Less noise, fewer hallucinations
4. **Scalability:** Works on projects of any size

---

## Patch/Diff-Based Editing

Exacta App Studio uses **unified diffs** for code modifications, not full file rewrites.

### Why Diffs
1. **Precision:** Only changed lines are specified
2. **Validation:** Diffs include context lines for verification
3. **Reversibility:** Diffs can be reversed for rollback
4. **Efficiency:** AI generates less output
5. **Safety:** Unintended changes are visible

### Diff Requirements
- Must be valid unified diff format
- Context lines must match actual file content
- No path traversal (`../`) in file paths
- No absolute paths
- No markdown fences or decorations
- Missing trailing newline: rejected

### Diff Lifecycle
```
AI generates diff

│

▼

Parser validates format

│

▼

Context lines verified against file hash

│

▼

Path safety checked

│

▼

Applied atomically via File Gateway

│

▼

Post-apply syntax validation

│

▼

Rollback available if needed
```

---

## Editing the Correct File

Given a request like "Add error handling to the login method," how does Exacta App Studio find the right file?

### Resolution Process
1. **Intent extraction:** Identify operation (modify), target (login method), constraint (add error handling)
2. **Symbol lookup:** Query symbol table for "login" methods
3. **Disambiguation:** If multiple matches, either:
   - Use context (current file, recent edits) to rank
   - Ask user to clarify
4. **Context assembly:** Load the file containing the target method, plus relevant dependencies
5. **Diff generation:** AI generates diff targeting the specific method
6. **Validation:** Verify diff applies to the correct location

### Ambiguity Handling
If the target is ambiguous (e.g., multiple "login" methods in different files):
- The system does not guess
- The system presents options to the user
- The user must explicitly select the target

---

## Index Maintenance

### Initial Build
On project open:
1. Scan file tree
2. Hash all source files
3. Parse supported files to AST
4. Build symbol tables
5. Construct dependency graph

### Incremental Updates
On file change (detected via watcher or before operation):
1. Invalidate affected file entries
2. Re-parse changed files
3. Update symbol table entries
4. Update dependency graph edges

### Drift Detection
Before applying any diff:
1. Re-check file hash
2. If hash changed since plan generation: reject diff, require re-planning

---

## Summary
Exacta App Studio handles large codebases by:
1. **Indexing** the codebase into queryable structures
2. **Resolving** context selectively for each operation
3. **Providing** only relevant context to AI
4. **Validating** AI outputs before applying
5. **Using diffs** instead of full file rewrites
6. **Detecting drift** to prevent stale edits

The AI is never trusted to "know" the codebase. The system always provides and verifies.

---

## Hard Invariants
This component enforces the following Global System Invariants:
- **INV-GLOBAL-1: Local-Only Execution**
- **INV-GLOBAL-2: Deterministic Orchestration**
- **INV-GLOBAL-3: Fail-Closed Behavior**
- **INV-GLOBAL-4: AI Treated as Untrusted Input**
- **INV-GLOBAL-5: User-Owned API Keys**
- **INV-GLOBAL-6: No Telemetry