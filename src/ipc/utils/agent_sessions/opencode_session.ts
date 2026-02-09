import { spawn, type ChildProcess } from "child_process";
import {
  BaseAgentSession,
  type AgentConfig,
  type AgentMessage,
  type AgentResponse,
} from "./base";
import log from "electron-log";

const logger = log.scope("opencode-session");

/**
 * OpenCode AI CLI agent session
 * Terminal TUI with stdin support for commands
 */
export class OpencodeSession extends BaseAgentSession {
  private process?: ChildProcess;
  private outputBuffer = "";

  async start(config: AgentConfig): Promise<void> {
    if (this.running) {
      throw new Error("OpenCode session is already running");
    }

    this.setConfig(config);

    try {
      logger.info("Starting OpenCode session");

      const args = [...(config.customArgs || [])];

      this.process = spawn("opencode-ai", args, {
        cwd: config.workingDirectory,
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          ...process.env,
          ...(config.apiKey ? { OPENAI_API_KEY: config.apiKey } : {}),
        },
      });

      this.process.on("error", (error) => {
        logger.error("OpenCode process error:", error);
        this.setRunning(false);
      });

      this.process.on("exit", (code) => {
        logger.info("OpenCode process exited", { code });
        this.setRunning(false);
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      this.setRunning(true);
      logger.info("OpenCode session started");
    } catch (error) {
      logger.error("Failed to start OpenCode:", error);
      throw error;
    }
  }

  async *sendMessage(message: AgentMessage): AsyncIterableIterator<AgentResponse> {
    if (!this.running || !this.process?.stdin) {
      throw new Error("OpenCode session is not running");
    }

    logger.info("Sending message to OpenCode");

    this.process.stdin.write(`${message.prompt}\n`);

    this.outputBuffer = "";
    const stream = this.createOutputStream();

    for await (const chunk of stream) {
      yield {
        content: chunk,
        isComplete: false,
      };
    }

    yield {
      content: this.outputBuffer,
      isComplete: true,
    };
  }

  async stop(): Promise<void> {
    if (!this.running || !this.process) {
      return;
    }

    logger.info("Stopping OpenCode session");

    if (this.process.stdin) {
      this.process.stdin.end();
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (this.process) {
      this.process.kill();
    }

    this.setRunning(false);
    this.process = undefined;
  }

  private async *createOutputStream(): AsyncIterableIterator<string> {
    if (!this.process?.stdout) {
      return;
    }

    for await (const chunk of this.process.stdout) {
      const text = chunk.toString();
      this.outputBuffer += text;
      yield text;
    }
  }
}
