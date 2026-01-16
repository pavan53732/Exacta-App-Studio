# Notification & Interruption Contract


This document specifies **when and how** LocalAgent notifies users and handles interruptions during autonomous execution.

---

## 1. Notification Types and Priorities

```tsx
enum NotificationType {
  Silent = "silent",           // Log only, no UI notification
  StatusBar = "status_bar",   // Update status bar
  Toast = "toast",            // Brief popup notification
  Modal = "modal"             // Requires user attention
}

enum NotificationPriority {
  Low = 0,      // Background info
  Medium = 1,   // User should know
  High = 2,     // User should act
  Critical = 3  // Immediate attention required
}

interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  timestamp: number;
  operationId?: string;
  correlation_id?: string;  // For audit trail
  actions?: NotificationAction[];
  dismissible: boolean;
  expiresInMs?: number;
}

interface NotificationAction {
  label: string;
  action: () => void | Promise<void>;
  style?: "primary" | "secondary" | "danger";
}
```

---

## 2. Notification Decision Matrix

### By Risk Level and Event

```tsx
function determineNotificationType(
  operation: AutonomousOperation,
  event: OperationEvent
): NotificationType {
  
  // Critical events always show modal
  if (event === OperationEvent.Failed && operation.retryCount >= 3) {
    return NotificationType.Modal;
  }
  
  if (event === OperationEvent.RequiresClarification) {
    return NotificationType.Modal;
  }
  
  // High risk operations show toast
  if (operation.riskLevel === RiskLevel.High) {
    if (event === OperationEvent.Started || event === OperationEvent.Completed) {
      return NotificationType.Toast;
    }
  }
  
  // Medium risk operations show toast on completion
  if (operation.riskLevel === RiskLevel.Medium) {
    if (event === OperationEvent.Completed || event === OperationEvent.Failed) {
      return NotificationType.Toast;
    }
    if (event === OperationEvent.Started) {
      return NotificationType.StatusBar;
    }
  }
  
  // Low risk operations are silent except failures
  if (operation.riskLevel === RiskLevel.Low) {
    if (event === OperationEvent.Failed) {
      return NotificationType.Toast;
    }
    if (event === OperationEvent.Completed) {
      return NotificationType.StatusBar;
    }
    return NotificationType.Silent;
  }
  
  // Default: status bar
  return NotificationType.StatusBar;
}
```

### Notification Strategy Table

| Risk Level | Event | Notification Type |
| --- | --- | --- |
| **Low** | Started | Silent |
| Low | Progress | Silent |
| Low | Completed | Status Bar |
| Low | Failed | Toast |
| Low | Retrying | Silent |
| **Medium** | Started | Status Bar |
| Medium | Progress | Status Bar |
| Medium | Completed | Toast |
| Medium | Failed | Toast |
| Medium | Retrying | Status Bar |
| **High** | Started | Toast |
| High | Progress | Status Bar |
| High | Completed | Toast |
| High | Failed | **Modal** |
| High | Retrying | Toast |
| **Any** | Retry Exhausted | **Modal** |
| Any | Needs Clarification | **Modal** |

---

## 3. When to Interrupt the User

### Interrupt Decision Rules

```tsx
function shouldInterruptUser(
  operation: AutonomousOperation,
  event: OperationEvent,
  context: ExecutionContext
): InterruptDecision {
  
  // Rule 1: Always interrupt for clarification requests
  if (event === OperationEvent.RequiresClarification) {
    return {
      shouldInterrupt: true,
      urgency: "immediate",
      reason: "Agent needs user input to proceed"
    };
  }
  
  // Rule 2: Interrupt when retry exhausted
  if (event === OperationEvent.Failed && operation.retryCount >= 3) {
    return {
      shouldInterrupt: true,
      urgency: "high",
      reason: "Operation failed after 3 attempts"
    };
  }
  
  // Rule 3: Interrupt for high-risk failures
  if (event === OperationEvent.Failed && operation.riskLevel === RiskLevel.High) {
    return {
      shouldInterrupt: true,
      urgency: "high",
      reason: "High-risk operation failed"
    };
  }
  
  // Rule 4: Interrupt if user is actively viewing the affected files
  if (context.userIsViewingAffectedFiles) {
    if (event === OperationEvent.Started || event === OperationEvent.Completed) {
      return {
        shouldInterrupt: true,
        urgency: "medium",
        reason: "Agent is modifying file you're viewing"
      };
    }
  }
  
  // Rule 5: Don't interrupt if user is typing
  if (context.userIsTyping) {
    return {
      shouldInterrupt: false,
      urgency: "none",
      reason: "User is typing, will defer notification"
    };
  }
  
  // Rule 6: Don't interrupt for routine low-risk operations
  if (operation.riskLevel === RiskLevel.Low && event !== OperationEvent.Failed) {
    return {
      shouldInterrupt: false,
      urgency: "low",
      reason: "Low-risk routine operation"
    };
  }
  
  // Default: Don't interrupt
  return {
    shouldInterrupt: false,
    urgency: "low",
    reason: "No critical reason to interrupt"
  };
}

interface InterruptDecision {
  shouldInterrupt: boolean;
  urgency: "immediate" | "high" | "medium" | "low" | "none";
  reason: string;
}
```

