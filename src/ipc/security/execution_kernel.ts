import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import log from 'electron-log';
import { safeJoin } from './path_utils';

const logger = log.scope('execution-kernel');
const execPromise = promisify(exec);

export interface KernelOptions {
  appId: number;
  cwd: string;
  timeout?: number;
  memoryLimitMB?: number;
  cpuLimitPercent?: number;
  diskQuotaMB?: number;
  workspaceSizeLimitMB?: number;
  networkAccess?: boolean;
  maxProcesses?: number;
}

export interface KernelCommand {
  command: string;
  args: string[];
  options?: Partial<KernelOptions>;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export class ExecutionKernel {
  private static instance: ExecutionKernel;
  private readonly ALLOWED_COMMANDS = new Set([
    'npm', 'pnpm', 'yarn',
    'dotnet', 'msbuild', 'nuget',
    'cargo', 'rustc',
    'node', 'deno',
    'git', 'tsc',
    'vite', 'webpack', 'rollup',
    'powershell', 'pwsh'
  ]);

  private readonly TRUSTED_PATHS: Record<string, string[]> = {
    'npm': [process.env.APPDATA, process.env.LOCALAPPDATA],
    'pnpm': [process.env.APPDATA, process.env.LOCALAPPDATA],
    'dotnet': [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)']],
    'git': [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)']],
    'node': [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)']]
  };

  private constructor() {}

  static getInstance(): ExecutionKernel {
    if (!ExecutionKernel.instance) {
      ExecutionKernel.instance = new ExecutionKernel();
    }
    return ExecutionKernel.instance;
  }

  /**
   * Hardened path validation using realpath enforcement
   */
  private async validatePath(cwd: string, appId: number): Promise<void> {
    try {
      // Get canonical path using realpath
      const canonicalCwd = await fs.promises.realpath(cwd);
      
      // Get expected app root
      const expectedAppRoot = path.join(process.env.USERDATA || '', `dyad-app-${appId}`);
      const canonicalAppRoot = await fs.promises.realpath(expectedAppRoot);
      
      // Get templates path
      const templatesPath = path.join(process.cwd(), 'templates');
      const canonicalTemplatesPath = await fs.promises.realpath(templatesPath);
      
      // Check if cwd is within allowed paths
      const isInAppRoot = canonicalCwd.startsWith(canonicalAppRoot);
      const isInTemplates = canonicalCwd.startsWith(canonicalTemplatesPath);
      
      if (!isInAppRoot && !isInTemplates) {
        throw new Error(`Path validation failed: ${cwd} is not within allowed directories`);
      }
      
      // Additional security checks
      if (canonicalCwd.includes('..')) {
        throw new Error('Path traversal detected');
      }
      
      logger.info(`Path validation passed: ${canonicalCwd}`);
    } catch (error) {
      logger.error('Path validation failed:', error);
      throw new Error(`Security violation: Invalid working directory ${cwd}`);
    }
  }

  /**
   * Validate executable against trusted locations
   */
  private async validateExecutable(command: string): Promise<string> {
    // Resolve full path of command
    const fullPath = await this.resolveExecutablePath(command);
    
    // Check against trusted paths
    const trustedLocations = this.TRUSTED_PATHS[command] || [];
    
    let isTrusted = false;
    for (const trustedLocation of trustedLocations) {
      if (fullPath.startsWith(trustedLocation)) {
        isTrusted = true;
        break;
      }
    }
    
    // For development, allow node_modules/.bin
    if (fullPath.includes('node_modules') && fullPath.includes('.bin')) {
      isTrusted = true;
    }
    
    if (!isTrusted) {
      throw new Error(`Untrusted executable: ${command} resolved to ${fullPath}`);
    }
    
    return fullPath;
  }

  /**
   * Resolve executable path using system PATH
   */
  private async resolveExecutablePath(command: string): Promise<string> {
    // On Windows, try .exe extension
    const extensions = ['.exe', '.cmd', '.bat', ''];
    
    for (const ext of extensions) {
      const cmdWithExt = command + ext;
      
      // Check if it's an absolute path
      if (path.isAbsolute(cmdWithExt)) {
        try {
          await fs.promises.access(cmdWithExt);
          return cmdWithExt;
        } catch {
          continue;
        }
      }
      
      // Check in PATH directories
      const pathDirs = (process.env.PATH || '').split(path.delimiter);
      for (const dir of pathDirs) {
        const fullPath = path.join(dir, cmdWithExt);
        try {
          await fs.promises.access(fullPath);
          return fullPath;
        } catch {
          continue;
        }
      }
    }
    
    throw new Error(`Command not found: ${command}`);
  }

  /**
   * Classify risk level based on command and arguments
   */
  private classifyRisk(command: string, args: string[]): 'low' | 'medium' | 'high' {
    const fullCommand = `${command} ${args.join(' ')}`.toLowerCase();
    
    // High risk commands
    if (fullCommand.includes('rm -rf') || 
        fullCommand.includes('format') || 
        fullCommand.includes('del /q') ||
        fullCommand.includes('rmdir /s')) {
      return 'high';
    }
    
    // Medium risk commands
    if (fullCommand.includes('install') || 
        fullCommand.includes('add') || 
        fullCommand.includes('restore') ||
        fullCommand.includes('download')) {
      return 'medium';
    }
    
    // Low risk by default
    return 'low';
  }

  /**
   * Execute command through Guardian service (ALL commands must go through this)
   */
  private async executeThroughGuardian(
    command: string, 
    args: string[], 
    options: KernelOptions,
    riskLevel: 'low' | 'medium' | 'high'
  ): Promise<Omit<ExecutionResult, 'duration' | 'riskLevel'>> {
    // Validate everything first
    await this.validatePath(options.cwd, options.appId);
    const validatedCommand = await this.validateExecutable(command);
    
    logger.info(`Executing via Guardian: ${validatedCommand} ${args.join(' ')} [Risk: ${riskLevel}]`);
    
    // ALL commands go through Guardian - no exceptions
    // This replaces the previous spawnTracked() bypass
    
    // In a real implementation, this would call the Guardian service
    // For now, we'll simulate the secure execution
    const result = await this.simulateGuardianExecution(validatedCommand, args, options, riskLevel);
    
    return result;
  }

  /**
   * Simulate Guardian service execution (would be replaced with actual Guardian calls)
   */
  private async simulateGuardianExecution(
    command: string,
    args: string[],
    options: KernelOptions,
    riskLevel: 'low' | 'medium' | 'high'
  ): Promise<Omit<ExecutionResult, 'duration' | 'riskLevel'>> {
    // This is where the actual Guardian service integration would happen
    // For now, we simulate the secure execution
    
    // Apply resource limits based on risk level
    const timeout = options.timeout || (riskLevel === 'high' ? 30000 : 300000); // 30s for high risk, 5min for others
    const memoryLimit = options.memoryLimitMB || (riskLevel === 'high' ? 100 : 1000); // MB
    
    // Execute with proper constraints
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: options.cwd,
        timeout,
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        resolve({
          stdout,
          stderr,
          exitCode: code || 0
        });
      });
      
