import { useAtom, useAtomValue } from "jotai";
import {
  appConsoleEntriesAtom,
  previewModeAtom,
  previewPanelKeyAtom,
  selectedAppIdAtom,
  currentAppAtom,
} from "../../atoms/appAtoms";

import { CodeView } from "./CodeView";
import { PreviewIframe } from "./PreviewIframe";
import { NativeAppPreview } from "./NativeAppPreview";
import { ConsoleOutputPreview } from "./ConsoleOutputPreview";
import { HybridPreview } from "./HybridPreview";
import { Problems } from "./Problems";
import { ConfigurePanel } from "./ConfigurePanel";
import { ChevronDown, ChevronUp, Logs } from "lucide-react";
import { useEffect, useRef, useState, useMemo } from "react";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { Console } from "./Console";
import { useRunApp } from "@/hooks/useRunApp";
import { PublishPanel } from "./PublishPanel";
import { SecurityPanel } from "./SecurityPanel";
import { PlanPanel } from "./PlanPanel";
import { useSupabase } from "@/hooks/useSupabase";
import { useTranslation } from "react-i18next";
import { runtimeRegistry } from "@/ipc/runtime/RuntimeProviderRegistry";
import type { PreviewStrategy } from "@/ipc/runtime/RuntimeProvider";

interface ConsoleHeaderProps {
  isOpen: boolean;
  onToggle: () => void;
  latestMessage?: string;
}

