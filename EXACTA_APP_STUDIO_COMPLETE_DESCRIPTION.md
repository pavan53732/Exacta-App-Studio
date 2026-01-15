# Exacta App Studio - Complete Description

Exacta App Studio is a **local-only, safety-first AI application builder** for Windows desktop applications that uses deterministic orchestration and intelligent memory management to build software with guarantees. It is NOT an autonomous agent — it cannot initiate actions, write files, execute commands, or make decisions without explicit user approval at defined gates.

## Project Structure

### Core Components


#### 1. Knowledge Base (`exacta-kb/`)
Comprehensive documentation organized into key domains:

**A. Product & Principles**
- Core principles and system invariants
- User contracts and mental models
- UI capability gating and blocking contracts
- Explicit non-goals and exclusions

**B. Security & Trust**
- AI trust boundaries and threat modeling
- Security, privacy, and local-only guarantees
- Secrets management and redaction rules
- Security review checklists for subsystems

**C. Core Architecture**
- System architecture and orchestration state machine
- Memory model for large codebase handling
- File system safety and diff engine
- IPC contracts and backend command surface
- Project configuration schema and storage layout

## Orchestrator States (Canonical)
The Orchestrator operates as a strict finite state machine.

### States
- `Idle`
- `ExtractingIntent`
- `Planning`
- `AwaitingApproval`
- `Executing`
- `Paused`
- `Failed`
- `Completed`
- `Cancelling`

### State Invariants
- The orchestrator is in exactly one state at any time.
- State changes only via defined transitions; any other transition is rejected.
- UI commands are validated against current state + gates

### Illegal Transitions
Any transition not explicitly defined is rejected (fail-closed).

### Terminal States
- Completed
- Failed


`Failed` requires user acknowledgment to return to `Idle`; `Completed` may return to `Idle` automatically or via user acknowledgment.

**D. AI Interaction Pipeline**
- AI provider capability matrix and contracts
- Intent extraction, planning, and model definitions
- Constraint modeling and propagation
- Diff generation, validation, and application
- Plan validation rules and approval semantics

## Plan Object Schema (V1)
A plan is a structured, immutable object.

### Plan Fields
- `id`, `version`, `createdAt`, `intent`, `steps`, `constraints`, `estimatedTokens`, `status`

### Step Fields
- `id`, `order`, `type` (`file_create | file_modify | file_delete`), `target` (file path), `description`, `dependencies`, optional `diff`

### Validation Rules
- Plan MUST have at least one step
- All step dependencies MUST reference existing steps
- Dependency graph MUST be acyclic
- All target paths MUST be within project sandbox
- Token estimate MUST be within budget
- Plan MUST satisfy all extracted constraints
- File modifications MUST not conflict
- Delete operations MUST not target files with pending modifications

**E. Execution & Validation**
- Build, validation, and preview systems
- Error taxonomy and recovery paths
- Canonical error code registry
- Failure modes and recovery mechanisms

## Audit Log Record Contract
Every auditable event MUST emit a record with the following fields:

- `timestamp`, `level`, `component`, `event`, `message`, `context`, `correlationId`, `sessionId`

### Redaction Rules
- User prompt text: NEVER logged
- API keys: NEVER logged
- File contents are never logged at INFO/WARN/ERROR; DEBUG/TRACE are disabled by default and may contain more detail

Missing required fields = fatal error.

## Failure Ownership Model
Failures are classified as:

### User Errors
- Invalid request
- Ambiguous target
- Missing approval

Action: Explain and request user input

### AI Errors
- Invalid diff
- Hallucinated symbols
- Schema violation

Action: Reject output, retry or re-plan

### System Errors
- IO failure
- Build tool missing
- Permission denied

Action: Abort execution, preserve rollback state

AI errors NEVER mutate system state.

**F. Operations**
- CLI contracts and exit codes
- Debugging, logging, and support workflows
- Diagnostic bundle format and redaction
- Installation, updates, and prerequisite enforcement
- Operational limits and guardrails

## Hard Resource Limits (V1)
- Max context tokens per AI call: configurable (default enforced)
- Max steps per plan: hard capped
- Max files modified per plan: hard capped
- Max rollback history: bounded by disk quota

Exceeding any hard limit causes explicit refusal with explanation.

## Versioning & Compatibility
- Knowledge Base documents are versioned
- Plans generated under one version are not replayed under incompatible versions
- Project index schema migrations are explicit and reversible

Silent migrations are forbidden.

**G. Roadmap**
- Phase planning and scope control
- Advanced mode and guardrail overrides (future)

**H. Reference**
- Comprehensive glossary and terminology
- Reference documentation

## 🧠 Memory Model - How Your App Handles Large Codebases

### AI Has NO Memory (By Design)
- **Stateless AI**: Each AI call is completely independent
- **No session memory**: AI doesn't remember previous conversations
- **No learning**: AI doesn't learn user preferences or patterns
- **Privacy guarantee**: No user data retained in AI systems