---

## 4. Notification Batching

To avoid spamming the user with notifications, similar notifications are batched.

```tsx
class NotificationBatcher {
  private pending: Map<string, Notification[]> = new Map();
  private batchTimeout = 2000; // 2 seconds
  private timers: Map<string, NodeJS.Timeout> = new Map();
  
  add(notification: Notification): void {
    const key = this.getBatchKey(notification);
    
    if (!this.pending.has(key)) {
      this.pending.set(key, []);
    }
    
    this.pending.get(key)!.push(notification);
    
    // Reset timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
    }
    
    this.timers.set(key, setTimeout(() => {
      this.flush(key);
    }, this.batchTimeout));
  }
  
  private getBatchKey(notification: Notification): string {
    // Batch by operation type and risk level
    return `${notification.type}-${notification.priority}`;
  }
  
  private flush(key: string): void {
    const notifications = this.pending.get(key);
    if (!notifications || notifications.length === 0) return;
    
    if (notifications.length === 1) {
      // Single notification: show as-is
      this.show(notifications[0]);
    } else {
      // Multiple notifications: combine
      const combined = this.combineNotifications(notifications);
      this.show(combined);
    }
    
    this.pending.delete(key);
    this.timers.delete(key);
  }
  
  private combineNotifications(notifications: Notification[]): Notification {
    return {
      id: `batch-${Date.now()}`,
      type: notifications[0].type,
      priority: notifications[0].priority,
      title: `${notifications.length} operations completed`,
      message: notifications.map(n => n.title).join(", "),
      timestamp: Date.now(),
      actions: [
        { label: "View All", action: () => this.showDetails(notifications) },
        { label: "Dismiss", action: () => {} }
      ],
      dismissible: true
    };
  }
  
  private show(notification: Notification): void {
    // Delegate to appropriate notifier based on type
    const notifier = this.getNotifier(notification.type);
    notifier.show(notification);
    
    // Log to audit trail
    this.logNotification(notification);
  }
  
  private logNotification(notification: Notification): void {
    const logEntry = {
      id: notification.id,
      type: notification.type,
      priority: notification.priority,
      title: notification.title,
      message: notification.message,
      timestamp: new Date(notification.timestamp).toISOString(),
      operation_id: notification.operationId,
      correlation_id: notification.correlation_id
    };
    
    fs.appendFileSync(
      `.exacta/notifications/${Date.now()}.json`,
      JSON.stringify(logEntry, null, 2)
    );
  }
  
  private showDetails(notifications: Notification[]): void {
    // Show detailed list of all batched notifications
  }
  
  private getNotifier(type: NotificationType): any {
    switch (type) {
      case NotificationType.Silent: return new SilentNotifier();
      case NotificationType.StatusBar: return new StatusBarNotifier();
      case NotificationType.Toast: return new ToastNotifier();
      case NotificationType.Modal: return new ModalNotifier();
    }
  }
}
```

---

## 5. User-Initiated Interrupts

### Interrupt Types

```tsx
enum InterruptType {
  Pause = "pause",     // Stop at safe point, can resume
  Cancel = "cancel",   // Stop and rollback
  Skip = "skip"        // Skip current step, continue with next
}

interface InterruptRequest {
  operationId: string;
  type: InterruptType;
  requestedAt: number;
}
```

### Interrupt Controller