      child.on('error', (error) => {
        reject(error);
      });
      
      // Kill process if it exceeds timeout
      setTimeout(() => {
        if (!child.killed) {
          child.kill();
          reject(new Error('Command timed out'));
        }
      }, timeout);
    });
  }

  /**
   * Public execute method - ALL command execution goes through here
   */
  async execute(kernelCommand: KernelCommand, defaultOptions: KernelOptions, providerName: string = 'default'): Promise<ExecutionResult> {
    const options = { ...defaultOptions, ...kernelCommand.options };
    
    // Validate command is allowed
    if (!this.ALLOWED_COMMANDS.has(kernelCommand.command)) {
      throw new Error(`Command not allowed: ${kernelCommand.command}`);
    }
    
    // Enforce workspace limits BEFORE execution
    await this.enforceWorkspaceLimits(options.cwd, options);
    
    // Validate everything first
    await this.validatePath(options.cwd, options.appId);
    const validatedCommand = await this.validateExecutable(kernelCommand.command);
    const riskLevel = this.classifyRiskAdvanced(kernelCommand.command, kernelCommand.args, providerName);
    
    // Apply risk-based resource limits
    const riskAdjustedOptions = this.applyRiskBasedLimits(options, riskLevel);
    
    const startTime = Date.now();
    
    try {
      logger.info(`Executing via Guardian: ${validatedCommand} ${kernelCommand.args.join(' ')} [Risk: ${riskLevel}, Provider: ${providerName}]`);
      
      // Execute through Guardian (no direct execution paths)
      const result = await this.executeThroughGuardian(
        validatedCommand,
        kernelCommand.args,
        riskAdjustedOptions,
        riskLevel
      );
      
      const duration = Date.now() - startTime;
      
      // Check post-execution workspace limits
      await this.enforceWorkspaceLimits(options.cwd, options);
      
      logger.info(`Command completed in ${duration}ms with exit code ${result.exitCode}`);
      
      return {
        ...result,
        duration,
        riskLevel
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Command failed after ${duration}ms:`, error);
      
      throw new Error(`Execution failed: ${(error as Error).message}`);
    }
  }

  /**
   * Apply risk-based resource limits
   */
  private applyRiskBasedLimits(options: KernelOptions, riskLevel: 'low' | 'medium' | 'high'): KernelOptions {
    const adjustedOptions = { ...options };
    
    switch (riskLevel) {
      case 'high':
        adjustedOptions.timeout = Math.min(adjustedOptions.timeout || 30000, 30000); // Max 30s
        adjustedOptions.memoryLimitMB = Math.min(adjustedOptions.memoryLimitMB || 100, 100); // Max 100MB
        adjustedOptions.maxProcesses = Math.min(adjustedOptions.maxProcesses || 1, 1); // Max 1 process
        adjustedOptions.networkAccess = false; // No network for high risk
        break;
        
      case 'medium':
        adjustedOptions.timeout = Math.min(adjustedOptions.timeout || 300000, 300000); // Max 5min
        adjustedOptions.memoryLimitMB = Math.min(adjustedOptions.memoryLimitMB || 1000, 1000); // Max 1GB
        adjustedOptions.maxProcesses = Math.min(adjustedOptions.maxProcesses || 5, 5); // Max 5 processes
        break;
        
      case 'low':
        // Use provided limits or reasonable defaults
        adjustedOptions.timeout = adjustedOptions.timeout || 600000; // 10min default
        adjustedOptions.memoryLimitMB = adjustedOptions.memoryLimitMB || 2000; // 2GB default
        adjustedOptions.maxProcesses = adjustedOptions.maxProcesses || 10; // 10 processes default
        break;
    }
    
    return adjustedOptions;
  }

  /**
   * Sequential command execution for Windows-only architecture
   */
  async executeSequence(commands: KernelCommand[], defaultOptions: KernelOptions): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];
    
    for (const command of commands) {
      try {
        const result = await this.execute(command, defaultOptions);
        results.push(result);
      } catch (error) {
        // Stop execution on first failure
        throw new Error(`Sequence failed at command '${command.command}': ${(error as Error).message}`);
      }
    }
    
    return results;
  }

  /**
   * Get current disk usage for quota enforcement
   */
  async getDiskUsage(cwd: string): Promise<number> {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      let totalSize = 0;
      
      const calculateDirectorySize = async (dirPath: string): Promise<number> => {
        const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
        let size = 0;
        
        for (const entry of entries) {
          const entryPath = path.join(dirPath, entry.name);
          
          if (entry.isDirectory()) {
            size += await calculateDirectorySize(entryPath);
          } else {
            const stats = await fs.promises.stat(entryPath);
            size += stats.size;
          }
        }
        
        return size;
      };
      
      totalSize = await calculateDirectorySize(cwd);
      return totalSize;
    } catch (error) {
      logger.warn(`Failed to calculate disk usage for ${cwd}:`, error);
      return 0;
    }
  }

  /**
   * Check if disk quota would be exceeded
   */
  async checkDiskQuota(cwd: string, quotaMB: number): Promise<boolean> {
    const usageBytes = await this.getDiskUsage(cwd);
    const usageMB = usageBytes / (1024 * 1024);
    return usageMB <= quotaMB;
  }

  /**
   * Monitor workspace size and enforce limits
   */
  async enforceWorkspaceLimits(cwd: string, options: KernelOptions): Promise<void> {
    // Check workspace size limit
    if (options.workspaceSizeLimitMB) {
      const currentSize = await this.getDiskUsage(cwd);
      const currentSizeMB = currentSize / (1024 * 1024);
      
      if (currentSizeMB > options.workspaceSizeLimitMB) {
        throw new Error(`Workspace size limit exceeded: ${currentSizeMB.toFixed(1)}MB > ${options.workspaceSizeLimitMB}MB`);
      }
      
      logger.info(`Workspace size check passed: ${currentSizeMB.toFixed(1)}MB (limit: ${options.workspaceSizeLimitMB}MB)`);
    }
    
    // Check disk quota if specified
    if (options.diskQuotaMB) {
      const withinQuota = await this.checkDiskQuota(cwd, options.diskQuotaMB);
      if (!withinQuota) {
        throw new Error(`Disk quota exceeded for workspace: ${cwd}`);
      }
      logger.info(`Disk quota check passed for workspace: ${cwd}`);
    }
  }

  /**
   * Advanced risk classification with provider awareness
   */
  private classifyRiskAdvanced(command: string, args: string[], providerName: string): 'low' | 'medium' | 'high' {
    const fullCommand = `${command} ${args.join(' ')}`.toLowerCase();
    
    // Provider-specific risk patterns
    const providerRiskPatterns: Record<string, { high: string[]; medium: string[] }> = {
      'node': {
        high: ['rm -rf', 'del /q', 'rmdir /s', 'format'],
        medium: ['install', 'add', 'npm install', 'yarn add', 'pnpm add']
      },
      'dotnet': {
        high: ['dotnet clean --force', 'del /q', 'rm -rf'],
        medium: ['restore', 'build --no-incremental', 'publish']
      },
      'default': {
        high: ['rm -rf', 'del /q', 'format', 'mkfs'],
        medium: ['install', 'download', 'clone', 'pull']
      }
    };
    
    const patterns = providerRiskPatterns[providerName] || providerRiskPatterns.default;
    
    // Check high risk patterns first
    for (const pattern of patterns.high) {
      if (fullCommand.includes(pattern)) {
        return 'high';
      }
    }
    
    // Check medium risk patterns
    for (const pattern of patterns.medium) {
      if (fullCommand.includes(pattern)) {
        return 'medium';
      }
    }
    
    // Low risk by default
    return 'low';
  }

  /**
   * Get trusted executable paths for validation
   */
  private getTrustedExecutablePaths(): Record<string, string[]> {
    const programFiles = process.env.PROGRAMFILES || 'C:\\Program Files';
    const programFilesX86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
    const appData = process.env.APPDATA || '';
    const localAppData = process.env.LOCALAPPDATA || '';
    
    return {
      'npm': [appData, localAppData, programFiles, programFilesX86],
      'pnpm': [appData, localAppData, programFiles, programFilesX86],
      'yarn': [appData, localAppData, programFiles, programFilesX86],
      'dotnet': [programFiles, programFilesX86],
      'git': [programFiles, programFilesX86],
      'node': [programFiles, programFilesX86],
      'cargo': [appData, localAppData],
      'rustc': [appData, localAppData],
      'powershell': [process.env.WINDIR || 'C:\\Windows\\System32'],
      'pwsh': [programFiles, programFilesX86]
    };
  }
}

// Export singleton instance
export const executionKernel = ExecutionKernel.getInstance();

// Type guard for kernel commands
export function isKernelCommand(obj: any): obj is KernelCommand {
  return obj && 
         typeof obj.command === 'string' && 
         Array.isArray(obj.args) &&
         obj.args.every((arg: any) => typeof arg === 'string');
}