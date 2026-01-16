# Notification & Interruption Contract

## Purpose
Define how the system notifies users of events, progress, and interruptions.

## Scope
This contract applies to all user-facing notifications, including:
- Progress updates during long operations
- Error notifications
- Completion notifications
- Interruption requests (pause, cancel)

## Notification Types

### Progress Notifications
- **Format**: "Step X/Y: Description (Status)"
- **Frequency**: Every 5 seconds during active operations, or on state changes
- **Persistence**: Shown in UI status bar, logged

### Error Notifications
- **Format**: "Error: [Code] Message"
- **Actions**: Include remediation steps when available
- **Severity Levels**: Info, Warning, Error, Fatal

### Completion Notifications
- **Format**: "Operation completed successfully"
- **Details**: Include summary statistics (files changed, time taken)

## Interruption Handling

### User-Initiated Interruption
- **Pause**: Suspends current operation, maintains state
- **Cancel**: Terminates operation, allows rollback if possible
- **Resume**: Continues from paused state

### System-Initiated Interruption
- **Resource Limits**: Automatic pause when approaching limits
- **External Events**: Handle system sleep, network changes

## Hard Invariants
This component enforces:
- **INV-GLOBAL-1: Local-Only Execution**
- **INV-GLOBAL-2: Deterministic Orchestration**
- **INV-GLOBAL-3: Fail-Closed Behavior**
- **INV-GLOBAL-4: AI Treated as Untrusted Input**
- **INV-GLOBAL-5: User-Owned API Keys**
- **INV-GLOBAL-6: No Telemetry**