### What AI Never Receives
AI models never receive:
- Entire project snapshots
- File system paths outside the project root
- API keys or secrets
- Execution logs
- Build outputs
- Previous AI responses unless explicitly re-supplied

All AI input is constructed by the system and treated as untrusted output on return.

### Project Index = System Memory
Instead of relying on AI memory, your app maintains a **Project Index** — a structured, queryable database of the entire codebase:

1. **File Tree Index**
   - Complete map of project structure
   - File paths, types, sizes, timestamps
   - SHA-256 content hashes for drift detection
   - Detects external changes via file watchers and pre-operation hash verification

2. **AST (Abstract Syntax Tree) Parsing**
   - C# via Roslyn APIs (Rust planned via rust-analyzer)
   - Extracts: Namespaces, modules, type definitions, method signatures, properties, fields
   - Full code structure understanding

3. **Symbol Tables**
   - Queryable index of all named entities
   - Location tracking (file, line number, namespace)
   - Enables instant lookup: "Where is UserService defined?"

4. **Dependency Graph**
   - Relationship mapping: inheritance, interface implementation, method calls
   - Type references and file dependencies

### Context Resolution — Smart Memory Retrieval
When AI needs to generate code, it NEVER receives the entire codebase. Instead:

```
User Request: "Add error handling to login method"
         ↓
1. IDENTIFY TARGET
   - Query symbol table for "login" methods
   - Disambiguate if multiple matches
         ↓
2. GATHER RELEVANT CONTEXT
   - Target file content
   - Related symbols (interfaces, base classes)
   - Dependent files (if needed)
         ↓
3. ASSEMBLE CONTEXT WINDOW
   - Primary: Target file/symbol (always included)
   - Secondary: Direct dependencies (if space permits)
   - Tertiary: Indirect dependencies (summarized/omitted)
         ↓
4. VALIDATE FIT
   - If exceeds token limits: section-level slicing
   - Multi-call chunking with deterministic stitching
   - Refuse operation if still too large (never truncates silently)
         ↓
5. SEND TO AI
   - Only relevant context sent
   - AI generates precise unified diff
   - System validates and applies
```

## 🔒 Sandbox Creation - How Apps Are Built Safely

### Project Root Jail (File System Sandbox)
Every file operation is restricted to the project root directory:

```
Project Root: D:\MyApp\
         ↓
   ALLOWED ZONE
   ✅ D:\MyApp\src\file.cs
   ✅ D:\MyApp\config\app.json
         ↓
   FORBIDDEN ZONE
   ❌ D:\MyApp\..\OtherProject\file.cs  (escapes root)
   ❌ C:\Windows\System32\file.dll      (absolute path outside)
```

### Atomic Write Strategy (Prevents Corruption)
Every file write uses atomic operations:
1. Generate temp file: {target}.tmp.{guid}
2. Acquire exclusive lock on target
3. Write content to temp file
4. Flush to disk (fsync)
5. Verify temp file (read back, compare hash)
6. Rename temp → target (atomic on NTFS)
7. Release lock

### Preview Execution Sandbox
**What IS Isolated:**
- ✅ Working directory → Redirected to temp
- ✅ User data → Redirected to temp
- ✅ Configuration → Copied to temp

**What IS NOT Isolated:**
- ⚠️ Network access → Real network calls possible
- ⚠️ System registry → Partial isolation only
- ⚠️ Other processes → Can interact

### Rollback Stack (Time Machine for Code)
Before any file modification:
- Full file backup with SHA256 hash
- Timestamp and plan/step tracking
- Per-step and per-plan rollback capabilities
- Survives app restart
- Conflict detection for external changes

## 🔐 Security & Isolation Guarantees

### Network Isolation
Only 2 types of network calls allowed:
- AI API calls (user-initiated, user-configured)
- Documentation retrieval (optional, user-initiated)

**Enforcement Invariant:** Any other network call = FATAL ERROR

### API Key Security
- Encrypted in Windows Credential Manager
- Loaded into memory only when needed
- Cleared from memory immediately after use
- Never written to plain text files or logs

### Zero Telemetry Guarantee
**Not collected:** Usage statistics, performance metrics, user behavior, session info
**Not transmitted:** Crash reports, error logs, analytics, "phone home" pings

## ⚙️ Complete Workflow

### Single-Flight Execution Rule
Exacta App Studio executes only one plan at a time.
- New intents may be queued but not executed during an active run
- File writes are serialized
- State transitions are strictly linear

This prevents race conditions, overlapping diffs, and partial execution states.

