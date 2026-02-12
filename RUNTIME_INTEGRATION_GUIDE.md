# RuntimeProvider Integration Guide

## Quick Start Examples

### 1. Basic Provider Usage

```typescript
import { runtimeRegistry } from './src/ipc/runtime/RuntimeProviderRegistry';

// Get appropriate provider for your stack
const provider = runtimeRegistry.getProviderForStack('wpf');
// or directly: runtimeRegistry.getProvider('dotnet');

// Check if environment is ready
const prereqs = await provider.checkPrerequisites();
if (!prereqs.installed) {
  throw new Error(`Missing prerequisites: ${prereqs.missing.join(', ')}`);
}

// Create new project
const result = await provider.scaffold({
  templateId: 'wpf',
  projectName: 'MyNewApp',
  fullAppPath: '/projects/MyNewApp'
});

if (!result.success) {
  throw new Error(`Scaffolding failed: ${result.error}`);
}

console.log(`Project created with entry point: ${result.entryPoint}`);
```

### 2. Complete Development Workflow

```typescript
async function developApp(stackType: string, projectName: string, appPath: string) {
  const provider = runtimeRegistry.getProviderForStack(stackType);
  const appId = Date.now(); // or use your app ID system
  
  try {
    // 1. Setup
    console.log('Checking prerequisites...');
    const prereqs = await provider.checkPrerequisites();
    if (!prereqs.installed) {
      throw new Error(`Install missing: ${prereqs.missing.join(', ')}`);
    }
    
    // 2. Create project
    console.log('Creating project...');
    const scaffold = await provider.scaffold({
      templateId: stackType,
      projectName,
      fullAppPath: appPath
    });
    
    if (!scaffold.success) throw new Error(scaffold.error);
    
    // 3. Install dependencies
    console.log('Installing dependencies...');
    await provider.resolveDependencies({ appPath, appId });
    
    // 4. Build
    console.log('Building application...');
    const build = await provider.build({ appId, appPath });
    if (!build.success) {
      console.error('Build failed:', build.errors);
      return;
    }
    
    // 5. Run
    console.log('Starting application...');
    const run = await provider.run({ appId, appPath });
    
    if (run.ready) {
      console.log(`Application running with Job ID: ${run.jobId}`);
      
      // 6. Preview (optional)
      await provider.startPreview({ appId, appPath });
      
      // Keep running or return control...
      return run.jobId;
    }
    
  } catch (error) {
    console.error('Development workflow failed:', error);
    await provider.stop(appId);
    throw error;
  }
}
```

### 3. Error Handling Pattern

```typescript
async function robustOperation(provider: RuntimeProvider, operation: () => Promise<any>) {
  try {
    const result = await operation();
    return { success: true, data: result };
  } catch (error) {
    // Log the error with context
    console.error(`Operation failed:`, {
      provider: provider.runtimeId,
      error: error.message,
      stack: error.stack
    });
    
    return { 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Usage
const buildResult = await robustOperation(provider, () => 
  provider.build({ appId: 123, appPath: '/my/app' })
);

if (!buildResult.success) {
  // Handle error appropriately
  showErrorToUser(buildResult.error);
}
```

## Advanced Patterns

### 1. Event Streaming for Long Operations

```typescript
const eventHandler: ExecutionEventHandler = (event) => {
  switch (event.type) {
    case 'stdout':
      updateBuildLog(event.message);
      break;
    case 'stderr':
      updateErrorLog(event.message);
      break;
  }
};

const buildResult = await provider.build(
  { appId: 123, appPath: '/my/app' }, 
  eventHandler
);
```

### 2. Configuration Management

```typescript
interface AppConfig {
  stackType: string;
  runtimeProvider: string;
  buildConfiguration?: 'Debug' | 'Release';
  outputFormat?: 'exe' | 'single-file';
}

function createProviderWithOptions(config: AppConfig) {
  const provider = runtimeRegistry.getProvider(config.runtimeProvider);
  
  // Apply configuration-specific settings
  const buildOptions: BuildOptions = {
    appId: 123,
    appPath: '/my/app',
    configuration: config.buildConfiguration || 'Debug'
  };
  
  if (provider.runtimeId === 'dotnet' && config.outputFormat) {
    // Add .NET-specific packaging options
    return { ...buildOptions, outputFormat: config.outputFormat };
  }
  
  return buildOptions;
}
```

### 3. Monitoring and Telemetry

```typescript
class RuntimeTelemetry {
  static logOperation(provider: RuntimeProvider, operation: string, duration: number, success: boolean) {
    const metrics = {
      provider: provider.runtimeId,
      operation,
      durationMs: duration,
      success,
      timestamp: Date.now()
    };
    
    // Send to analytics service
    analytics.track('runtime_operation', metrics);
  }
  
  static async timedOperation<T>(
    provider: RuntimeProvider, 
    operation: string, 
    fn: () => Promise<T>
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      this.logOperation(provider, operation, Date.now() - start, true);
      return result;
    } catch (error) {
      this.logOperation(provider, operation, Date.now() - start, false);
      throw error;
    }
  }
}

// Usage
const buildResult = await RuntimeTelemetry.timedOperation(
  provider,
  'build',
  () => provider.build({ appId: 123, appPath: '/my/app' })
);
```

## Migration from Legacy Code

### Before (Direct Process Calls)
```typescript
// OLD WAY - Direct process spawning (INSECURE)
const { spawn } = require('child_process');
const proc = spawn('dotnet', ['build'], { cwd: appPath });
```

### After (RuntimeProvider Pattern)
```typescript
// NEW WAY - Secure through RuntimeProvider
const provider = runtimeRegistry.getProvider('dotnet');
const result = await provider.build({ appId: 123, appPath });
// Automatically handles security, error parsing, and job tracking
```

## Testing Your Integration

### Unit Test Example
```typescript
import { vi, describe, it, expect } from 'vitest';
import { runtimeRegistry } from '../RuntimeProviderRegistry';

describe('Runtime Integration', () => {
  it('should support WPF development', async () => {
    const provider = runtimeRegistry.getProviderForStack('wpf');
    
    expect(provider.runtimeId).toBe('dotnet');
    expect(provider.supportedStackTypes).toContain('wpf');
    
    // Mock the actual execution for testing
    vi.spyOn(provider, 'checkPrerequisites').mockResolvedValue({
      installed: true,
      missing: []
    });
    
    const prereqs = await provider.checkPrerequisites();
    expect(prereqs.installed).toBe(true);
  });
});
```

## Best Practices

1. **Always check prerequisites** before operations
2. **Handle errors gracefully** with proper user feedback
3. **Use jobId tracking** for process management
4. **Respect risk classifications** for security
5. **Clean up resources** with proper stop operations
6. **Log operations** for debugging and monitoring
7. **Validate inputs** before passing to providers
8. **Test both success and failure paths**

This guide provides practical patterns for integrating RuntimeProvider functionality into your applications safely and effectively.