```typescript
class InterruptController {

private activeInterrupts: Map<string, InterruptRequest> = new Map();

// User clicks "Pause"

async pause(operationId: string): Promise<void> {

const request: InterruptRequest = {

operationId,

type: InterruptType.Pause,

requestedAt: Date.now()

};

this.activeInterrupts.set(operationId, request);

// Wait for operation to reach safe point (max 5 seconds)

await this.waitForSafePoint(operationId, 5000);

// Notify user

this.notifyPaused(operationId);

}

// User clicks "Cancel"

async cancel(operationId: string): Promise<void> {

const request: InterruptRequest = {

operationId,

type: InterruptType.Cancel,

requestedAt: Date.now()

};

this.activeInterrupts.set(operationId, request);

// Stop immediately

await this.forceStop(operationId);

// Rollback changes

await this.rollback(operationId);

// Notify user

this.notifyCancelled(operationId);

}

// User clicks "Resume"

async resume(operationId: string): Promise<void> {

this.activeInterrupts.delete(operationId);

// Resume from saved state

await this.resumeFromState(operationId);

this.notifyResumed(operationId);

}

// Check if operation should stop

shouldStop(operationId: string): boolean {

return this.activeInterrupts.has(operationId);

}

// Get interrupt type

getInterruptType(operationId: string): InterruptType | null {

const interrupt = this.activeInterrupts.get(operationId);

return interrupt ? interrupt.type : null;

}

private async waitForSafePoint(operationId: string, timeoutMs: number): Promise<void> {

const startTime = Date.now();

while (Date.now() - startTime < timeoutMs) {

if (await this.isAtSafePoint(operationId)) {

return;

}

await sleep(100);

}

// Timeout: Force stop

await this.forceStop(operationId);

}

private async isAtSafePoint(operationId: string): boolean {

const safePointManager = SafePointManager.getInstance();

return safePointManager.isAtSafePoint(operationId);

}

private async forceStop(operationId: string): Promise<void> {

// Force stop the operation

}

private async rollback(operationId: string): Promise<void> {

// Rollback all changes made by the operation

}

private async resumeFromState(operationId: string): Promise<void> {

const resumeManager = new ResumeManager();

await resumeManager.resume(operationId);

}

private notifyPaused(operationId: string): void {

// Show notification that operation was paused

}

private notifyCancelled(operationId: string): void {

// Show notification that operation was cancelled

}

private notifyResumed(operationId: string): void {

// Show notification that operation was resumed

}

}

```

```

---

```

---

## 6. Safe Interruption Points

Operations can be safely interrupted at specific points without corruption.

```tsx
class SafePointManager {
  private safePoints: Map<string, SafePoint> = new Map();
  
  // Mark a safe point in operation
  mark(operationId: string, state: OperationState): void {
    const safePoint: SafePoint = {
      operationId,
      timestamp: Date.now(),
      state: this.cloneState(state),
      canResume: true,
      canRollback: this.isRollbackable(state)
    };
    
    this.safePoints.set(operationId, safePoint);
  }
  
  // Get latest safe point
  getLatest(operationId: string): SafePoint | null {
    return this.safePoints.get(operationId) || null;
  }
  
  // Check if at safe point (within last second)
  isAtSafePoint(operationId: string): boolean {
    const safePoint = this.safePoints.get(operationId);
    if (!safePoint) return false;
    
    const age = Date.now() - safePoint.timestamp;
    return age < 1000; // 1 second
  }
  
  private cloneState(state: OperationState): OperationState {
    return JSON.parse(JSON.stringify(state));
  }
  
  private isRollbackable(state: OperationState): boolean {
    // All file changes must be tracked with backups
    return state.changes.every(change => {
      return change.hasBackup && change.backupVerified;
    });
  }
}

interface SafePoint {
  operationId: string;
  timestamp: number;
  state: OperationState;
  canResume: boolean;
  canRollback: boolean;
}
```

### Safe Points Occur At:

1. **Before starting each step**
2. **After successfully completing a step**
3. **Before any file write**
4. **After successful file write**
5. **Before calling AI API**

```tsx
class OperationExecutor {
    async executeStep(step: OperationStep, state: OperationState): Promise<StepResult> {
    // Mark safe point BEFORE step
    this.safePointManager.mark(state.operationId, state);
    
    // Check for interrupt
    if (this.interruptController.shouldStop(state.operationId)) {
      throw new InterruptedError("Operation paused by user");
    }
    
    // Execute step
    const result = await this.executeStepInternal(step, state);
    
    // Mark safe point AFTER step
    state.completedSteps.push(step.id);
    this.safePointManager.mark(state.operationId, state);
    
    return result;
  }
  
  private async executeStepInternal(step: OperationStep, state: OperationState): Promise<StepResult> {
    // Step execution logic here
    return await step.execute(state);
  }
}
```

---

## 7. Resume After Interrupt

