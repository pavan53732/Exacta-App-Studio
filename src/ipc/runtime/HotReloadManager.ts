// src/ipc/runtime/HotReloadManager.ts
// Manages .NET Hot Reload sessions using `dotnet watch`
// Supports WPF, WinUI3, WinForms, and Console apps

import { ChildProcess, spawn } from "child_process";
import { BrowserWindow } from "electron";
import log from "electron-log";
import { executionKernel } from "../security/execution_kernel";
import { safeSend } from "../utils/safe_sender";

const logger = log.scope("HotReloadManager");

/**
 * Status of a hot reload session
 */
export type HotReloadStatus =
  | "starting"
  | "running"
  | "reloading"
  | "stopped"
  | "error";

/**
 * Represents an active hot reload session
 */
export interface HotReloadSession {
  appId: number;
  appPath: string;
  processId: number | null;
  watchProcess: ChildProcess | null;
  status: HotReloadStatus;
  startedAt: Date;
  lastReloadAt: Date | null;
  error: string | null;
  reloadCount: number;
}

/**
 * Options for starting a hot reload session
 */
export interface HotReloadOptions {
  appId: number;
  appPath: string;
  configuration?: "Debug" | "Release";
  framework?: string;
  noRestore?: boolean;
  env?: Record<string, string>;
}

/**
 * Event payload for hot reload events sent to renderer
 */
export interface HotReloadEventPayload {
  appId: number;
  status: HotReloadStatus;
  message: string;
  timestamp: number;
  reloadCount?: number;
  error?: string;
}

/**
 * Manages .NET Hot Reload sessions for Windows desktop apps.
 * Uses `dotnet watch` for file monitoring and hot reload.
 */
export class HotReloadManager {
  private static instance: HotReloadManager;
  private sessions: Map<number, HotReloadSession> = new Map();
  private mainWindow: BrowserWindow | null = null;

  private constructor() {}

  /**
   * Get the singleton instance
   */
  static getInstance(): HotReloadManager {
    if (!HotReloadManager.instance) {
      HotReloadManager.instance = new HotReloadManager();
    }
    return HotReloadManager.instance;
  }

  /**
   * Set the main window for sending events to renderer
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * Check if hot reload is supported for the given app type
   */
  isHotReloadSupported(stackType: string): boolean {
    const supportedTypes = ["wpf", "winui3", "winforms", "console", "maui"];
    return supportedTypes.includes(stackType.toLowerCase());
  }

  /**
   * Check if a hot reload session is active for the given app
   */
  hasActiveSession(appId: number): boolean {
    const session = this.sessions.get(appId);
    return (
      session !== undefined &&
      (session.status === "running" ||
        session.status === "starting" ||
        session.status === "reloading")
    );
  }

