import { spawn, type ChildProcess } from "child_process";
import {
  BaseAgentSession,
  type AgentConfig,
  type AgentMessage,
  type AgentResponse,
} from "./base";
import log from "electron-log";

const logger = log.scope("gemini-session");

/**
 * Gemini CLI agent session using headless mode with stdin
 * Supports both --prompt flag and stdin piping
 */
export class GeminiSession extends BaseAgentSession {
  async start(config: AgentConfig): Promise<void> {
    if (this.running) {
      throw new Error("Gemini session is already running");
    }

    this.setConfig(config);
    this.setRunning(true);
    logger.info("Gemini session initialized (stateless mode)");
  }

  async *sendMessage(message: AgentMessage): AsyncIterableIterator<AgentResponse> {
    if (!this.running) {
      throw new Error("Gemini session is not running");
    }

    logger.info("Executing Gemini CLI command");

    const args = [
      "--prompt",
      message.prompt,
      ...(this.config?.customArgs || []),
    ];

    try {
      const childProcess = spawn("gemini", args, {
        cwd: this.config?.workingDirectory,
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          ...(this.config?.apiKey ? { GEMINI_API_KEY: this.config.apiKey } : {}),
        },
      });

      let output = "";

      // Collect stdout
      for await (const chunk of childProcess.stdout) {
        const text = chunk.toString();
        output += text;
        
        yield {
          content: text,
          isComplete: false,
        };
      }

      // Wait for process to complete
      await new Promise<void>((resolve, reject) => {
        childProcess.on("exit", (code: number | null) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Gemini CLI exited with code ${code}`));
          }
        });
        childProcess.on("error", reject);
      });

      yield {
        content: output,
        isComplete: true,
      };
    } catch (error) {
      logger.error("Failed to execute Gemini CLI:", error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    // Gemini runs in stateless mode (one-shot), so no cleanup needed
    this.setRunning(false);
    logger.info("Gemini session stopped");
  }
}
