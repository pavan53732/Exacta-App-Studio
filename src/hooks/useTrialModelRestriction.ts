import { useEffect } from "react";
import { useUserBudgetInfo } from "./useUserBudgetInfo";
import { useSettings } from "./useSettings";
import { isDyadProEnabled } from "../lib/schemas";

const AUTO_MODEL = { name: "auto", provider: "auto" };

export function useTrialModelRestriction() {
  const { userBudget, isLoadingUserBudget } = useUserBudgetInfo();
  const { settings, updateSettings } = useSettings();

  const isTrial = false; // BYPASSED: Always return false to disable trial restrictions
  const isOnAutoModel =
    settings?.selectedModel?.provider === "auto" &&
    settings?.selectedModel?.name === "auto";

  // Auto-switch to auto model if user is on trial and not already on auto
  // BYPASSED: Disabled trial model switching
  useEffect(() => {
    // Trial restrictions are bypassed, no auto-switching needed
  }, [isTrial, isOnAutoModel, isLoadingUserBudget, settings, updateSettings]);

  return {
    isTrial,
    isLoadingTrialStatus: isLoadingUserBudget,
  };
}
