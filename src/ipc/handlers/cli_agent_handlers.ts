import log from "electron-log";
import { db } from "@/db";
import { mcpServers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createTypedHandler } from "./base";
import { mcpManager } from "@/ipc/utils/mcp_manager";
import { cliAgentContracts, type CliAgentType } from "@/ipc/types/cli_agents";
import {
  getCliAgentDefaults,
  validateCliAgentConfig,
} from "@/ipc/utils/cli_agent_utils";

const logger = log.scope("cli_agent_handlers");

// CLI Agent definitions with default configurations
export const CLI_AGENTS: Record<
  CliAgentType,
  {
    name: string;
    description: string;
    website: string;
    installCommand: string;
  }
> = {
  aider: {
    name: "Aider",
    description: "AI pair programming in your terminal",
    website: "https://aider.chat",
    installCommand: "pip install aider-chat",
  },
  "gpt-engineer": {
    name: "GPT Engineer",
    description:
      "Specify what you want it to build, the AI asks for clarification, and then builds it",
    website: "https://github.com/gpt-engineer-org/gpt-engineer",
    installCommand: "pip install gpt-engineer",
  },
  "goose-cli": {
    name: "Goose CLI",
    description:
      "An open-source AI agent that can perform complex tasks on your device",
    website: "https://block.github.io/goose/",
    installCommand:
      "curl -fsSL https://github.com/block/goose/releases/latest/download/install.sh | bash",
  },
  opencode: {
    name: "OpenCode",
    description: "Open-source AI coding assistant",
    website: "https://opencode.ai",
    installCommand: "npm install -g opencode",
  },
  "blackbox-cli": {
    name: "Blackbox CLI",
    description: "AI coding assistant with real-time knowledge",
    website: "https://www.blackbox.ai",
    installCommand: "npm install -g @blackboxai/cli",
  },
  "crush-cli": {
    name: "Crush CLI",
    description: "AI-powered terminal assistant",
    website: "https://crush.sh",
    installCommand: "npm install -g crush-cli",
  },
  "codex-cli": {
    name: "Codex CLI",
    description: "OpenAI's official coding agent",
    website: "https://github.com/openai/codex",
    installCommand: "npm install -g @openai/codex",
  },
  "gemini-cli": {
    name: "Gemini CLI",
    description: "Google's AI coding assistant",
    website: "https://github.com/google-gemini/gemini-cli",
    installCommand: "npm install -g @google/gemini-cli",
  },
};

