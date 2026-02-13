import { createLoggedHandler } from "./safe_handle";
import log from "electron-log";
import { db } from "../../db";
import { apps } from "../../db/schema";
import { eq } from "drizzle-orm";
import { getDyadAppPath } from "../../paths/paths";
import { gitCommit, gitAdd } from "../utils/git_utils";
import { storeDbTimestampAtCurrentVersion } from "../utils/neon_timestamp_utils";
import { executionKernel } from "../security/execution_kernel";

const logger = log.scope("portal_handlers");
const handle = createLoggedHandler(logger);

async function getApp(appId: number) {
  const app = await db.query.apps.findFirst({
    where: eq(apps.id, appId),
  });
  if (!app) {
    throw new Error(`App with id ${appId} not found`);
  }
  return app;
}

export function registerPortalHandlers() {
  handle(
    "portal:migrate-create",
    async (_, { appId }: { appId: number }): Promise<{ output: string }> => {
      const app = await getApp(appId);
      const appPath = getDyadAppPath(app.path);

      // Run the migration command through ExecutionKernel for security
      logger.info(`Running migrate:create for app ${appId} at ${appPath}`);

      let migrationOutput = "";

      try {
        const options = {
          appId,
          cwd: appPath,
          timeout: 300000, // 5 minute timeout
          memoryLimitMB: 1000, // 1GB memory limit
          networkAccess: false, // Database migrations shouldn't need network
        };

        // Execute npm run migrate:create with proper arguments
        const result = await executionKernel.execute(
          {
            command: "npm",
            args: ["run", "migrate:create", "--", "--skip-empty"],
          },
          options,
        );

        migrationOutput =
          result.stdout +
          (result.stderr ? `\n\nErrors/Warnings:\n${result.stderr}` : "");

        if (result.exitCode === 0) {
          if (result.stdout.includes("Migration created at")) {
            logger.info(
              `migrate:create completed successfully for app ${appId}`,
            );
          } else {
            logger.error(
              `migrate:create completed successfully for app ${appId} but no migration was created`,
            );
            throw new Error(
              "No migration was created because no changes were found.",
            );
          }
        } else {
          logger.error(
            `migrate:create failed for app ${appId} with exit code ${result.exitCode}`,
          );
          const errorMessage = `Migration creation failed (exit code ${result.exitCode})\n\n${migrationOutput}`;
          throw new Error(errorMessage);
        }

        // Handle the stdin interaction that was in the original code
        // This would need to be handled differently in the ExecutionKernel approach
        // For now, we'll assume the --skip-empty flag handles the interaction
      } catch (error) {
        logger.error(`Failed to run migrate:create for app ${appId}:`, error);
        throw error;
      }

      if (app.neonProjectId && app.neonDevelopmentBranchId) {
        try {
          await storeDbTimestampAtCurrentVersion({
            appId: app.id,
          });
        } catch (error) {
          logger.error(
            "Error storing Neon timestamp at current version:",
            error,
          );
          throw new Error(
            "Could not store Neon timestamp at current version; database versioning functionality is not working: " +
              error,
          );
        }
      }

      // Stage all changes and commit
      try {
        await gitAdd({ path: appPath, filepath: "." });

        const commitHash = await gitCommit({
          path: appPath,
          message: "[dyad] Generate database migration file",
        });

        logger.info(`Successfully committed migration changes: ${commitHash}`);
        return { output: migrationOutput };
      } catch (gitError) {
        logger.error(`Migration created but failed to commit: ${gitError}`);
        throw new Error(`Migration created but failed to commit: ${gitError}`);
      }
    },
  );
}
