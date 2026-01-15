# Failure Modes and Recovery

This document enumerates all expected failure modes and their recovery paths. Understanding these failures builds trust in the system's reliability.

---

## Failure Categories
1. AI failures
2. Patch failures
3. User-initiated interruptions
4. System crashes
5. Index corruption
6. Build environment issues
7. File system errors

---

## AI Failures

### Provider Unreachable
**Cause:** Network issues, provider outage, incorrect API endpoint.  
**Detection:** Connection timeout, HTTP errors.  
**Recovery:**
1. Retry with exponential backoff (3 attempts)
2. If all retries fail: surface error to user
3. Options: retry later, check network, verify API key

---

### Invalid API Key
**Cause:** Expired key, revoked key, incorrect key.  
**Detection:** 401/403 response from provider.  
**Recovery:**
1. Do not retry (will fail again)
2. Surface error to user
3. Direct user to settings to update key

---

### Rate Limit Exceeded
**Cause:** Too many requests to provider.  
**Detection:** 429 response from provider.  
**Recovery:**
1. Pause execution
2. Display wait time (if provided by provider)
3. Auto-resume after wait, or user cancels

---

### Malformed AI Response
**Cause:** AI generated invalid JSON, incomplete response, unexpected format.  
**Detection:** Parse failure, schema validation failure.  
**Recovery:**
1. Retry with same prompt (1 attempt)
2. If retry fails: surface error
3. Options: retry, rephrase request, cancel

---

### AI Generates Unsafe Output
**Cause:** AI suggests paths outside project, suggests dangerous operations.  
**Detection:** Path validation, operation validation.  
**Recovery:**
1. Reject the output (do not apply)
2. Log the violation
3. Retry with explicit safety constraints in prompt
4. If retry fails: surface error, require user intervention

---

## Patch Failures

### Context Mismatch
**Cause:** File changed since diff was generated.  
**Detection:** Context lines in diff don't match file content.  
**Recovery:**
1. Re-read the file
2. Regenerate diff with fresh content (1 attempt)
3. If retry fails: surface error
4. Options: re-plan, cancel, manual edit

---

### Repeated Bad Patches
**Cause:** AI consistently generates patches that don't apply.  
**Detection:** Multiple consecutive patch failures for same step.  
**Recovery:**
1. After 2 failures: halt step execution
2. Surface detailed error to user
3. Options:
   - Provide more context (user guidance)
   - Skip step (if optional)
   - Cancel plan
   - Manual edit

---

### Syntax Error After Apply
**Cause:** Patch applied but introduced syntax error.  
**Detection:** Post-apply syntax validation.  
**Recovery:**
1. Automatically rollback the patch
2. Surface error with specific syntax issue
3. Retry with error feedback in prompt (1 attempt)
4. If retry fails: step failed, options as above

---

## User-Initiated Interruptions

### Pause Request
**Cause:** User clicks pause during execution.  
**Behavior:**
1. Complete current atomic operation
2. Transition to Paused state
3. Persist state  
**Recovery:**
- Resume: validate state, continue from next step
- Cancel: rollback and return to Idle

---

### Cancel Request
**Cause:** User clicks cancel during execution.  
**Behavior:**
1. Complete current atomic operation
2. Transition to Cancelling state
3. Rollback applied changes
4. Transition to Idle  
**Recovery:**
- If rollback succeeds: return to Idle
- If rollback fails: transition to Failed, require manual intervention

---

### App Close During Execution
**Cause:** User closes app window while execution is in progress.  
**Behavior:**
1. Persist current state immediately
2. Close app  
**Recovery on Restart:**
1. Detect incomplete execution
2. Transition to Paused state
3. Require user to resume or cancel

---

## System Crashes

### App Crash
**Cause:** Unhandled exception, memory issue, external termination.  
**Detection:** On restart, state file indicates execution was in progress.  
**Recovery:**
1. Load persisted state
2. Validate state integrity
3. If valid: transition to Paused, await user decision
4. If invalid: transition to Failed, offer recovery options

---

