# Windows App Builder - Runtime Provider Documentation

## Overview

The Windows App Builder implements a unified RuntimeProvider architecture that enables building both web applications (Node.js/React) and native Windows desktop applications (.NET) through a secure, extensible system.

## Supported Runtimes

### 1. NodeRuntimeProvider (`node`)

**Purpose**: Web application development
**Supported Stack Types**: `react`, `nextjs`, `express-react`

#### Capabilities:

- React/Next.js application scaffolding
- npm/pnpm dependency management
- Development server with hot reload
- Production builds
- Iframe-based preview
- 2GB disk quota

#### Security Features:

- Command allowlisting through ExecutionKernel
- Risk-based resource limits
- Path validation and sandboxing
- JobId-based process tracking

### 2. DotNetRuntimeProvider (`dotnet`)

**Purpose**: Native Windows desktop application development
**Supported Stack Types**: `wpf`, `winui3`, `winforms`, `console`, `maui`

#### Capabilities:

- WPF applications with MVVM pattern
- WinUI 3 modern Windows apps
- WinForms classic desktop apps
- Console applications
- MAUI cross-platform apps
- NuGet package management
- Self-contained application packaging
- External window preview
- 5GB disk quota

#### Security Features:

- .NET CLI command validation
- Risk classification (restore=high, build/publish=medium, others=low)
- Secure process execution through ExecutionKernel
- JobId-based lifecycle management

## Architecture Components

### RuntimeProvider Interface

All runtime providers implement a standardized interface:

```typescript
interface RuntimeProvider {
  runtimeId: string;
  runtimeName: string;
  supportedStackTypes: string[];
  previewStrategy: "iframe" | "external-window";
  diskQuotaBytes: number;

  checkPrerequisites(): Promise<{ installed: boolean; missing: string[] }>;
  getRiskProfile(command: string, args: string[]): RiskProfile;
  scaffold(options: ScaffoldOptions): Promise<ScaffoldResult>;
  resolveDependencies(options: {
    appPath: string;
    appId: number;
  }): Promise<ExecutionResult>;
  build(options: BuildOptions): Promise<BuildResult>;
  run(options: RunOptions): Promise<RunResult>;
  stop(appId: number, jobId?: string): Promise<void>;
  startPreview(options: PreviewOptions): Promise<void>;
  stopPreview(appId: number): Promise<void>;
  package?(options: PackageOptions): Promise<ExecutionResult>;
  isReady(message: string): boolean;
}
```

### RuntimeProviderRegistry

Central registry for managing runtime providers:

```typescript
class RuntimeProviderRegistry {
  register(provider: RuntimeProvider): void;
  getProvider(runtimeId: string): RuntimeProvider;
  getProviderForStack(stackType: string): RuntimeProvider;
  listProviders(): RuntimeProvider[];
}
```

### ExecutionKernel Integration

All runtime operations flow through the secure ExecutionKernel:

- Path validation and canonicalization
- Risk-based resource limiting
- JobId tracking for process management
- Command allowlisting
- Secure termination capabilities

## Usage Examples

### Creating a New WPF Application

```javascript
// Get the .NET runtime provider
const provider = runtimeRegistry.getProvider("dotnet");

// Check prerequisites
const prereqs = await provider.checkPrerequisites();
if (!prereqs.installed) {
  console.log("Missing:", prereqs.missing);
  return;
}

// Scaffold new WPF project
const scaffoldResult = await provider.scaffold({
  templateId: "wpf",
  projectName: "MyWpfApp",
  fullAppPath: "/path/to/app",
});

// Resolve dependencies
await provider.resolveDependencies({
  appPath: "/path/to/app",
  appId: 123,
});

// Build the application
const buildResult = await provider.build({
  appId: 123,
  appPath: "/path/to/app",
});

// Run the application
const runResult = await provider.run({
  appId: 123,
  appPath: "/path/to/app",
});
```

### Creating a New React Application

```javascript
// Get the Node.js runtime provider
const provider = runtimeRegistry.getProvider("node");

// Scaffold new React project
const scaffoldResult = await provider.scaffold({
  templateId: "react",
  projectName: "my-react-app",
  fullAppPath: "/path/to/app",
});

// Build and run
await provider.build({ appId: 123, appPath: "/path/to/app" });
await provider.run({ appId: 123, appPath: "/path/to/app" });
```

## Security Model

### Risk Classification

Each runtime provider implements risk-based classification:

**NodeRuntimeProvider:**

- High: npm install, package.json modifications
- Medium: build operations, dev server
- Low: version checks, clean operations

**DotNetRuntimeProvider:**

- High: nuget restore, package add
- Medium: build, publish, pack
- Low: version checks, clean, list

### Execution Security

- All commands validated through ExecutionKernel
- Path canonicalization prevents directory traversal
- Resource limits prevent system abuse
- JobId tracking enables secure process termination
- Network access controlled per operation

## System Integration

### Database Schema

Apps table extended with:

- `stackType`: Target framework (react, wpf, winui3, etc.)
- `runtimeProvider`: Execution runtime (node, dotnet)

### Backward Compatibility

Existing applications continue to work with default values:

- `stackType`: 'react'
- `runtimeProvider`: 'node'

### Process Management

Dual-mode support:

- Legacy process-based apps
- New jobId-based RuntimeProvider apps

## Testing and Quality Assurance

### Test Coverage

Comprehensive test suites verify:

- Provider registration and resolution
- Prerequisite checking
- Risk profiling
- Build and execution workflows
- Error handling and edge cases
- Integration with ExecutionKernel

### Continuous Integration

All changes tested through:

- Unit tests for individual components
- Integration tests for provider workflows
- Security validation tests
- Backward compatibility verification

## Future Extensions

The architecture supports easy addition of new runtimes:

- **TauriRuntimeProvider**: Cross-platform desktop apps
- **PythonRuntimeProvider**: Data science and scripting
- **GoRuntimeProvider**: High-performance applications
- **RustRuntimeProvider**: Systems programming

Each new runtime follows the same pattern:

1. Implement RuntimeProvider interface
2. Register in RuntimeProviderRegistry
3. Add system prompts for AI assistance
4. Create comprehensive test suite
5. Update documentation

## Troubleshooting

### Common Issues

1. **Missing prerequisites**: Use `checkPrerequisites()` to diagnose
2. **Build failures**: Check error parsing in build results
3. **Runtime selection**: Verify stackType mapping in registry
4. **Security violations**: Review ExecutionKernel logs

### Debug Information

- JobId tracking for process lifecycle
- Risk level logging for security auditing
- Detailed error messages from build operations
- Provider resolution traces

This documentation provides a comprehensive overview of the current RuntimeProvider implementation and serves as a reference for extending and maintaining the system.
