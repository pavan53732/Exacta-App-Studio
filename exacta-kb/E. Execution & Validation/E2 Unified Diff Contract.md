# E2. Unified Diff Contract

This document defines the **strict diff format** accepted by the Safe Execution Engine and the **safety gates** applied at the diff level.

---

## Format Rules

The system accepts ONLY strict Unified Diff format.

1. **Header:** Must use `--- a/path` and `+++ b/path`.
2. **Hunks:** Must use `@@ -start,count +start,count @@`.
3. **Context:** Minimum 3 lines of context required.
4. **No Decoration:** Markdown fences (`), git headers, or "Here is the diff" text are **forbidden**.
5. **Sentinel:** If no changes are needed, AI must output exactly: `NO_CHANGES_REQUIRED`.

---

## Safety Gates (Diff Level)

- **Binary Files:** Modifications to binary files (images, compiled libs) via diff are **REJECTED**.
- **Path Traversal:** Paths containing `../` or absolute paths (e.g. `/etc/passwd`) are **REJECTED**.
- **Encoding:** Output MUST be UTF-8.