import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { guardianClient } from "@/ipc/types/guardian";
import type {
  CreateJobRequest,
  AssignProcessRequest,
  TerminateJobRequest,
  GetJobStatsRequest,
  RequestCapabilityRequest,
  ValidateCapabilityRequest,
  RevokeCapabilityRequest,
  CreateWfpRuleRequest,
  DeleteWfpRuleRequest,
} from "@/ipc/types/guardian";

/**
 * Query keys for Guardian cache management
 */
export const guardianKeys = {
  all: ["guardian"] as const,
  jobs: () => [...guardianKeys.all, "jobs"] as const,
  jobStats: (jobName: string) => [...guardianKeys.jobs(), "stats", jobName] as const,
  capabilities: () => [...guardianKeys.all, "capabilities"] as const,
  wfpRules: () => [...guardianKeys.all, "wfp-rules"] as const,
  status: () => [...guardianKeys.all, "status"] as const,
};

/**
 * Hook for Guardian service status and health check
 */
export function useGuardianStatus() {
  return useQuery({
    queryKey: guardianKeys.status(),
    queryFn: () => guardianClient.pingGuardian(),
    refetchInterval: 5000, // Ping every 5 seconds
    retry: 2,
  });
}

/**
 * Hook for Job Object operations
 */
export function useGuardianJobs() {
  const queryClient = useQueryClient();

  const jobs = useQuery({
    queryKey: guardianKeys.jobs(),
    queryFn: () => guardianClient.listJobs(),
    refetchInterval: 2000,
  });

  const createJob = useMutation({
    mutationFn: (request: CreateJobRequest) => guardianClient.createJob(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: guardianKeys.jobs() });
    },
  });

  const assignProcess = useMutation({
    mutationFn: (request: AssignProcessRequest) =>
      guardianClient.assignProcessToJob(request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: guardianKeys.jobStats(variables.jobName),
      });
    },
  });

  const terminateJob = useMutation({
    mutationFn: (request: TerminateJobRequest) =>
      guardianClient.terminateJob(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: guardianKeys.jobs() });
    },
  });

  const getJobStats = useCallback(
    (jobName: string) => {
      return useQuery({
        queryKey: guardianKeys.jobStats(jobName),
        queryFn: () => guardianClient.getJobStats({ jobName }),
        enabled: !!jobName,
        refetchInterval: 1000,
      });
    },
    [queryClient]
  );

  return {
    jobs,
    createJob,
    assignProcess,
    terminateJob,
    getJobStats,
  };
}

/**
 * Hook for creating a sandboxed process
 * Combines job creation + process assignment
 */
export function useSandboxedProcess() {
  const { createJob, assignProcess } = useGuardianJobs();

  const createSandbox = useMutation({
    mutationFn: async ({
      jobName,
      memoryLimitBytes,
      cpuRatePercent,
      processId,
    }: {
      jobName: string;
      memoryLimitBytes?: number;
      cpuRatePercent?: number;
      processId: number;
    }) => {
      // 1. Create job
      await createJob.mutateAsync({
        jobName,
        memoryLimitBytes,
        cpuRatePercent,
        killProcessesOnJobClose: true,
      });

      // 2. Assign process
      await assignProcess.mutateAsync({
        jobName,
        processId,
      });

      return { jobName, processId };
    },
  });

  return {
    createSandbox,
    isCreating: createJob.isPending || assignProcess.isPending,
  };
}

/**
 * Hook for Capability Token operations
 */
export function useGuardianCapabilities() {
  const queryClient = useQueryClient();

  const capabilities = useQuery({
    queryKey: guardianKeys.capabilities(),
    queryFn: () => guardianClient.listCapabilities(),
    refetchInterval: 5000,
  });

  const requestCapability = useMutation({
    mutationFn: (request: RequestCapabilityRequest) =>
      guardianClient.requestCapability(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: guardianKeys.capabilities() });
    },
  });

  const validateCapability = useMutation({
    mutationFn: (request: ValidateCapabilityRequest) =>
      guardianClient.validateCapability(request),
  });

  const revokeCapability = useMutation({
    mutationFn: (request: RevokeCapabilityRequest) =>
      guardianClient.revokeCapability(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: guardianKeys.capabilities() });
    },
  });

  return {
    capabilities,
    requestCapability,
    validateCapability,
    revokeCapability,
  };
}

/**
 * Hook for requesting file access capability
 */
export function useFileAccessCapability() {
  const { requestCapability } = useGuardianCapabilities();

  const requestFileRead = useCallback(
    async (path: string, expiresInSeconds?: number) => {
      return requestCapability.mutateAsync({
        subject: "user-session",
        resource: `file:${path}`,
        action: "read",
        expiresInSeconds: expiresInSeconds ?? 3600,
      });
    },
    [requestCapability]
  );

  const requestFileWrite = useCallback(
    async (path: string, expiresInSeconds?: number) => {
      return requestCapability.mutateAsync({
        subject: "user-session",
        resource: `file:${path}`,
        action: "write",
        expiresInSeconds: expiresInSeconds ?? 3600,
      });
    },
    [requestCapability]
  );

  return {
    requestFileRead,
    requestFileWrite,
    isRequesting: requestCapability.isPending,
  };
}

/**
 * Hook for WFP Firewall operations
 */
export function useGuardianFirewall() {
  const queryClient = useQueryClient();

  const rules = useQuery({
    queryKey: guardianKeys.wfpRules(),
    queryFn: () => guardianClient.listWfpRules(),
    refetchInterval: 5000,
  });

  const createRule = useMutation({
    mutationFn: (request: CreateWfpRuleRequest) =>
      guardianClient.createWfpRule(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: guardianKeys.wfpRules() });
    },
  });

  const deleteRule = useMutation({
    mutationFn: (request: DeleteWfpRuleRequest) =>
      guardianClient.deleteWfpRule(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: guardianKeys.wfpRules() });
    },
  });

  return {
    rules,
    createRule,
    deleteRule,
  };
}

/**
 * Combined hook for all Guardian operations
 */
export function useGuardian() {
  const status = useGuardianStatus();
  const jobs = useGuardianJobs();
  const capabilities = useGuardianCapabilities();
  const firewall = useGuardianFirewall();
  const sandbox = useSandboxedProcess();
  const fileAccess = useFileAccessCapability();

  return {
    // Connection status
    isConnected: status.data?.status === "ok",
    status: status.data,
    isLoading: status.isLoading,
    error: status.error,

    // Operations
    jobs,
    capabilities,
    firewall,
    sandbox,
    fileAccess,

    // Convenience methods
    ping: status.refetch,
  };
}