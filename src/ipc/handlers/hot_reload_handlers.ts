// src/ipc/handlers/hot_reload_handlers.ts
// IPC handlers for .NET Hot Reload functionality

import log from "electron-log";
import { createLoggedHandler } from "./safe_handle";
import { hotReloadContracts } from "../types/hot_reload";
import { hotReloadManager } from "../runtime/HotReloadManager";
import { db } from "../../db";
import { apps } from "../../db/schema";
import { eq } from "drizzle-orm";
import { getDyadAppPath } from "../../paths/paths";

const logger = log.scope("hot_reload_handlers");
const handle = createLoggedHandler(logger);

/**
 * Register all hot reload IPC handlers
 */
export function registerHotReloadHandlers(): void {
  logger.info("Registering hot reload IPC handlers");

  // Start hot reload session
  handle(
    hotReloadContracts.startHotReload,
    async (_event, params): Promise<{ success: boolean; session?: any; error?: string }> => {
      const { appId, configuration, framework, noRestore, env } = params;

      try {
        // Get app info from database
        const [app] = await db.select().from(apps).where(eq(apps.id, appId));

        if (!app) {
          return {
            success: false,
            error: `App with ID ${appId} not found`,
          };
        }

        // Get app path
        const appPath = app.path || getDyadAppPath(app.name);

        // Check if hot reload is supported for this app type
        const stackType = app.stackType || "wpf";
        if (!hotReloadManager.isHotReloadSupported(stackType)) {
          return {
            success: false,
            error: `Hot reload is not supported for ${stackType} apps`,
          };
        }

        // Check if session already active
        if (hotReloadManager.hasActiveSession(appId)) {
          const existingSession = hotReloadManager.getSession(appId);
          return {
            success: true,
            session: existingSession,
          };
        }

        // Start hot reload session
        const session = await hotReloadManager.startHotReload({
          appId,
          appPath,
          configuration,
          framework,
          noRestore,
          env,
        });

        return {
          success: true,
          session: {
            appId: session.appId,
            appPath: session.appPath,
            processId: session.processId,
            status: session.status,
            startedAt: session.startedAt,
            lastReloadAt: session.lastReloadAt,
            error: session.error,
            reloadCount: session.reloadCount,
          },
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to start hot reload for app ${appId}:`, errorMessage);
        return {
          success: false,
          error: errorMessage,
        };
      }
    },
  );

  // Stop hot reload session
  handle(
    hotReloadContracts.stopHotReload,
    async (_event, params): Promise<{ success: boolean; error?: string }> => {
      const { appId } = params;

      try {
        await hotReloadManager.stopHotReload(appId);
        return { success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to stop hot reload for app ${appId}:`, errorMessage);
        return {
          success: false,
          error: errorMessage,
        };
      }
    },
  );

  // Get hot reload status
  handle(
    hotReloadContracts.getHotReloadStatus,
    async (_event, params): Promise<{ status: string | null; session?: any }> => {
      const { appId } = params;

      const status = hotReloadManager.getStatus(appId);
      const session = hotReloadManager.getSession(appId);

      if (session) {
        return {
          status,
          session: {
            appId: session.appId,
            appPath: session.appPath,
            processId: session.processId,
            status: session.status,
            startedAt: session.startedAt,
            lastReloadAt: session.lastReloadAt,
            error: session.error,
            reloadCount: session.reloadCount,
          },
        };
      }

      return { status: null };
    },
  );

  // Check hot reload support
  handle(
    hotReloadContracts.checkHotReloadSupport,
    async (_event, params): Promise<{ supported: boolean; message?: string }> => {
      const { stackType } = params;

      const supported = hotReloadManager.isHotReloadSupported(stackType);

      return {
        supported,
        message: supported
          ? undefined
          : `Hot reload is not supported for ${stackType} apps. Supported types: WPF, WinUI3, WinForms, Console, MAUI`,
      };
    },
  );

  logger.info("Hot reload IPC handlers registered successfully");
}
