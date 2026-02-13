import { EventEmitter } from "events";
import log from "electron-log";

const logger = log.scope("realtime-feedback");

export interface ProgressUpdate {
  type: "progress" | "success" | "warning" | "error" | "info";
  message: string;
  progress?: number; // 0-100
  timestamp: number;
  operationId?: string;
  details?: any;
}

export interface OperationContext {
  id: string;
  description: string;
  startTime: number;
  estimatedDuration?: number;
}

export class RealtimeFeedbackSystem extends EventEmitter {
  private static instance: RealtimeFeedbackSystem;
  private activeOperations: Map<string, OperationContext> = new Map();
  private recentUpdates: ProgressUpdate[] = [];
  private readonly MAX_RECENT_UPDATES = 50;

  private constructor() {
    super();
  }

  static getInstance(): RealtimeFeedbackSystem {
    if (!RealtimeFeedbackSystem.instance) {
      RealtimeFeedbackSystem.instance = new RealtimeFeedbackSystem();
    }
    return RealtimeFeedbackSystem.instance;
  }

  startOperation(
    id: string,
    description: string,
    estimatedDuration?: number,
  ): OperationContext {
    const context: OperationContext = {
      id,
      description,
      startTime: Date.now(),
      estimatedDuration,
    };

    this.activeOperations.set(id, context);
    this.emitUpdate({
      type: "info",
      message: `🚀 Starting: ${description}`,
      operationId: id,
      timestamp: Date.now(),
    });

    logger.info(`Operation started: ${id} - ${description}`);
    return context;
  }

  updateProgress(
    operationId: string,
    progress: number,
    message?: string,
  ): void {
    const operation = this.activeOperations.get(operationId);
    if (!operation) {
      logger.warn(
        `Attempted to update progress for non-existent operation: ${operationId}`,
      );
      return;
    }

    const update: ProgressUpdate = {
      type: "progress",
      message: message || `${operation.description} (${Math.round(progress)}%)`,
      progress,
      operationId,
      timestamp: Date.now(),
    };

    this.emitUpdate(update);
    logger.debug(
      `Progress update for ${operationId}: ${progress}% - ${message}`,
    );
  }

  completeOperation(
    operationId: string,
    success: boolean,
    message?: string,
  ): void {
    const operation = this.activeOperations.get(operationId);
    if (!operation) {
      logger.warn(
        `Attempted to complete non-existent operation: ${operationId}`,
      );
      return;
    }

    const duration = Date.now() - operation.startTime;
    const finalMessage =
      message ||
      (success
        ? `✅ Completed: ${operation.description}`
        : `❌ Failed: ${operation.description}`);

    this.emitUpdate({
      type: success ? "success" : "error",
      message: finalMessage,
      operationId,
      timestamp: Date.now(),
      details: { duration },
    });

    this.activeOperations.delete(operationId);
    logger.info(
      `Operation ${success ? "completed" : "failed"}: ${operationId} in ${duration}ms`,
    );
  }

  emitWarning(operationId: string, message: string, details?: any): void {
    this.emitUpdate({
      type: "warning",
      message: `⚠️ ${message}`,
      operationId,
      timestamp: Date.now(),
      details,
    });

    logger.warn(`Warning in operation ${operationId}: ${message}`, details);
  }

  emitInfo(operationId: string, message: string, details?: any): void {
    this.emitUpdate({
      type: "info",
      message,
      operationId,
      timestamp: Date.now(),
      details,
    });

    logger.info(`Info for operation ${operationId}: ${message}`, details);
  }

  private emitUpdate(update: ProgressUpdate): void {
    // Keep recent updates for UI display
    this.recentUpdates.push(update);
    if (this.recentUpdates.length > this.MAX_RECENT_UPDATES) {
      this.recentUpdates.shift();
    }

    // Emit event for listeners (UI components, logs, etc.)
    this.emit("update", update);
    this.emit(`update:${update.operationId}`, update);
  }

  getActiveOperations(): OperationContext[] {
    return Array.from(this.activeOperations.values());
  }

  getRecentUpdates(limit: number = 10): ProgressUpdate[] {
    return this.recentUpdates.slice(-limit);
  }

  getOperationProgress(operationId: string): number | null {
    // This would calculate actual progress based on operation type
    // For now returning mock progress
    const operation = this.activeOperations.get(operationId);
    if (operation && operation.estimatedDuration) {
      const elapsed = Date.now() - operation.startTime;
      return Math.min(95, (elapsed / operation.estimatedDuration) * 100);
    }
    return null;
  }

  // Convenience methods for common operations
  async trackAsyncOperation<T>(
    id: string,
    description: string,
    operation: () => Promise<T>,
    estimatedDuration?: number,
  ): Promise<T> {
    this.startOperation(id, description, estimatedDuration);

    try {
      const result = await operation();
      this.completeOperation(id, true);
      return result;
    } catch (error) {
      this.completeOperation(id, false, (error as Error).message);
      throw error;
    }
  }

  // Batch operation tracking
  async trackBatchOperations<T>(
    operations: Array<{
      id: string;
      description: string;
      operation: () => Promise<T>;
    }>,
    batchSize: number = 3,
  ): Promise<T[]> {
    const results: T[] = [];
    const errors: Error[] = [];

    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      const batchPromises = batch.map(async (op) => {
        try {
          return await this.trackAsyncOperation(
            op.id,
            op.description,
            op.operation,
          );
        } catch (error) {
          errors.push(error as Error);
          return undefined;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...(batchResults.filter((r) => r !== undefined) as T[]));
    }

    if (errors.length > 0) {
      logger.warn(
        `Batch operation completed with ${errors.length} errors`,
        errors,
      );
    }

    return results;
  }
}

// Create global instance
export const feedbackSystem = RealtimeFeedbackSystem.getInstance();

// Utility functions for common feedback scenarios
export const feedbackUtils = {
  createOperationId(prefix: string = "op"): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  },

  estimateFileOperationDuration(
    fileCount: number,
    avgFileSizeKB: number = 10,
  ): number {
    // Rough estimation: 10ms per KB + 100ms overhead per file
    return fileCount * avgFileSizeKB * 10 + fileCount * 100;
  },
};
