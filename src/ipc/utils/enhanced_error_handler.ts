import log from "electron-log";

const logger = log.scope("enhanced-error-handler");

export interface EnhancedError extends Error {
  code?: string;
  recoverySuggestion?: string;
  context?: Record<string, any>;
  isRecoverable?: boolean;
}

export interface ErrorRecoveryStrategy {
  canRecover(error: EnhancedError): boolean;
  recover(error: EnhancedError, context: any): Promise<boolean>;
  getRecoveryMessage(error: EnhancedError): string;
}

export class EnhancedErrorHandler {
  private static instance: EnhancedErrorHandler;
  private recoveryStrategies: ErrorRecoveryStrategy[] = [];

  private constructor() {}

  static getInstance(): EnhancedErrorHandler {
    if (!EnhancedErrorHandler.instance) {
      EnhancedErrorHandler.instance = new EnhancedErrorHandler();
    }
    return EnhancedErrorHandler.instance;
  }

  registerRecoveryStrategy(strategy: ErrorRecoveryStrategy): void {
    this.recoveryStrategies.push(strategy);
  }

  async handleWithErrorRecovery<T>(
    operation: () => Promise<T>,
    context: any = {},
    operationName: string = "Operation"
  ): Promise<{ result?: T; error?: EnhancedError; recovered: boolean }> {
    try {
      const result = await operation();
      return { result, recovered: false };
    } catch (error) {
      const enhancedError = this.enhanceError(error as Error, operationName, context);
      
      logger.error(`${operationName} failed:`, {
        error: enhancedError.message,
        code: enhancedError.code,
        context: enhancedError.context,
        stack: enhancedError.stack
      });

      // Try recovery strategies
      for (const strategy of this.recoveryStrategies) {
        if (strategy.canRecover(enhancedError)) {
          try {
            const recovered = await strategy.recover(enhancedError, context);
            if (recovered) {
              logger.info(`${operationName} recovered successfully using strategy: ${strategy.getRecoveryMessage(enhancedError)}`);
              return { error: enhancedError, recovered: true };
            }
          } catch (recoveryError) {
            logger.warn(`Recovery attempt failed for ${operationName}:`, recoveryError);
          }
        }
      }

      // No recovery available
      return { error: enhancedError, recovered: false };
    }
  }

  private enhanceError(error: Error, operationName: string, context: any): EnhancedError {
    const enhancedError: EnhancedError = {
      ...error,
      name: error.name || 'Error',
      message: error.message || 'Unknown error occurred',
      stack: error.stack,
      context: {
        operation: operationName,
        timestamp: new Date().toISOString(),
        ...context
      }
    };

    // Add specific error codes and recovery suggestions based on error type
    if (error.message.includes('ENOENT') || error.message.includes('not found')) {
      enhancedError.code = 'FILE_NOT_FOUND';
      enhancedError.isRecoverable = true;
      enhancedError.recoverySuggestion = 'Check if the file path is correct or recreate the missing file';
    } else if (error.message.includes('EACCES') || error.message.includes('permission')) {
      enhancedError.code = 'PERMISSION_DENIED';
      enhancedError.isRecoverable = true;
      enhancedError.recoverySuggestion = 'Try running with elevated privileges or check file permissions';
    } else if (error.message.includes('MODULE_NOT_FOUND')) {
      enhancedError.code = 'DEPENDENCY_MISSING';
      enhancedError.isRecoverable = true;
      enhancedError.recoverySuggestion = 'Install missing dependencies using npm install';
    } else if (error.message.includes('SyntaxError') || error.message.includes('ParseError')) {
      enhancedError.code = 'SYNTAX_ERROR';
      enhancedError.isRecoverable = false;
      enhancedError.recoverySuggestion = 'Fix the syntax error in the generated code';
    } else {
      enhancedError.code = 'UNKNOWN_ERROR';
      enhancedError.isRecoverable = false;
    }

    return enhancedError;
  }

  formatErrorForUser(error: EnhancedError): string {
    let message = `❌ ${error.message}`;
    
    if (error.recoverySuggestion) {
      message += `\n💡 Suggested fix: ${error.recoverySuggestion}`;
    }
    
    if (error.code) {
      message += `\n📝 Error code: ${error.code}`;
    }
    
    return message;
  }

  getErrorStats(): { totalErrors: number; recoverableErrors: number; recoveryRate: number } {
    // This would connect to your logging system to get real stats
    // For now returning mock data
    return {
      totalErrors: 0,
      recoverableErrors: 0,
      recoveryRate: 0
    };
  }
}

// Built-in recovery strategies
export class FileNotFoundRecovery implements ErrorRecoveryStrategy {
  canRecover(error: EnhancedError): boolean {
    return error.code === 'FILE_NOT_FOUND';
  }

  async recover(error: EnhancedError, context: any): Promise<boolean> {
    // Try to recreate missing files or find alternatives
    if (context.filePath) {
      // Attempt to create parent directories if they don't exist
      const fs = await import('fs-extra');
      const path = await import('path');
      
      const dirPath = path.dirname(context.filePath);
      try {
        await fs.ensureDir(dirPath);
        logger.info(`Created missing directory: ${dirPath}`);
        return true;
      } catch (dirError) {
        logger.warn(`Failed to create directory ${dirPath}:`, dirError);
      }
    }
    return false;
  }

  getRecoveryMessage(error: EnhancedError): string {
    return "Created missing directory structure";
  }
}

export class DependencyRecovery implements ErrorRecoveryStrategy {
  canRecover(error: EnhancedError): boolean {
    return error.code === 'DEPENDENCY_MISSING';
  }

  async recover(error: EnhancedError, context: any): Promise<boolean> {
    if (context.packageName) {
      try {
        const { spawn } = await import('child_process');
        const { promisify } = await import('util');
        const exec = promisify(spawn);
        
        logger.info(`Attempting to install missing package: ${context.packageName}`);
        
        const child = spawn('npm', ['install', context.packageName], {
          cwd: context.workingDir || process.cwd()
        });
        
        return new Promise((resolve) => {
          child.on('close', (code) => {
            if (code === 0) {
              logger.info(`Successfully installed ${context.packageName}`);
              resolve(true);
            } else {
              logger.warn(`Failed to install ${context.packageName}, exit code: ${code}`);
              resolve(false);
            }
          });
          
          child.on('error', (err) => {
            logger.error(`Error installing ${context.packageName}:`, err);
            resolve(false);
          });
        });
      } catch (installError) {
        logger.error('Failed to initiate package installation:', installError);
      }
    }
    return false;
  }

  getRecoveryMessage(error: EnhancedError): string {
    return "Installed missing dependency";
  }
}

// Initialize and register built-in strategies
const errorHandler = EnhancedErrorHandler.getInstance();
errorHandler.registerRecoveryStrategy(new FileNotFoundRecovery());
errorHandler.registerRecoveryStrategy(new DependencyRecovery());

export { errorHandler };