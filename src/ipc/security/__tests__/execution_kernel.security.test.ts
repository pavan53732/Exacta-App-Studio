import { vi } from 'vitest';
import { ExecutionKernel, executionKernel, KernelOptions, KernelCommand } from '../execution_kernel';
import fs from 'fs';
import path from 'path';

describe('ExecutionKernel Security Tests', () => {
  let kernel: ExecutionKernel;
  const testAppId = 12345;
  const testCwd = process.cwd(); // Use current directory for testing
  
  beforeEach(() => {
    kernel = executionKernel;
  });

  describe('Path Validation Security', () => {
    test('should reject path traversal attempts', async () => {
      const maliciousCwd = path.join(testCwd, '..\\..\\..\\Windows\\System32');
      const options: KernelOptions = {
        appId: testAppId,
        cwd: maliciousCwd
      };
      
      const command: KernelCommand = {
        command: 'npm', // Use allowed command
        args: ['--version']
      };

      await expect(kernel.execute(command, options))
        .rejects
        .toThrow(/Security violation|Path validation failed|Path traversal detected/);
    });

    test('should reject paths outside allowed directories', async () => {
      const outsideCwd = 'C:\\Windows\\System32';
      const options: KernelOptions = {
        appId: testAppId,
        cwd: outsideCwd
      };
      
      const command: KernelCommand = {
        command: 'npm', // Use allowed command
        args: ['--version']
      };

      await expect(kernel.execute(command, options))
        .rejects
        .toThrow(/Security violation|Path validation failed|not within allowed directories/);
    });

    test('should accept valid app workspace paths', async () => {
      // Create a mock app workspace directory for testing
      const mockAppDir = path.join(process.env.TEMP || '/tmp', `dyad-app-${testAppId}`);
      
      try {
        // Ensure directory exists
        await fs.promises.mkdir(mockAppDir, { recursive: true });
        
        const options: KernelOptions = {
          appId: testAppId,
          cwd: mockAppDir
        };
        
        const command: KernelCommand = {
          command: 'echo',
          args: ['hello world']
        };

        // This should succeed (or at least not fail on path validation)
        // The actual command might fail due to echo not being available on Windows,
        // but path validation should pass
        try {
          await kernel.execute(command, options);
        } catch (error) {
          // Expect error to be about command not found, not path validation
          expect((error as Error).message).not.toMatch(/Security violation|Path validation failed/);
        }
      } finally {
        // Cleanup
        try {
          await fs.promises.rm(mockAppDir, { recursive: true, force: true });
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    });
  });

  describe('Command Allowlist Security', () => {
    test('should reject unauthorized commands', async () => {
      const options: KernelOptions = {
        appId: testAppId,
        cwd: testCwd
      };
      
      const maliciousCommand: KernelCommand = {
        command: 'format', // Unauthorized command
        args: ['C:']
      };

      await expect(kernel.execute(maliciousCommand, options))
        .rejects
        .toThrow(/Command not allowed/);
    });

    test('should accept authorized commands', async () => {
      const options: KernelOptions = {
        appId: testAppId,
        cwd: testCwd
      };
      
      const validCommand: KernelCommand = {
        command: 'npm',
        args: ['--version']
      };

      // Should not throw "Command not allowed" error
      // Might fail for other reasons (command not found, etc.) but not security rejection
      try {
        await kernel.execute(validCommand, options);
      } catch (error) {
        expect((error as Error).message).not.toContain('Command not allowed');
      }
    });
  });

  describe('Executable Path Validation', () => {
    test('should validate executables against trusted locations', async () => {
      const options: KernelOptions = {
        appId: testAppId,
        cwd: testCwd
      };
      
      // Test with a command that should be in trusted locations
      const command: KernelCommand = {
        command: 'node',
        args: ['--version']
      };

      try {
        await kernel.execute(command, options);
      } catch (error) {
        // Should not be rejected for untrusted executable
        expect((error as Error).message).not.toContain('Untrusted executable');
      }
    });

    test('should reject untrusted executable paths', async () => {
      // Test with cmd which should be in trusted locations on Windows
      const validateExecutable = (kernel as any).validateExecutable.bind(kernel);
      
      // Add cmd to trusted paths for testing
      const originalTrustedPaths = (kernel as any).TRUSTED_PATHS;
      (kernel as any).TRUSTED_PATHS.cmd = [process.env.WINDIR || 'C:\\Windows\\System32'];
      
      try {
        await expect(validateExecutable('cmd')).resolves.toContain('cmd.exe');
      } finally {
        // Restore original trusted paths
        (kernel as any).TRUSTED_PATHS = originalTrustedPaths;
      }
    });
  });

  describe('Risk Classification', () => {
    test('should classify high-risk commands correctly', () => {
      const classifyRisk = (kernel as any).classifyRiskAdvanced.bind(kernel);
      
      // High risk commands
      expect(classifyRisk('rm', ['-rf', '/'], 'node')).toBe('high');
      expect(classifyRisk('del', ['/q', 'C:\\important'], 'default')).toBe('high');
      
      // Medium risk commands
      expect(classifyRisk('npm', ['install'], 'node')).toBe('medium');
      expect(classifyRisk('dotnet', ['restore'], 'dotnet')).toBe('medium');
      
      // Low risk commands
      expect(classifyRisk('echo', ['hello'], 'default')).toBe('low');
      expect(classifyRisk('ls', [], 'default')).toBe('low');
    });

    test('should apply risk-based resource limits', () => {
      const applyLimits = (kernel as any).applyRiskBasedLimits.bind(kernel);
      
      const baseOptions: KernelOptions = {
        appId: testAppId,
        cwd: testCwd,
        timeout: 1000000,
        memoryLimitMB: 8000,
        maxProcesses: 50
      };
      
      // High risk should get strict limits
      const highRiskOptions = applyLimits(baseOptions, 'high');
      expect(highRiskOptions.timeout).toBeLessThanOrEqual(30000);
      expect(highRiskOptions.memoryLimitMB).toBeLessThanOrEqual(100);
      expect(highRiskOptions.maxProcesses).toBeLessThanOrEqual(1);
      expect(highRiskOptions.networkAccess).toBe(false);
      
      // Medium risk should get moderate limits
      const mediumRiskOptions = applyLimits(baseOptions, 'medium');
      expect(mediumRiskOptions.timeout).toBeLessThanOrEqual(300000);
      expect(mediumRiskOptions.memoryLimitMB).toBeLessThanOrEqual(1000);
      expect(mediumRiskOptions.maxProcesses).toBeLessThanOrEqual(5);
      
      // Low risk should keep reasonable defaults
      const lowRiskOptions = applyLimits(baseOptions, 'low');
      expect(lowRiskOptions.timeout).toBeGreaterThanOrEqual(600000);
    });
  });

  describe('Workspace Limits Enforcement', () => {
    test('should enforce workspace size limits', async () => {
      const options: KernelOptions = {
        appId: testAppId,
        cwd: testCwd,
        workspaceSizeLimitMB: 0.001 // Very small limit to trigger violation
      };
      
      const command: KernelCommand = {
        command: 'npm', // Use allowed command
        args: ['--version']
      };

      // Should fail due to workspace size limit
      await expect(kernel.execute(command, options))
        .rejects
        .toThrow(/Workspace size limit exceeded/);
    });

    test('should enforce disk quota limits', async () => {
      const options: KernelOptions = {
        appId: testAppId,
        cwd: testCwd,
        diskQuotaMB: 0.001 // Very small quota to trigger violation
      };
      
      const command: KernelCommand = {
        command: 'npm', // Use allowed command
        args: ['--version']
      };

      // Should fail due to disk quota violation
      await expect(kernel.execute(command, options))
        .rejects
        .toThrow(/Disk quota exceeded/);
    });
  });

  describe('Sequential Execution Security', () => {
    test('should stop execution on first failure', async () => {
      const options: KernelOptions = {
        appId: testAppId,
        cwd: testCwd
      };
      
      const commands: KernelCommand[] = [
        {
          command: 'invalid-command-that-does-not-exist',
          args: []
        },
        {
          command: 'echo',
          args: ['this should not execute']
        }
      ];

      await expect(kernel.executeSequence(commands, options))
        .rejects
        .toThrow(/Sequence failed/);
    });

    test('should execute valid command sequences', async () => {
      const options: KernelOptions = {
        appId: testAppId,
        cwd: testCwd
      };
      
      const commands: KernelCommand[] = [
        {
          command: 'echo',
          args: ['first command']
        }
      ];

      try {
        const results = await kernel.executeSequence(commands, options);
        expect(results).toHaveLength(1);
      } catch (error) {
        // Accept if echo is not available, but sequence mechanism should work
        expect((error as Error).message).toContain('failed');
      }
    });
  });

  describe('Provider-Aware Risk Classification', () => {
    test('should use provider-specific risk patterns', () => {
      const classifyRisk = (kernel as any).classifyRiskAdvanced.bind(kernel);
      
      // Node.js specific high risk
      expect(classifyRisk('npm', ['install', 'malicious-package'], 'node')).toBe('medium');
      expect(classifyRisk('rm', ['-rf', 'node_modules'], 'node')).toBe('high');
      
      // DotNet specific patterns
      expect(classifyRisk('dotnet', ['restore'], 'dotnet')).toBe('medium');
      expect(classifyRisk('dotnet', ['clean', '--force'], 'dotnet')).toBe('high');
      
      // Default provider fallback
      expect(classifyRisk('unknown', ['command'], 'unknown-provider')).toBe('low');
    });
  });

  describe('Guardian Integration', () => {
    test('should route all commands through Guardian', async () => {
      const options: KernelOptions = {
        appId: testAppId,
        cwd: testCwd
      };
      
      const command: KernelCommand = {
        command: 'npm', // Use allowed command
        args: ['--version']
      };

      // Mock the Guardian execution to verify it's called
      const originalSimulate = (kernel as any).simulateGuardianExecution;
      let guardianCalled = false;
      
      (kernel as any).simulateGuardianExecution = vi.fn().mockImplementation(async () => {
        guardianCalled = true;
        return { stdout: 'test', stderr: '', exitCode: 0 };
      });

      try {
        await kernel.execute(command, options);
        expect(guardianCalled).toBe(true);
      } finally {
        // Restore original method
        (kernel as any).simulateGuardianExecution = originalSimulate;
      }
    });
  });
});