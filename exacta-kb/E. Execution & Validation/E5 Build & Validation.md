# E5. Build & Validation

This document defines how the system **validates results** after files are written.

---

## Build Executor

- **Tools:** Auto-detects `.sln` (MSBuild) or `.csproj` (dotnet build).
- **Isolation:** Runs in a child process. Captures `stdout`/`stderr`.
- **Timeout:** Enforces hard timeout (default 5m) to prevent hangs.

---

## Error Classification

The system distinguishes between:

| Error Type | Source | Recovery Strategy |
| --- | --- | --- |
| **Code Error** | Compilation fail, Syntax error | **Retryable.** Feed error to AI → Regenerate. |
| **Environment Error** | Missing SDK, Disk Full, Locked File | **Non-Retryable** (mostly). User intervention required. |
| **Logic Error** | Build succeeds, Test fails | **Retryable** (if tests enabled). |

---

## Preview Sandbox

- **Restriction:** Previews run on the local machine with User permissions.
- **Warning:** First-time preview requires explicit User Acknowledgment (files/network access).
- **Isolation:** NOT fully sandboxed (OS level). Users are warned "Code runs with your privileges."