export function registerCliAgentHandlers() {
  // Get all available CLI agent types
  createTypedHandler(cliAgentContracts.listAgents, async () => {
    return Object.entries(CLI_AGENTS).map(([type, config]) => ({
      type: type as CliAgentType,
      ...config,
    }));
  });

  // Get default configuration for a CLI agent
  createTypedHandler(cliAgentContracts.getDefaults, async (_, agentType) => {
    return getCliAgentDefaults(agentType);
  });

  // Configure a CLI agent as an MCP server
  createTypedHandler(cliAgentContracts.configureAgent, async (_, params) => {
    const { agentType, apiKey, customArgs, enabled } = params;

    const agentDefaults = CLI_AGENTS[agentType];
    if (!agentDefaults) {
      throw new Error(`Unknown CLI agent type: ${agentType}`);
    }

    // Validate configuration
    const validation = validateCliAgentConfig(agentType, params);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.error}`);
    }

    // Build the configuration
    const config = getCliAgentDefaults(agentType);
    const args = customArgs || config.args || [];
    const envJson: Record<string, string> = {};

    // Add API key to environment if provided
    if (apiKey) {
      const envVarName = getApiKeyEnvVar(agentType);
      if (envVarName) {
        envJson[envVarName] = apiKey;
      }
    }

    // Merge with default environment variables
    if (config.envJson) {
      Object.assign(envJson, config.envJson);
    }

    // Check if already exists
    const existing = await db
      .select()
      .from(mcpServers)
      .where(eq(mcpServers.name, agentDefaults.name))
      .get();

    let result;
    if (existing) {
      // Update existing
      result = await db
        .update(mcpServers)
        .set({
          command: config.command,
          args,
          envJson,
          enabled: enabled !== undefined ? enabled : existing.enabled,
          updatedAt: new Date(),
        })
        .where(eq(mcpServers.id, existing.id))
        .returning();

      // Dispose cached client to force recreation
      try {
        mcpManager.dispose(existing.id);
      } catch {}
    } else {
      // Create new
      result = await db
        .insert(mcpServers)
        .values({
          name: agentDefaults.name,
          transport: "stdio",
          command: config.command,
          args,
          envJson,
          enabled: enabled !== false,
        })
        .returning();
    }

    logger.info(`Configured CLI agent: ${agentDefaults.name}`);
    return {
      id: result[0].id,
      name: result[0].name,
      enabled: result[0].enabled,
    };
  });

  // Get configuration for a CLI agent
  createTypedHandler(cliAgentContracts.getConfig, async (_, agentType) => {
    const agentDefaults = CLI_AGENTS[agentType];
    if (!agentDefaults) {
      return null;
    }

    const server = await db
      .select()
      .from(mcpServers)
      .where(eq(mcpServers.name, agentDefaults.name))
      .get();

    if (!server) {
      return null;
    }

    return {
      id: server.id,
      agentType,
      enabled: server.enabled,
      apiKeySet: !!server.envJson && Object.keys(server.envJson).length > 0,
      args: server.args,
    };
  });

  // Remove a CLI agent configuration
  createTypedHandler(cliAgentContracts.removeAgent, async (_, agentType) => {
    const agentDefaults = CLI_AGENTS[agentType];
    if (!agentDefaults) {
      throw new Error(`Unknown CLI agent type: ${agentType}`);
    }

    const server = await db
      .select()
      .from(mcpServers)
      .where(eq(mcpServers.name, agentDefaults.name))
      .get();

    if (server) {
      try {
        mcpManager.dispose(server.id);
      } catch {}

      await db.delete(mcpServers).where(eq(mcpServers.id, server.id));
      logger.info(`Removed CLI agent: ${agentDefaults.name}`);
    }

    return { success: true };
  });

  // Test a CLI agent configuration
  createTypedHandler(cliAgentContracts.testAgent, async (_, agentType) => {
    const agentDefaults = CLI_AGENTS[agentType];
    if (!agentDefaults) {
      throw new Error(`Unknown CLI agent type: ${agentType}`);
    }

    const server = await db
      .select()
      .from(mcpServers)
      .where(eq(mcpServers.name, agentDefaults.name))
      .get();

    if (!server) {
      throw new Error(`CLI agent not configured: ${agentType}`);
    }

    try {
      const client = await mcpManager.getClient(server.id);
      const tools = await client.tools();

      return {
        success: true,
        message: `Connected successfully. Available tools: ${Object.keys(tools).length}`,
      };
    } catch (error: any) {
      logger.error(`Failed to test CLI agent ${agentType}:`, error);
      return {
        success: false,
        message: error.message || "Failed to connect to CLI agent",
      };
    }
  });

  logger.debug("Registered CLI agent handlers");
}

// Helper function to get the environment variable name for API keys
function getApiKeyEnvVar(agentType: CliAgentType): string | null {
  switch (agentType) {
    case "aider":
      return "OPENAI_API_KEY";
    case "gpt-engineer":
      return "OPENAI_API_KEY";
    case "goose-cli":
      return "GOOSE_API_KEY";
    case "opencode":
      return "OPENCODE_API_KEY";
    case "blackbox-cli":
      return "BLACKBOX_API_KEY";
    case "crush-cli":
      return "CRUSH_API_KEY";
    case "codex-cli":
      return "OPENAI_API_KEY";
    case "gemini-cli":
      return "GOOGLE_API_KEY";
    default:
      return null;
  }
}
