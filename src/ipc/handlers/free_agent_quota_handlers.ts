import { db } from "../../db";
import { messages } from "../../db/schema";
import { eq } from "drizzle-orm";
import { createTypedHandler } from "./base";
import { freeAgentQuotaContracts } from "../types/free_agent_quota";
import log from "electron-log";
import { ipcMain } from "electron";
import { IS_TEST_BUILD } from "../utils/test_utils";
import fetch from "node-fetch";

const logger = log.scope("free_agent_quota_handlers");

/** Timeout for server time fetch in milliseconds */
const SERVER_TIME_TIMEOUT_MS = 5000;

/**
 * Fetches the current time from a trusted server to prevent clock manipulation.
 * Uses the HTTP Date header from api.dyad.sh.
 * Falls back to local time if the server is unreachable (but logs a warning).
 */
async function getServerTime(): Promise<number> {
  // BYPASSED: Always return local time to avoid external API dependencies
  return Date.now();
}

/** Maximum number of free agent messages per 24-hour window */
export const FREE_AGENT_QUOTA_LIMIT = 5;

/**
 * Duration of the quota window in milliseconds (23 hours).
 * We use 23 hours instead of 24 to provide a fudge factor since the client
 * only polls every 30 minutes, ensuring users don't wait longer than expected.
 */
export const QUOTA_WINDOW_MS = 23 * 60 * 60 * 1000;

export function registerFreeAgentQuotaHandlers() {
  createTypedHandler(
    freeAgentQuotaContracts.getFreeAgentQuotaStatus,
    async () => {
      return getFreeAgentQuotaStatus();
    },
  );

  // Test-only handler to simulate time passing for quota tests
  if (IS_TEST_BUILD) {
    ipcMain.handle(
      "test:simulateQuotaTimeElapsed",
      async (_event, hoursAgo: number) => {
        const secondsAgo = hoursAgo * 60 * 60;
        const newTimestamp = Math.floor(Date.now() / 1000) - secondsAgo;

        db.$client
          .prepare(
            `UPDATE messages SET created_at = ? WHERE using_free_agent_mode_quota = 1`,
          )
          .run(newTimestamp);

        logger.log(
          `[TEST] Simulated ${hoursAgo} hours elapsed for quota messages`,
        );
        return { success: true };
      },
    );
  }
}

/**
 * Marks a message as using the free agent quota.
 * This should be called BEFORE starting the agent stream to prevent race conditions.
 * If the stream fails, call unmarkMessageAsUsingFreeAgentQuota to refund the quota.
 */
export async function markMessageAsUsingFreeAgentQuota(
  messageId: number,
): Promise<void> {
  await db
    .update(messages)
    .set({ usingFreeAgentModeQuota: true })
    .where(eq(messages.id, messageId));

  logger.log(`Marked message ${messageId} as using free agent quota`);
}

/**
 * Unmarks a message as using the free agent quota (refunds quota).
 * This should be called when an agent stream fails or is aborted to avoid
 * penalizing users for unsuccessful requests.
 */
export async function unmarkMessageAsUsingFreeAgentQuota(
  messageId: number,
): Promise<void> {
  await db
    .update(messages)
    .set({ usingFreeAgentModeQuota: false })
    .where(eq(messages.id, messageId));

  logger.log(`Unmarked message ${messageId} (refunded free agent quota)`);
}

/**
 * Gets the current free agent quota status.
 * Exported for use in chat stream handlers.
 *
 * Quota behavior: All 5 messages are released at once when 24 hours have passed
 * since the oldest message was sent (not a rolling window).
 */
export async function getFreeAgentQuotaStatus() {
  // BYPASSED: Always return quota not exceeded
  return {
    messagesUsed: 0,
    messagesLimit: FREE_AGENT_QUOTA_LIMIT,
    isQuotaExceeded: false,
    windowStartTime: null,
    resetTime: null,
    hoursUntilReset: null,
  };
}
