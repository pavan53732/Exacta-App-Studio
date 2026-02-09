import { spawn, type ChildProcess } from "child_process";
import {
  BaseAgentSession,
  type AgentConfig,
  type AgentMessage,
  type AgentResponse,
} from "./base";
import log from "electron-log";

const logger = log.scope("aider-session");

/**
 * Aider CLI agent session using stdin/stdout piping
 * Aider supports interactive mode with automated responses via --yes flag
 */
export class AiderSession extends BaseAgentSession {
  private process?: ChildProcess;
  private outputBuffer = "";

  async start(config: AgentConfig): Promise<void> {
    if (this.running) {
      throw new Error("Aider session is already running");
    }

    this.setConfig(config);

    // Build command args
    const args = [
      "--yes", // Auto-confirm for non-interactive mode
      "--auto-commits", // Auto-commit changes
      ...(config.customArgs || []),
    ];

    // Add files if provided
    if (config.files && config.files.length > 0) {
      args.push(...config.files);
    }

    try {
      logger.info("Starting Aider session", { args, cwd: config.workingDirectory });

      this.process = spawn("aider", args, {
        cwd: config.workingDirectory,
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          ...process.env,
          ...(config.apiKey ? { OPENAI_API_KEY: config.apiKey } : {}),
        },
      });

      this.process.on("error", (error) => {
        logger.error("Aider process error:", error);
        this.setRunning(false);
      });

      this.process.on("exit", (code) => {
        logger.info("Aider process exited", { code });
        this.setRunning(false);
      });

      // Wait a moment for process to start
      await new Promise((resolve) => setTimeout(resolve, 500));

      this.setRunning(true);
      logger.info("Aider session started successfully");
    } catch (error) {
      logger.error("Failed to start Aider:", error);
      throw error;
    }
  }

  async *sendMessage(message: AgentMessage): AsyncIterableIterator<AgentResponse> {
    if (!this.running || !this.process?.stdin) {
      throw new Error("Aider session is not running");
    }

    logger.info("Sending message to Aider", { prompt: message.prompt });

    // Add files if provided
    if (message.files && message.files.length > 0) {
      for (const file of message.files) {
        this.process.stdin.write(`/add ${file}\n`);
      }
    }

    // Send the prompt
    this.process.stdin.write(`${message.prompt}\n`);

    // Stream responses from stdout
    this.outputBuffer = "";
    const stream = this.createOutputStream();

    for await (const chunk of stream) {
      yield {
        content: chunk,
        isComplete: false,
      };
    }

    // Final response
    yield {
      content: this.outputBuffer,
      isComplete: true,
    };
  }

  async stop(): Promise<void> {
    if (!this.running || !this.process) {
      return;
    }

    logger.info("Stopping Aider session");

    // Send exit command
    if (this.process.stdin) {
      this.process.stdin.write("/exit\n");
    }

    // Wait for graceful exit
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Force kill if still running
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

    const stdout = this.process.stdout;
    let buffer = "";

    for await (const chunk of stdout) {
      const text = chunk.toString();
      buffer += text;
      this.outputBuffer += text;

      // Yield chunks as they come
      if (buffer.includes("\n")) {
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          yield line + "\n";
        }
      }
    }

    // Yield remaining buffer
    if (buffer) {
      yield buffer;
    }
  }
}
