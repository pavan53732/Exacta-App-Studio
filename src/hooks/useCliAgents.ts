import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  cliAgentClient,
  type CliAgentType,
  type CliAgentConfig,
} from "@/ipc/types/cli_agents";
import { showError, showSuccess } from "@/lib/toast";

export function useCliAgents() {
  const queryClient = useQueryClient();

  // List all available CLI agents
  const { data: agents, isLoading: isLoadingAgents } = useQuery({
    queryKey: ["cli-agents", "list"],
    queryFn: async () => {
      return cliAgentClient.listAgents();
    },
  });

  // Get configuration for a specific agent
  const getConfig = (agentType: CliAgentType) => {
    return useQuery({
      queryKey: ["cli-agents", "config", agentType],
      queryFn: async () => {
        return cliAgentClient.getConfig(agentType);
      },
    });
  };

  // Configure an agent
  const configureMutation = useMutation({
    mutationFn: async (config: CliAgentConfig) => {
      return cliAgentClient.configureAgent(config);
    },
    onSuccess: (_, variables) => {
      showSuccess(`CLI agent ${variables.agentType} configured successfully`);
      queryClient.invalidateQueries({ queryKey: ["cli-agents", "config"] });
    },
    onError: (error: any) => {
      showError(`Failed to configure CLI agent: ${error.message}`);
    },
  });

  // Remove an agent configuration
  const removeMutation = useMutation({
    mutationFn: async (agentType: CliAgentType) => {
      return cliAgentClient.removeAgent(agentType);
    },
    onSuccess: (_, agentType) => {
      showSuccess(`CLI agent ${agentType} removed successfully`);
      queryClient.invalidateQueries({ queryKey: ["cli-agents", "config"] });
    },
    onError: (error: any) => {
      showError(`Failed to remove CLI agent: ${error.message}`);
    },
  });

  // Test an agent connection
  const testMutation = useMutation({
    mutationFn: async (agentType: CliAgentType) => {
      return cliAgentClient.testAgent(agentType);
    },
    onSuccess: (result) => {
      if (result.success) {
        showSuccess(result.message);
      } else {
        showError(result.message);
      }
    },
    onError: (error: any) => {
      showError(`Failed to test CLI agent: ${error.message}`);
    },
  });

  return {
    agents,
    isLoadingAgents,
    getConfig,
    configureAgent: configureMutation.mutateAsync,
    isConfiguring: configureMutation.isPending,
    removeAgent: removeMutation.mutateAsync,
    isRemoving: removeMutation.isPending,
    testAgent: testMutation.mutateAsync,
    isTesting: testMutation.isPending,
  };
}
