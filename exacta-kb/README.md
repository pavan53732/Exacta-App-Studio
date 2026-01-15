# Exacta App Studio

Exacta App Studio is a local-only, safety-first AI application builder for Windows.
It uses deterministic orchestration to generate, validate, and apply code changes while treating AI output as untrusted input.

This is **not** an autonomous agent.
It is a controlled system that builds software *with guarantees*.

---

## Core Principles

Exacta App Studio is built on six non-negotiable principles:

1. **Local-Only Execution**  
   All indexing, planning, file operations, and builds run on the user’s machine.

2. **Deterministic Orchestration**  
   A strict state machine governs intent → plan → approval → execution.  
   No implicit actions. No hidden steps.

3. **Fail-Closed Behavior**  
   On ambiguity, mismatch, or validation failure, the system stops and asks.  
   It never guesses.

4. **AI Is Untrusted Input**  
   AI may suggest intent, plans, or diffs, but never executes anything directly.

5. **User-Owned API Keys**  
   Users configure their own AI providers and keys.  
   Keys are stored locally and never logged.

6. **No Telemetry**  
   No analytics, no tracking, no background uploads, no phone-home behavior.

---

## What This Tool Is
- A **desktop AI app builder**, not a cloud service
- A **deterministic system**, not a magic copilot
- A **code-aware editor**, not a chat wrapper
- A **single-user, local-first tool**

## What This Tool Is Not
- A web app builder
- A mobile app builder
- A cloud deployment platform
- A collaborative IDE
- An autonomous, self-executing agent

---

## How It Works (High Level)

1. **User input** is captured via chat UI
2. **Intent extraction** produces a structured intent with confidence
3. **Plan generation** produces explicit, ordered steps
4. **User approval** is required before execution
5. **Context resolution** selects only relevant files and symbols
6. **AI generates unified diffs**, not full files
7. **Diffs are validated** against the filesystem and hashes
8. **Changes are applied atomically**
9. **Build & validation** run locally
10. **Rollback** is available if anything fails

At no point does AI directly write files or run commands.

---

## Large Codebase Handling

Exacta App Studio does **not** rely on AI memory or massive context windows.

Instead, it maintains a **Project Index** that acts as system memory:
- File tree index (paths, hashes, metadata)
- AST-level parsing (C# via Roslyn; Rust planned)
- Symbol tables (types, methods, interfaces)
- Dependency graph (calls, inheritance, references)

Only **relevant context** is provided to AI for each operation.

---

## Safety Guarantees

- All file writes go through a **File Gateway** with:
  - Path jail enforcement
  - Atomic writes
  - Hash verification
  - Rollback support

- All AI output is validated:
  - Syntax checks
  - Diff format checks
  - Context matching
  - Plan-state enforcement

- Preview execution requires **explicit user acknowledgment** of sandbox limits.

---

## Supported Platforms (Initial Scope)
- **Windows 10 / 11**
- Desktop stacks:
  - WPF (.NET)
  - WinUI 3 (.NET)
  - WinForms
  - C++ Win32 (limited, advanced mode)

---

## Network Usage

The only permitted network calls are:
- User-initiated AI API requests to user-configured providers
- Optional documentation fetches (user-approved)

Any other network activity is treated as a **fatal error**.

---

## Sections
- [A. Product & Principles](A. Product & Principles/README.md)
- [B. Security & Trust](B. Security & Trust/README.md)
- [C. Core Architecture](C. Core Architecture/README.md)
- [D. AI Interaction Pipeline](D. AI Interaction Pipeline/README.md)
- [E. Execution & Validation](E. Execution & Validation/README.md)
- [F. Operations](F. Operations/README.md)
- [G. Roadmap](G. Roadmap/README.md)
- [H. Reference](H. Reference/README.md)