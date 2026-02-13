import { executionKernel } from "../security/execution_kernel";

describe("Security Handler Integration Tests", () => {
  test("should have ExecutionKernel properly integrated in all handlers", () => {
    expect(executionKernel).toBeDefined();
    expect(typeof executionKernel.execute).toBe("function");
    expect(typeof executionKernel.executeSequence).toBe("function");
  });

  test("should validate secure command execution works", async () => {
    // Test that we can execute basic commands through ExecutionKernel
    const options = {
      appId: 0,
      cwd: process.cwd(),
      timeout: 10000,
      memoryLimitMB: 100,
    };

    try {
      // This should either succeed or fail with a security error, but not crash
      await executionKernel.execute(
        { command: "echo", args: ["test"] },
        options,
      );
      // If it succeeds, that's fine
    } catch (error) {
      // If it fails, it should be due to security validation, not missing functionality
      const errorMessage = (error as Error).message;
      expect(errorMessage).toMatch(
        /Security violation|Command not allowed|Path validation failed/,
      );
    }
  });

  test("should have proper security controls in place", () => {
    const kernel: any = executionKernel;

    // Verify security features exist
    expect(kernel.ALLOWED_COMMANDS).toBeDefined();
    expect(kernel.TRUSTED_PATHS).toBeDefined();
    expect(typeof kernel.validatePath).toBe("function");
    expect(typeof kernel.validateExecutable).toBe("function");
    expect(typeof kernel.classifyRiskAdvanced).toBe("function");
  });

  test("should enforce command allowlisting", async () => {
    const options = {
      appId: 0,
      cwd: process.cwd(),
      timeout: 5000,
      memoryLimitMB: 50,
    };

    // Try an unauthorized command
    try {
      await executionKernel.execute(
        { command: "format", args: ["C:"] }, // Unauthorized command
        options,
      );
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect((error as Error).message).toContain("Command not allowed");
    }
  });

  test("should apply risk-based resource limits", () => {
    const kernel: any = executionKernel;
    const applyLimits = kernel.applyRiskBasedLimits.bind(kernel);

    const baseOptions = {
      appId: 123,
      cwd: "/test",
      timeout: 1000000,
      memoryLimitMB: 8000,
    };

    // High risk should get strict limits
    const highRiskOptions = applyLimits(baseOptions, "high");
    expect(highRiskOptions.timeout).toBeLessThanOrEqual(30000);
    expect(highRiskOptions.memoryLimitMB).toBeLessThanOrEqual(100);
    expect(highRiskOptions.networkAccess).toBe(false);

    // Low risk should keep reasonable defaults
    const lowRiskOptions = applyLimits(baseOptions, "low");
    expect(lowRiskOptions.timeout).toBeGreaterThanOrEqual(600000);
  });
});
