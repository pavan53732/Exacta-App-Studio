# E3. File System Safety & Atomic Writes

> **Document ID:** E3
> 

> **Version:** V2.2 (Hardened File Gateway)
> 

> **Status:** Canonical & Enforced
> 

This document defines the **File Gateway** responsibilities, **authority model**, **atomic write strategy**, and **rollback guarantees**.

> **Scope:** File system writes, backup integrity, path safety, approval binding
> 

> **Related:** E7 Shell Contract, E9 Containment, E10 Trust Chain, C3 Approval Gate
> 

---

## 1. File Gateway

The **File Gateway** is the only component allowed to write to disk within the UserWorkspaceRoot.

<aside>
🔒

**INV-FS-1: Exclusive Write Authority**

The File Gateway is the SOLE component with filesystem write permission. All other components MUST request writes via authenticated IPC. Direct filesystem writes by any other component constitute a security violation.

</aside>

---

## 2. Authority & Enforcement *(New in V2.2)*

<aside>
🔒

**INV-FS-2: Process Isolation**

The File Gateway SHALL execute as a **separate, low-privilege system process** with exclusive OS-level write permission to the UserWorkspaceRoot.

</aside>

### Token Model

All other system components, including Core, Agent, Planner, Shell Runner, and Diff Engine:

- SHALL run under tokens that are **denied filesystem write access**
- MAY only request file mutations via an **authenticated IPC channel** to the File Gateway

### Request Rejection Rules

The File Gateway SHALL reject any request that:

- Is not bound to an **approved correlation_id**
- Is not associated with a **validated plan_id**
- Targets a path outside UserWorkspaceRoot
- Intersects any **System Path** defined by INV-GLOBAL-15

---

## 3. Protected Paths *(New in V2.2)*

<aside>
🔒

**INV-FS-3: System Path Immunity**

The File Gateway MUST enforce INV-GLOBAL-15. The following paths are non-addressable write targets.

</aside>

```jsx
.exacta/                              ← Project control directory
C:\ProgramData\Exacta\               ← All system data
C:\ProgramData\Exacta\LegalHold\**   ← Legal hold evidence (V2.2)
Guardian install root                 ← Immutable trust core
Trust store                           ← Certificate chain
Policy root                           ← Safety policy
Upgrade verification root             ← Pending upgrades
Rollback archive                      ← Recovery snapshots
```

Any write attempt intersecting these paths SHALL result in:

1. **Request denial**
2. **Audit event:** `FS-SYSTEM-PATH-VIOLATION`
3. **Immediate termination** of the requesting session
4. **Security incident flag**

---

## 4. Path Resolution Rules *(New in V2.2)*

<aside>
🔒

**INV-FS-4: Path Canonicalization**

All paths MUST be fully resolved before any operation. Escape attempts via symlinks, junctions, or relative paths MUST be blocked.

</aside>

Before any operation, the File Gateway MUST:

1. **Resolve** symbolic links, junctions, and reparse points
2. **Canonicalize** relative paths to absolute form
3. **Verify** the resolved absolute path remains within UserWorkspaceRoot
4. **Check** against System Path list (INV-GLOBAL-15)

**Failure at any step → DENY**

Prevents:

- Symlink escape
- Junction hopping
- Mount point abuse
- Path traversal attacks

---

## 5. Approval Binding *(New in V2.2)*

<aside>
🔒

**INV-FS-5: Write-Approval Linkage**

Every file write MUST be traceable to an approved plan. Unbounded writes are forbidden.

</aside>

Every write request MUST include:

```tsx
interface WriteRequest {
  correlation_id: UUID;       // Links to operation chain
  plan_id: UUID;              // Links to approved plan
  step_id: UUID;              // Links to specific plan step
  approved_capabilities: string[];  // What this plan is allowed to do
  target_path: string;        // Requested write target
  content_hash: SHA256;       // Hash of content to write
  approval_signature: string; // Guardian signature over (plan_id, step_id, capabilities, timestamp) [V2.2]
  approval_hash: SHA256;      // Hash of approval record [V2.2]
}
```

The File Gateway SHALL verify these against the **Approval Gate registry** before executing any mutation.

**Cryptographic Verification (V2.2):**

The File Gateway MUST verify the `approval_signature` using the Guardian public key before executing any write. Verification steps:

1. **Reconstruct signature payload:** `(plan_id, step_id, approved_capabilities, timestamp)`
2. **Verify Guardian signature** using Guardian's public key
3. **Check approval_hash** against Approval Gate registry
4. **Verify timestamp** is within plan TTL window

**Signature verification failure → DENY + SEC-601 audit flag**

**Mismatch → DENY + audit**

---

## 6. Atomic Write Strategy

To prevent corruption during crashes or power loss:

### Step-by-Step Process

