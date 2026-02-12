// src/ipc/runtime/RuntimeProviderRegistry.ts
// Central registry for runtime providers
// NO scattered runtime branching across the codebase

import type { RuntimeProvider } from "./RuntimeProvider";
import { nodeRuntimeProvider } from "./providers/NodeRuntimeProvider";
import { dotNetRuntimeProvider } from "./providers/DotNetRuntimeProvider";

class RuntimeProviderRegistry {
  private providers: Map<string, RuntimeProvider> = new Map();

  register(provider: RuntimeProvider): void {
    this.providers.set(provider.runtimeId, provider);
  }

  getProvider(runtimeId: string): RuntimeProvider {
    const provider = this.providers.get(runtimeId);
    if (!provider) {
      throw new Error(`Unknown runtime: ${runtimeId}`);
    }
    return provider;
  }

  getProviderForStack(stackType: string): RuntimeProvider {
    for (const provider of this.providers.values()) {
      if (provider.supportedStackTypes.includes(stackType)) {
        return provider;
      }
    }
    throw new Error(`No provider found for stack type: ${stackType}`);
  }

  listProviders(): RuntimeProvider[] {
    return Array.from(this.providers.values());
  }
}

// Singleton instance
export const runtimeRegistry = new RuntimeProviderRegistry();

// Register default providers
runtimeRegistry.register(nodeRuntimeProvider);
runtimeRegistry.register(dotNetRuntimeProvider);
