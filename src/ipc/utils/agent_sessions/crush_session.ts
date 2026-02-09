import { spawn, type ChildProcess } from "child_process";
import {
  BaseAgentSession,
  type AgentConfig,
  type AgentMessage,
  type AgentResponse,
} from "./base";
import log from "electron-log";

const logger = log.scope("crush-session");

/**
 * Crush CLI agent session (successor to OpenCode)
 * Built with Charmbracelet's Bubble Tea framework
 * Supports stdin piping and session-based workflows
 */
export class CrushSession extends BaseAgentSession {
  private process?: ChildProcess;
  private outputBuffer = "";

  async start(config: AgentConfig): Promise<void> {
    if (this.running) {
      throw new Error("Crush session is already running");
    }

    this.setConfig(config);

    try {
      logger.info("Starting Crush session");

      const args = [...(config.customArgs || [])];

      this.process = spawn("crush", args, {
        cwd: config.workingDirectory,
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          ...process.env,
          ...(config.apiKey ? { OPENAI_API_KEY: config.apiKey } : {}),
        },
      });

      this.process.on("error", (error) => {
        logger.error("Crush process error:", error);
        this.setRunning(false);
      });

      this.process.on("exit", (code) => {
        logger.info("Crush process exited", { code });
        this.setRunning(false);
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      this.setRunning(true);
      logger.info("Crush session started");
    } catch (error) {
      logger.error("Failed to start Crush:", error);
      throw error;
    }
  }

  async *sendMessage(message: AgentMessage): AsyncIterableIterator<AgentResponse> {
    if (!this.running || !this.process?.stdin) {
      throw new Error("Crush session is not running");
    }

    logger.info("Sending message to Crush");

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

    logger.info("Stopping Crush session");

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
