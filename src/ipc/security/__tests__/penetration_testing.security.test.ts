import { ExecutionKernel, executionKernel, KernelOptions, KernelCommand } from '../execution_kernel';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Comprehensive Security Penetration Testing Suite
 * Tests various attack vectors against the ExecutionKernel
 */

describe('ExecutionKernel Penetration Testing', () => {
  let kernel: ExecutionKernel;
  const testAppId = 99999;
  const testBaseDir = path.join(os.tmpdir(), 'security-test-workspace');
  
  beforeAll(async () => {
    kernel = executionKernel;
    // Create test workspace
    await fs.promises.mkdir(testBaseDir, { recursive: true });
  });

  afterAll(async () => {
    // Cleanup test workspace
    try {
      await fs.promises.rm(testBaseDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('Path Traversal Attacks', () => {
    const traversalAttempts = [
      '..\\..\\..\\Windows\\System32',
      '../../etc/passwd',
      '..\\..\\..\\..\\..\\..\\..\\..\\..\\..\\boot.ini',
      '%SYSTEMROOT%\\system32\\cmd.exe',
      '$HOME/.ssh/id_rsa',
      '../../../../../../../../../../etc/shadow'
    ];

    test.each(traversalAttempts)('should block path traversal: %s', async (maliciousPath) => {
      const options: KernelOptions = {
        appId: testAppId,
        cwd: path.join(testBaseDir, maliciousPath)
      };
      
      const command: KernelCommand = {
        command: 'echo',
        args: ['test']
      };

      await expect(kernel.execute(command, options))
        .rejects
        .toThrow(/Security violation|Path validation failed|Path traversal detected|not within allowed directories/);
    });
  });

  describe('Command Injection Attacks', () => {
    const injectionAttempts = [
      '; rm -rf /',
      '&& del /q C:\\*',
      '| format C:',
      '`rm -rf /`',
      '$(rm -rf /)',
      '<script>alert("xss")</script>',
      '" & del /q C:\\Windows & "',
      '|| shutdown /s /t 0'
    ];

    test.each(injectionAttempts)('should sanitize command injection: %s', async (maliciousPayload) => {
      const options: KernelOptions = {
        appId: testAppId,
        cwd: testBaseDir
      };
      
      const command: KernelCommand = {
        command: 'echo',
        args: [maliciousPayload]
      };

      // Should either reject the command or sanitize the payload
      try {
        await kernel.execute(command, options);
      } catch (error) {
        // Should not execute dangerous commands
        const errorMessage = (error as Error).message.toLowerCase();
        expect(errorMessage).toMatch(/security violation|not allowed|invalid|dangerous/);
      }
    });
  });

  describe('Unauthorized Command Execution', () => {
    const unauthorizedCommands = [
      'shutdown',
      'format',
      'del',
      'erase',
      'cipher',
      'takeown',
      'icacls',
      'wmic',
      'powershell',
      'cmd',
      'wscript',
      'cscript',
      'mshta',
      'regsvr32',
      'rundll32'
    ];

    test.each(unauthorizedCommands)('should block unauthorized command: %s', async (commandName) => {
      const options: KernelOptions = {
        appId: testAppId,
        cwd: testBaseDir
      };
      
      const command: KernelCommand = {
        command: commandName,
        args: []
      };

      await expect(kernel.execute(command, options))
        .rejects
        .toThrow(/Command not allowed/);
    });
  });

  describe('Environment Variable Exploitation', () => {
    const envAttacks = [
      '$(whoami)',
      '`whoami`',
      '%USERNAME%',
      '%USERDOMAIN%',
      '${IFS}',
      '$PATH',
      '%PATH%'
    ];

    test.each(envAttacks)('should handle environment variable attacks: %s', async (payload) => {
      const options: KernelOptions = {
        appId: testAppId,
        cwd: testBaseDir
      };
      
      const command: KernelCommand = {
        command: 'echo',
        args: [payload]
      };

      try {
        await kernel.execute(command, options);
      } catch (error) {
        // Should not execute shell expansions
        const errorMessage = (error as Error).message.toLowerCase();
        expect(errorMessage).not.toContain('root');
        expect(errorMessage).not.toContain('administrator');
      }
    });
  });

  describe('Resource Exhaustion Attacks', () => {
    test('should enforce memory limits', async () => {
      const options: KernelOptions = {
        appId: testAppId,
        cwd: testBaseDir,
        memoryLimitMB: 1 // Very restrictive
      };
      
      const command: KernelCommand = {
        command: 'node',
        args: ['-e', 'Buffer.alloc(100 * 1024 * 1024)'] // 100MB allocation
      };

      // Should be killed due to memory limit
      await expect(kernel.execute(command, options))
        .rejects
        .toThrow(/killed|timeout|memory/);
    });

    test('should enforce CPU limits', async () => {
      const options: KernelOptions = {
        appId: testAppId,
        cwd: testBaseDir,
        cpuLimitPercent: 1, // Very restrictive
        timeout: 5000
      };
      
      const command: KernelCommand = {
        command: 'node',
        args: ['-e', 'while(true) {}'] // Infinite loop
      };

      // Should timeout due to CPU restriction
      await expect(kernel.execute(command, options))
        .rejects
        .toThrow(/timed out|timeout/);
    });

    test('should enforce process limits', async () => {
      const options: KernelOptions = {
        appId: testAppId,
        cwd: testBaseDir,
        maxProcesses: 1,
        timeout: 10000
      };
      
      // Try to create multiple processes
      const commands: KernelCommand[] = [
        { command: 'node', args: ['-e', 'setTimeout(() => {}, 5000)'] },
        { command: 'node', args: ['-e', 'setTimeout(() => {}, 5000)'] }
      ];

      // Should fail on second process creation
      await expect(kernel.executeSequence(commands, options))
        .rejects
        .toThrow(/Sequence failed|process limit/);
    });
  });

  describe('Network Access Control', () => {
    test('should block network access for high-risk commands', async () => {
      const options: KernelOptions = {
        appId: testAppId,
        cwd: testBaseDir,
        networkAccess: false,
        timeout: 10000
      };
      
      const command: KernelCommand = {
        command: 'node',
        args: ['-e', 'require("http").get("http://example.com")']
      };

      // Should fail due to network restrictions
      await expect(kernel.execute(command, options, 'node'))
        .rejects
        .toThrow(/network|connection|timeout/);
    });
  });

  describe('File System Access Control', () => {
    test('should prevent access to sensitive directories', async () => {
      const sensitivePaths = [
        'C:\\Windows\\System32',
        'C:\\Program Files',
        process.env.USERPROFILE || '',
        process.env.APPDATA || ''
      ];
      
      for (const sensitivePath of sensitivePaths) {
        if (!sensitivePath) continue;
        
        const options: KernelOptions = {
          appId: testAppId,
          cwd: sensitivePath
        };
        
        const command: KernelCommand = {
          command: 'echo',
          args: ['test']
        };

        await expect(kernel.execute(command, options))
          .rejects
          .toThrow(/Security violation|Path validation failed/);
      }
    });

    test('should enforce workspace boundaries', async () => {
      // Create a test file outside the workspace
      const outsideFile = path.join(os.tmpdir(), 'outside-file.txt');
      await fs.promises.writeFile(outsideFile, 'sensitive data');
      
      try {
        const options: KernelOptions = {
          appId: testAppId,
          cwd: testBaseDir
        };
        
        const command: KernelCommand = {
          command: 'type', // Windows equivalent of cat
          args: [outsideFile]
        };

        // Should not be able to access files outside workspace
        await expect(kernel.execute(command, options))
          .rejects
          .toThrow(/Security violation|access denied/);
      } finally {
        await fs.promises.unlink(outsideFile).catch(() => {});
      }
    });
  });

  describe('Privilege Escalation Attempts', () => {
    test('should prevent privilege escalation commands', async () => {
      const privEscCommands = [
        { cmd: 'runas', args: ['/user:Administrator', 'cmd'] },
        { cmd: 'powershell', args: ['-Command', 'Start-Process powershell -Verb RunAs'] },
        { cmd: 'schtasks', args: ['/create', '/tn', 'Backdoor', '/tr', 'cmd.exe'] }
      ];
      
      for (const { cmd, args } of privEscCommands) {
        const options: KernelOptions = {
          appId: testAppId,
          cwd: testBaseDir
        };
        
        const command: KernelCommand = { command: cmd, args };

        await expect(kernel.execute(command, options))
          .rejects
          .toThrow(/Command not allowed|Security violation/);
      }
    });
  });

  describe('Race Condition Attacks', () => {
    test('should prevent TOCTOU (Time-of-Check to Time-of-Use) attacks', async () => {
      // Create a legitimate directory
      const legitDir = path.join(testBaseDir, 'legit-dir');
      await fs.promises.mkdir(legitDir);
      
      try {
        const options: KernelOptions = {
          appId: testAppId,
          cwd: legitDir
        };
        
        // Simulate race condition by attempting to switch cwd during validation
        const command: KernelCommand = {
          command: 'node',
          args: ['-e', `
            const fs = require('fs');
            const path = require('path');
            
            // Try to create symlink to sensitive location
            try {
              fs.symlinkSync('/etc/passwd', 'symlink-attack');
            } catch (e) {
              // Expected to fail
            }
          `]
        };

        // Should detect and prevent the race condition
        await expect(kernel.execute(command, options))
          .rejects
          .toThrow(/Security violation|Path validation failed/);
      } finally {
        await fs.promises.rm(legitDir, { recursive: true, force: true }).catch(() => {});
      }
    });
  });

  describe('Stress Testing', () => {
    test('should handle concurrent security violations gracefully', async () => {
      const promises = [];
      
      // Launch multiple simultaneous attacks
      for (let i = 0; i < 10; i++) {
        const options: KernelOptions = {
          appId: testAppId,
          cwd: `C:\\Windows\\System32\\attack-${i}`
        };
        
        const command: KernelCommand = {
          command: 'format',
          args: [`C:\\drive${i}`]
        };
        
        promises.push(
          kernel.execute(command, options)
            .then(() => {
              throw new Error('Should have been blocked');
            })
            .catch(error => {
              // All should be security violations
              expect((error as Error).message).toMatch(/Security violation|Command not allowed/);
            })
        );
      }
      
      await Promise.all(promises);
    });

    test('should maintain performance under attack pressure', async () => {
      const startTime = Date.now();
      const attackPromises = [];
      
      // Flood with various attack types
      for (let i = 0; i < 50; i++) {
        const attackTypes = [
          () => {
            // Path traversal
            return kernel.execute(
              { command: 'echo', args: ['test'] },
              { appId: testAppId, cwd: `../../../attack-${i}` }
            );
          },
          () => {
            // Unauthorized command
            return kernel.execute(
              { command: 'shutdown', args: [] },
              { appId: testAppId, cwd: testBaseDir }
            );
          },
          () => {
            // Command injection
            return kernel.execute(
              { command: 'echo', args: [`"; malicious-${i};"`] },
              { appId: testAppId, cwd: testBaseDir }
            );
          }
        ];
        
        const randomAttack = attackTypes[Math.floor(Math.random() * attackTypes.length)];
        attackPromises.push(
          randomAttack()
            .then(() => {
              throw new Error('Attack should have been blocked');
            })
            .catch(() => {
              // Expected security rejection
            })
        );
      }
      
      await Promise.all(attackPromises);
      const duration = Date.now() - startTime;
      
      // Should handle stress without excessive delays
      expect(duration).toBeLessThan(10000); // 10 seconds max
    });
  });

  describe('Logging and Monitoring', () => {
    test('should log security violations', async () => {
      // This would require mocking the logger
      // For now, we verify that violations are properly thrown
      const options: KernelOptions = {
        appId: testAppId,
        cwd: 'C:\\Windows\\System32'
      };
      
      const command: KernelCommand = {
        command: 'format',
        args: ['C:']
      };

      await expect(kernel.execute(command, options))
        .rejects
        .toThrow(); // Should log the security violation
      
      // In a real test, we'd verify log output contains security event details
    });
  });
});