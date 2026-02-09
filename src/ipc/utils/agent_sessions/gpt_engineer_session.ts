import { spawn, type ChildProcess } from "child_process";
import {
  BaseAgentSession,
  type AgentConfig,
  type AgentMessage,
  type AgentResponse,
} from "./base";
import log from "electron-log";

const logger = log.scope("gpt-engineer-session");

/**
 * GPT Engineer agent session using stdin for interactive prompts
 * GPT Engineer asks clarifying questions and builds in project directory
 */
export class GptEngineerSession extends BaseAgentSession {
  private process?: ChildProcess;
  private outputBuffer = "";

  async start(config: AgentConfig): Promise<void> {
    if (this.running) {
      throw new Error("GPT Engineer session is already running");
    }

    if (!config.workingDirectory) {
      throw new Error("GPT Engineer requires a working directory");
    }

    this.setConfig(config);

    const args = [config.workingDirectory, ...(config.customArgs || [])];

    try {
      logger.info("Starting GPT Engineer session", { cwd: config.workingDirectory });

      this.process = spawn("gpte", args, {
        cwd: config.workingDirectory,
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          ...process.env,
          ...(config.apiKey ? { OPENAI_API_KEY: config.apiKey } : {}),
        },
      });

      this.process.on("error", (error) => {
        logger.error("GPT Engineer process error:", error);
        this.setRunning(false);
      });

      this.process.on("exit", (code) => {
        logger.info("GPT Engineer process exited", { code });
        this.setRunning(false);
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      this.setRunning(true);
      logger.info("GPT Engineer session started");
    } catch (error) {
      logger.error("Failed to start GPT Engineer:", error);
      throw error;
    }
  }

  async *sendMessage(message: AgentMessage): AsyncIterableIterator<AgentResponse> {
    if (!this.running || !this.process?.stdin) {
      throw new Error("GPT Engineer session is not running");
    }

    logger.info("Sending message to GPT Engineer");

    // Send prompt via stdin
    this.process.stdin.write(`${message.prompt}\n`);

    // Stream responses
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

    logger.info("Stopping GPT Engineer session");

    // Send EOF to stdin
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
