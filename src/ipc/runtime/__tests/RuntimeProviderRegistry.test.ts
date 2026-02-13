// src/ipc/runtime/__tests__/RuntimeProviderRegistry.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  runtimeRegistry,
  RuntimeProviderRegistry,
} from "../RuntimeProviderRegistry";
import type { RuntimeProvider } from "../RuntimeProvider";

// Mock provider for testing
const mockProvider: RuntimeProvider = {
  runtimeId: "test",
  runtimeName: "Test Runtime",
  supportedStackTypes: ["test-stack"],
  previewStrategy: "iframe",
  diskQuotaBytes: 1024 * 1024 * 1024, // 1GB

  async checkPrerequisites() {
    return { installed: true, missing: [] };
  },

  getRiskProfile() {
    return "low";
  },

  async scaffold() {
    return { success: true, entryPoint: "index.js" };
  },

  async resolveDependencies() {
    return {
      stdout: "",
      stderr: "",
      exitCode: 0,
      duration: 0,
      riskLevel: "low",
    };
  },

  async build() {
    return { success: true };
  },

  async run() {
    return { ready: true, jobId: "test-job-123" };
  },

  async stop() {
    // noop
  },

  async startPreview() {
    // noop
  },

  async stopPreview() {
    // noop
  },

  isReady(message: string) {
    return message.includes("ready");
  },
};

describe("RuntimeProviderRegistry", () => {
  beforeEach(() => {
    // Reset the singleton for clean tests
    // Note: In real usage, we wouldn't reset the singleton
  });

  describe("getProvider", () => {
    it("should return node runtime provider by default", () => {
      const provider = runtimeRegistry.getProvider("node");
      expect(provider).toBeDefined();
      expect(provider.runtimeId).toBe("node");
      expect(provider.runtimeName).toBe("Node.js");
    });

    it("should throw error for unknown runtime", () => {
      expect(() => runtimeRegistry.getProvider("unknown")).toThrow(
        "Unknown runtime: unknown",
      );
    });
  });

  describe("getProviderForStack", () => {
    it("should return node provider for react stack", () => {
      const provider = runtimeRegistry.getProviderForStack("react");
      expect(provider.runtimeId).toBe("node");
    });

    it("should return node provider for nextjs stack", () => {
      const provider = runtimeRegistry.getProviderForStack("nextjs");
      expect(provider.runtimeId).toBe("node");
    });

    it("should return node provider for express-react stack", () => {
      const provider = runtimeRegistry.getProviderForStack("express-react");
      expect(provider.runtimeId).toBe("node");
    });

    it("should throw error for unsupported stack type", () => {
      expect(() =>
        runtimeRegistry.getProviderForStack("unknown-stack"),
      ).toThrow("No provider found for stack type: unknown-stack");
    });
  });

  describe("register", () => {
    it("should register a new provider", () => {
      const testRegistry = new RuntimeProviderRegistry();
      testRegistry.register(mockProvider);

      const provider = testRegistry.getProvider("test");
      expect(provider).toBe(mockProvider);
    });

    it("should override existing provider on re-register", () => {
      const testRegistry = new RuntimeProviderRegistry();
      testRegistry.register(mockProvider);

      const newProvider = { ...mockProvider, runtimeName: "Updated Test" };
      testRegistry.register(newProvider);

      const provider = testRegistry.getProvider("test");
      expect(provider.runtimeName).toBe("Updated Test");
    });
  });

  describe("listProviders", () => {
    it("should include node provider in list", () => {
      const providers = runtimeRegistry.listProviders();
      const nodeProvider = providers.find((p) => p.runtimeId === "node");
      expect(nodeProvider).toBeDefined();
    });

    it("should return array of providers", () => {
      const providers = runtimeRegistry.listProviders();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);
    });
  });
});

describe("NodeRuntimeProvider (via Registry)", () => {
  const provider = runtimeRegistry.getProvider("node");

  describe("runtime properties", () => {
    it("should have correct runtimeId", () => {
      expect(provider.runtimeId).toBe("node");
    });

    it("should have correct runtimeName", () => {
      expect(provider.runtimeName).toBe("Node.js");
    });

    it("should support expected stack types", () => {
      expect(provider.supportedStackTypes).toContain("react");
      expect(provider.supportedStackTypes).toContain("nextjs");
      expect(provider.supportedStackTypes).toContain("express-react");
    });

    it("should use iframe preview strategy", () => {
      expect(provider.previewStrategy).toBe("iframe");
    });

    it("should have 2GB disk quota", () => {
      expect(provider.diskQuotaBytes).toBe(2 * 1024 * 1024 * 1024);
    });
  });

  describe("getRiskProfile", () => {
    it("should return high risk for install commands", () => {
      const risk = provider.getRiskProfile("npm", ["install"]);
      expect(risk).toBe("high");
    });

    it("should return medium risk for build commands", () => {
      const risk = provider.getRiskProfile("npm", ["run", "build"]);
      expect(risk).toBe("medium");
    });

    it("should return low risk for other commands", () => {
      const risk = provider.getRiskProfile("npm", ["--version"]);
      expect(risk).toBe("low");
    });
  });

  describe("isReady", () => {
    it("should detect localhost URL in message", () => {
      expect(provider.isReady("Server running at http://localhost:3000")).toBe(
        true,
      );
      expect(provider.isReady("Ready on https://localhost:8080")).toBe(true);
    });

    it("should return false for non-ready messages", () => {
      expect(provider.isReady("Building...")).toBe(false);
      expect(provider.isReady("Error occurred")).toBe(false);
    });
  });
});
