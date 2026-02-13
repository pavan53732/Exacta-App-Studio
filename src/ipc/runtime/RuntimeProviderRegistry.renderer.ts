/**
 * Renderer-safe version of RuntimeProviderRegistry
 * This file can be safely imported by renderer code as it doesn't import any providers
 * or Node.js modules.
 */

import type { PreviewStrategy } from "./runtime_types";

// Minimal runtime info that renderer needs
interface RuntimeInfo {
  runtimeId: string;
  runtimeName: string;
  previewStrategy: PreviewStrategy;
  supportedStackTypes: string[];
}

// Static runtime information (no actual provider instances)
const RUNTIME_INFO: Record<string, RuntimeInfo> = {
  node: {
    runtimeId: "node",
    runtimeName: "Node.js",
    previewStrategy: "iframe",
    supportedStackTypes: [
      "react",
      "next",
      "vue",
      "angular",
      "svelte",
      "astro",
      "solid",
      "qwik",
      "remix",
      "nuxt",
      "gatsby",
      "vite",
      "parcel",
      "webpack",
      "rollup",
      "esbuild",
      "turbopack",
    ],
  },
  dotnet: {
    runtimeId: "dotnet",
    runtimeName: ".NET",
    previewStrategy: "external-window",
    supportedStackTypes: [
      "wpf",
      "winui3",
      "winforms",
      "maui",
      "console",
      "blazor",
      "aspnet",
    ],
  },
  tauri: {
    runtimeId: "tauri",
    runtimeName: "Tauri",
    previewStrategy: "hybrid",
    supportedStackTypes: ["tauri"],
  },
};

/**
 * Renderer-safe registry that only provides static information
 */
export class RendererRuntimeRegistry {
  getRuntimeInfo(runtimeId: string): RuntimeInfo | undefined {
    return RUNTIME_INFO[runtimeId];
  }

  getPreviewStrategy(runtimeId: string): PreviewStrategy {
    const info = this.getRuntimeInfo(runtimeId);
    return info?.previewStrategy ?? "iframe";
  }

  listRuntimes(): RuntimeInfo[] {
    return Object.values(RUNTIME_INFO);
  }
}

// Singleton for renderer use
export const rendererRuntimeRegistry = new RendererRuntimeRegistry();
