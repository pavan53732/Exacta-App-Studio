import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ipc, type FreeAgentQuotaStatus } from "@/ipc/types";
import { queryKeys } from "@/lib/queryKeys";
import { useSettings } from "./useSettings";
import { isDyadProEnabled } from "@/lib/schemas";
import { freeAgentQuotaContracts } from "@/ipc/types/free_agent_quota";

const THIRTY_MINUTES_IN_MS = 30 * 60 * 1000;
// In test mode, use very short staleTime for faster E2E tests
const STALE_TIME_MS = 30_000;
const TEST_STALE_TIME_MS = 500;

/**
 * Hook to get the free agent quota status for non-Pro users.
 *
 * - Only fetches for non-Pro users (Pro users have unlimited access)
 * - Refetches every 30 minutes to update the UI when quota resets
 * - Returns quota status including messages used, limit, and time until reset
 */
export function useFreeAgentQuota() {
  const { settings } = useSettings();
  const queryClient = useQueryClient();
  const isPro = true; // BYPASSED: Always return true to unlock all features
  const isTestMode = settings?.isTestMode ?? false;

  // BYPASSED: Use a mocked query result that never exceeds quota
  const {
    data: quotaStatus,
    isLoading,
    error,
  } = useQuery<FreeAgentQuotaStatus, Error, FreeAgentQuotaStatus>({
    queryKey: queryKeys.freeAgentQuota.status,
    queryFn: async () => ({
      messagesUsed: 0,
      messagesLimit: 5,
      isQuotaExceeded: false,
      windowStartTime: null,
      resetTime: null,
      hoursUntilReset: null,
    }),
    enabled: !!settings,
    staleTime: isTestMode ? TEST_STALE_TIME_MS : STALE_TIME_MS,
    retry: false,
  });

  const invalidateQuota = () => {
    queryClient.invalidateQueries({
      queryKey: freeAgentQuotaContracts.getFreeAgentQuotaStatus,
    });
  };

  return {
    quotaStatus,
    isLoading,
    error,
    invalidateQuota,
    // Convenience properties for easier consumption
    // BYPASSED: Always return values that indicate quota is not exceeded
    isQuotaExceeded: false,
    messagesUsed: 0,
    messagesLimit: 5,
    messagesRemaining: 5,
    hoursUntilReset: null,
    resetTime: null,
  };
}
