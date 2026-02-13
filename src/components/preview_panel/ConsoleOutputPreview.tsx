// src/components/preview_panel/ConsoleOutputPreview.tsx
// Preview component for console applications
// Displays terminal-like interface with stdout/stderr output

import { useAtomValue } from "jotai";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Play,
  Square,
  Terminal,
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
  Download,
} from "lucide-react";
import {
  selectedAppIdAtom,
  appConsoleEntriesAtom,
  currentAppAtom,
} from "@/atoms/appAtoms";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ipc } from "@/ipc/types";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type ProcessStatus = "idle" | "running" | "exited";

interface OutputLine {
  id: string;
  timestamp: number;
  content: string;
  type: "stdout" | "stderr" | "system";
}

export function ConsoleOutputPreview({ loading }: { loading: boolean }) {
  const { t } = useTranslation("home");
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const app = useAtomValue(currentAppAtom);
  const consoleEntries = useAtomValue(appConsoleEntriesAtom);
  const [status, setStatus] = useState<ProcessStatus>("idle");
  const [outputLines, setOutputLines] = useState<OutputLine[]>([]);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const outputEndRef = useRef<HTMLDivElement>(null);
  const lineIdCounterRef = useRef(0);

  // Generate unique ID for each output line
  const generateLineId = useCallback(() => {
    lineIdCounterRef.current += 1;
    return `line-${Date.now()}-${lineIdCounterRef.current}`;
  }, []);

  // Auto-scroll to bottom when new output arrives (if enabled)
  useEffect(() => {
    if (isAutoScroll) {
      outputEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [outputLines, isAutoScroll]);

  // Process console entries into output lines
  useEffect(() => {
    if (!selectedAppId) return;

    const relevantEntries = consoleEntries.filter(
      (entry) => entry.appId === selectedAppId,
    );

    const newLines: OutputLine[] = relevantEntries.map((entry) => ({
      id: `${entry.timestamp}-${entry.message.slice(0, 20)}`,
      timestamp: entry.timestamp,
      content: entry.message,
      type: entry.level === "error" ? "stderr" : "stdout",
    }));

    setOutputLines((prev) => {
      // Merge new lines with existing, avoiding duplicates
      const existingIds = new Set(prev.map((l) => l.id));
      const uniqueNewLines = newLines.filter((l) => !existingIds.has(l.id));
      return [...prev, ...uniqueNewLines];
    });
  }, [consoleEntries, selectedAppId]);

  // Handle app output events directly
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
        setOutputLines((prev) => [
          ...prev,
          {
            id: generateLineId(),
            timestamp,
            content: output.message,
            type: output.type as "stdout" | "stderr",
          },
        ]);
      }
    };

    const handleAppExit = (
      _event: any,
      data: { appId: number; exitCode: number },
    ) => {
      if (data.appId !== selectedAppId) return;

      setStatus("exited");
      setExitCode(data.exitCode);

      // Add exit message
      setOutputLines((prev) => [
        ...prev,
        {
          id: generateLineId(),
          timestamp: Date.now(),
          content: `\nProcess exited with code ${data.exitCode}`,
          type: "system",
        },
      ]);
    };

    const unsubscribeOutput = (window as any).electron?.ipcRenderer?.on?.(
      "app-output",
      handleAppOutput,
    );
    const unsubscribeExit = (window as any).electron?.ipcRenderer?.on?.(
      "app-exit",
      handleAppExit,
    );

    return () => {
      unsubscribeOutput?.();
      unsubscribeExit?.();
    };
  }, [selectedAppId, generateLineId]);

  // Run the console app
  const handleRun = useCallback(async () => {
    if (!selectedAppId) return;

    setStatus("running");
    setExitCode(null);

    // Add startup message
    setOutputLines((prev) => [
      ...prev,
      {
        id: generateLineId(),
        timestamp: Date.now(),
        content: `Starting ${app?.name || "application"}...\n`,
        type: "system",
      },
    ]);

    try {
      const result = await ipc.app.runApp({ appId: selectedAppId });

      if (result.error) {
        setStatus("exited");
        setOutputLines((prev) => [
          ...prev,
          {
            id: generateLineId(),
            timestamp: Date.now(),
            content: `Failed to start: ${result.error}`,
            type: "stderr",
          },
        ]);
      }
    } catch (error) {
      setStatus("exited");
      setOutputLines((prev) => [
        ...prev,
        {
          id: generateLineId(),
          timestamp: Date.now(),
          content: `Error: ${error}`,
          type: "stderr",
        },
      ]);
    }
  }, [selectedAppId, app?.name, generateLineId]);

  // Stop the running process
  const handleStop = useCallback(async () => {
    if (!selectedAppId) return;

    try {
      await ipc.app.stopApp({ appId: selectedAppId });
      setStatus("exited");
      setOutputLines((prev) => [
        ...prev,
        {
          id: generateLineId(),
          timestamp: Date.now(),
          content: "\nProcess stopped by user.",
          type: "system",
        },
      ]);
    } catch (error) {
      console.error("Failed to stop process:", error);
    }
  }, [selectedAppId, generateLineId]);

  // Clear the output
  const handleClear = useCallback(() => {
    setOutputLines([]);
    setExitCode(null);
  }, []);

  // Export output to file
  const handleExport = useCallback(() => {
    const content = outputLines
      .map((line) => {
        const timestamp = formatTimestamp(line.timestamp);
        const prefix =
          line.type === "stderr"
            ? "[ERR]"
            : line.type === "system"
              ? "[SYS]"
              : "[OUT]";
        return `${timestamp} ${prefix} ${line.content}`;
      })
      .join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `console-output-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [outputLines]);

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black text-gray-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-900 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Terminal className="w-4 h-4 text-green-400" />
          <span className="text-sm font-medium text-gray-300">
            {t("preview.console.title") || "Console Output"}
          </span>
          {status === "running" && (
            <Badge
              variant="outline"
              className="bg-green-500/20 text-green-400 border-green-500"
            >
              {t("preview.console.running") || "Running"}
            </Badge>
          )}
          {exitCode !== null && (
            <Badge
              variant="outline"
              className={cn(
                exitCode === 0
                  ? "bg-green-500/20 text-green-400 border-green-500"
                  : "bg-red-500/20 text-red-400 border-red-500",
              )}
            >
              {exitCode === 0 ? (
                <CheckCircle2 className="w-3 h-3 mr-1" />
              ) : (
                <XCircle className="w-3 h-3 mr-1" />
              )}
              Exit: {exitCode}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {status === "idle" || status === "exited" ? (
            <Button
              onClick={handleRun}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={!selectedAppId}
            >
              <Play className="w-4 h-4 mr-1" />
              {t("preview.console.run") || "Run"}
            </Button>
          ) : (
            <Button onClick={handleStop} size="sm" variant="destructive">
              <Square className="w-4 h-4 mr-1" />
              {t("preview.console.stop") || "Stop"}
            </Button>
          )}
          <Button
            onClick={handleClear}
            size="sm"
            variant="ghost"
            className="text-gray-400 hover:text-white"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button
            onClick={handleExport}
            size="sm"
            variant="ghost"
            className="text-gray-400 hover:text-white"
            disabled={outputLines.length === 0}
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Output area */}
      <ScrollArea className="flex-1">
        <div className="font-mono text-sm p-2 min-h-full">
          {outputLines.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              {t("preview.console.empty") ||
                "No output. Click Run to start the application."}
            </div>
          ) : (
            outputLines.map((line) => (
              <div
                key={line.id}
                className={cn(
                  "py-0.5 px-1 hover:bg-gray-800/50 rounded whitespace-pre-wrap break-words",
                  line.type === "stderr" && "text-red-400",
                  line.type === "system" && "text-yellow-400 italic",
                )}
              >
                <span className="text-gray-500 select-none mr-2">
                  [{formatTimestamp(line.timestamp)}]
                </span>
                {line.content}
              </div>
            ))
          )}
          <div ref={outputEndRef} />
        </div>
      </ScrollArea>

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-gray-900 border-t border-gray-700 text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>
            {outputLines.length} {t("preview.console.lines") || "lines"}
          </span>
          {app?.stackType && <span className="uppercase">{app.stackType}</span>}
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isAutoScroll}
            onChange={(e) => setIsAutoScroll(e.target.checked)}
            className="rounded border-gray-600 bg-gray-800"
          />
          {t("preview.console.autoScroll") || "Auto-scroll"}
        </label>
      </div>
    </div>
  );
}
