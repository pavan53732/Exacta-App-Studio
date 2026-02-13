import { describe, test, expect } from "vitest";
import {
  NetworkPolicySchema,
  CreateJobRequestSchema,
  JobStatisticsSchema,
  QuotaTypeSchema,
  QuotaExceededEventSchema,
} from "../guardian";

describe("Guardian Types", () => {
  describe("NetworkPolicySchema", () => {
    test("should validate a complete network policy", () => {
      const policy = {
        allowedHosts: ["127.0.0.1", "localhost"],
        blockedHosts: ["10.0.0.1"],
        allowAll: false,
        blockAll: false,
        allowLoopback: true,
      };

      const result = NetworkPolicySchema.safeParse(policy);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.allowedHosts).toEqual(["127.0.0.1", "localhost"]);
        expect(result.data.blockedHosts).toEqual(["10.0.0.1"]);
        expect(result.data.allowAll).toBe(false);
        expect(result.data.blockAll).toBe(false);
        expect(result.data.allowLoopback).toBe(true);
      }
    });

    test("should apply default values", () => {
      const policy = {};

      const result = NetworkPolicySchema.safeParse(policy);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.allowAll).toBe(false);
        expect(result.data.blockAll).toBe(false);
        expect(result.data.allowLoopback).toBe(true);
      }
    });

    test("should validate blockAll policy", () => {
      const policy = {
        blockAll: true,
        allowLoopback: true,
      };

      const result = NetworkPolicySchema.safeParse(policy);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.blockAll).toBe(true);
        expect(result.data.allowLoopback).toBe(true);
      }
    });

    test("should validate allowAll policy", () => {
      const policy = {
        allowAll: true,
      };

      const result = NetworkPolicySchema.safeParse(policy);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.allowAll).toBe(true);
      }
    });
  });

  describe("CreateJobRequestSchema", () => {
    test("should validate a basic job request", () => {
      const request = {
        jobName: "test-job",
      };

      const result = CreateJobRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.jobName).toBe("test-job");
        expect(result.data.killProcessesOnJobClose).toBe(true);
      }
    });

    test("should validate a job request with all limits", () => {
      const request = {
        jobName: "test-job",
        memoryLimitBytes: 1024 * 1024 * 256, // 256 MB
        cpuRatePercent: 50,
        activeProcessLimit: 10,
        killProcessesOnJobClose: true,
        diskQuotaBytes: 1024 * 1024 * 1024, // 1 GB
        networkPolicy: {
          blockAll: true,
          allowLoopback: true,
        },
      };

      const result = CreateJobRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.jobName).toBe("test-job");
        expect(result.data.memoryLimitBytes).toBe(1024 * 1024 * 256);
        expect(result.data.cpuRatePercent).toBe(50);
        expect(result.data.activeProcessLimit).toBe(10);
        expect(result.data.diskQuotaBytes).toBe(1024 * 1024 * 1024);
        expect(result.data.networkPolicy?.blockAll).toBe(true);
      }
    });

    test("should validate CPU rate percent range", () => {
      const invalidRequest = {
        jobName: "test-job",
        cpuRatePercent: 150, // Invalid: > 100
      };

      const result = CreateJobRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    test("should validate network policy within job request", () => {
      const request = {
        jobName: "test-job",
        networkPolicy: {
          allowedHosts: ["api.example.com", "192.168.1.1"],
          blockedHosts: ["malicious.site"],
          allowLoopback: true,
        },
      };

      const result = CreateJobRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.networkPolicy?.allowedHosts).toHaveLength(2);
        expect(result.data.networkPolicy?.blockedHosts).toHaveLength(1);
      }
    });
  });

  describe("JobStatisticsSchema", () => {
    test("should validate job statistics", () => {
      const stats = {
        jobName: "test-job",
        activeProcesses: 5,
        totalPageFaults: 1000,
        totalProcesses: 10,
        totalTerminatedProcesses: 2,
        peakMemoryUsed: 1024 * 1024 * 100,
        currentMemoryUsage: 1024 * 1024 * 50,
        totalDiskReadBytes: 1024 * 1024 * 500,
        totalDiskWriteBytes: 1024 * 1024 * 200,
        diskQuotaLimit: 1024 * 1024 * 1024,
      };

      const result = JobStatisticsSchema.safeParse(stats);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.jobName).toBe("test-job");
        expect(result.data.activeProcesses).toBe(5);
        expect(result.data.totalDiskReadBytes).toBe(1024 * 1024 * 500);
        expect(result.data.diskQuotaLimit).toBe(1024 * 1024 * 1024);
      }
    });

    test("should validate minimal job statistics", () => {
      const stats = {
        jobName: "test-job",
        activeProcesses: 0,
        totalPageFaults: 0,
        totalProcesses: 0,
        totalTerminatedProcesses: 0,
        peakMemoryUsed: 0,
        currentMemoryUsage: 0,
      };

      const result = JobStatisticsSchema.safeParse(stats);
      expect(result.success).toBe(true);
    });
  });

  describe("QuotaTypeSchema", () => {
    test("should validate all quota types", () => {
      const types = [
        "Memory",
        "DiskRead",
        "DiskWrite",
        "DiskTotal",
        "CpuRate",
        "ProcessCount",
      ];

      for (const type of types) {
        const result = QuotaTypeSchema.safeParse(type);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(type);
        }
      }
    });

    test("should reject invalid quota type", () => {
      const result = QuotaTypeSchema.safeParse("InvalidType");
      expect(result.success).toBe(false);
    });
  });

  describe("QuotaExceededEventSchema", () => {
    test("should validate quota exceeded event", () => {
      const event = {
        jobName: "test-job",
        quotaType: "DiskTotal",
        limit: 1024 * 1024 * 1024,
        currentValue: 1024 * 1024 * 1024 * 2,
        timestamp: Date.now(),
      };

      const result = QuotaExceededEventSchema.safeParse(event);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.jobName).toBe("test-job");
        expect(result.data.quotaType).toBe("DiskTotal");
        expect(result.data.limit).toBe(1024 * 1024 * 1024);
        expect(result.data.currentValue).toBe(1024 * 1024 * 1024 * 2);
      }
    });

    test("should validate memory quota exceeded event", () => {
      const event = {
        jobName: "test-job",
        quotaType: "Memory",
        limit: 1024 * 1024 * 256,
        currentValue: 1024 * 1024 * 300,
        timestamp: Date.now(),
      };

      const result = QuotaExceededEventSchema.safeParse(event);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.quotaType).toBe("Memory");
      }
    });
  });
});
