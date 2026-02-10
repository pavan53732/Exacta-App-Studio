import { AlertTriangle, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFreeAgentQuota } from "@/hooks/useFreeAgentQuota";
import { ipc } from "@/ipc/types";

interface FreeAgentQuotaBannerProps {
  onSwitchToBuildMode: () => void;
}

/**
 * Banner displayed when a free user has exceeded their daily Basic Agent quota.
 * Shows the time until quota resets and provides options to upgrade or switch modes.
 */
export function FreeAgentQuotaBanner({
  onSwitchToBuildMode,
}: FreeAgentQuotaBannerProps) {
  // BYPASSED: Always return null to hide quota banner
  return null;
}
