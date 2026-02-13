interface FreeAgentQuotaBannerProps {
  onSwitchToBuildMode: () => void;
}

/**
 * Banner displayed when a free user has exceeded their daily Basic Agent quota.
 * Shows the time until quota resets and provides options to upgrade or switch modes.
 */
export function FreeAgentQuotaBanner({
  onSwitchToBuildMode: _onSwitchToBuildMode,
}: FreeAgentQuotaBannerProps) {
  // BYPASSED: Always return null to hide quota banner
  return null;
}