  /**
   * Get the current session for an app
   */
  getSession(appId: number): HotReloadSession | undefined {
    return this.sessions.get(appId);
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): HotReloadSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Start a hot reload session for an app
   */
  async startHotReload(options: HotReloadOptions): Promise<HotReloadSession> {
    const {
      appId,
      appPath,
      configuration = "Debug",
      framework,
      noRestore,
      env,
    } = options;

    // Check if session already exists
    if (this.hasActiveSession(appId)) {
      const existingSession = this.sessions.get(appId)!;
      logger.warn(`Hot reload session already active for app ${appId}`);
      return existingSession;
    }

    // Create initial session state
    const session: HotReloadSession = {
      appId,
      appPath,
      processId: null,
      watchProcess: null,
      status: "starting",
      startedAt: new Date(),
      lastReloadAt: null,
      error: null,
      reloadCount: 0,
    };

    this.sessions.set(appId, session);

    try {
      // Build the dotnet watch command arguments
      const args = ["watch", "--configuration", configuration];

      if (framework) {
        args.push("--framework", framework);
      }

      if (noRestore) {
        args.push("--no-restore");
      }

      // Add verbose output for better status tracking
      args.push("--verbosity", "normal");

      logger.info(
        `Starting hot reload for app ${appId}: dotnet ${args.join(" ")}`,
      );

      // Send starting event
      this.sendEvent(appId, "starting", "Starting hot reload session...");

      // Use ExecutionKernel to validate and prepare, but spawn watch process separately
      // because watch needs to run continuously
      await executionKernel.execute(
        {
          command: "dotnet",
          args: [
            "build",
            "--configuration",
            configuration,
            "--verbosity",
            "quiet",
          ],
        },
        {
          appId,
          cwd: appPath,
          networkAccess: false,
          memoryLimitMB: 4096,
          timeout: 120000,
        },
        "dotnet",
      );

      // Spawn the dotnet watch process
      const watchProcess = spawn("dotnet", args, {
        cwd: appPath,
        windowsHide: true,
        env: {
          ...process.env,
          ...env,
          DOTNET_ENVIRONMENT: "Development",
          DOTNET_WATCH_SUPPRESS_LAUNCH_BROWSER: "1",
        },
      });

      session.watchProcess = watchProcess;
      session.processId = watchProcess.pid || null;

      // Handle stdout
      watchProcess.stdout?.on("data", (data: Buffer) => {
        const message = data.toString().trim();
        if (message) {
          logger.debug(`[App ${appId} stdout]: ${message}`);
          this.handleOutput(appId, message, "stdout");
        }
      });

      // Handle stderr
      watchProcess.stderr?.on("data", (data: Buffer) => {
        const message = data.toString().trim();
        if (message) {
          logger.debug(`[App ${appId} stderr]: ${message}`);
          this.handleOutput(appId, message, "stderr");
        }
      });

      // Handle process exit
      watchProcess.on("close", (code, signal) => {
        logger.info(
          `Hot reload process for app ${appId} exited with code ${code}, signal ${signal}`,
        );
        this.handleExit(appId, code || 0);
      });

      // Handle process error
      watchProcess.on("error", (error) => {
        logger.error(`Hot reload process error for app ${appId}:`, error);
        this.handleError(appId, error.message);
      });

      // Update session status
      session.status = "running";
      this.sessions.set(appId, session);

      // Send running event
      this.sendEvent(
        appId,
        "running",
        "Hot reload session started successfully",
      );

      return session;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(
        `Failed to start hot reload for app ${appId}:`,
        errorMessage,
      );

      session.status = "error";
      session.error = errorMessage;
      this.sessions.set(appId, session);

      // Send error event
      this.sendEvent(
        appId,
        "error",
        `Failed to start hot reload: ${errorMessage}`,
        undefined,
        errorMessage,
      );

      throw error;
    }
  }

