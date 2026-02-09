import { spawn, type ChildProcess } from "child_process";
import {
  BaseAgentSession,
  type AgentConfig,
  type AgentMessage,
  type AgentResponse,
} from "./base";
import log from "electron-log";

const logger = log.scope("blackbox-session");

/**
 * Blackbox AI CLI agent session
 * Uses API key authentication and natural language commands
 */
export class BlackboxSession extends BaseAgentSession {
  private configured = false;

  async start(config: AgentConfig): Promise<void> {
    if (this.running) {
      throw new Error("Blackbox session is already running");
    }

    this.setConfig(config);

    // Configure API key if provided and not already configured
    if (config.apiKey && !this.configured) {
      await this.configure(config.apiKey);
    }

    this.setRunning(true);
    logger.info("Blackbox session started");
  }

  async *sendMessage(message: AgentMessage): AsyncIterableIterator<AgentResponse> {
    if (!this.running) {
      throw new Error("Blackbox session is not running");
    }

    logger.info("Executing Blackbox CLI command");

    const args = [...(this.config?.customArgs || [])];

    try {
      const process = spawn("blackbox", args, {
        cwd: this.config?.workingDirectory,
        stdio: ["pipe", "pipe", "pipe"],
      });

      // Send prompt via stdin
      if (process.stdin) {
        process.stdin.write(`${message.prompt}\n`);
        process.stdin.end();
      }

      let output = "";

      for await (const chunk of process.stdout) {
        const text = chunk.toString();
        output += text;

        yield {
          content: text,
          isComplete: false,
        };
      }

      await new Promise((resolve, reject) => {
        process.on("exit", resolve);
        process.on("error", reject);
      });

      yield {
        content: output,
        isComplete: true,
      };
    } catch (error) {
      logger.error("Failed to execute Blackbox:", error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.setRunning(false);
    logger.info("Blackbox session stopped");
  }

  private async configure(apiKey: string): Promise<void> {
    logger.info("Configuring Blackbox API key");

    try {
      const process = spawn("blackbox", ["configure"], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      if (process.stdin) {
        process.stdin.write(`${apiKey}\n`);
        process.stdin.end();
      }

      await new Promise((resolve, reject) => {
        process.on("exit", (code) => {
          if (code === 0) {
            this.configured = true;
            resolve(undefined);
          } else {
            reject(new Error(`Blackbox configure failed with code ${code}`));
          }
        });
        process.on("error", reject);
      });

      logger.info("Blackbox configured successfully");
    } catch (error) {
      logger.error("Failed to configure Blackbox:", error);
      throw error;
    }
  }
}
