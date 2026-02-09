import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import {
  cliAgentClient,
  type CliAgentType,
  type AgentConfig,
} from "@/ipc/types/cli_agents";
import { showError, showSuccess } from "@/lib/toast";

interface ActiveSession {
  sessionId: string;
  agentType: CliAgentType;
  status: "starting" | "running" | "stopping" | "stopped";
}

export function useCliAgents() {
  const queryClient = useQueryClient();
  const [activeSessions, setActiveSessions] = useState<Map<string, ActiveSession>>(new Map());

  // List all available CLI agents
  const { data: agents, isLoading: isLoadingAgents } = useQuery({
    queryKey: ["cli-agents", "list"],
    queryFn: async () => {
      return cliAgentClient.listAgents();
    },
  });

  // Create a new agent session
  const createSessionMutation = useMutation({
    mutationFn: async ({
      sessionId,
      agentType,
      config,
    }: {
      sessionId: string;
      agentType: CliAgentType;
      config: AgentConfig;
    }) => {
      setActiveSessions((prev) => {
        const newMap = new Map(prev);
        newMap.set(sessionId, { sessionId, agentType, status: "starting" });
        return newMap;
      });

      const result = await cliAgentClient.createSession({
        sessionId,
        agentType,
        config,
      });

      if (result.success) {
        setActiveSessions((prev) => {
          const newMap = new Map(prev);
          const session = newMap.get(sessionId);
          if (session) {
            session.status = "running";
          }
          return newMap;
        });
      } else {
        setActiveSessions((prev) => {
          const newMap = new Map(prev);
          newMap.delete(sessionId);
          return newMap;
        });
      }

      return result;
    },
    onSuccess: (result, variables) => {
      if (result.success) {
        showSuccess(`Started ${variables.agentType} session`);
      } else {
        showError(`Failed to start session: ${result.error}`);
      }
    },
    onError: (error: any) => {
      showError(`Failed to create session: ${error.message}`);
    },
  });

  // Send message to a session
  const sendMessageMutation = useMutation({
    mutationFn: async ({
      sessionId,
      prompt,
      files,
    }: {
      sessionId: string;
      prompt: string;
      files?: string[];
    }) => {
      return cliAgentClient.sendMessage({ sessionId, prompt, files });
    },
    onError: (error: any) => {
      showError(`Failed to send message: ${error.message}`);
    },
  });

  // Stop a session
  const stopSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      setActiveSessions((prev) => {
        const newMap = new Map(prev);
        const session = newMap.get(sessionId);
        if (session) {
          session.status = "stopping";
        }
        return newMap;
      });

      const result = await cliAgentClient.stopSession({ sessionId });

      setActiveSessions((prev) => {
        const newMap = new Map(prev);
        newMap.delete(sessionId);
        return newMap;
      });

      return result;
    },
    onSuccess: () => {
      showSuccess("Session stopped");
    },
    onError: (error: any) => {
      showError(`Failed to stop session: ${error.message}`);
    },
  });

  // Helper to generate unique session IDs
  const generateSessionId = useCallback(() => {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Helper to check if a session is active
  const isSessionActive = useCallback(
    (sessionId: string) => {
      const session = activeSessions.get(sessionId);
      return session?.status === "running";
    },
    [activeSessions]
  );

  return {
    // Agent list
    agents,
    isLoadingAgents,

    // Session management
    activeSessions: Array.from(activeSessions.values()),
    createSession: createSessionMutation.mutateAsync,
    isCreatingSession: createSessionMutation.isPending,
    sendMessage: sendMessageMutation.mutateAsync,
    isSendingMessage: sendMessageMutation.isPending,
    stopSession: stopSessionMutation.mutateAsync,
    isStoppingSession: stopSessionMutation.isPending,

    // Helpers
    generateSessionId,
    isSessionActive,
  };
}