### OS Crash / Power Loss
**Cause:** System-level failure during execution.  
**Impact:**
- Persisted state may be incomplete
- In-progress file write may be partial  
**Recovery:**
1. Load persisted state
2. Validate all file hashes
3. If file corruption detected:
   - Offer to restore from rollback
   - If no rollback: require manual recovery
4. If state corrupted: reset to Idle with warning

---

## Index Corruption

### Partial Index
**Cause:** Indexing interrupted, files changed during indexing.  
**Detection:** Index integrity check fails.  
**Recovery:**
1. Discard corrupted index
2. Rebuild index from scratch
3. Continue operation after rebuild

---

### Stale Index
**Cause:** Files changed externally, watcher missed changes.  
**Detection:** File hash mismatch during operation.  
**Recovery:**
1. Invalidate affected entries
2. Re-index changed files
3. Re-validate current operation

---

### Index File Corrupted
**Cause:** Disk error, incomplete write.  
**Detection:** Index file fails to parse.  
**Recovery:**
1. Delete corrupted index file
2. Rebuild index from scratch
3. Log incident

---

## Build Environment Issues

### SDK Not Found
**Cause:** Required SDK not installed.  
**Detection:** Build tool reports SDK error.  
**Recovery:**
1. Surface specific error to user
2. Provide link to SDK download
3. User installs SDK, then retries

---

### Build Tool Not Found
**Cause:** dotnet/msbuild not in PATH.  
**Detection:** Process start fails.  
**Recovery:**
1. Surface error to user
2. Suggest:
   - Install Visual Studio / Build Tools
   - Install .NET SDK
   - Check PATH configuration
3. User fixes environment, then retries

---

### Insufficient Permissions
**Cause:** Cannot write to project directory.  
**Detection:** Access denied on file operation.  
**Recovery:**
1. Surface error with specific path
2. Suggest:
   - Run as administrator (if appropriate)
   - Check directory permissions
   - Move project to writable location
3. User fixes permissions, then retries

---

## File System Errors

### Disk Full
**Cause:** No space for file writes.  
**Detection:** Write fails with disk full error.  
**Recovery:**
1. Rollback any partial changes
2. Surface error to user
3. User frees disk space, then retries

---

### File Locked
**Cause:** Another process has the file open.  
**Detection:** Cannot acquire exclusive lock.  
**Recovery:**
1. Wait with backoff (5 seconds total)
2. If still locked: surface error
3. Suggest closing other applications
4. User closes conflicting app, then retries

---

### File Deleted Externally
**Cause:** Target file was deleted after planning.  
**Detection:** File not found during diff apply.  
**Recovery:**
1. For modify operations: fail step, re-plan needed
2. For create operations: proceed normally
3. Surface clear message about what happened

---

## Manual Recovery Paths

When automated recovery fails, users have these options:

### Reset Orchestrator State
**When:** State is corrupted beyond repair.  
**Action:** Delete state files, return to Idle.  
**Warning:** Loses undo/rollback capability for current plan.

---

### Rebuild Index
**When:** Index is corrupted or severely stale.  
**Action:** Delete index, trigger full re-index.  
**Impact:** Next operation will be slower.

---

### Manual File Restore
**When:** Rollback data is unavailable but files are corrupted.  
**Action:** User restores from version control or backup.  
**Guidance:** System provides list of files that were modified.

---

### Discard Plan
**When:** Plan is stuck and cannot proceed.  
**Action:** Mark plan as cancelled, return to Idle.  
**Impact:** Loses plan state, must re-plan from intent.

---

## Failure Reporting

All failures include:
1. **What failed:** Specific operation that failed
2. **Why it failed:** Error message and classification
3. **What was affected:** Files, steps, or resources involved
4. **What to do:** Clear next steps for recovery
5. **Technical details:** Full error available on demand

No failure should leave the user without guidance.

---

## Hard Invariants
This component enforces the following Global System Invariants:
- **INV-GLOBAL-1: Local-Only Execution**
- **INV-GLOBAL-2: Deterministic Orchestration**
- **INV-GLOBAL-3: Fail-Closed Behavior**
- **INV-GLOBAL-4: AI Treated as Untrusted Input**
- **INV-GLOBAL-5: User-Owned API Keys**
- **INV-GLOBAL-6: No Telemetry