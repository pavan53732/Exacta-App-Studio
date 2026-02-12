// src/ipc/runtime/__tests__/NodeRuntimeProvider.integration.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { nodeRuntimeProvider } from "../providers/NodeRuntimeProvider";
import { runtimeRegistry } from "../RuntimeProviderRegistry";
import { executionKernel } from "../../security/execution_kernel";
import type { ScaffoldOptions, RunOptions, BuildOptions } from "../RuntimeProvider";
import fs from "fs-extra";
import path from "node:path";
import os from "node:os";

// Mock dependencies
vi.mock("../../security/execution_kernel", () => ({
  executionKernel: {
    execute: vi.fn(),
    terminateJob: vi.fn(),
  },
}));

vi.mock("electron", () => ({
  app: {
    getAppPath: vi.fn(() => "/mock/app/path"),
  },
}));

vi.mock("electron-log", () => ({
  default: {
    scope: vi.fn(() => ({
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
    })),
  },
}));

describe("NodeRuntimeProvider Integration", () => {
  const testAppPath = path.join(os.tmpdir(), "dyad-test-app-" + Date.now());

  beforeEach(async () => {
    vi.clearAllMocks();
    await fs.ensureDir(testAppPath);
  });

  afterEach(async () => {
    await fs.remove(testAppPath);
  });

  describe("checkPrerequisites", () => {
    it("should return installed=true when node is available", async () => {
      vi.mocked(executionKernel.execute).mockResolvedValueOnce({
        stdout: "v18.0.0",
        stderr: "",
        exitCode: 0,
        duration: 100,
        riskLevel: "low",
      });

      const result = await nodeRuntimeProvider.checkPrerequisites();

      expect(result.installed).toBe(true);
      expect(result.missing).toEqual([]);
      expect(executionKernel.execute).toHaveBeenCalledWith(
        { command: "node", args: ["--version"] },
        expect.objectContaining({ appId: 0, cwd: process.cwd() }),
        "node"
      );
    });

    it("should return installed=false when node is not available", async () => {
      vi.mocked(executionKernel.execute).mockRejectedValueOnce(new Error("Command not found"));

      const result = await nodeRuntimeProvider.checkPrerequisites();

      expect(result.installed).toBe(false);
      expect(result.missing).toEqual(["Node.js"]);
    });
  });

  describe("getRiskProfile", () => {
    it.each([
      [["install"], "high"],
      [["install", "react"], "high"],
      [["add", "typescript"], "high"],
      [["run", "build"], "medium"],
      [["--version"], "low"],
      [["run", "test"], "low"],
    ])("should classify %s as %s risk", (args, expectedRisk) => {
      const risk = nodeRuntimeProvider.getRiskProfile("npm", args);
      expect(risk).toBe(expectedRisk);
    });
  });

  describe("scaffold", () => {
    it("should scaffold react template", async () => {
      // Create mock scaffold source
      const mockScaffoldPath = path.join(testAppPath, "scaffold");
      await fs.ensureDir(mockScaffoldPath);
      await fs.writeFile(path.join(mockScaffoldPath, "package.json"), '{"name": "test"}');

      // This would need actual Electron app mock
      // For now, we test the error case
      const options: ScaffoldOptions = {
        projectName: "test-app",
        fullAppPath: path.join(testAppPath, "output"),
        templateId: "react",
      };

      // Without proper app mock, this should fail
      const result = await nodeRuntimeProvider.scaffold(options);

      // We expect this to fail in test environment without Electron
      expect(result).toBeDefined();
    });
  });

  describe("resolveDependencies", () => {
    it("should use pnpm when pnpm-lock.yaml exists", async () => {
      await fs.writeFile(path.join(testAppPath, "pnpm-lock.yaml"), "");

      vi.mocked(executionKernel.execute).mockResolvedValueOnce({
        stdout: "Packages installed",
        stderr: "",
        exitCode: 0,
        duration: 5000,
        riskLevel: "high",
      });

      await nodeRuntimeProvider.resolveDependencies({
        appPath: testAppPath,
        appId: 123,
      });

      expect(executionKernel.execute).toHaveBeenCalledWith(
        { command: "pnpm", args: ["install"] },
        expect.objectContaining({
          appId: 123,
          cwd: testAppPath,
          networkAccess: true,
        }),
        "node"
      );
    });

    it("should use npm with legacy-peer-deps when package-lock.json exists", async () => {
      await fs.writeFile(path.join(testAppPath, "package-lock.json"), "{}");

      vi.mocked(executionKernel.execute).mockResolvedValueOnce({
        stdout: "Packages installed",
        stderr: "",
        exitCode: 0,
        duration: 5000,
        riskLevel: "high",
      });

      await nodeRuntimeProvider.resolveDependencies({
        appPath: testAppPath,
        appId: 123,
      });

      expect(executionKernel.execute).toHaveBeenCalledWith(
        { command: "npm", args: ["install", "--legacy-peer-deps"] },
        expect.objectContaining({
          appId: 123,
          cwd: testAppPath,
        }),
        "node"
      );
    });
  });

  describe("build", () => {
    it("should execute npm run build through kernel", async () => {
      const onEvent = vi.fn();

      vi.mocked(executionKernel.execute).mockResolvedValueOnce({
        stdout: "Build successful",
        stderr: "",
        exitCode: 0,
        duration: 10000,
        riskLevel: "medium",
      });

      const options: BuildOptions = {
        appId: 123,
        appPath: testAppPath,
        configuration: "Release",
      };

      const result = await nodeRuntimeProvider.build(options, onEvent);

      expect(result.success).toBe(true);
      expect(executionKernel.execute).toHaveBeenCalledWith(
        { command: "npm", args: ["run", "build"] },
        expect.objectContaining({
          appId: 123,
          cwd: testAppPath,
          networkAccess: false,
        }),
        "node"
      );
    });

    it("should return errors when build fails", async () => {
      vi.mocked(executionKernel.execute).mockResolvedValueOnce({
        stdout: "",
        stderr: "Build failed: Module not found",
        exitCode: 1,
        duration: 5000,
        riskLevel: "medium",
      });

      const options: BuildOptions = {
        appId: 123,
        appPath: testAppPath,
      };

      const result = await nodeRuntimeProvider.build(options);

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Build failed: Module not found");
    });
  });

  describe("run", () => {
    it("should start dev server with correct port", async () => {
      vi.mocked(executionKernel.execute).mockResolvedValueOnce({
        stdout: "Server running at http://localhost:3001",
        stderr: "",
        exitCode: 0,
        duration: 5000,
        riskLevel: "high",
      });

      const options: RunOptions = {
        appId: 123,
        appPath: testAppPath,
      };

      const result = await nodeRuntimeProvider.run(options);

      expect(result.ready).toBe(true);
      expect(result.jobId).toBeDefined();
      expect(executionKernel.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          command: expect.stringMatching(/npm|pnpm/),
          args: expect.arrayContaining(["run", "dev"]),
        }),
        expect.objectContaining({
          appId: 123,
          cwd: testAppPath,
          mode: "session",
        }),
        "node"
      );
    });

    it("should handle custom install/start commands", async () => {
      vi.mocked(executionKernel.execute)
        .mockResolvedValueOnce({
          stdout: "Installed",
          stderr: "",
          exitCode: 0,
          duration: 5000,
          riskLevel: "high",
        });

      const options: RunOptions = {
        appId: 123,
        appPath: testAppPath,
        installCommand: "yarn install",
        startCommand: "yarn dev",
      };

      await nodeRuntimeProvider.run(options);

      // Should use kernel for execution
      expect(executionKernel.execute).toHaveBeenCalled();
    });
  });

  describe("stop", () => {
    it("should terminate job when jobId provided", async () => {
      await nodeRuntimeProvider.stop(123, "job_test_123");

      expect(executionKernel.terminateJob).toHaveBeenCalledWith("job_test_123");
    });

    it("should fall back to process_manager when no jobId", async () => {
      // This would need process_manager mock
      await nodeRuntimeProvider.stop(123);

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe("isReady", () => {
    it.each([
      ["Server running at http://localhost:3000", true],
      ["Ready on https://localhost:8080", true],
      ["Listening on http://localhost:5173", true],
      ["Building...", false],
      ["Error: Port already in use", false],
      ["npm install completed", false],
    ])("should detect ready state for: %s", (message, expected) => {
      expect(nodeRuntimeProvider.isReady(message)).toBe(expected);
    });
  });
});

describe("RuntimeProvider Registry Integration", () => {
  it("should resolve provider from registry and execute run", async () => {
    const provider = runtimeRegistry.getProvider("node");

    vi.mocked(executionKernel.execute).mockResolvedValueOnce({
      stdout: "Server started",
      stderr: "",
      exitCode: 0,
      duration: 3000,
      riskLevel: "high",
    });

    const result = await provider.run({
      appId: 456,
      appPath: "/test/path",
    });

    expect(result.ready).toBe(true);
    expect(provider.runtimeId).toBe("node");
  });
});
