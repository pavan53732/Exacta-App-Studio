import { spawn } from "child_process";
import {
  BaseAgentSession,
  type AgentConfig,
  type AgentMessage,
  type AgentResponse,
} from "./base";
import log from "electron-log";

const logger = log.scope("codex-session");

/**
 * OpenAI Codex CLI agent session (2025 version)
 * Note: This is a placeholder for SDK integration
 * The @openai/codex-sdk would be used for proper integration
 */
export class CodexSession extends BaseAgentSession {
  async start(config: AgentConfig): Promise<void> {
    if (this.running) {
      throw new Error("Codex session is already running");
    }

    this.setConfig(config);
    this.setRunning(true);
    logger.info("Codex session initialized");
  }

  async *sendMessage(message: AgentMessage): AsyncIterableIterator<AgentResponse> {
    if (!this.running) {
      throw new Error("Codex session is not running");
    }

    logger.info("Executing Codex CLI");

    const args = [
      message.prompt,
      ...(message.files?.map((f) => `--file ${f}`) || []),
      ...(this.config?.customArgs || []),
    ];

    try {
      const childProcess = spawn("codex", args, {
        cwd: this.config?.workingDirectory,
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          ...(this.config?.apiKey ? { OPENAI_API_KEY: this.config.apiKey } : {}),
        },
      });

      let output = "";

      for await (const chunk of childProcess.stdout) {
        const text = chunk.toString();
        output += text;

        yield {
          content: text,
          isComplete: false,
        };
      }

      await new Promise<void>((resolve, reject) => {
        childProcess.on("exit", resolve);
        childProcess.on("error", reject);
      });

      yield {
        content: output,
        isComplete: true,
      };
    } catch (error) {
      logger.error("Failed to execute Codex:", error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.setRunning(false);
    logger.info("Codex session stopped");
  }
}