```
1. USER INPUT
   "Add login button to MainWindow"
        ↓
2. INTENT EXTRACTION (AI)
   Type: AddFeature, Target: MainWindow.xaml
        ↓
3. CONTEXT RESOLUTION (System Memory)
   - Query Project Index for MainWindow
   - Load relevant files and types
   - Assemble minimal context window
        ↓
4. PLAN GENERATION (AI with Context)
   Step 1: Add Button to XAML
   Step 2: Add Click handler to code-behind
        ↓
5. USER APPROVAL (Required Gate)
   User reviews plan → Approves
        ↓
6. EXECUTION (Sandbox Protected)
   For each step:
     a. Capture original file (rollback stack)
     b. AI generates unified diff
     c. Validate diff format and context lines
     d. Check path safety (project root jail)
     e. Apply atomically (temp file → rename)
     f. Syntax validation (Roslyn parse)
     g. Update Project Index
        ↓
7. BUILD & VALIDATION
   - Invoke dotnet build (local)
   - Classify errors (code vs environment)
        ↓
8. PREVIEW (Optional, Approval Required)
   - Display sandbox limitations warning
   - User confirms understanding
   - Launch in isolated working directory
        ↓
9. ROLLBACK AVAILABLE
   - Any step can be undone
   - Entire plan can be reverted
```

## 🎯 Key Differentiators

### Memory Management
- ✅ Project Index acts as system memory (not AI memory)
- ✅ AST-level parsing for deep code understanding
- ✅ Selective context resolution (not massive context windows)
- ✅ Symbol tables & dependency graphs for precise targeting
- ✅ Drift detection via SHA-256 hashing

### Sandbox & Safety
- ✅ Project root jail (file system sandbox)
- ✅ Atomic writes (corruption prevention)
- ✅ Preview isolation (with explicit user acknowledgment)
- ✅ Rollback stack (time machine for code)
- ✅ Network isolation (only approved endpoints)
- ✅ No fuzzy matching (exact or reject)

### Deterministic Execution
- ✅ State machine orchestration (predictable behavior)
- ✅ Fail-closed design (stops on ambiguity)
- ✅ User approval gates (no autonomous actions)
- ✅ Complete auditability (every action logged)

### Capability Gating (Action-Level Safety)
User actions in Exacta App Studio are gated by explicit, named conditions evaluated by the Orchestrator (gating rules are defined in the KB).

- UI actions are enabled or disabled based on **Orchestrator state + safety gates**
- When blocked, the UI must display:
  - Blocking gate ID
  - Human-readable reason
  - Remediation steps
  - Retryability status

This ensures:
- No ambiguous UI behavior
- No “silent failures”
- Full transparency about *why* an action is unavailable

The UI is a safety layer only; the backend is authoritative and enforces the same gates fail-closed.

### Hard Limits & Refusal Conditions
Exacta App Studio will explicitly refuse operations when:
- Target symbols cannot be uniquely resolved
- Context exceeds hard token budgets after slicing
- Files drift since plan creation
- Path safety checks fail
- Diff context does not match current file content
- Required approval gates are not satisfied

The system never guesses, truncates silently, or applies “best effort” changes.

## 📊 Supported Capabilities

### Intent Types (V1)
- **CreateProject** — Initialize from template (WPF, WinUI, WinForms)
- **AddFeature** — Add new functionality
- **FixBug** — Correct defects
- **BuildPackage** — Compile and generate installer

### Build Integration
- dotnet, msbuild support
- Installer generation (NSIS, WiX, Inno Setup)
- Error classification (code vs environment)
- Incremental builds supported

### Validation Layers
- **Syntax validation** (immediate, Roslyn-based)
- **Build validation** (compile-time errors)
- **Preview execution** (runtime testing)

## 🏗️ Architecture Components

- **Chat UI** — User interface
- **Orchestrator** — Central state machine (the "brain")
- **Project Indexer** — System memory (AST, symbols, dependencies)
- **AI Interface** — Provider abstraction (stateless)
- **File Gateway** — Sandbox enforcement (atomic writes, rollback)
- **Build Executor** — Local toolchain invocation

**Critical Rule:** AI never directly executes anything. All AI outputs validated by deterministic system logic.

## ✨ In Summary

Exacta App Studio is a sophisticated, memory-aware, sandbox-protected AI assistant that:

- Uses a **Project Index** (not AI memory) to understand large codebases
- Employs **selective context resolution** to provide only relevant code to AI
- Enforces **project root jail** and atomic writes for file system safety
- Requires **explicit user approval** for preview execution with clear sandbox limitations
- Maintains a **rollback stack** for complete reversibility
- Guarantees **local-only execution** with zero telemetry
- Operates **deterministically** with fail-closed behavior

**Every action is transparent, auditable, and reversible. You maintain complete control while AI provides intelligent assistance.**

## 🚫 Explicit Non-Goals
Exacta App Studio is intentionally NOT designed to:
- Build mobile applications (iOS, Android)
- Build web applications (SPA, SSR, static sites)
- Build macOS, Linux, or cross-platform applications
- Sync projects to the cloud
- Store data on remote servers
- Require an account or login
- Collect telemetry or usage analytics
- Support multi-user editing or shared projects
- Run autonomous background agents
- Execute plans without user approval
- Learn from user behavior
- Support plugins or extensions

These exclusions are deliberate to preserve safety, predictability, and user control.
