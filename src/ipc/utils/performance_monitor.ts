import log from "electron-log";
import { EventEmitter } from "events";

const logger = log.scope("performance-monitor");

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: number;
  memoryUsage?: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
  success: boolean;
  details?: Record<string, any>;
}

export interface PerformanceThresholds {
  slowOperation: number; // milliseconds
  highMemory: number; // bytes
  warningThreshold: number; // percentage (0-100)
}

export class PerformanceMonitor extends EventEmitter {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private readonly MAX_METRICS = 1000;
  private thresholds: PerformanceThresholds = {
    slowOperation: 5000, // 5 seconds
    highMemory: 500 * 1024 * 1024, // 500MB
    warningThreshold: 80,
  };
  private baselineMetrics: Map<string, { avgDuration: number; count: number }> =
    new Map();

  private constructor() {
    super();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  setThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
    logger.info("Performance thresholds updated", this.thresholds);
  }

  async measureOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    details?: Record<string, any>,
  ): Promise<T> {
    const startTime = process.hrtime.bigint();
    const _startMemory = process.memoryUsage();
    const startCpu = process.cpuUsage();

    try {
      const result = await operation();

      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      const endMemory = process.memoryUsage();
      const endCpu = process.cpuUsage(startCpu);

      const metric: PerformanceMetrics = {
        operation: operationName,
        duration,
        timestamp: Date.now(),
        memoryUsage: endMemory,
        cpuUsage: endCpu,
        success: true,
        details,
      };

      this.recordMetric(metric);
      this.checkPerformanceAlerts(metric);

      return result;
    } catch (error) {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;

      const metric: PerformanceMetrics = {
        operation: operationName,
        duration,
        timestamp: Date.now(),
        memoryUsage: process.memoryUsage(),
        success: false,
        details: { ...details, error: (error as Error).message },
      };

      this.recordMetric(metric);
      throw error;
    }
  }

  private recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);

    // Trim old metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }

    // Update baselines for performance comparison
    this.updateBaseline(metric);

    this.emit("metricRecorded", metric);
    logger.debug(
      `Performance recorded: ${metric.operation} took ${metric.duration}ms`,
    );
  }

  private updateBaseline(metric: PerformanceMetrics): void {
    const baseline = this.baselineMetrics.get(metric.operation);
    if (baseline) {
      const newAvg =
        (baseline.avgDuration * baseline.count + metric.duration) /
        (baseline.count + 1);
      baseline.avgDuration = newAvg;
      baseline.count += 1;
    } else {
      this.baselineMetrics.set(metric.operation, {
        avgDuration: metric.duration,
        count: 1,
      });
    }
  }

  private checkPerformanceAlerts(metric: PerformanceMetrics): void {
    const alerts: string[] = [];

    // Check for slow operations
    if (metric.duration > this.thresholds.slowOperation) {
      alerts.push(
        `Slow operation: ${metric.operation} took ${metric.duration}ms (threshold: ${this.thresholds.slowOperation}ms)`,
      );
    }

    // Check for high memory usage
    if (
      metric.memoryUsage &&
      metric.memoryUsage.heapUsed > this.thresholds.highMemory
    ) {
      alerts.push(
        `High memory usage: ${Math.round(metric.memoryUsage.heapUsed / 1024 / 1024)}MB (threshold: ${this.thresholds.highMemory / 1024 / 1024}MB)`,
      );
    }

    // Check performance degradation compared to baseline
    const baseline = this.baselineMetrics.get(metric.operation);
    if (baseline && baseline.count > 5) {
      // Need enough samples
      const degradation =
        ((metric.duration - baseline.avgDuration) / baseline.avgDuration) * 100;
      if (degradation > this.thresholds.warningThreshold) {
        alerts.push(
          `Performance degradation: ${metric.operation} is ${degradation.toFixed(1)}% slower than baseline (${baseline.avgDuration.toFixed(1)}ms)`,
        );
      }
    }

    if (alerts.length > 0) {
      this.emit("performanceAlert", {
        operation: metric.operation,
        alerts,
        metric,
      });

      alerts.forEach((alert) => logger.warn(alert));
    }
  }

  getMetrics(filter?: {
    operation?: string;
    startTime?: number;
    endTime?: number;
    success?: boolean;
  }): PerformanceMetrics[] {
    let filtered = this.metrics;

    if (filter?.operation) {
      filtered = filtered.filter((m) => m.operation === filter.operation);
    }

    if (filter?.startTime) {
      filtered = filtered.filter((m) => m.timestamp >= filter.startTime!);
    }

    if (filter?.endTime) {
      filtered = filtered.filter((m) => m.timestamp <= filter.endTime!);
    }

    if (filter?.success !== undefined) {
      filtered = filtered.filter((m) => m.success === filter.success);
    }

    return filtered;
  }

  getPerformanceSummary(operation?: string): {
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    successRate: number;
    totalOperations: number;
    memoryUsage?: { avg: number; max: number };
  } {
    const metrics = operation ? this.getMetrics({ operation }) : this.metrics;

    if (metrics.length === 0) {
      return {
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        successRate: 0,
        totalOperations: 0,
      };
    }

    const durations = metrics.map((m) => m.duration);
    const successfulOps = metrics.filter((m) => m.success).length;

    const memoryUsages = metrics
      .filter((m) => m.memoryUsage)
      .map((m) => m.memoryUsage!.heapUsed);

    return {
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      successRate: (successfulOps / metrics.length) * 100,
      totalOperations: metrics.length,
      memoryUsage:
        memoryUsages.length > 0
          ? {
              avg:
                memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length,
              max: Math.max(...memoryUsages),
            }
          : undefined,
    };
  }

  getSlowOperations(
    thresholdMs: number = this.thresholds.slowOperation,
  ): PerformanceMetrics[] {
    return this.metrics.filter((m) => m.duration > thresholdMs && m.success);
  }

  getPerformanceTrends(
    operation: string,
    timeWindowHours: number = 24,
  ): {
    hourlyAverages: { hour: number; avgDuration: number; count: number }[];
    trend: "improving" | "degrading" | "stable";
  } {
    const cutoffTime = Date.now() - timeWindowHours * 60 * 60 * 1000;
    const recentMetrics = this.getMetrics({
      operation,
      startTime: cutoffTime,
    });

    // Group by hour
    const hourlyData = new Map<
      number,
      { durations: number[]; count: number }
    >();

    recentMetrics.forEach((metric) => {
      const hour = Math.floor(
        (metric.timestamp - cutoffTime) / (60 * 60 * 1000),
      );
      if (!hourlyData.has(hour)) {
        hourlyData.set(hour, { durations: [], count: 0 });
      }
      const data = hourlyData.get(hour)!;
      data.durations.push(metric.duration);
      data.count++;
    });

    const hourlyAverages = Array.from(hourlyData.entries())
      .map(([hour, data]) => ({
        hour,
        avgDuration:
          data.durations.reduce((a, b) => a + b, 0) / data.durations.length,
        count: data.count,
      }))
      .sort((a, b) => a.hour - b.hour);

    // Determine trend
    let trend: "improving" | "degrading" | "stable" = "stable";
    if (hourlyAverages.length >= 2) {
      const firstHalf = hourlyAverages.slice(
        0,
        Math.floor(hourlyAverages.length / 2),
      );
      const secondHalf = hourlyAverages.slice(
        Math.floor(hourlyAverages.length / 2),
      );

      const firstAvg =
        firstHalf.reduce((sum, h) => sum + h.avgDuration, 0) / firstHalf.length;
      const secondAvg =
        secondHalf.reduce((sum, h) => sum + h.avgDuration, 0) /
        secondHalf.length;

      const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;

      if (changePercent > 10) trend = "degrading";
      else if (changePercent < -10) trend = "improving";
    }

    return { hourlyAverages, trend };
  }

  clearMetrics(): void {
    this.metrics = [];
    this.baselineMetrics.clear();
    this.emit("cleared");
    logger.info("Performance metrics cleared");
  }

  // Memory optimization helpers
  suggestMemoryOptimizations(): string[] {
    const suggestions: string[] = [];
    const currentMemory = process.memoryUsage();

    if (currentMemory.heapUsed > this.thresholds.highMemory * 0.8) {
      suggestions.push(
        "High memory usage detected - consider implementing object pooling",
      );
      suggestions.push(
        "Review file processing to use streams instead of loading entire files",
      );
      suggestions.push(
        "Implement proper cleanup of large objects and event listeners",
      );
    }

    // Check for memory leaks in metrics
    if (this.metrics.length > this.MAX_METRICS * 0.9) {
      suggestions.push(
        "Performance metrics buffer nearly full - consider reducing retention",
      );
    }

    return suggestions;
  }
}

// Create global instance
export const perfMonitor = PerformanceMonitor.getInstance();

// Utility decorators for easy performance monitoring
export function PerformanceTracked(operationName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const opName =
        operationName || `${target.constructor.name}.${propertyKey}`;
      return perfMonitor.measureOperation(
        opName,
        () => originalMethod.apply(this, args),
        {
          className: target.constructor.name,
          methodName: propertyKey,
          argCount: args.length,
        },
      );
    };

    return descriptor;
  };
}

// Batch operation optimizer
export class BatchOptimizer {
  static async processInBatches<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    batchSize: number = 10,
    concurrency: number = 3,
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      // Process concurrent batches
      const batchPromises = [];
      for (let j = 0; j < Math.min(concurrency, batch.length); j++) {
        batchPromises.push(processor(batch[j]));
      }

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }
}
