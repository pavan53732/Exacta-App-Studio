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

// Agent Session Configuration
export const AgentConfigSchema = z.object({
  apiKey: z.string().optional(),
  customArgs: z.array(z.string()).optional(),
  workingDirectory: z.string().optional(),
  files: z.array(z.string()).optional(),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

// Session Result
export const SessionResultSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

export type SessionResult = z.infer<typeof SessionResultSchema>;

// Send Message Result
export const SendMessageResultSchema = z.object({
  success: z.boolean(),
  response: z.string().optional(),
  error: z.string().optional(),
});

export type SendMessageResult = z.infer<typeof SendMessageResultSchema>;

// CLI Agent Default Config (kept for backwards compatibility)
export const CliAgentDefaultsSchema = z.object({
  command: z.string(),
  args: z.array(z.string()),
  apiKey: z.string(),
});

export type CliAgentDefaults = z.infer<typeof CliAgentDefaultsSchema>;

// CLI Agent Contracts (Session-Based)
export const cliAgentContracts = {
  // List available CLI agents
  listAgents: defineContract({
    channel: "cli-agents:list",
    input: z.void(),
    output: z.array(CliAgentInfoSchema),
  }),

  // Get default configuration for an agent
  getDefaults: defineContract({
    channel: "cli-agents:get-defaults",
    input: CliAgentTypeSchema,
    output: CliAgentDefaultsSchema,
  }),

  // Create a new agent session
  createSession: defineContract({
    channel: "cli-agents:create-session",
    input: z.object({
      sessionId: z.string(),
      agentType: CliAgentTypeSchema,
      config: AgentConfigSchema,
    }),
    output: SessionResultSchema,
  }),

  // Send a message to an active session
  sendMessage: defineContract({
    channel: "cli-agents:send-message",
    input: z.object({
      sessionId: z.string(),
      prompt: z.string(),
      files: z.array(z.string()).optional(),
    }),
    output: SendMessageResultSchema,
  }),

  // Stop an active session
  stopSession: defineContract({
    channel: "cli-agents:stop-session",
    input: z.object({
      sessionId: z.string(),
    }),
    output: SessionResultSchema,
  }),
} as const;

// CLI Agent Client
export const cliAgentClient = createClient(cliAgentContracts);