// Console header component
const ConsoleHeader = ({
  isOpen,
  onToggle,
  latestMessage,
}: ConsoleHeaderProps) => {
  const { t } = useTranslation("home");
  return (
    <div
      onClick={onToggle}
      className="flex items-start gap-2 px-4 py-1.5 border-t border-border cursor-pointer hover:bg-[var(--background-darkest)] transition-colors"
    >
      <Logs size={16} className="mt-0.5" />
      <div className="flex flex-col">
        <span className="text-sm font-medium">
          {t("preview.systemMessages")}
        </span>
        {!isOpen && latestMessage && (
          <span className="text-xs text-gray-500 truncate max-w-[200px] md:max-w-[400px]">
            {latestMessage}
          </span>
        )}
      </div>
      <div className="flex-1" />
      {isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
    </div>
  );
};

// Helper function to determine preview strategy based on app's runtime provider
function getPreviewStrategy(
  runtimeProvider?: string | null,
  _stackType?: string | null,
): PreviewStrategy {
  if (!runtimeProvider) {
    return "iframe"; // Default to iframe for legacy apps
  }

  try {
    const provider = runtimeRegistry.getProvider(runtimeProvider);
    return provider.previewStrategy;
  } catch {
    // If provider not found, fall back to iframe
    return "iframe";
  }
}

// Component that renders the appropriate preview based on strategy
function PreviewContent({
  strategy,
  loading,
  key,
}: {
  strategy: PreviewStrategy;
  loading: boolean;
  key: number;
}) {
  switch (strategy) {
    case "external-window":
      return <NativeAppPreview key={key} loading={loading} />;
    case "console-output":
      return <ConsoleOutputPreview key={key} loading={loading} />;
    case "hybrid":
      return <HybridPreview key={key} loading={loading} />;
    case "iframe":
    default:
      return <PreviewIframe key={key} loading={loading} />;
  }
}

// Main PreviewPanel component
export function PreviewPanel() {
  const [previewMode] = useAtom(previewModeAtom);
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const _currentApp = useAtomValue(currentAppAtom);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const { runApp, stopApp, loading, app } = useRunApp();
  const { loadEdgeLogs } = useSupabase();
  const runningAppIdRef = useRef<number | null>(null);
  const key = useAtomValue(previewPanelKeyAtom);
  const consoleEntries = useAtomValue(appConsoleEntriesAtom);

  // Determine preview strategy based on app's runtime provider
  const previewStrategy = useMemo(() => {
    return getPreviewStrategy(app?.runtimeProvider, app?.stackType);
  }, [app?.runtimeProvider, app?.stackType]);

  const latestMessage =
    consoleEntries.length > 0
      ? consoleEntries[consoleEntries.length - 1]?.message
      : undefined;

  useEffect(() => {
    const previousAppId = runningAppIdRef.current;

    // Check if the selected app ID has changed
    if (selectedAppId !== previousAppId) {
      // Stop the previously running app, if any
      if (previousAppId !== null) {
        console.debug("Stopping previous app", previousAppId);
        stopApp(previousAppId);
        // We don't necessarily nullify the ref here immediately,
        // let the start of the next app update it or unmount handle it.
      }

      // Start the new app if an ID is selected
      if (selectedAppId !== null) {
        console.debug("Starting new app", selectedAppId);
        runApp(selectedAppId); // Consider adding error handling for the promise if needed
        runningAppIdRef.current = selectedAppId; // Update ref to the new running app ID
      } else {
        // If selectedAppId is null, ensure no app is marked as running
        runningAppIdRef.current = null;
      }
    }

    // Cleanup function: This runs when the component unmounts OR before the effect runs again.
    // We only want to stop the app on actual unmount. The logic above handles stopping
    // when the appId changes. So, we capture the running appId at the time the effect renders.
    const appToStopOnUnmount = runningAppIdRef.current;
    return () => {
      if (appToStopOnUnmount !== null) {
        const currentRunningApp = runningAppIdRef.current;
        if (currentRunningApp !== null) {
          console.debug(
            "Component unmounting or selectedAppId changing, stopping app",
            currentRunningApp,
          );
          stopApp(currentRunningApp);
          runningAppIdRef.current = null; // Clear ref on stop
        }
      }
    };
    // Dependencies: run effect when selectedAppId changes.
    // runApp/stopApp are stable due to useCallback.
  }, [selectedAppId, runApp, stopApp]);

  // Load edge logs if app has Supabase project configured
  useEffect(() => {
    const projectId = app?.supabaseProjectId;
    const organizationSlug = app?.supabaseOrganizationSlug ?? undefined;
    if (!projectId) return;

    // Load logs immediately
    loadEdgeLogs({ projectId, organizationSlug }).catch((error) => {
      console.error("Failed to load edge logs:", error);
    });

    // Poll for new logs every 5 seconds
    const intervalId = setInterval(() => {
      loadEdgeLogs({ projectId, organizationSlug }).catch((error) => {
        console.error("Failed to load edge logs:", error);
      });
    }, 5000);

    return () => clearInterval(intervalId);
  }, [app?.supabaseProjectId, app?.supabaseOrganizationSlug, loadEdgeLogs]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="vertical">
          <Panel id="content" minSize={30}>
            <div className="h-full overflow-y-auto">
              {previewMode === "preview" ? (
                <PreviewContent
                  strategy={previewStrategy}
                  loading={loading}
                  key={key}
                />
              ) : previewMode === "code" ? (
                <CodeView loading={loading} app={app} />
              ) : previewMode === "configure" ? (
                <ConfigurePanel />
              ) : previewMode === "publish" ? (
                <PublishPanel />
              ) : previewMode === "security" ? (
                <SecurityPanel />
              ) : previewMode === "plan" ? (
                <PlanPanel />
              ) : (
                <Problems />
              )}
            </div>
          </Panel>
          {isConsoleOpen && (
            <>
              <PanelResizeHandle className="h-1 bg-border hover:bg-gray-400 transition-colors cursor-row-resize" />
              <Panel id="console" minSize={10} defaultSize={30}>
                <div className="flex flex-col h-full">
                  <ConsoleHeader
                    isOpen={true}
                    onToggle={() => setIsConsoleOpen(false)}
                    latestMessage={latestMessage}
                  />
                  <Console />
                </div>
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
      {!isConsoleOpen && (
        <ConsoleHeader
          isOpen={false}
          onToggle={() => setIsConsoleOpen(true)}
          latestMessage={latestMessage}
        />
      )}
    </div>
  );
}
