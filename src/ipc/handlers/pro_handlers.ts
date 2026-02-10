import fetch from "node-fetch"; // Electron main process might need node-fetch
import log from "electron-log";
import { createLoggedHandler } from "./safe_handle";
import { readSettings } from "../../main/settings"; // Assuming settings are read this way
import { UserBudgetInfo, UserBudgetInfoSchema } from "@/ipc/types";
import { IS_TEST_BUILD } from "../utils/test_utils";
import { z } from "zod";

export const UserInfoResponseSchema = z.object({
  usedCredits: z.number(),
  totalCredits: z.number(),
  budgetResetDate: z.string(), // ISO date string from API
  userId: z.string(),
  isTrial: z.boolean().optional().default(false),
});
export type UserInfoResponse = z.infer<typeof UserInfoResponseSchema>;

const logger = log.scope("pro_handlers");
const handle = createLoggedHandler(logger);

export function registerProHandlers() {
  // This method should try to avoid throwing errors because this is auxiliary
  // information and isn't critical to using the app
  handle("get-user-budget", async (): Promise<UserBudgetInfo | null> => {
    logger.info("Providing mocked user budget information.");

    const resetDate = new Date();
    resetDate.setFullYear(resetDate.getFullYear() + 1); // Reset in 1 year

    return {
      usedCredits: 0,
      totalCredits: 999999,
      budgetResetDate: resetDate,
      redactedUserId: "****PRO",
      isTrial: false,
    };
  });
}
