import {
  executionKernel,
  KernelCommand,
  KernelOptions,
} from "../security/execution_kernel";
import log from "electron-log";

const logger = log.scope("runtime-provider");

export interface RuntimeContext {
  appId: number;
  appPath: string;
  port?: number;
  environment?: "development" | "production";
}

export interface BuildResult {
  success: boolean;
  message: string;
  artifacts?: string[];
  previewUrl?: string;
  duration: number;
}

export interface PackageResult {
  success: boolean;
  outputPath: string;
  fileSize?: number;
  message: string;
}

export abstract class RuntimeProvider {
  protected readonly kernel = executionKernel;

  constructor(protected readonly name: string) {}

  abstract build(context: RuntimeContext): Promise<BuildResult>;
  abstract startDevServer(
    context: RuntimeContext,
  ): Promise<{ url: string; pid: number }>;
  abstract stopDevServer(pid: number): Promise<void>;
  abstract package(context: RuntimeContext): Promise<PackageResult>;
  abstract getCapabilities(): string[];
  abstract validateContext(context: RuntimeContext): Promise<boolean>;

  protected async executeCommand(
    command: string,
    args: string[],
    options: KernelOptions,
  ): Promise<any> {
    const kernelCommand: KernelCommand = { command, args };
    return this.kernel.execute(kernelCommand, options);
  }

  protected async executeSequence(
    commands: KernelCommand[],
    options: KernelOptions,
  ): Promise<any[]> {
    return this.kernel.executeSequence(commands, options);
  }

  protected logAction(action: string, context: RuntimeContext): void {
    logger.info(
      `[${this.name}] ${action} for app ${context.appId} at ${context.appPath}`,
    );
  }
}

export class NodeRuntimeProvider extends RuntimeProvider {
  constructor() {
    super("node");
  }

  async build(context: RuntimeContext): Promise<BuildResult> {
    this.logAction("Building Node.js app", context);

    const startTime = Date.now();
    const options: KernelOptions = {
      appId: context.appId,
      cwd: context.appPath,
      timeout: 300000, // 5 minutes
      memoryLimitMB: 2000,
    };

    try {
      // Sequential execution instead of shell chaining
      await this.executeCommand("npm", ["ci"], options);
      await this.executeCommand("npm", ["run", "build"], options);

      const duration = Date.now() - startTime;

      return {
        success: true,
        message: "Build completed successfully",
        artifacts: ["dist/", "build/"],
        previewUrl: `file://${context.appPath}/dist/index.html`,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        message: `Build failed: ${(error as Error).message}`,
        duration,
      };
    }
  }

  async startDevServer(
    context: RuntimeContext,
  ): Promise<{ url: string; pid: number }> {
    this.logAction("Starting dev server", context);

    const options: KernelOptions = {
      appId: context.appId,
      cwd: context.appPath,
      timeout: 30000,
      memoryLimitMB: 1000,
    };

    const port = context.port || 3000;

    // Execute sequentially - no shell chaining
    await this.executeCommand("npm", ["ci"], options);

    // Start dev server
    const result = await this.executeCommand(
      "npm",
      ["run", "dev", "--", "--port", port.toString()],
      options,
    );

    return {
      url: `http://localhost:${port}`,
      pid: result.pid || 0, // Would need actual process tracking
    };
  }

  async stopDevServer(pid: number): Promise<void> {
    this.logAction(`Stopping dev server PID ${pid}`, { appId: 0, appPath: "" });

    // Use kernel to terminate process properly
    const options: KernelOptions = {
      appId: 0,
      cwd: process.cwd(),
      timeout: 10000,
    };

    try {
      await this.executeCommand(
        "taskkill",
        ["/PID", pid.toString(), "/F"],
        options,
      );
    } catch (error) {
      logger.warn(`Failed to kill process ${pid}:`, error);
      // Fall back to more aggressive termination if needed
    }
  }

  async package(context: RuntimeContext): Promise<PackageResult> {
    this.logAction("Packaging Node.js app", context);

    const options: KernelOptions = {
      appId: context.appId,
      cwd: context.appPath,
      timeout: 600000, // 10 minutes for packaging
      memoryLimitMB: 3000,
    };

    try {
      await this.executeCommand("npm", ["run", "package"], options);

      // Find the packaged output
      const outputPath = `${context.appPath}/dist/app.zip`;

      return {
        success: true,
        outputPath,
        message: "Packaging completed successfully",
      };
    } catch (error) {
      return {
        success: false,
        outputPath: "",
        message: `Packaging failed: ${(error as Error).message}`,
      };
    }
  }

  getCapabilities(): string[] {
    return ["web", "server", "static-site", "spa"];
  }