```tsx
class ResumeManager {
  async resume(operationId: string): Promise<void> {
    // Load persisted state
    const state = await this.loadState(operationId);
    if (!state) {
      throw new Error("Cannot resume: state not found");
    }
    
    // Verify state is still valid
    await this.verifyStateValidity(state);
    
    // Resume from last safe point
    const remainingSteps = this.getRemainingSteps(state);
    
    // Continue execution
    await this.continueExecution(state, remainingSteps);
  }
  
  private async verifyStateValidity(state: OperationState): Promise<void> {
    // Check if files still exist
    for (const file of state.affectedFiles) {
      if (!await fs.exists(file.path)) {
        throw new Error(`File no longer exists: ${file.path}`);
      }
      
      // Check if content matches expected state
      const currentContent = await fs.readFile(file.path, "utf-8");
      const expectedHash = file.contentHash;
      const currentHash = this.hash(currentContent);
      
      if (currentHash !== expectedHash) {
        throw new Error(`File modified during pause: ${file.path}`);
      }
    }
  }
  
  private getRemainingSteps(state: OperationState): OperationStep[] {
    return state.operation.steps.filter(step => {
      return !state.completedSteps.includes(step.id);
    });
  }
  
  private async loadState(operationId: string): Promise<OperationState | null> {
    try {
      const stateFile = `.exacta/state/${operationId}.json`;
      const content = await fs.readFile(stateFile, "utf-8");
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }
  
  private async continueExecution(state: OperationState, remainingSteps: OperationStep[]): Promise<void> {
    const executor = new OperationExecutor();
    
    for (const step of remainingSteps) {
      await executor.executeStep(step, state);
    }
  }
  
  private hash(content: string): string {
    // Simple hash function
    return require('crypto').createHash('sha256').update(content).digest('hex');
  }
}
```

---

## UI Integration

### Status Bar

```tsx
class StatusBarNotifier {
  update(message: string, icon?: string): void {
    // Update status bar with icon and message
    statusBar.text = `${icon || ""} ${message}`;
    statusBar.show();
  }
  
  clear(): void {
    statusBar.hide();
  }
  
  show(notification: Notification): void {
    this.update(notification.message);
  }
}
```

### Toast Notifications

```tsx
class ToastNotifier {
  show(notification: Notification): void {
    // Show toast with auto-dismiss after 5 seconds
    toast.show({
      message: notification.message,
      duration: 5000,
      actions: notification.actions?.map(action => ({
        label: action.label,
        callback: action.action
      }))
    });
  }
}
```

### Modal Dialogs

```tsx
class ModalNotifier {
  async show(notification: Notification): Promise<string> {
    // Show modal and wait for user action
    const result = await modal.show({
      title: notification.title,
      message: notification.message,
      actions: notification.actions?.map(action => ({
        label: action.label,
        callback: action.action,
        style: action.style
      }))
    });
    
    return result;
  }
}
```

---

### **Silent Notifier**

```tsx
class SilentNotifier {
  show(notification: Notification): void {
    // Log only, no UI notification
    console.log(`[Silent] ${notification.title}: ${notification.message}`);
  }
}
```

## Hard Invariants

This component enforces the following Global System Invariants:

- **INV-GLOBAL-1: Local-Only Execution** — All notifications local; no external notification services
- **INV-GLOBAL-2: Autonomous Execution** — Notifications designed for autonomous operations; minimal interruption
- **INV-GLOBAL-3: Background Operation** — Notifications support background execution; risk-based visibility
- **INV-GLOBAL-4: Graceful Degradation** — Interrupt handling allows pause/resume at safe points
- **INV-GLOBAL-5: AI Treated as Trusted Advisor** — Notifications based on risk level, not AI vs user-initiated distinction
- **INV-GLOBAL-6: User-Owned API Keys** — N/A (notifications don't make API calls)
- **INV-GLOBAL-7: No Telemetry** — Notification logs stay local in `.exacta/notifications/`
- **INV-GLOBAL-8: All Changes Reversible** — Cancel/rollback functionality ensures reversibility
- **INV-GLOBAL-9: Complete Audit Trail** — All notifications logged with correlation_id and operation_id

---

## Requirements (Non-Negotiable)

- **MUST track correlation_id** — Every notification linked to original operation for audit trail
- **MUST respect interrupt safety** — Cannot interrupt during atomic operations (file writes, builds)
- **MUST support pause/resume** — Save state at safe points; allow resume from exact point
- **MUST support rollback** — Cancel must fully reverse all changes
- **MUST batch notifications** — Similar notifications batched with 2-second window
- **MUST defer during typing** — Do not interrupt user while actively typing
- **MUST notify on file conflicts** — Interrupt if modifying file user is viewing
- **MUST show modal on failure** — High-risk failures and exhausted retries require modal
- **MUST show modal on clarification** — Agent requests for input always show modal
- **MUST timeout interrupts** — Max 5 seconds to reach safe point before force stop
- **MUST log all notifications** — Write to `.exacta/notifications/` with timestamps
- **MUST check drift on resume** — Verify files unchanged during pause before continuing
- **MUST track safe points** — Mark safe points every 1 second during execution
- **MUST support three interrupt types** — Pause (resume), Cancel (rollback), Skip (continue)
- **MUST auto-dismiss toasts** — Toast notifications auto-dismiss after 5 seconds