import { ExecutionKernel } from '../security/execution_kernel';

describe('ExecutionKernel Security Foundation', () => {
  test('should be able to create ExecutionKernel instance', () => {
    const kernel = ExecutionKernel.getInstance();
    expect(kernel).toBeDefined();
    expect(typeof kernel.execute).toBe('function');
    expect(typeof kernel.executeSequence).toBe('function');
  });

  test('should have security command allowlist', () => {
    const kernel: any = ExecutionKernel.getInstance();
    expect(kernel.ALLOWED_COMMANDS).toBeDefined();
    expect(kernel.ALLOWED_COMMANDS.has('npm')).toBe(true);
    expect(kernel.ALLOWED_COMMANDS.has('node')).toBe(true);
    expect(kernel.ALLOWED_COMMANDS.has('dotnet')).toBe(true);
  });

  test('should have trusted paths configuration', () => {
    const kernel: any = ExecutionKernel.getInstance();
    expect(kernel.TRUSTED_PATHS).toBeDefined();
    expect(Array.isArray(kernel.TRUSTED_PATHS.npm)).toBe(true);
    expect(Array.isArray(kernel.TRUSTED_PATHS.dotnet)).toBe(true);
  });

  test('should classify risk levels correctly', () => {
    const kernel: any = ExecutionKernel.getInstance();
    
    // Test private method through binding
    const classifyRisk = kernel.classifyRiskAdvanced.bind(kernel);
    
    expect(classifyRisk('rm', ['-rf'], 'node')).toBe('high');
    expect(classifyRisk('npm', ['install'], 'node')).toBe('medium');
    expect(classifyRisk('echo', ['hello'], 'default')).toBe('low');
  });

  test('should apply risk-based resource limits', () => {
    const kernel: any = ExecutionKernel.getInstance();
    const applyLimits = kernel.applyRiskBasedLimits.bind(kernel);
    
    const baseOptions = {
      appId: 123,
      cwd: '/test',
      timeout: 1000000,
      memoryLimitMB: 8000
    };
    
    const highRiskOptions = applyLimits(baseOptions, 'high');
    expect(highRiskOptions.timeout).toBeLessThanOrEqual(30000);
    expect(highRiskOptions.memoryLimitMB).toBeLessThanOrEqual(100);
    
    const lowRiskOptions = applyLimits(baseOptions, 'low');
    expect(lowRiskOptions.timeout).toBeGreaterThanOrEqual(600000);
  });
});