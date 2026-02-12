import { z } from "zod";
import { defineContract, createClient } from "../contracts/core";

// ============================================================================
// Job Object Schemas
// ============================================================================

export const CreateJobRequestSchema = z.object({
  jobName: z.string(),
  memoryLimitBytes: z.number().optional(),
  cpuRatePercent: z.number().min(1).max(100).optional(),
  activeProcessLimit: z.number().optional(),
  killProcessesOnJobClose: z.boolean().default(true),
  // NEW: Zero-Trust extensions
  networkPolicy: z.enum(["blocked", "allowed", "local-only"]).optional(),
  diskQuotaBytes: z.number().optional(),
});

export const CreateJobResponseSchema = z.object({
  success: z.boolean(),
  jobName: z.string(),
  error: z.string().optional(),
});

export const AssignProcessRequestSchema = z.object({
  jobName: z.string(),
  processId: z.number(),
});

export const AssignProcessResponseSchema = z.object({
  success: z.boolean(),
});

export const TerminateJobRequestSchema = z.object({
  jobName: z.string(),
  exitCode: z.number().default(1),
});

export const TerminateJobResponseSchema = z.object({
  success: z.boolean(),
});

export const JobStatisticsSchema = z.object({
  jobName: z.string(),
  activeProcesses: z.number(),
  totalPageFaults: z.number(),
  totalProcesses: z.number(),
  totalTerminatedProcesses: z.number(),
  peakMemoryUsed: z.number(),
  currentMemoryUsage: z.number(),
});

export const GetJobStatsRequestSchema = z.object({
  jobName: z.string(),
});

export const ListJobsResponseSchema = z.object({
  jobs: z.array(z.string()),
});

// ============================================================================
// Capability Token Schemas
// ============================================================================

export const RequestCapabilityRequestSchema = z.object({
  subject: z.string(), // Who is requesting (user/app)
  resource: z.string(), // What resource (file:/path, process:cmd, network:host)
  action: z.enum(["read", "write", "execute", "connect", "admin"]),
  constraints: z.record(z.string(), z.unknown()).optional(),
  expiresInSeconds: z.number().default(3600),
});

export const CapabilityTokenSchema = z.object({
  success: z.boolean(),
  token: z.string().optional(),
  tokenId: z.string().optional(),
  expiresAt: z.number().optional(),
  error: z.string().optional(),
});

export const ValidateCapabilityRequestSchema = z.object({
  token: z.string(),
  resource: z.string().optional(),
  action: z.string().optional(),
});

export const ValidateCapabilityResponseSchema = z.object({
  valid: z.boolean(),
  subject: z.string().optional(),
  resource: z.string().optional(),
  action: z.string().optional(),
  claims: z.record(z.string(), z.unknown()).optional(),
  error: z.string().optional(),
});

export const RevokeCapabilityRequestSchema = z.object({
  tokenId: z.string(),
});

export const RevokeCapabilityResponseSchema = z.object({
  success: z.boolean(),
});

export const CapabilityInfoSchema = z.object({
  tokenId: z.string(),
  subject: z.string(),
  resource: z.string(),
  action: z.string(),
  issuedAt: z.number(),
  expiresAt: z.number(),
  revoked: z.boolean(),
});

export const ListCapabilitiesResponseSchema = z.object({
  capabilities: z.array(CapabilityInfoSchema),
});

// ============================================================================
// WFP (Firewall) Schemas
// ============================================================================

export const CreateWfpRuleRequestSchema = z.object({
  name: z.string().optional(),
  direction: z.enum(["inbound", "outbound"]).default("outbound"),
  protocol: z.enum(["tcp", "udp", "any"]).default("any"),
  localPort: z.string().optional(),
  remotePort: z.string().optional(),
  remoteAddress: z.string().optional(),
  action: z.enum(["allow", "block"]).default("block"),
});

export const CreateWfpRuleResponseSchema = z.object({
  ruleId: z.string().optional(),
  name: z.string().optional(),
  created: z.boolean(),
  error: z.string().optional(),
});

export const DeleteWfpRuleRequestSchema = z.object({
  ruleId: z.string(),
});

export const DeleteWfpRuleResponseSchema = z.object({
  success: z.boolean(),
});

export const WfpRuleInfoSchema = z.object({
  ruleId: z.string(),
  name: z.string(),
  direction: z.string(),
  protocol: z.string(),
  localPort: z.string().optional(),
  remotePort: z.string().optional(),
  remoteAddress: z.string().optional(),
  action: z.string(),
  enabled: z.boolean(),
  createdAt: z.number(),
});