  async validateContext(context: RuntimeContext): Promise<boolean> {
    // Check if package.json exists
    try {
      const fs = await import("fs");
      await fs.promises.access(`${context.appPath}/package.json`);
      return true;
    } catch {
      return false;
    }
  }
}

export class DotNetRuntimeProvider extends RuntimeProvider {
  constructor() {
    super("dotnet");
  }

  async build(context: RuntimeContext): Promise<BuildResult> {
    this.logAction("Building .NET app", context);

    const startTime = Date.now();
    const options: KernelOptions = {
      appId: context.appId,
      cwd: context.appPath,
      timeout: 600000, // 10 minutes for .NET builds
      memoryLimitMB: 4000,
    };

    try {
      await this.executeCommand("dotnet", ["restore"], options);
      await this.executeCommand(
        "dotnet",
        ["build", "--configuration", "Release"],
        options,
      );

      const duration = Date.now() - startTime;

      return {
        success: true,
        message: ".NET build completed successfully",
        artifacts: ["bin/Release/", "obj/"],
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        message: `.NET build failed: ${(error as Error).message}`,
        duration,
      };
    }
  }

  async startDevServer(
    context: RuntimeContext,
  ): Promise<{ url: string; pid: number }> {
    this.logAction("Starting .NET dev server", context);

    const options: KernelOptions = {
      appId: context.appId,
      cwd: context.appPath,
      timeout: 30000,
      memoryLimitMB: 2000,
    };

    const port = context.port || 5000;

    // Restore and run
    await this.executeCommand("dotnet", ["restore"], options);
    const result = await this.executeCommand(
      "dotnet",
      ["run", "--urls", `http://localhost:${port}`],
      options,
    );

    return {
      url: `http://localhost:${port}`,
      pid: result.pid || 0,
    };
  }

  async stopDevServer(pid: number): Promise<void> {
    this.logAction(`Stopping .NET server PID ${pid}`, {
      appId: 0,
      appPath: "",
    });

    const options: KernelOptions = {
      appId: 0,
      cwd: process.cwd(),
      timeout: 10000,
    };

    try {
      await this.executeCommand(
        "taskkill",
        ["/PID", pid.toString(), "/F"],
        options,
      );
    } catch (error) {
      logger.warn(`Failed to kill .NET process ${pid}:`, error);
    }
  }

  async package(context: RuntimeContext): Promise<PackageResult> {
    this.logAction("Packaging .NET app", context);

    const options: KernelOptions = {
      appId: context.appId,
      cwd: context.appPath,
      timeout: 900000, // 15 minutes for .NET packaging
      memoryLimitMB: 4000,
    };

    try {
      await this.executeCommand(
        "dotnet",
        ["publish", "--configuration", "Release", "--output", "publish"],
        options,
      );

      const outputPath = `${context.appPath}/publish`;

      return {
        success: true,
        outputPath,
        message: ".NET packaging completed successfully",
      };
    } catch (error) {
      return {
        success: false,
        outputPath: "",
        message: `.NET packaging failed: ${(error as Error).message}`,
      };
    }
  }

  getCapabilities(): string[] {
    return ["desktop", "web", "api", "console"];
  }

  async validateContext(context: RuntimeContext): Promise<boolean> {
    // Check if .csproj or .sln exists
    try {
      const fs = await import("fs");
      const files = await fs.promises.readdir(context.appPath);
      return files.some(
        (file) => file.endsWith(".csproj") || file.endsWith(".sln"),
      );
    } catch {
      return false;
    }
  }
}

// Registry for runtime providers
export class RuntimeProviderRegistry {
  private static instance: RuntimeProviderRegistry;
  private providers: Map<string, RuntimeProvider> = new Map();

  private constructor() {
    // Register default providers
    this.register("node", new NodeRuntimeProvider());
    this.register("dotnet", new DotNetRuntimeProvider());
  }

  static getInstance(): RuntimeProviderRegistry {
    if (!RuntimeProviderRegistry.instance) {
      RuntimeProviderRegistry.instance = new RuntimeProviderRegistry();
    }
    return RuntimeProviderRegistry.instance;
  }

  register(name: string, provider: RuntimeProvider): void {
    this.providers.set(name, provider);
    logger.info(`Registered runtime provider: ${name}`);
  }

  get(name: string): RuntimeProvider | undefined {
    return this.providers.get(name);
  }

  getAll(): RuntimeProvider[] {
    return Array.from(this.providers.values());
  }

  getSupportedRuntimes(): string[] {
    return Array.from(this.providers.keys());
  }
}

export const runtimeProviderRegistry = RuntimeProviderRegistry.getInstance();
