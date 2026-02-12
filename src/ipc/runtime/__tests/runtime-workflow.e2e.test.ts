// src/ipc/runtime/__tests__/runtime-workflow.e2e.test.ts
// End-to-end integration tests for RuntimeProvider workflow
// Tests the complete lifecycle: create app → scaffold → build → run → stop

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { runtimeRegistry } from "../RuntimeProviderRegistry";
import { nodeRuntimeProvider } from "../providers/NodeRuntimeProvider";
import { dotNetRuntimeProvider } from "../providers/DotNetRuntimeProvider";
import { tauriRuntimeProvider } from "../providers/TauriRuntimeProvider";
import { executionKernel } from "../../security/execution_kernel";
import type { ScaffoldOptions, BuildOptions, RunOptions } from "../RuntimeProvider";

// Mock execution kernel for controlled testing
vi.mock("../../security/execution_kernel", () => ({
  executionKernel: {
    execute: vi.fn(),
    terminateJob: vi.fn(),
  },
}));

// Mock electron module for scaffold method
vi.mock("electron", () => ({
  app: {
    getAppPath: vi.fn(() => "/mock/app/path"),
  },
}));

// Mock copyDirectoryRecursive for scaffold method
vi.mock("../../utils/file_utils", () => ({
  copyDirectoryRecursive: vi.fn(),
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

describe("RuntimeProvider E2E Workflow", () => {
  beforeAll(() => {
    // Ensure all providers are registered
    expect(runtimeRegistry.listProviders()).toHaveLength(3);
  });

  afterAll(() => {
    vi.clearAllMocks();
  });

  describe("Complete App Lifecycle", () => {
    const testAppId = 999;
    const testAppPath = "/test/e2e-app";

    it("should resolve correct provider for each stack type", () => {
      const testCases = [
        { stack: "react", expectedRuntime: "node" },
        { stack: "nextjs", expectedRuntime: "node" },
        { stack: "wpf", expectedRuntime: "dotnet" },
        { stack: "winui3", expectedRuntime: "dotnet" },
        { stack: "winforms", expectedRuntime: "dotnet" },
        { stack: "tauri-react", expectedRuntime: "tauri" },
        { stack: "tauri-vue", expectedRuntime: "tauri" },
      ];

      for (const { stack, expectedRuntime } of testCases) {
        const provider = runtimeRegistry.getProviderForStack(stack);
        expect(provider.runtimeId).toBe(expectedRuntime);
      }
    });

    describe("Node.js Workflow (React)", () => {
      const provider = nodeRuntimeProvider;

      it("should complete full Node.js app lifecycle", async () => {
        // 1. Check prerequisites
        vi.mocked(executionKernel.execute).mockResolvedValueOnce({
          stdout: "v18.0.0",
          stderr: "",
          exitCode: 0,
          duration: 100,
          riskLevel: "low",
        });

        const prereqs = await provider.checkPrerequisites();
        expect(prereqs.installed).toBe(true);

        // 2. Scaffold app
        const scaffoldOptions: ScaffoldOptions = {
          projectName: "test-react-app",
          fullAppPath: testAppPath,
          templateId: "react",
        };

        vi.mocked(executionKernel.execute).mockResolvedValueOnce({
          stdout: "Scaffolded successfully",
          stderr: "",
          exitCode: 0,
          duration: 5000,
          riskLevel: "high",
        });

        const scaffoldResult = await provider.scaffold(scaffoldOptions);
        expect(scaffoldResult.success).toBe(true);

        // 3. Install dependencies
        vi.mocked(executionKernel.execute).mockResolvedValueOnce({
          stdout: "added 150 packages",
          stderr: "",
          exitCode: 0,
          duration: 30000,
          riskLevel: "high",
        });

        const depsResult = await provider.resolveDependencies({
          appPath: testAppPath,
          appId: testAppId,
        });
        expect(depsResult.exitCode).toBe(0);

        // 4. Build
        const buildOptions: BuildOptions = {
          appId: testAppId,
          appPath: testAppPath,
          configuration: "Release",
        };

        vi.mocked(executionKernel.execute).mockResolvedValueOnce({
          stdout: "Build successful",
          stderr: "",
          exitCode: 0,
          duration: 60000,
          riskLevel: "medium",
        });

        const buildResult = await provider.build(buildOptions);
        expect(buildResult.success).toBe(true);

        // 5. Run
        const runOptions: RunOptions = {
          appId: testAppId,
          appPath: testAppPath,
        };

        vi.mocked(executionKernel.execute).mockResolvedValueOnce({
          stdout: "Server running at http://localhost:3000",
          stderr: "",
          exitCode: 0,
          duration: 5000,
          riskLevel: "high",
        });

        const runResult = await provider.run(runOptions);
        expect(runResult.ready).toBe(true);
        expect(runResult.jobId).toBeDefined();

        // 6. Stop
        await provider.stop(testAppId, runResult.jobId);
        expect(executionKernel.terminateJob).toHaveBeenCalledWith(runResult.jobId);
      });
    });

    describe(".NET Workflow (WPF)", () => {
      const provider = dotNetRuntimeProvider;

      it("should complete full .NET app lifecycle", async () => {
        // 1. Check prerequisites
        vi.mocked(executionKernel.execute)
          .mockResolvedValueOnce({ stdout: "6.0.400", stderr: "", exitCode: 0, duration: 100, riskLevel: "low" })
          .mockResolvedValueOnce({ stdout: "MSBuild", stderr: "", exitCode: 0, duration: 100, riskLevel: "low" });

        const prereqs = await provider.checkPrerequisites();
        expect(prereqs.installed).toBe(true);

        // 2. Scaffold
        const scaffoldOptions: ScaffoldOptions = {
          projectName: "test-wpf-app",
          fullAppPath: testAppPath,
          templateId: "wpf",
        };

        vi.mocked(executionKernel.execute).mockResolvedValueOnce({
          stdout: "Template created successfully",
          stderr: "",
          exitCode: 0,
          duration: 10000,
          riskLevel: "high",
        });

        const scaffoldResult = await provider.scaffold(scaffoldOptions);
        expect(scaffoldResult.success).toBe(true);

        // 3. Restore dependencies
        vi.mocked(executionKernel.execute).mockResolvedValueOnce({
          stdout: "Restore completed",
          stderr: "",
          exitCode: 0,
          duration: 30000,
          riskLevel: "high",
        });

        const depsResult = await provider.resolveDependencies({
          appPath: testAppPath,
          appId: testAppId,
        });
        expect(depsResult.exitCode).toBe(0);

        // 4. Build
        const buildOptions: BuildOptions = {
          appId: testAppId,
          appPath: testAppPath,
          configuration: "Debug",
        };

        vi.mocked(executionKernel.execute).mockResolvedValueOnce({
          stdout: "Build succeeded",
          stderr: "",
          exitCode: 0,
          duration: 45000,
          riskLevel: "medium",
        });

        const buildResult = await provider.build(buildOptions);
        expect(buildResult.success).toBe(true);

        // 5. Run
        const runOptions: RunOptions = {
          appId: testAppId,
          appPath: testAppPath,
        };

        vi.mocked(executionKernel.execute).mockResolvedValueOnce({
          stdout: "Application started",
          stderr: "",
          exitCode: 0,
          duration: 8000,
          riskLevel: "medium",
        });

        const runResult = await provider.run(runOptions);
        expect(runResult.ready).toBe(true);
        expect(runResult.jobId).toBeDefined();

        // 6. Stop
        await provider.stop(testAppId, runResult.jobId);
        expect(executionKernel.terminateJob).toHaveBeenCalledWith(runResult.jobId);
      });
    });

    describe("Tauri Workflow (React)", () => {
      const provider = tauriRuntimeProvider;

      it("should complete full Tauri app lifecycle", async () => {
        // 1. Check prerequisites
        vi.mocked(executionKernel.execute)
          .mockResolvedValueOnce({ stdout: "v18.0.0", stderr: "", exitCode: 0, duration: 100, riskLevel: "low" })
          .mockResolvedValueOnce({ stdout: "rustc 1.70.0", stderr: "", exitCode: 0, duration: 100, riskLevel: "low" })
          .mockResolvedValueOnce({ stdout: "cargo 1.70.0", stderr: "", exitCode: 0, duration: 100, riskLevel: "low" });

        const prereqs = await provider.checkPrerequisites();
        expect(prereqs.installed).toBe(true);

        // 2. Scaffold
        const scaffoldOptions: ScaffoldOptions = {
          projectName: "test-tauri-app",
          fullAppPath: testAppPath,
          templateId: "tauri-react",
        };

        vi.mocked(executionKernel.execute).mockResolvedValueOnce({
          stdout: "Vite project created",
          stderr: "",
          exitCode: 0,
          duration: 15000,
          riskLevel: "high",
        });

        const scaffoldResult = await provider.scaffold(scaffoldOptions);
        expect(scaffoldResult.success).toBe(true);

        // 3. Install dependencies
        vi.mocked(executionKernel.execute).mockResolvedValueOnce({
          stdout: "added 200 packages",
          stderr: "",
          exitCode: 0,
          duration: 60000,
          riskLevel: "high",
        });

        const depsResult = await provider.resolveDependencies({
          appPath: testAppPath,
          appId: testAppId,
        });
        expect(depsResult.exitCode).toBe(0);

        // 4. Build
        const buildOptions: BuildOptions = {
          appId: testAppId,
          appPath: testAppPath,
          configuration: "Release",
        };

        vi.mocked(executionKernel.execute).mockResolvedValueOnce({
          stdout: "Finished release build",
          stderr: "",
          exitCode: 0,
          duration: 300000,
          riskLevel: "medium",
        });

        const buildResult = await provider.build(buildOptions);
        expect(buildResult.success).toBe(true);

        // 5. Run
        const runOptions: RunOptions = {
          appId: testAppId,
          appPath: testAppPath,
        };

        vi.mocked(executionKernel.execute).mockResolvedValueOnce({
          stdout: "Running dev server",
          stderr: "",
          exitCode: 0,
          duration: 10000,
          riskLevel: "low",
        });

        const runResult = await provider.run(runOptions);
        expect(runResult.ready).toBe(true);
        expect(runResult.jobId).toBeDefined();

        // 6. Stop
        await provider.stop(testAppId, runResult.jobId);
        expect(executionKernel.terminateJob).toHaveBeenCalledWith(runResult.jobId);
      });
    });
  });

  describe("Provider Consistency", () => {
    const providers = runtimeRegistry.listProviders();

    it("all providers should implement required interface", () => {
      for (const provider of providers) {
        expect(provider.runtimeId).toBeDefined();
        expect(provider.runtimeName).toBeDefined();
        expect(provider.supportedStackTypes).toBeInstanceOf(Array);
        expect(provider.supportedStackTypes.length).toBeGreaterThan(0);
        expect(provider.previewStrategy).toMatch(/iframe|external-window|console-output|hybrid/);
        expect(typeof provider.checkPrerequisites).toBe("function");
        expect(typeof provider.getRiskProfile).toBe("function");
        expect(typeof provider.scaffold).toBe("function");
        expect(typeof provider.resolveDependencies).toBe("function");
        expect(typeof provider.build).toBe("function");
        expect(typeof provider.run).toBe("function");
        expect(typeof provider.stop).toBe("function");
        expect(typeof provider.isReady).toBe("function");
      }
    });

    it("all providers should have unique runtimeIds", () => {
      const ids = providers.map((p) => p.runtimeId);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("risk profiles should be consistent", () => {
      for (const provider of providers) {
        const risk = provider.getRiskProfile("test", ["--version"]);
        expect(["low", "medium", "high", "critical"]).toContain(risk);
      }
    });
  });
});