export const ListWfpRulesResponseSchema = z.object({
  rules: z.array(WfpRuleInfoSchema),
});

// ============================================================================
// Guardian Health/Status
// ============================================================================

export const GuardianStatusSchema = z.object({
  connected: z.boolean(),
  version: z.string().optional(),
  uptime: z.number().optional(),
});

// ============================================================================
// Contracts
// ============================================================================

export const guardianContracts = {
  // Job Object Contracts
  createJob: defineContract({
    channel: "guardian:create-job",
    input: CreateJobRequestSchema,
    output: CreateJobResponseSchema,
  }),

  assignProcessToJob: defineContract({
    channel: "guardian:assign-process",
    input: AssignProcessRequestSchema,
    output: AssignProcessResponseSchema,
  }),

  terminateJob: defineContract({
    channel: "guardian:terminate-job",
    input: TerminateJobRequestSchema,
    output: TerminateJobResponseSchema,
  }),

  getJobStats: defineContract({
    channel: "guardian:get-job-stats",
    input: GetJobStatsRequestSchema,
    output: JobStatisticsSchema,
  }),

  listJobs: defineContract({
    channel: "guardian:list-jobs",
    input: z.void(),
    output: ListJobsResponseSchema,
  }),

  // Capability Token Contracts
  requestCapability: defineContract({
    channel: "guardian:request-capability",
    input: RequestCapabilityRequestSchema,
    output: CapabilityTokenSchema,
  }),

  validateCapability: defineContract({
    channel: "guardian:validate-capability",
    input: ValidateCapabilityRequestSchema,
    output: ValidateCapabilityResponseSchema,
  }),

  revokeCapability: defineContract({
    channel: "guardian:revoke-capability",
    input: RevokeCapabilityRequestSchema,
    output: RevokeCapabilityResponseSchema,
  }),

  listCapabilities: defineContract({
    channel: "guardian:list-capabilities",
    input: z.void(),
    output: ListCapabilitiesResponseSchema,
  }),

  // WFP Contracts
  createWfpRule: defineContract({
    channel: "guardian:create-wfp-rule",
    input: CreateWfpRuleRequestSchema,
    output: CreateWfpRuleResponseSchema,
  }),

  deleteWfpRule: defineContract({
    channel: "guardian:delete-wfp-rule",
    input: DeleteWfpRuleRequestSchema,
    output: DeleteWfpRuleResponseSchema,
  }),

  listWfpRules: defineContract({
    channel: "guardian:list-wfp-rules",
    input: z.void(),
    output: ListWfpRulesResponseSchema,
  }),

  // Process Management
  spawnInJob: defineContract({
    channel: "guardian:spawn-in-job",
    input: z.object({
      jobId: z.string(),
      command: z.string(),
      args: z.array(z.string()),
      cwd: z.string(),
      env: z.record(z.string(), z.string()).optional(),
      token: z.string().optional(),
    }),
    output: z.object({
      success: z.boolean(),
      pid: z.number().optional(),
      error: z.string().optional(),
    }),
  }),

  // Health Check
  pingGuardian: defineContract({
    channel: "guardian:ping",
    input: z.void(),
    output: z.object({ status: z.string(), timestamp: z.number() }),
  }),
};

// Client for renderer process
export const guardianClient = createClient(guardianContracts);

// Type exports
export type CreateJobRequest = z.infer<typeof CreateJobRequestSchema>;
export type CreateJobResponse = z.infer<typeof CreateJobResponseSchema>;
export type JobStatistics = z.infer<typeof JobStatisticsSchema>;

export type RequestCapabilityRequest = z.infer<typeof RequestCapabilityRequestSchema>;
export type CapabilityToken = z.infer<typeof CapabilityTokenSchema>;
export type ValidateCapabilityRequest = z.infer<typeof ValidateCapabilityRequestSchema>;
export type ValidateCapabilityResponse = z.infer<typeof ValidateCapabilityResponseSchema>;
export type CapabilityInfo = z.infer<typeof CapabilityInfoSchema>;

export type CreateWfpRuleRequest = z.infer<typeof CreateWfpRuleRequestSchema>;
export type WfpRuleInfo = z.infer<typeof WfpRuleInfoSchema>;
export type GuardianStatus = z.infer<typeof GuardianStatusSchema>;

// Spawn in Job types
export type SpawnInJobRequest = {
  jobId: string;
  command: string;
  args: string[];
  cwd: string;
  env?: Record<string, string>;
  token?: string;
};
export type SpawnInJobResponse = {
  success: boolean;
  pid?: number;
  error?: string;
};