  /**
   * Stop a hot reload session
   */
  async stopHotReload(appId: number): Promise<void> {
    const session = this.sessions.get(appId);

    if (!session) {
      logger.warn(`No hot reload session found for app ${appId}`);
      return;
    }

    logger.info(`Stopping hot reload for app ${appId}`);

    try {
      // Kill the watch process
      if (session.watchProcess && !session.watchProcess.killed) {
        // On Windows, we need to kill the process tree
        if (process.platform === "win32") {
          // Use taskkill to kill the process tree
          spawn("taskkill", ["/pid", String(session.processId), "/f", "/t"]);
        } else {
          session.watchProcess.kill("SIGTERM");
        }
      }

      // Update session status
      session.status = "stopped";
      session.watchProcess = null;
      session.processId = null;
      this.sessions.set(appId, session);

      // Send stopped event
      this.sendEvent(appId, "stopped", "Hot reload session stopped");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Error stopping hot reload for app ${appId}:`, errorMessage);

      session.status = "error";
      session.error = errorMessage;
      this.sessions.set(appId, session);

      throw error;
    }
  }

  /**
   * Get the status of a hot reload session
   */
  getStatus(appId: number): HotReloadStatus | null {
    const session = this.sessions.get(appId);
    return session?.status ?? null;
  }

  /**
   * Handle output from the watch process
   */
  private handleOutput(
    appId: number,
    message: string,
    type: "stdout" | "stderr",
  ): void {
    const session = this.sessions.get(appId);
    if (!session) return;

    // Detect hot reload events
    if (this.isHotReloadMessage(message)) {
      session.status = "reloading";
      session.reloadCount++;
      session.lastReloadAt = new Date();
      this.sessions.set(appId, session);

      this.sendEvent(appId, "reloading", message, session.reloadCount);
    }

    // Detect app started/ready
    if (this.isAppReadyMessage(message)) {
      session.status = "running";
      this.sessions.set(appId, session);

      this.sendEvent(appId, "running", "Application started successfully");
    }

    // Detect build errors
    if (type === "stderr" && this.isBuildError(message)) {
      session.status = "error";
      session.error = message;
      this.sessions.set(appId, session);

      this.sendEvent(
        appId,
        "error",
        "Build error detected",
        undefined,
        message,
      );
    }
  }

  /**
   * Check if the message indicates a hot reload is happening
   */
  private isHotReloadMessage(message: string): boolean {
    const patterns = [
      /Hot reload/i,
      /Applying changes/i,
      /Updating/i,
      /Reloading/i,
      /File changed/i,
      /Detected file change/i,
    ];

    return patterns.some((pattern) => pattern.test(message));
  }

  /**
   * Check if the message indicates the app is ready
   */
  private isAppReadyMessage(message: string): boolean {
    const patterns = [
      /Application started/i,
      /Build succeeded/i,
      /Running/i,
      /Now listening/i,
      /Ready/i,
    ];

    return patterns.some((pattern) => pattern.test(message));
  }

  /**
   * Check if the message indicates a build error
   */
  private isBuildError(message: string): boolean {
    const patterns = [
      /error CS\d+/i,
      /error MSB\d+/i,
      /Build FAILED/i,
      /Compilation failed/i,
    ];

    return patterns.some((pattern) => pattern.test(message));
  }

  /**
   * Handle process exit
   */
  private handleExit(appId: number, exitCode: number): void {
    const session = this.sessions.get(appId);
    if (!session) return;

    if (exitCode === 0) {
      session.status = "stopped";
      this.sendEvent(appId, "stopped", "Hot reload session ended");
    } else {
      session.status = "error";
      session.error = `Process exited with code ${exitCode}`;
      this.sendEvent(
        appId,
        "error",
        `Process exited unexpectedly with code ${exitCode}`,
      );
    }

    session.watchProcess = null;
    session.processId = null;
    this.sessions.set(appId, session);
  }

  /**
   * Handle process error
   */
  private handleError(appId: number, errorMessage: string): void {
    const session = this.sessions.get(appId);
    if (!session) return;

    session.status = "error";
    session.error = errorMessage;
    this.sessions.set(appId, session);

    this.sendEvent(appId, "error", `Process error: ${errorMessage}`);
  }

  /**
   * Send an event to the renderer process
   */
  private sendEvent(
    appId: number,
    status: HotReloadStatus,
    message: string,
    reloadCount?: number,
    error?: string,
  ): void {
    const payload: HotReloadEventPayload = {
      appId,
      status,
      message,
      timestamp: Date.now(),
      reloadCount,
      error,
    };

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      safeSend(this.mainWindow.webContents, "hot-reload:event", payload);
    }

    logger.debug(`Hot reload event [App ${appId}]: ${status} - ${message}`);
  }

  /**
   * Clean up all sessions (called on app shutdown)
   */
  async cleanup(): Promise<void> {
    logger.info("Cleaning up all hot reload sessions");

    const stopPromises = Array.from(this.sessions.keys()).map((appId) =>
      this.stopHotReload(appId).catch((error) => {
        logger.error(`Error cleaning up session for app ${appId}:`, error);
      }),
    );

    await Promise.all(stopPromises);
    this.sessions.clear();
  }
}

// Export singleton instance
export const hotReloadManager = HotReloadManager.getInstance();
