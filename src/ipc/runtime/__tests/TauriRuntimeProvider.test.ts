// src/ipc/runtime/__tests__/TauriRuntimeProvider.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { tauriRuntimeProvider } from "../providers/TauriRuntimeProvider";
import { runtimeRegistry } from "../RuntimeProviderRegistry";
import { executionKernel } from "../../security/execution_kernel";
import type { RunOptions, BuildOptions } from "../RuntimeProvider";

// Mock dependencies
vi.mock("../../security/execution_kernel", () => ({
  executionKernel: {
    execute: vi.fn(),
    terminateJob: vi.fn(),
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

describe("TauriRuntimeProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("runtime properties", () => {
    it("should have correct runtimeId", () => {
      expect(tauriRuntimeProvider.runtimeId).toBe("tauri");
    });

    it("should have correct runtimeName", () => {
      expect(tauriRuntimeProvider.runtimeName).toBe("Tauri");
    });

    it("should support expected stack types", () => {
      expect(tauriRuntimeProvider.supportedStackTypes).toContain("tauri-react");
      expect(tauriRuntimeProvider.supportedStackTypes).toContain("tauri-vue");
      expect(tauriRuntimeProvider.supportedStackTypes).toContain(
        "tauri-svelte",
      );
      expect(tauriRuntimeProvider.supportedStackTypes).toContain("tauri-solid");
    });

    it("should use external-window preview strategy", () => {
      expect(tauriRuntimeProvider.previewStrategy).toBe("external-window");
    });

    it("should have 3GB disk quota", () => {
      expect(tauriRuntimeProvider.diskQuotaBytes).toBe(3 * 1024 * 1024 * 1024);
    });
  });

  describe("checkPrerequisites", () => {
    it("should return installed=true when all prerequisites are available", async () => {
      vi.mocked(executionKernel.execute)
        .mockResolvedValueOnce({
          stdout: "v18.0.0",
          stderr: "",
          exitCode: 0,
          duration: 100,
          riskLevel: "low",
        })
        .mockResolvedValueOnce({
          stdout: "rustc 1.70.0",
          stderr: "",
          exitCode: 0,
          duration: 100,
          riskLevel: "low",
        })
        .mockResolvedValueOnce({
          stdout: "cargo 1.70.0",
          stderr: "",
          exitCode: 0,
          duration: 100,
          riskLevel: "low",
        });

      const result = await tauriRuntimeProvider.checkPrerequisites();

      expect(result.installed).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it("should detect missing Node.js", async () => {
      vi.mocked(executionKernel.execute)
        .mockRejectedValueOnce(new Error("Command not found"))
        .mockResolvedValueOnce({
          stdout: "rustc 1.70.0",
          stderr: "",
          exitCode: 0,
          duration: 100,
          riskLevel: "low",
        })
        .mockResolvedValueOnce({
          stdout: "cargo 1.70.0",
          stderr: "",
          exitCode: 0,
          duration: 100,
          riskLevel: "low",
        });

      const result = await tauriRuntimeProvider.checkPrerequisites();

      expect(result.installed).toBe(false);
      expect(result.missing).toContain("Node.js");
    });

    it("should detect missing Rust", async () => {
      vi.mocked(executionKernel.execute)
        .mockResolvedValueOnce({
          stdout: "v18.0.0",
          stderr: "",
          exitCode: 0,
          duration: 100,
          riskLevel: "low",
        })
        .mockRejectedValueOnce(new Error("Command not found"))
        .mockResolvedValueOnce({
          stdout: "cargo 1.70.0",
          stderr: "",
          exitCode: 0,
          duration: 100,
          riskLevel: "low",
        });

      const result = await tauriRuntimeProvider.checkPrerequisites();

      expect(result.installed).toBe(false);
      expect(result.missing).toContain("Rust");
    });

    it("should detect missing Cargo", async () => {
      vi.mocked(executionKernel.execute)
        .mockResolvedValueOnce({
          stdout: "v18.0.0",
          stderr: "",
          exitCode: 0,
          duration: 100,
          riskLevel: "low",
        })
        .mockResolvedValueOnce({
          stdout: "rustc 1.70.0",
          stderr: "",
          exitCode: 0,
          duration: 100,
          riskLevel: "low",
        })
        .mockRejectedValueOnce(new Error("Command not found"));

      const result = await tauriRuntimeProvider.checkPrerequisites();

      expect(result.installed).toBe(false);
      expect(result.missing).toContain("Cargo");
    });
  });

  describe("getRiskProfile", () => {
    it.each([
      [["install"], "high"],
      [["run", "tauri", "init"], "high"],
      [["tauri", "build"], "medium"],
      [["cargo", "build"], "medium"],
      [["run", "build"], "medium"],
      [["--version"], "low"],
      [["run", "dev"], "low"],
    ])("should classify %s as %s risk", (args, expectedRisk) => {
      const risk = tauriRuntimeProvider.getRiskProfile("npm", args);
      expect(risk).toBe(expectedRisk);
    });
  });

  describe("resolveDependencies", () => {
    it("should execute npm install for frontend dependencies", async () => {
      vi.mocked(executionKernel.execute).mockResolvedValueOnce({
        stdout: "added 150 packages",
        stderr: "",
        exitCode: 0,
        duration: 5000,
        riskLevel: "high",
      });

      await tauriRuntimeProvider.resolveDependencies({
        appPath: "/test/app",
        appId: 123,
      });

      expect(executionKernel.execute).toHaveBeenCalledWith(
        { command: "npm", args: ["install"] },
        expect.objectContaining({
          appId: 123,
          cwd: "/test/app",
          networkAccess: true,
          memoryLimitMB: 2048,
        }),
        "tauri",
      );
    });
  });

  describe("build", () => {
    it("should execute tauri build with Debug configuration", async () => {
      vi.mocked(executionKernel.execute).mockResolvedValueOnce({
        stdout: "Finished dev [optimized + debuginfo] target(s)",
        stderr: "",
        exitCode: 0,
        duration: 300000,
        riskLevel: "medium",
      });

      const options: BuildOptions = {
        appId: 123,
        appPath: "/test/app",
        configuration: "Debug",
      };

      const result = await tauriRuntimeProvider.build(options);

      expect(result.success).toBe(true);
      expect(executionKernel.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "npm",
          args: expect.arrayContaining([
            "run",
            "tauri",
            "build",
            "--",
            "--debug",
          ]),
        }),
        expect.objectContaining({
          appId: 123,
          cwd: "/test/app",
          networkAccess: false,
          memoryLimitMB: 4096,
        }),
        "tauri",
      );
    });

    it("should use Release configuration when specified", async () => {
      vi.mocked(executionKernel.execute).mockResolvedValueOnce({
        stdout: "Finished release [optimized] target(s)",
        stderr: "",
        exitCode: 0,
        duration: 600000,
        riskLevel: "medium",
      });

      const options: BuildOptions = {
        appId: 123,
        appPath: "/test/app",
        configuration: "Release",
      };

      await tauriRuntimeProvider.build(options);

      expect(executionKernel.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.not.arrayContaining(["--debug"]),
        }),
        expect.anything(),
        "tauri",
      );
    });

    it("should parse Rust compiler errors from output", async () => {
      vi.mocked(executionKernel.execute).mockResolvedValueOnce({
        stdout: "",
        stderr: `error[E0308]: mismatched types
 --> src/main.rs:5:20
error: could not compile "app" due to previous error`,
        exitCode: 1,
        duration: 30000,
        riskLevel: "medium",
      });

      const options: BuildOptions = {
        appId: 123,
        appPath: "/test/app",
      };

      const result = await tauriRuntimeProvider.build(options);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe("run", () => {
    it("should start tauri dev server", async () => {
      vi.mocked(executionKernel.execute).mockResolvedValueOnce({
        stdout: "Running dev server...",
        stderr: "",
        exitCode: 0,
        duration: 5000,
        riskLevel: "low",
      });

      const options: RunOptions = {
        appId: 123,
        appPath: "/test/app",
      };

      const result = await tauriRuntimeProvider.run(options);

      expect(result.ready).toBe(true);
      expect(result.jobId).toContain("tauri");
      expect(executionKernel.execute).toHaveBeenCalledWith(
        { command: "npm", args: ["run", "tauri", "dev"] },
        expect.objectContaining({
          appId: 123,
          cwd: "/test/app",
          mode: "session",
        }),
        "tauri",
      );
    });
  });

  describe("stop", () => {
    it("should terminate job when jobId provided", async () => {
      await tauriRuntimeProvider.stop(123, "job_test_789_tauri");

      expect(executionKernel.terminateJob).toHaveBeenCalledWith(
        "job_test_789_tauri",
      );
    });

    it("should use taskkill fallback for cargo processes", async () => {
      vi.mocked(executionKernel.execute).mockResolvedValueOnce({
        stdout: "SUCCESS",
        stderr: "",
        exitCode: 0,
        duration: 1000,
        riskLevel: "low",
      });

      await tauriRuntimeProvider.stop(123);

      expect(executionKernel.execute).toHaveBeenCalledWith(
        { command: "taskkill", args: ["/F", "/IM", "cargo.exe"] },
        expect.objectContaining({ appId: 123 }),
        "tauri",
      );
    });
  });

  describe("isReady", () => {
    it.each([
      ["dev server running at http://localhost:1420", true],
      ["running on http://localhost:3000", true],
      ["Vite server ready", true],
      ["Compiled successfully", true],
      ["Compiling...", false],
      ["Building frontend assets...", false],
      ["Downloading Rust toolchain...", false],
    ])("should detect ready state for: %s", (message, expected) => {
      expect(tauriRuntimeProvider.isReady(message)).toBe(expected);
    });
  });
});

describe("TauriRuntimeProvider via Registry", () => {
  it("should resolve tauri provider from registry", () => {
    const provider = runtimeRegistry.getProvider("tauri");
    expect(provider.runtimeId).toBe("tauri");
    expect(provider.runtimeName).toBe("Tauri");
  });

  it.each([["tauri-react"], ["tauri-vue"], ["tauri-svelte"], ["tauri-solid"]])(
    "should resolve tauri provider for stack type: %s",
    (stackType) => {
      const provider = runtimeRegistry.getProviderForStack(stackType);
      expect(provider.runtimeId).toBe("tauri");
    },
  );
});
