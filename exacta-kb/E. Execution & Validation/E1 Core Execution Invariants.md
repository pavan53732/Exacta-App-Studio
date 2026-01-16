# E1. Core Execution Invariants

This document defines the **non-negotiable execution rules** that govern all file and build operations in Exacta App Studio.

---

## Hard Invariants

- **INV-EXEC-1: Project Root Jail** — All file operations MUST be contained within the project root. Paths resolving outside (via `..` or absolute paths) are rejected immediately.
- **INV-EXEC-2: Atomic Application** — Diffs apply atomically. Either all hunks in a set apply, or NONE apply. No partial state is ever left on disk.
- **INV-EXEC-3: No Fuzzy Patching** — Context lines in diffs must match the file on disk byte-for-byte (ignoring CRLF differences if normalized). "Close enough" is rejected.
- **INV-EXEC-4: Reversibility (Rollback)** — Every file modification creates a rollback snapshot. The system can always revert to the state before the last operation.
- **INV-EXEC-5: Local-Only Builds** — Build tools (dotnet, msbuild) are invoked locally. No code is sent to remote build servers.
- **INV-EXEC-6: Shell Sandbox** *(New in V2)* — Shell commands execute only within project root. Filtered by allowlist/blocklist. Resource-limited.
- **INV-EXEC-7: Auto-Rollback** *(New in V2)* — Autonomous execution failures trigger automatic rollback before user escalation.
- **INV-EXEC-8: System Path Immunity** *(New in V2.1)* — Core SHALL NOT execute, apply diffs to, or target any path defined as SYSTEM-OWNED under INV-GLOBAL-8, regardless of Project Root Jail. System Paths are untouchable even if technically "within project root."