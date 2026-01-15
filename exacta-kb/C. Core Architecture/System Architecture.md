# System Architecture

This document describes the high-level architecture of Exacta App Studio, including major components, their responsibilities, and data flow.

---

## Component Overview

Exacta App Studio consists of six major components:

1. **Chat UI** — User interface for input and feedback
2. **Orchestrator** — Central state machine controlling execution flow
3. **Project Indexer** — Maintains structured knowledge of the codebase
4. **AI Interface** — Abstraction layer for AI provider communication
5. **File Gateway** — Controlled file system access with safety guarantees
6. **Build Executor** — Invokes local toolchains for compilation and packaging

---

## Component Responsibilities

### Chat UI
**Purpose:** Capture user intent and display system state.

**Responsibilities:**
- Accept natural language input from the user
- Display plans for approval
- Display diffs for review
- Show execution progress and errors
- Queue new intents during execution

**Does NOT:**
- Parse or interpret user input (delegated to AI Interface)
- Control execution (delegated to Orchestrator)
- Access files directly (delegated to File Gateway)

---

### Orchestrator
**Purpose:** Central authority for execution flow.

**Responsibilities:**
- Maintain the current execution state
- Enforce state transitions via explicit transition tables
- Coordinate between all other components
- Enforce approval gates
- Handle cancellation and pause requests
- Persist state for crash recovery

**Does NOT:**
- Generate plans (delegated to AI Interface)
- Write files (delegated to File Gateway)
- Make decisions about code content

**Authority Invariant:** The Orchestrator is the sole component permitted to mutate system state. All state transitions, file write authorizations, and execution decisions flow through the Orchestrator. No other component may initiate state changes independently.

---

### Project Indexer
**Purpose:** Maintain structured knowledge of the codebase.

**Responsibilities:**
- Scan and index the file tree
- Parse source files to AST level (where tooling exists)
- Maintain symbol tables (types, methods, properties)
- Track file hashes for drift detection
- Watch for external file changes
- Provide context resolution for AI calls

**Does NOT:**
- Modify files
- Make decisions about what to edit
- Communicate with AI directly

---

### AI Interface
**Purpose:** Abstraction layer for AI provider communication.

**Responsibilities:**
- Manage provider configuration and capability matrix
- Inject API keys at runtime (never log, never persist)
- Format prompts for intent extraction, planning, and diff generation
- Parse and validate AI responses
- Handle rate limiting and retries
- Enforce token limits

**Does NOT:**
- Store conversation history
- Execute any actions
- Access files directly

**Trust Boundary:** AI responses are treated as untrusted input. Every AI output (intent, plan, diff, code) must pass through deterministic validation before any action is taken. The AI Interface is a conduit, not an authority.

---

### File Gateway
**Purpose:** Controlled, safe file system access.

**Responsibilities:**
- Enforce project root jail
- Apply path allow/deny rules
- Validate file hashes before writes
- Perform atomic writes (temp file + rename)
- Maintain rollback stack
- Log all file operations

**Does NOT:**
- Decide what to write (receives instructions from Orchestrator)
- Communicate with AI
- Make policy decisions

---

### Build Executor
**Purpose:** Invoke local toolchains.

**Responsibilities:**
- Detect build tool from project configuration
- Invoke build commands (dotnet, msbuild, etc.)
- Capture build output (stdout, stderr, exit code)
- Classify errors (code vs environment)
- Invoke installer generators (NSIS, WiX, Inno Setup)

**Does NOT:**
- Modify source files
- Make decisions about build order
- Retry builds without Orchestrator instruction

---

## Data Flow

### Intent to Execution Flow
```
User Input

│

▼

[Chat UI] ─── raw text ───▶ [Orchestrator]

│

▼

[AI Interface] ─── intent request ───▶ AI Provider

│

◀─── intent response ───

│

▼

[Orchestrator] validates intent

│

▼

[Project Indexer] ─── provides context

│

▼

[AI Interface] ─── plan request ───▶ AI Provider

│

◀─── plan response ───

│

▼

[Orchestrator] validates plan

│

▼

[Chat UI] ─── displays plan for approval

│

▼

User approves

│

▼

[Orchestrator] begins execution
```

### Execution Flow (per step)
```
[Orchestrator] ─── step context request ───▶ [Project Indexer]

│

◀─── relevant files/symbols ───

│

▼

[Orchestrator] ─── diff request ───▶ [AI Interface] ───▶ AI Provider

│

◀─── unified diff ───

│

▼

[Orchestrator] validates diff

│

▼

[File Gateway] ─── applies diff atomically

│

▼

[Build Executor] ─── syntax validation

│

▼

[Orchestrator] ─── next step or complete
```

---

## Separation of Concerns

### AI (Reasoning) vs System (Execution)

| Responsibility | Owner |
| --- | --- |
| Interpret user intent | AI Interface |
| Generate plan steps | AI Interface |
| Generate code diffs | AI Interface |
| **Validate** intent | Orchestrator |
| **Validate** plan | Orchestrator |
| **Validate** diffs | Orchestrator + File Gateway |
| **Execute** file writes | File Gateway |
| **Execute** builds | Build Executor |
| **Control** execution order | Orchestrator |
| **Approve** execution | User (via Chat UI) |

**Critical rule:** AI never directly triggers execution. AI outputs are always validated by deterministic system logic before any action is taken.

### State Preconditions
**Invariant:** Each state transition requires the system to be in a specific Orchestrator state; otherwise the request is rejected.
- Intent extraction requires: `Idle` state
- Plan generation requires: `ExtractingIntent` completed successfully
- Execution requires: `AwaitingApproval` with explicit user approval
- File writes require: `Executing` state with valid plan step

Out-of-order requests are rejected, not queued. This prevents race conditions and ensures deterministic execution flow.

---

## Component Isolation
Components communicate only through defined interfaces:
- **Chat UI ↔ Orchestrator:** Commands and state updates
- **Orchestrator ↔ AI Interface:** Structured requests and validated responses
- **Orchestrator ↔ Project Indexer:** Context queries and index updates
- **Orchestrator ↔ File Gateway:** Write instructions and confirmations
- **Orchestrator ↔ Build Executor:** Build commands and results

No component may bypass the Orchestrator to communicate with another component directly.

---

## Hard Invariants
This component enforces the following Global System Invariants:
- **INV-GLOBAL-1: Local-Only Execution**
- **INV-GLOBAL-2: Deterministic Orchestration**
- **INV-GLOBAL-3: Fail-Closed Behavior**
- **INV-GLOBAL-4: AI Treated as Untrusted Input**
- **INV-GLOBAL-5: User-Owned API Keys**
- **INV-GLOBAL-6: No Telemetry