1. **Validate:** Check approval binding, path resolution, system path exclusion
2. **Lock:** Acquire OS-level mandatory lock on target file (30s timeout)
3. **Snapshot:** Read current content → Hash → Write to `.exacta/backups/\\\{correlation_id\\\}/`
4. **Write Temp:** Apply diff to content → Write to `\\\{filename\\\}.tmp.\\\{uuid\\\}` (same volume only)
5. **Verify:** Read back temp file → Check syntax/integrity → Verify content hash
6. **Rename:** Atomic replace within the **same volume and ACL domain** only
7. **Unlock:** Release lock
8. **Log:** Record operation in audit trail with all binding metadata

### Atomicity Guarantee *(Enhanced in V2.2)*

<aside>
⚠️

**Platform Constraint:** Atomic rename is guaranteed ONLY within the same volume and ACL domain. Cross-volume or cross-ACL renames SHALL be rejected.

</aside>

---

## 7. Lock Semantics *(New in V2.2)*

<aside>
🔒

**INV-FS-6: Mandatory Locking**

File locks MUST be OS-enforced, time-bounded, and recoverable.

</aside>

Locks SHALL be:

- **OS-level mandatory locks** (not advisory)
- **Scoped per-file** (no directory-level locks)
- **Time-bound:** Default 30 seconds, configurable per operation type

| **Scenario** | **Behavior** |
| --- | --- |
| Lock timeout exceeded | Operation aborted, rollback triggered |
| Process crash while holding lock | Guardian forcibly releases lock |
| Deadlock detected | Abort operation, trigger rollback, audit flag |
| Stale lock on startup | Guardian clears all stale locks |

---

## 8. Rollback Stack

### Schema *(Enhanced in V2.2)*

```tsx
interface RollbackEntry {
  correlation_id: UUID;
  step_id: UUID;
  file_path: string;
  backup_path: string;
  backup_hash: SHA256;        // NEW: Hash at creation
  original_hash: SHA256;      // NEW: Hash of original file
  timestamp: string;
  operation_type: 'CREATE' | 'MODIFY' | 'DELETE';
}
```

**Trigger:** On ANY failure during a multi-file apply, the system automatically walks the rollback stack for the current `correlation_id` in reverse order to restore state.

---

## 9. Backup Verification *(New in V2.2)*

<aside>
🔒

**INV-FS-7: Backup Integrity**

All backups MUST be hashed at creation and verified before restore. Tampered backups MUST NOT be restored.

</aside>

### Creation

When creating a backup:

1. Read original file content
2. Compute SHA-256 hash
3. Write to backup location
4. Verify written backup matches hash
5. Store hash in RollbackEntry

### Restoration

Before restoring from backup:

1. Read backup file
2. Compute SHA-256 hash
3. Compare against stored `backup_hash`
4. **Hash mismatch → ABORT + FORENSIC FLAG**

```tsx
interface BackupVerificationResult {
  backup_path: string;
  expected_hash: SHA256;
  actual_hash: SHA256;
  verified: boolean;
  forensic_flag?: 'BACKUP_TAMPERED';
}
```

---

## 10. Resource Limits *(New in V2.2)*

<aside>
⚠️

**INV-FS-8: Resource Controls**

The File Gateway MUST enforce resource limits to prevent denial-of-service via disk exhaustion.

</aside>

| **Resource** | **Default Limit** | **On Exceed** |
| --- | --- | --- |
| Max file size per write | 50 MB | DENY |
| Max backup size per correlation_id | 200 MB | DENY new backups |
| Disk space floor | 1 GB free | ABORT all writes |
| Max files per operation | 100 | DENY |

---

## 11. Audit Events

All File Gateway operations emit structured audit events:

```tsx
interface FileGatewayAuditEvent {
  event_type: 'WRITE' | 'BACKUP' | 'RESTORE' | 'DENY' | 'VIOLATION';
  correlation_id: UUID;
  plan_id: UUID;
  target_path: string;
  result: 'SUCCESS' | 'DENIED' | 'FAILED';
  denial_reason?: string;
  violation_code?: 'FS-SYSTEM-PATH-VIOLATION' | 'FS-APPROVAL-MISMATCH' | 
                   'FS-PATH-ESCAPE' | 'FS-BACKUP-TAMPERED';
  timestamp: string;
}
```

---

## Hard Invariants

This component enforces the following Global System Invariants:

- **INV-GLOBAL-8: All Changes Reversible**
- **INV-GLOBAL-9: Complete Audit Trail**
- **INV-GLOBAL-15: System Path Immunity**

And defines component-specific invariants:

- **INV-FS-1:** Exclusive Write Authority
- **INV-FS-2:** Process Isolation
- **INV-FS-3:** System Path Immunity
- **INV-FS-4:** Path Canonicalization
- **INV-FS-5:** Write-Approval Linkage
- **INV-FS-6:** Mandatory Locking
- **INV-FS-7:** Backup Integrity
- **INV-FS-8:** Resource Controls