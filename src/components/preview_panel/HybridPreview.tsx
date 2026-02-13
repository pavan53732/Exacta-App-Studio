// src/components/preview_panel/HybridPreview.tsx
// Preview component for hybrid apps (Tauri)
// Combines iframe preview for web layer with native window controls

import { useAtomValue, useSetAtom, useAtom } from "jotai";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Play,
  Square,
  Camera,
  Loader2,
  ExternalLink,
  Terminal,
  Monitor,
  Globe,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Minimize2,
} from "lucide-react";
import {
  selectedAppIdAtom,
  appConsoleEntriesAtom,
  currentAppAtom,
  appUrlAtom,
  previewPanelKeyAtom,
} from "@/atoms/appAtoms";
import {
  previewIframeRefAtom,
  screenshotDataUrlAtom,
} from "@/atoms/previewAtoms";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ipc } from "@/ipc/types";
import { runtimeRegistry } from "@/ipc/runtime/RuntimeProviderRegistry";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";

type HybridStatus = "idle" | "building" | "running" | "stopped" | "error";

interface LogEntry {
  timestamp: number;
  message: string;
  type: "stdout" | "stderr" | "info" | "rust";
}

export function HybridPreview({ loading }: { loading: boolean }) {
  const { t } = useTranslation("home");
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const app = useAtomValue(currentAppAtom);
  const { appUrl } = useAtomValue(appUrlAtom);
  const consoleEntries = useAtomValue(appConsoleEntriesAtom);
  const [status, setStatus] = useState<HybridStatus>("idle");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [screenshotData, setScreenshotData] = useAtom(screenshotDataUrlAtom);
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);
  const [showLogs, setShowLogs] = useState(true);
  const [logsPanelSize, _setLogsPanelSize] = useState(30);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const setPreviewIframeRef = useSetAtom(previewIframeRefAtom);
  const [reloadKey, setReloadKey] = useState(0);
  const previewPanelKey = useAtomValue(previewPanelKeyAtom);

  // Update iframe ref atom
  useEffect(() => {
    setPreviewIframeRef(iframeRef.current);
  }, [iframeRef.current, setPreviewIframeRef]);

  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Process console entries for logs
  useEffect(() => {
    if (!selectedAppId) return;

    const appLogs = consoleEntries
      .filter((entry) => entry.appId === selectedAppId)
      .map((entry) => ({
        timestamp: entry.timestamp,
        message: entry.message,
        type:
          entry.level === "error"
            ? ("stderr" as const)
            : entry.message.includes("[rust]")
              ? ("rust" as const)
              : ("stdout" as const),
      }));

    if (appLogs.length > logs.length) {
      setLogs(appLogs);
    }
  }, [consoleEntries, selectedAppId, logs.length]);

  // Handle app events
  useEffect(() => {
    const handleAppOutput = (
      _event: any,
      output: {
        appId: number;
        type: string;
        message: string;
        timestamp?: number;
      },
    ) => {
      if (output.appId !== selectedAppId) return;

      const timestamp = output.timestamp || Date.now();

      if (output.type === "stdout" || output.type === "stderr") {
        setLogs((prev) => [
          ...prev,
          {
            timestamp,
            message: output.message,
            type: output.type,
          },
        ]);
      }

      // Detect Tauri app ready state
      if (
        output.message.includes("Running on") ||
        output.message.includes("Dev server running") ||
        output.message.includes("ready in")
      ) {
        setStatus("running");
      }
    };

    const handleAppExit = (
      _event: any,
      data: { appId: number; exitCode: number },
    ) => {
      if (data.appId !== selectedAppId) return;
      setStatus("stopped");
    };

    const unsubscribeOutput = window.electron?.ipcRenderer?.on?.(
      "app-output",
      handleAppOutput,
    );
    const unsubscribeExit = window.electron?.ipcRenderer?.on?.(
      "app-exit",
      handleAppExit,
    );

    return () => {
      unsubscribeOutput?.();
      unsubscribeExit?.();
    };
  }, [selectedAppId]);

  // Start the Tauri app
  const handleStart = useCallback(async () => {
    if (!selectedAppId || !app) return;

    setStatus("building");
    setLogs([]);
    setScreenshotData(null);

    try {
      const result = await ipc.app.runApp({ appId: selectedAppId });

      if (result.error) {
        setStatus("error");
        setLogs((prev) => [
          ...prev,
          {
            timestamp: Date.now(),
            message: `Failed to start: ${result.error}`,
            type: "stderr",
          },
        ]);
      } else {
        setStatus("running");
      }
    } catch (error) {
      setStatus("error");
      setLogs((prev) => [
        ...prev,
        {
          timestamp: Date.now(),
          message: `Error: ${error}`,
          type: "stderr",
        },
      ]);
    }
  }, [selectedAppId, app, setScreenshotData]);

  // Stop the Tauri app
  const handleStop = useCallback(async () => {
    if (!selectedAppId) return;

    try {
      await ipc.app.stopApp({ appId: selectedAppId });
      setStatus("stopped");
    } catch (error) {
      console.error("Failed to stop app:", error);
    }
  }, [selectedAppId]);

  // Capture screenshot
  const handleScreenshot = useCallback(async () => {
    if (!selectedAppId || !app?.runtimeProvider) return;

    setIsCapturingScreenshot(true);
    try {
      const provider = runtimeRegistry.getProvider(app.runtimeProvider);
      if (provider?.captureScreenshot) {
        const dataUrl = await provider.captureScreenshot(selectedAppId);
        setScreenshotData(dataUrl);
      }
    } catch (error) {
      console.error("Failed to capture screenshot:", error);
    } finally {
      setIsCapturingScreenshot(false);
    }
  }, [selectedAppId, app?.runtimeProvider, setScreenshotData]);

  // Reload iframe
  const handleReload = useCallback(() => {
    setReloadKey((prev) => prev + 1);
  }, []);

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Get status info
  const getStatusInfo = () => {
    switch (status) {
      case "idle":
        return {
          color: "bg-gray-500",
          text: t("preview.hybrid.statusIdle") || "Idle",
        };
      case "building":
        return {
          color: "bg-yellow-500",
          text: t("preview.hybrid.statusBuilding") || "Building...",
        };
      case "running":
        return {
          color: "bg-green-500",
          text: t("preview.hybrid.statusRunning") || "Running",
        };
      case "stopped":
        return {
          color: "bg-gray-500",
          text: t("preview.hybrid.statusStopped") || "Stopped",
        };
      case "error":
        return {
          color: "bg-red-500",
          text: t("preview.hybrid.statusError") || "Error",
        };
      default:
        return { color: "bg-gray-500", text: "Unknown" };
    }
  };

  const statusInfo = getStatusInfo();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with controls */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-background">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="flex items-center gap-2">
            <span className={cn("w-2 h-2 rounded-full", statusInfo.color)} />
            {statusInfo.text}
          </Badge>
          {appUrl && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Globe className="w-3 h-3" />
              {new URL(appUrl).port}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {status === "idle" || status === "stopped" || status === "error" ? (
            <Button
              onClick={handleStart}
              size="sm"
              className="flex items-center gap-2"
              disabled={!selectedAppId}
            >
              <Play className="w-4 h-4" />
              {t("preview.hybrid.launch") || "Launch"}
            </Button>
          ) : status === "building" ? (
            <Button size="sm" disabled>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              {t("preview.hybrid.building") || "Building..."}
            </Button>
          ) : (
            <>
              <Button
                onClick={handleStop}
                size="sm"
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Square className="w-4 h-4" />
                {t("preview.hybrid.stop") || "Stop"}
              </Button>
              <Button
                onClick={handleReload}
                size="sm"
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                onClick={handleScreenshot}
                size="sm"
                variant="outline"
                className="flex items-center gap-2"
                disabled={isCapturingScreenshot}
              >
                {isCapturingScreenshot ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main content - split view */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="vertical">
          {/* Web preview panel */}
          <Panel id="web-preview" minSize={30}>
            <div className="h-full flex flex-col">
              {/* Web preview header */}
              <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-muted/50">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {t("preview.hybrid.webLayer") || "Web Layer"}
                </span>
              </div>

              {/* Iframe or placeholder */}
              <div className="flex-1 relative bg-white dark:bg-gray-900">
                {status === "running" && appUrl ? (
                  <iframe
                    key={`${reloadKey}-${previewPanelKey}`}
                    ref={iframeRef}
                    src={appUrl}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                    title="Tauri Web Preview"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Monitor className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-sm">
                      {status === "building"
                        ? t("preview.hybrid.buildingMessage") ||
                          "Building Tauri application..."
                        : t("preview.hybrid.launchMessage") ||
                          "Launch the app to see the web preview"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Panel>

          {/* Logs panel */}
          {showLogs && (
            <>
              <PanelResizeHandle className="h-1 bg-border hover:bg-gray-400 transition-colors cursor-row-resize" />
              <Panel id="logs" minSize={10} defaultSize={logsPanelSize}>
                <div className="h-full flex flex-col">
                  {/* Logs header */}
                  <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {t("preview.hybrid.logs") || "Build & Runtime Logs"}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => setShowLogs(false)}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Logs content */}
                  <ScrollArea className="flex-1">
                    <div className="font-mono text-xs p-2">
                      {logs.length === 0 ? (
                        <div className="text-muted-foreground text-center py-4">
                          {t("preview.hybrid.noLogs") || "No logs yet."}
                        </div>
                      ) : (
                        logs.map((log, index) => (
                          <div
                            key={index}
                            className={cn(
                              "py-0.5 px-2 hover:bg-muted/50 rounded",
                              log.type === "stderr" &&
                                "text-red-500 dark:text-red-400",
                              log.type === "rust" &&
                                "text-orange-500 dark:text-orange-400",
                            )}
                          >
                            <span className="text-muted-foreground mr-2">
                              [{formatTimestamp(log.timestamp)}]
                            </span>
                            <span className="whitespace-pre-wrap break-words">
                              {log.message}
                            </span>
                          </div>
                        ))
                      )}
                      <div ref={logsEndRef} />
                    </div>
                  </ScrollArea>
                </div>
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>

      {/* Bottom bar with logs toggle */}
      {!showLogs && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 border-t border-border bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
          onClick={() => setShowLogs(true)}
        >
          <Terminal className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {t("preview.hybrid.showLogs") || "Show Logs"}
          </span>
          <ChevronUp className="w-4 h-4 text-muted-foreground ml-auto" />
        </div>
      )}

      {/* Screenshot preview */}
      {screenshotData && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="relative max-w-[90%] max-h-[90%]">
            <img
              src={screenshotData}
              alt="Screenshot"
              className="max-w-full max-h-full rounded-lg shadow-lg"
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
              onClick={() => setScreenshotData(null)}
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Info banner */}
      {status === "running" && (
        <div className="px-3 py-2 bg-purple-50 dark:bg-purple-950 border-t border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 text-sm text-purple-700 dark:text-purple-300">
            <ExternalLink className="w-4 h-4" />
            <span>
              {t("preview.hybrid.tauriRunning") ||
                "Tauri app is running. The web layer is shown above, native window runs separately."}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
