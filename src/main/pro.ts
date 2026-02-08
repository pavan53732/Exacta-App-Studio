import { readSettings, writeSettings } from "./settings";

export function handleExactaAppStudioProReturn({ apiKey }: { apiKey: string }) {
  const settings = readSettings();
  writeSettings({
    providerSettings: {
      ...settings.providerSettings,
      auto: {
        ...settings.providerSettings.auto,
        apiKey: {
          value: apiKey,
        },
      },
    },
    enableExactaAppStudioPro: true,
  });
}
