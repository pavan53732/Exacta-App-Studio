# E3. File System Safety & Atomic Writes

This document defines the **File Gateway** responsibilities and the **atomic write strategy** that prevents corruption.

---

## File Gateway

The **File Gateway** is the only component allowed to write to disk.

---

## Atomic Write Strategy

To prevent corruption during crashes or power loss:

1. **Lock:** Acquire exclusive lock on target file.
2. **Snapshot:** Read current content → Write to `.exacta/backups/{correlation_id}/`.
3. **Write Temp:** Apply diff to content → Write to `{filename}.tmp.{uuid}`.
4. **Verify:** Read back temp file → Check syntax/integrity.
5. **Rename:** Atomic move `{filename}.tmp` → `{filename}` (Replacing original).
6. **Unlock:** Release lock.

---

## Rollback Stack

Schema for rollback entries:

```tsx
interface RollbackEntry {
  correlation_id: UUID;
  step_id: UUID;
  file_path: string;
  backup_path: string; // Path to copy in .exacta/backups
  timestamp: string;
}
```

**Trigger:** On ANY failure during a multi-file apply, the system automatically walks the rollback stack for the current `correlation_id` in reverse order to restore state.