import { z } from "zod";
import { defineContract, createClient } from "../contracts/core";

// CLI Agent Types
export const CliAgentTypeSchema = z.enum([
  "aider",
  "gpt-engineer",
  "goose-cli",
  "opencode",
  "blackbox-cli",
  "crush-cli",
  "codex-cli",
  "gemini-cli",
]);

export type CliAgentType = z.infer<typeof CliAgentTypeSchema>;

// CLI Agent Info
export const CliAgentInfoSchema = z.object({
  type: CliAgentTypeSchema,
  name: z.string(),
  description: z.string(),
  website: z.string(),
  installCommand: z.string(),
});

export type CliAgentInfo = z.infer<typeof CliAgentInfoSchema>;

// CLI Agent Configuration
export const CliAgentConfigSchema = z.object({
  agentType: CliAgentTypeSchema,
  apiKey: z.string().optional(),
  customArgs: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
});

export type CliAgentConfig = z.infer<typeof CliAgentConfigSchema>;

// CLI Agent Status
export const CliAgentStatusSchema = z.object({
  id: z.number(),
  agentType: CliAgentTypeSchema,
  enabled: z.boolean(),
  apiKeySet: z.boolean(),
  args: z.array(z.string()).nullable(),
});

export type CliAgentStatus = z.infer<typeof CliAgentStatusSchema>;

// CLI Agent Default Config
export const CliAgentDefaultsSchema = z.object({
  command: z.string(),
  args: z.array(z.string()),
  envJson: z.record(z.string(), z.string()).optional(),
});

export type CliAgentDefaults = z.infer<typeof CliAgentDefaultsSchema>;

// Test Result
export const CliAgentTestResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type CliAgentTestResult = z.infer<typeof CliAgentTestResultSchema>;

// CLI Agent Contracts
export const cliAgentContracts = {
  listAgents: defineContract({
    channel: "cli-agents:list",
    input: z.void(),
    output: z.array(CliAgentInfoSchema),
  }),

  getDefaults: defineContract({
    channel: "cli-agents:get-defaults",
    input: CliAgentTypeSchema,
    output: CliAgentDefaultsSchema,
  }),

  configureAgent: defineContract({
    channel: "cli-agents:configure",
    input: CliAgentConfigSchema,
    output: z.object({
      id: z.number(),
      name: z.string(),
      enabled: z.boolean(),
    }),
  }),

  getConfig: defineContract({
    channel: "cli-agents:get-config",
    input: CliAgentTypeSchema,
    output: CliAgentStatusSchema.nullable(),
  }),

  removeAgent: defineContract({
    channel: "cli-agents:remove",
    input: CliAgentTypeSchema,
    output: z.object({ success: z.boolean() }),
  }),

  testAgent: defineContract({
    channel: "cli-agents:test",
    input: CliAgentTypeSchema,
    output: CliAgentTestResultSchema,
  }),
} as const;

// CLI Agent Client
export const cliAgentClient = createClient(cliAgentContracts);
