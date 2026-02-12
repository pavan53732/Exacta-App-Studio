import { executionKernel } from '../security/execution_kernel';
import { runtimeProviderRegistry } from '../runtime/runtime_providers';

describe('App Handlers Security Integration', () => {
  test('should have ExecutionKernel available for secure command execution', () => {
    expect(executionKernel).toBeDefined();
    expect(typeof executionKernel.execute).toBe('function');
  });

  test('should have runtime provider registry for app execution', () => {
    expect(runtimeProviderRegistry).toBeDefined();
    expect(typeof runtimeProviderRegistry.get).toBe('function');
    expect(typeof runtimeProviderRegistry.getAll).toBe('function');
  });

  test('should have registered runtime providers', () => {
    const providers = runtimeProviderRegistry.getAll();
    expect(providers.length).toBeGreaterThan(0);
    
    const providerNames = runtimeProviderRegistry.getSupportedRuntimes();
    expect(providerNames).toContain('node');
    expect(providerNames).toContain('dotnet');
  });

  test('should be able to get specific runtime providers', () => {
    const nodeProvider = runtimeProviderRegistry.get('node');
    const dotnetProvider = runtimeProviderRegistry.get('dotnet');
    
    expect(nodeProvider).toBeDefined();
    expect(dotnetProvider).toBeDefined();
    
    expect(typeof nodeProvider?.build).toBe('function');
    expect(typeof nodeProvider?.startDevServer).toBe('function');
    expect(typeof dotnetProvider?.build).toBe('function');
    expect(typeof dotnetProvider?.startDevServer).toBe('function');
  });

  test('runtime providers should integrate with ExecutionKernel', () => {
    const nodeProvider: any = runtimeProviderRegistry.get('node');
    const dotnetProvider: any = runtimeProviderRegistry.get('dotnet');
    
    // Check that providers have kernel reference
    expect(nodeProvider?.kernel).toBeDefined();
    expect(dotnetProvider?.kernel).toBeDefined();
    
    // Verify kernel is the same instance
    expect(nodeProvider.kernel).toBe(executionKernel);
    expect(dotnetProvider.kernel).toBe(executionKernel);
  });
});