// src/components/preview_panel/NativeAppPreview.tsx
// Preview component for native Windows apps (WPF, WinUI3, WinForms, MAUI)
// Uses external-window preview strategy

import { useAtomValue } from "jotai";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Play,
  Square,
  Camera,
  Loader2,
  ExternalLink,
  Terminal,
  CheckCircle2,
  XCircle,
  Flame,
  RefreshCw,
  Zap,
} from "lucide-react";
import {
  selectedAppIdAtom,
  appConsoleEntriesAtom,
  currentAppAtom,
} from "@/atoms/appAtoms";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { ipc } from "@/ipc/types";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useHotReload, useHotReloadEvents } from "@/hooks/useHotReload";
import type { HotReloadEventPayload } from "@/ipc/types/hot_reload";

type AppStatus = "idle" | "starting" | "running" | "stopped" | "error";

interface LogEntry {
  timestamp: number;
  message: string;
  type: "stdout" | "stderr" | "info";
}

export function NativeAppPreview({ loading }: { loading: boolean }) {
  const { t } = useTranslation("home");
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const app = useAtomValue(currentAppAtom);
  const consoleEntries = useAtomValue(appConsoleEntriesAtom);
  const [status, setStatus] = useState<AppStatus>("idle");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [hotReloadEnabled, setHotReloadEnabled] = useState(false);
  const [hotReloadNotification, setHotReloadNotification] = useState<
    string | null
  >(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const jobIdRef = useRef<string | null>(null);

  // Hot reload hook
  const {
    isSupported: isHotReloadSupported,
    status: hotReloadStatus,
    isStarting: isHotReloadStarting,
    isStopping: isHotReloadStopping,
    startHotReload,
    stopHotReload,
  } = useHotReload(selectedAppId, app?.stackType);

  // Handle hot reload events
  const handleHotReloadEvent = useCallback(
    (payload: HotReloadEventPayload) => {
      // Add log entry
      setLogs((prev) => [
        ...prev,
        {
          timestamp: payload.timestamp,
          message: `[Hot Reload] ${payload.message}`,
          type: payload.status === "error" ? "stderr" : "stdout",
        },
      ]);

      // Show notification for reload events
      if (payload.status === "reloading") {
        setHotReloadNotification(`Reloading... (${payload.reloadCount} total)`);
        setTimeout(() => setHotReloadNotification(null), 2000);
      } else if (
        payload.status === "running" &&
        hotReloadStatus === "reloading"
      ) {
        setHotReloadNotification("Reload complete!");
        setTimeout(() => setHotReloadNotification(null), 2000);
      }
    },
    [hotReloadStatus],
  );

  // Subscribe to hot reload events
  useHotReloadEvents(selectedAppId, handleHotReloadEvent);

  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Filter console entries for this app and update logs
  useEffect(() => {
    if (!selectedAppId) return;

    const appLogs = consoleEntries
      .filter((entry) => entry.appId === selectedAppId)
      .map((entry) => ({
        timestamp: entry.timestamp,
        message: entry.message,
        type:
          entry.level === "error" ? ("stderr" as const) : ("stdout" as const),
      }));

    // Only add new logs
    if (appLogs.length > logs.length) {
      setLogs(appLogs);
    }
  }, [consoleEntries, selectedAppId, logs.length]);

  // Handle app output events
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

      // Detect app ready state
      if (
        output.message.includes("Application started") ||
        output.message.includes("Ready") ||
        output.message.includes("Running on")
      ) {
        setStatus("running");
      }
    };

    // Listen for app exit
    const handleAppExit = (
      _event: any,
      data: { appId: number; exitCode: number },
    ) => {
      if (data.appId !== selectedAppId) return;

      setStatus("stopped");
      setExitCode(data.exitCode);
      jobIdRef.current = null;
    };

    // Subscribe to IPC events
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

  // Start the native app
  const handleStart = useCallback(async () => {
    if (!selectedAppId || !app) return;

    setStatus("starting");
    setLogs([]);
    setExitCode(null);
    setScreenshotData(null);

    try {
      const result = await ipc.app.runApp({ appId: selectedAppId });

      if (result.error) {
        setStatus("error");
        setLogs((prev) => [
          ...prev,
          {
            timestamp: Date.now(),
            message: `Failed to start app: ${result.error}`,
            type: "stderr",
          },
        ]);
      } else {
        jobIdRef.current = result.jobId || null;
        setStatus("running");
      }
    } catch (error) {
      setStatus("error");
      setLogs((prev) => [
        ...prev,
        {
          timestamp: Date.now(),
          message: `Error starting app: ${error}`,
          type: "stderr",
        },
      ]);
    }
  }, [selectedAppId, app]);

  // Stop the native app
  const handleStop = useCallback(async () => {
    if (!selectedAppId) return;

    try {
      // Stop hot reload first if active
      if (hotReloadEnabled) {
        await stopHotReload();
        setHotReloadEnabled(false);
      }
      await ipc.app.stopApp({ appId: selectedAppId });
      setStatus("stopped");
      jobIdRef.current = null;
    } catch (error) {
      console.error("Failed to stop app:", error);
    }
  }, [selectedAppId, hotReloadEnabled, stopHotReload]);

  // Capture screenshot
  const handleScreenshot = useCallback(async () => {
    if (!selectedAppId || !app?.runtimeProvider) return;

    setIsCapturingScreenshot(true);
    try {
      // Use IPC to request screenshot
      const result = await ipc.app.captureScreenshot?.({
        appId: selectedAppId,
      });
      if (result?.dataUrl) {
        setScreenshotData(result.dataUrl);
      }
    } catch (error) {
      console.error("Failed to capture screenshot:", error);
    } finally {
      setIsCapturingScreenshot(false);
    }
  }, [selectedAppId, app?.runtimeProvider]);

  // Toggle hot reload
  const handleToggleHotReload = useCallback(
    async (enabled: boolean) => {
      if (!selectedAppId) return;

      setHotReloadEnabled(enabled);

      if (enabled) {
        try {
          const result = await startHotReload();
          if (!result?.success) {
            setHotReloadEnabled(false);
            setLogs((prev) => [
              ...prev,
              {
                timestamp: Date.now(),
                message: `Failed to start hot reload: ${result?.error || "Unknown error"}`,
                type: "stderr",
              },
            ]);
          } else {
            setLogs((prev) => [
              ...prev,
              {
                timestamp: Date.now(),
                message: "[Hot Reload] Session started successfully",
                type: "stdout",
              },
            ]);
          }
        } catch (error) {
          setHotReloadEnabled(false);
          setLogs((prev) => [
            ...prev,
            {
              timestamp: Date.now(),
              message: `Failed to start hot reload: ${error}`,
              type: "stderr",
            },
          ]);
        }
      } else {
        try {
          await stopHotReload();
          setLogs((prev) => [
            ...prev,
            {
              timestamp: Date.now(),
              message: "[Hot Reload] Session stopped",
              type: "stdout",
            },
          ]);
        } catch (error) {
          console.error("Failed to stop hot reload:", error);
        }
      }
    },
    [selectedAppId, startHotReload, stopHotReload],
  );

  // Format timestamp for log entries
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Get status badge color and text
  const getStatusInfo = () => {
    switch (status) {
      case "idle":
        return {
          color: "bg-gray-500",
          text: t("preview.native.statusIdle") || "Idle",
        };
      case "starting":
        return {
          color: "bg-yellow-500",
          text: t("preview.native.statusStarting") || "Starting...",
        };
      case "running":
        return {
          color: "bg-green-500",
          text: t("preview.native.statusRunning") || "Running",
        };
      case "stopped":
        return {
          color: "bg-gray-500",
          text: t("preview.native.statusStopped") || "Stopped",
        };
      case "error":
        return {
          color: "bg-red-500",
          text: t("preview.native.statusError") || "Error",
        };
      default:
        return { color: "bg-gray-500", text: "Unknown" };
    }
  };

  // Get hot reload status badge
  const getHotReloadStatusInfo = () => {
    switch (hotReloadStatus) {
      case "starting":
        return { color: "bg-yellow-500", text: "Starting..." };
      case "running":
        return { color: "bg-green-500", text: "Active" };
      case "reloading":
        return { color: "bg-blue-500", text: "Reloading..." };
      case "stopped":
        return { color: "bg-gray-500", text: "Stopped" };
      case "error":
        return { color: "bg-red-500", text: "Error" };
      default:
        return null;
    }
  };

  const statusInfo = getStatusInfo();
  const hotReloadStatusInfo = getHotReloadStatusInfo();

  // Determine if this is a console app
  const isConsoleApp = app?.stackType === "console";

  // Check if this is a .NET app that supports hot reload
  const isDotNetApp = app?.runtimeProvider === "dotnet";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        {/* Header with controls */}
        <div className="flex items-center justify-between p-3 border-b border-border bg-background">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="flex items-center gap-2">
              <span className={cn("w-2 h-2 rounded-full", statusInfo.color)} />
              {statusInfo.text}
            </Badge>
            {exitCode !== null && (
              <Badge
                variant={exitCode === 0 ? "default" : "destructive"}
                className="flex items-center gap-1"
              >
                {exitCode === 0 ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <XCircle className="w-3 h-3" />
                )}
                Exit: {exitCode}
              </Badge>
            )}
            {/* Hot reload status badge */}
            {hotReloadEnabled && hotReloadStatusInfo && (
              <Badge
                variant="outline"
                className="flex items-center gap-2 text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-700"
              >
                <Flame className="w-3 h-3" />
                {hotReloadStatusInfo.text}
              </Badge>
            )}
            {/* Hot reload notification */}
            {hotReloadNotification && (
              <Badge
                variant="outline"
                className="flex items-center gap-2 animate-pulse"
              >
                <RefreshCw className="w-3 h-3" />
                {hotReloadNotification}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Hot reload toggle - only for .NET apps */}
            {isDotNetApp && isHotReloadSupported && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50">
                    <Zap className="w-4 h-4 text-orange-500" />
                    <span className="text-xs font-medium">Hot Reload</span>
                    <Switch
                      checked={hotReloadEnabled}
                      onCheckedChange={handleToggleHotReload}
                      disabled={
                        isHotReloadStarting ||
                        isHotReloadStopping ||
                        (status !== "running" &&
                          status !== "idle" &&
                          status !== "stopped")
                      }
                      className="data-[state=checked]:bg-orange-500"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {hotReloadEnabled
                      ? "Disable Hot Reload"
                      : "Enable Hot Reload - See code changes without restarting"}
                  </p>
                </TooltipContent>
              </Tooltip>
            )}

            {status === "idle" || status === "stopped" || status === "error" ? (
              <Button
                onClick={handleStart}
                size="sm"
                className="flex items-center gap-2"
                disabled={!selectedAppId}
              >
                <Play className="w-4 h-4" />
                {t("preview.native.launch") || "Launch"}
              </Button>
            ) : status === "starting" ? (
              <Button size="sm" disabled>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {t("preview.native.starting") || "Starting..."}
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
                  {t("preview.native.stop") || "Stop"}
                </Button>
                {!isConsoleApp && (
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
                    {t("preview.native.screenshot") || "Screenshot"}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Screenshot preview (for GUI apps) */}
          {screenshotData && !isConsoleApp && (
            <div className="border-b border-border p-2">
              <div className="relative">
                <img
                  src={screenshotData}
                  alt="App Screenshot"
                  className="max-w-full h-auto rounded border border-border"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => setScreenshotData(null)}
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Logs panel */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/50">
              <Terminal className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {t("preview.native.logs") || "Application Logs"}
              </span>
            </div>
            <ScrollArea className="flex-1">
              <div className="font-mono text-xs p-2">
                {logs.length === 0 ? (
                  <div className="text-muted-foreground text-center py-8">
                    {t("preview.native.noLogs") ||
                      "No logs yet. Launch the app to see output."}
                  </div>
                ) : (
                  logs.map((log, index) => (
                    <div
                      key={index}
                      className={cn(
                        "py-0.5 px-2 hover:bg-muted/50 rounded",
                        log.type === "stderr" &&
                          "text-red-500 dark:text-red-400",
                        log.message.includes("[Hot Reload]") &&
                          "text-orange-600 dark:text-orange-400",
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
        </div>

        {/* Info banner for external window apps */}
        {status === "running" && !isConsoleApp && (
          <div className="px-3 py-2 bg-blue-50 dark:bg-blue-950 border-t border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
              <ExternalLink className="w-4 h-4" />
              <span>
                {t("preview.native.externalWindow") ||
                  "App is running in an external window. Use the controls above to manage it."}
              </span>
            </div>
          </div>
        )}

        {/* Hot reload info banner */}
        {hotReloadEnabled && status === "running" && (
          <div className="px-3 py-2 bg-orange-50 dark:bg-orange-950 border-t border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-300">
              <Flame className="w-4 h-4" />
              <span>
                Hot Reload is active. Edit your code and save to see changes
                instantly.
              </span>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
