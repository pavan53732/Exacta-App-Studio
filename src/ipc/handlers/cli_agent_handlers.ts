import { ipcMain } from "electron";
import {
  createAgentSession,
  type AgentType,
  type AgentConfig,
} from "../utils/agent_sessions";
import log from "electron-log";

const logger = log.scope("cli-agent-manager");

/**
 * Agent Session Manager
 * Manages long-running agent sessions and message passing
 */
class AgentSessionManager {
  private sessions = new Map<string, any>(); // sessionId -> AgentSession

  async createSession(
    sessionId: string,
    agentType: AgentType,
    config: AgentConfig
  ): Promise<void> {
    if (this.sessions.has(sessionId)) {
      throw new Error(`Session ${sessionId} already exists`);
    }

    const session = createAgentSession(agentType);
    await session.start(config);

    this.sessions.set(sessionId, session);
    logger.info(`Created ${agentType} session`, { sessionId });
  }

  async sendMessage(sessionId: string, prompt: string, files?: string[]) {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const responses: string[] = [];

    for await (const response of session.sendMessage({ prompt, files })) {
      responses.push(response.content);

      if (response.isComplete) {
        break;
      }
    }

    return responses.join("");
  }

  async stopSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return;
    }

    await session.stop();
    this.sessions.delete(sessionId);
    logger.info(`Stopped session`, { sessionId });
  }

  async stopAllSessions(): Promise<void> {
    const sessionIds = Array.from(this.sessions.keys());

    for (const sessionId of sessionIds) {
      await this.stopSession(sessionId);
    }
  }
}

const sessionManager = new AgentSessionManager();

/**
 * CLI Agent type definitions and metadata
 */
export type CliAgentType =
  | "aider"
  | "gpt-engineer"
  | "goose-cli"
  | "opencode"
  | "blackbox-cli"
  | "crush-cli"
  | "codex-cli"
  | "gemini-cli";

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
    description: "Specify what you want to build, AI asks for clarification",
    website: "https://github.com/gpt-engineer-org/gpt-engineer",
    installCommand: "pip install gpt-engineer",
  },
  "goose-cli": {
    name: "Goose CLI",
    description: "Developer agent that runs in your terminal",
    website: "https://github.com/square/goose",
    installCommand: "curl -fsSL https://goose-cli.com/install.sh | sh",
  },
  opencode: {
    name: "OpenCode",
    description: "Open-source AI coding assistant",
    website: "https://opencode.ai",
    installCommand: "npm install -g opencode-ai",
  },
  "blackbox-cli": {
    name: "Blackbox CLI",
    description: "AI-powered code generation and debugging",
    website: "https://www.blackbox.ai/cli",
    installCommand: "npm install -g @blackboxai/cli",
  },
  "crush-cli": {
    name: "Crush CLI",
    description: "AI-powered terminal assistant (successor to OpenCode)",
    website: "https://github.com/charmbracelet/crush",
    installCommand: "npm install -g @charmland/crush",
  },
  "codex-cli": {
    name: "Codex CLI",
    description: "OpenAI's new 2025 code assistant CLI",
    website: "https://openai.com/codex",
    installCommand: "npm install -g @openai/codex",
  },
  "gemini-cli": {
    name: "Gemini CLI",
    description: "Official Google Gem ini CLI",
    website: "https://developers.google.com/gemini",
    installCommand: "npm install -g @google/gemini-cli",
  },
};

/**
 * Register IPC handlers for CLI agent operations
 */
export function registerCliAgentHandlers() {
  // List available CLI agents
  ipcMain.handle("cli-agents:list", () => {
    const agents = Object.entries(CLI_AGENTS).map(([type, info]) => ({
      type,
      ...info,
    }));
    return agents;
  });

  // Get default config for an agent
  ipcMain.handle("cli-agents:get-defaults", (_event, agentType: CliAgentType) => {
    return {
      command: agentType,
      args: [],
      apiKey: "",
    };
  });

  // Create new agent session
  ipcMain.handle(
    "cli-agents:create-session",
    async (_event, sessionId: string, agentType: CliAgentType, config: AgentConfig) => {
      try {
        await sessionManager.createSession(sessionId, agentType as AgentType, config);
        return { success: true };
      } catch (error) {
        logger.error("Failed to create session:", error);
        return { success: false, error: String(error) };
      }
    }
  );

  // Send message to agent session
  ipcMain.handle(
    "cli-agents:send-message",
    async (
      _event,
      sessionId: string,
      prompt: string,
      files?: string[]
    ) => {
      try {
        const response = await sessionManager.sendMessage(sessionId, prompt, files);
        return { success: true, response };
      } catch (error) {
        logger.error("Failed to send message:", error);
        return { success: false, error: String(error) };
      }
    }
  );

  // Stop agent session
  ipcMain.handle("cli-agents:stop-session", async (_event, sessionId: string) => {
    try {
      await sessionManager.stopSession(sessionId);
      return { success: true };
    } catch (error) {
      logger.error("Failed to stop session:", error);
      return { success: false, error: String(error) };
    }
  });

  logger.info("CLI agent handlers registered");
}

// Clean up sessions on app quit
process.on("exit", () => {
  sessionManager.stopAllSessions().catch((error) => {
    logger.error("Failed to stop sessions on exit:", error);
  });
});
