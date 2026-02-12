// src/ipc/runtime/__tests__/DotNetRuntimeProvider.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { dotNetRuntimeProvider } from "../providers/DotNetRuntimeProvider";
import { runtimeRegistry } from "../RuntimeProviderRegistry";
import { executionKernel } from "../../security/execution_kernel";
import type { ScaffoldOptions, RunOptions, BuildOptions } from "../RuntimeProvider";

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

describe("DotNetRuntimeProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("runtime properties", () => {
    it("should have correct runtimeId", () => {
      expect(dotNetRuntimeProvider.runtimeId).toBe("dotnet");
    });

    it("should have correct runtimeName", () => {
      expect(dotNetRuntimeProvider.runtimeName).toBe(".NET");
    });

    it("should support expected stack types", () => {
      expect(dotNetRuntimeProvider.supportedStackTypes).toContain("wpf");
      expect(dotNetRuntimeProvider.supportedStackTypes).toContain("winui3");
      expect(dotNetRuntimeProvider.supportedStackTypes).toContain("winforms");
      expect(dotNetRuntimeProvider.supportedStackTypes).toContain("console");
      expect(dotNetRuntimeProvider.supportedStackTypes).toContain("maui");
    });

    it("should use external-window preview strategy", () => {
      expect(dotNetRuntimeProvider.previewStrategy).toBe("external-window");
    });

    it("should have 5GB disk quota", () => {
      expect(dotNetRuntimeProvider.diskQuotaBytes).toBe(5 * 1024 * 1024 * 1024);
    });
  });

  describe("checkPrerequisites", () => {
    it("should return installed=true when dotnet and msbuild are available", async () => {
      vi.mocked(executionKernel.execute)
        .mockResolvedValueOnce({
          stdout: "6.0.400",
          stderr: "",
          exitCode: 0,
          duration: 100,
          riskLevel: "low",
        })
        .mockResolvedValueOnce({
          stdout: "C:\\Program Files\\dotnet\\dotnet.exe",
          stderr: "",
          exitCode: 0,
          duration: 100,
          riskLevel: "low",
        });

      const result = await dotNetRuntimeProvider.checkPrerequisites();

      expect(result.installed).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it("should return missing .NET SDK when dotnet is not found", async () => {
      vi.mocked(executionKernel.execute)
        .mockRejectedValueOnce(new Error("Command not found"))
        .mockResolvedValueOnce({
          stdout: "C:\\Program Files\\dotnet\\dotnet.exe",
          stderr: "",
          exitCode: 0,
          duration: 100,
          riskLevel: "low",
        });

      const result = await dotNetRuntimeProvider.checkPrerequisites();

      expect(result.installed).toBe(false);
      expect(result.missing).toContain(".NET SDK");
    });

    it("should return missing MSBuild when msbuild is not found", async () => {
      vi.mocked(executionKernel.execute)
        .mockResolvedValueOnce({
          stdout: "6.0.400",
          stderr: "",
          exitCode: 0,
          duration: 100,
          riskLevel: "low",
        })
        .mockRejectedValueOnce(new Error("Command not found"));

      const result = await dotNetRuntimeProvider.checkPrerequisites();

      expect(result.installed).toBe(false);
      expect(result.missing).toContain("MSBuild (Windows SDK)");
    });
  });

  describe("getRiskProfile", () => {
    it.each([
      [["restore"], "high"],
      [["add", "package", "Newtonsoft.Json"], "high"],
      [["nuget", "push"], "high"],
      [["build"], "medium"],
      [["publish"], "medium"],
      [["pack"], "medium"],
      [["--version"], "low"],
      [["clean"], "low"],
      [["list"], "low"],
    ])("should classify dotnet %s as %s risk", (args, expectedRisk) => {
      const risk = dotNetRuntimeProvider.getRiskProfile("dotnet", args);
      expect(risk).toBe(expectedRisk);
    });
  });

  describe("resolveDependencies", () => {
    it("should execute dotnet restore through kernel", async () => {
      vi.mocked(executionKernel.execute).mockResolvedValueOnce({
        stdout: "Restore completed",
        stderr: "",
        exitCode: 0,
        duration: 5000,
        riskLevel: "high",
      });

      await dotNetRuntimeProvider.resolveDependencies({
        appPath: "/test/app",
        appId: 123,
      });

      expect(executionKernel.execute).toHaveBeenCalledWith(
        { command: "dotnet", args: ["restore"] },
        expect.objectContaining({
          appId: 123,
          cwd: "/test/app",
          networkAccess: true,
          memoryLimitMB: 4096,
        }),
        "dotnet"
      );
    });
  });

  describe("build", () => {
    it("should execute dotnet build with Debug configuration by default", async () => {
      vi.mocked(executionKernel.execute).mockResolvedValueOnce({
        stdout: "Build succeeded",
        stderr: "",
        exitCode: 0,
        duration: 15000,
        riskLevel: "medium",
      });

      const options: BuildOptions = {
        appId: 123,
        appPath: "/test/app",
      };

      const result = await dotNetRuntimeProvider.build(options);

      expect(result.success).toBe(true);
      expect(executionKernel.execute).toHaveBeenCalledWith(
        { command: "dotnet", args: ["build", "--configuration", "Debug", "--verbosity", "normal"] },
        expect.objectContaining({
          appId: 123,
          cwd: "/test/app",
          networkAccess: false,
          memoryLimitMB: 4096,
        }),
        "dotnet"
      );
    });

    it("should use Release configuration when specified", async () => {
      vi.mocked(executionKernel.execute).mockResolvedValueOnce({
        stdout: "Build succeeded",
        stderr: "",
        exitCode: 0,
        duration: 15000,
        riskLevel: "medium",
      });

      const options: BuildOptions = {
        appId: 123,
        appPath: "/test/app",
        configuration: "Release",
      };

      await dotNetRuntimeProvider.build(options);

      expect(executionKernel.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.arrayContaining(["--configuration", "Release"]),
        }),
        expect.anything(),
        "dotnet"
      );
    });

    it("should parse errors and warnings from build output", async () => {
      vi.mocked(executionKernel.execute).mockResolvedValueOnce({
        stdout: "",
        stderr: `error CS0103: The name 'foo' does not exist
warning CS0168: Variable is declared but never used
error MSB1009: Project file does not exist`,
        exitCode: 1,
        duration: 5000,
        riskLevel: "medium",
      });

      const options: BuildOptions = {
        appId: 123,
        appPath: "/test/app",
      };

      const result = await dotNetRuntimeProvider.build(options);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors![0]).toContain("CS0103");
      expect(result.errors![1]).toContain("MSB1009");
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings![0]).toContain("CS0168");
    });
  });

  describe("run", () => {
    it("should start app with dotnet run", async () => {
      vi.mocked(executionKernel.execute).mockResolvedValueOnce({
        stdout: "Application started. Press Ctrl+C to shut down.",
        stderr: "",
        exitCode: 0,
        duration: 3000,
        riskLevel: "medium",
      });

      const options: RunOptions = {
        appId: 123,
        appPath: "/test/app",
      };

      const result = await dotNetRuntimeProvider.run(options);

      expect(result.ready).toBe(true);
      expect(result.jobId).toContain("dotnet");
      expect(executionKernel.execute).toHaveBeenCalledWith(
        { command: "dotnet", args: ["run", "--verbosity", "normal"] },
        expect.objectContaining({
          appId: 123,
          cwd: "/test/app",
          mode: "session",
        }),
        "dotnet"
      );
    });
  });

  describe("stop", () => {
    it("should terminate job when jobId provided", async () => {
      await dotNetRuntimeProvider.stop(123, "job_test_456_dotnet");

      expect(executionKernel.terminateJob).toHaveBeenCalledWith("job_test_456_dotnet");
    });

    it("should use taskkill fallback when no jobId", async () => {
      vi.mocked(executionKernel.execute).mockResolvedValueOnce({
        stdout: "SUCCESS",
        stderr: "",
        exitCode: 0,
        duration: 1000,
        riskLevel: "low",
      });

      await dotNetRuntimeProvider.stop(123);

      expect(executionKernel.execute).toHaveBeenCalledWith(
        { command: "taskkill", args: ["/F", "/IM", "dotnet.exe"] },
        expect.objectContaining({ appId: 123 }),
        "dotnet"
      );
    });
  });

  describe("isReady", () => {
    it.each([
      ["Application started. Press Ctrl+C to shut down.", true],
      ["Now listening on: http://localhost:5000", true],
      ["Hosting environment: Development", true],
      ["Content root path: C:\\app", true],
      ["Build succeeded.", true],
      ["Restoring packages...", false],
      ["Build FAILED.", false],
      ["Error: Project file not found", false],
    ])("should detect ready state for: %s", (message, expected) => {
      expect(dotNetRuntimeProvider.isReady(message)).toBe(expected);
    });
  });

  describe("package", () => {
    it("should create self-contained publish package", async () => {
      vi.mocked(executionKernel.execute).mockResolvedValueOnce({
        stdout: "Publish succeeded",
        stderr: "",
        exitCode: 0,
        duration: 30000,
        riskLevel: "medium",
      });

      const options = {
        appPath: "/test/app",
        outputFormat: "exe" as const,
        architecture: "x64" as const,
      };

      await dotNetRuntimeProvider.package!(options);

      expect(executionKernel.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "dotnet",
          args: expect.arrayContaining([
            "publish",
            "--configuration", "Release",
            "--output", expect.stringContaining("publish"),
            "--self-contained", "true",
            "--runtime", "win-x64",
          ]),
        }),
        expect.objectContaining({
          memoryLimitMB: 8192,
          timeout: 900000,
        }),
        "dotnet"
      );
    });

    it("should add PublishSingleFile for single-file format", async () => {
      vi.mocked(executionKernel.execute).mockResolvedValueOnce({
        stdout: "Publish succeeded",
        stderr: "",
        exitCode: 0,
        duration: 30000,
        riskLevel: "medium",
      });

      const options = {
        appPath: "/test/app",
        outputFormat: "single-file" as const,
      };

      await dotNetRuntimeProvider.package!(options);

      expect(executionKernel.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.arrayContaining(["-p:PublishSingleFile=true"]),
        }),
        expect.anything(),
        "dotnet"
      );
    });
  });
});

describe("DotNetRuntimeProvider via Registry", () => {
  it("should resolve dotnet provider from registry", () => {
    const provider = runtimeRegistry.getProvider("dotnet");
    expect(provider.runtimeId).toBe("dotnet");
    expect(provider.runtimeName).toBe(".NET");
  });

  it.each([
    ["wpf"],
    ["winui3"],
    ["winforms"],
    ["console"],
    ["maui"],
  ])("should resolve dotnet provider for stack type: %s", (stackType) => {
    const provider = runtimeRegistry.getProviderForStack(stackType);
    expect(provider.runtimeId).toBe("dotnet");
  });
});
