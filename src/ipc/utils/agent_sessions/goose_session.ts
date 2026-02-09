import { spawn, type ChildProcess } from "child_process";
import {
  BaseAgentSession,
  type AgentConfig,
  type AgentMessage,
  type AgentResponse,
} from "./base";
import log from "electron-log";

const logger = log.scope("goose-session");

/**
 * Goose CLI agent session using HTTP API
 * Goose has a web server mode that exposes HTTP endpoints
 */
export class GooseSession extends BaseAgentSession {
  private process?: ChildProcess;
  private serverUrl = "http://localhost:8080";
  private sessionId?: string;

  async start(config: AgentConfig): Promise<void> {
    if (this.running) {
      throw new Error("Goose session is already running");
    }

    this.setConfig(config);

    try {
      logger.info("Starting Goose web server");

      // Start goose web server
      const args = ["web", "--port", "8080", ...(config.customArgs || [])];

      this.process = spawn("goose", args, {
        cwd: config.workingDirectory,
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          ...process.env,
          ...(config.apiKey ? { GOOSE_API_KEY: config.apiKey } : {}),
        },
      });

      this.process.on("error", (error) => {
        logger.error("Goose process error:", error);
        this.setRunning(false);
      });

      this.process.on("exit", (code) => {
        logger.info("Goose process exited", { code });
        this.setRunning(false);
      });

      // Wait for server to start
      await this.waitForServer();

      // Create a session
      await this.createSession();

      this.setRunning(true);
      logger.info("Goose session started successfully");
    } catch (error) {
      logger.error("Failed to start Goose:", error);
      throw error;
    }
  }

  async *sendMessage(message: AgentMessage): AsyncIterableIterator<AgentResponse> {
    if (!this.running || !this.sessionId) {
      throw new Error("Goose session is not running");
    }

    logger.info("Sending message to Goose", { sessionId: this.sessionId });

    try {
      const response = await fetch(`${this.serverUrl}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: this.sessionId,
          prompt: message.prompt,
          files: message.files,
        }),
      });

      if (!response.ok) {
        throw new Error(`Goose API error: ${response.statusText}`);
      }

      const data = await response.json();

      yield {
        content: data.response || "",
        isComplete: true,
        metadata: data.metadata,
      };
    } catch (error) {
      logger.error("Failed to send message to Goose:", error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    logger.info("Stopping Goose session");

    // End the session via API if possible
    if (this.sessionId) {
      try {
        await fetch(`${this.serverUrl}/api/sessions/${this.sessionId}`, {
          method: "DELETE",
        });
      } catch (error) {
        logger.warn("Failed to end Goose session via API:", error);
      }
    }

    // Kill the server process
    if (this.process) {
      this.process.kill();
    }

    this.setRunning(false);
    this.sessionId = undefined;
    this.process = undefined;
  }

  private async waitForServer(): Promise<void> {
    const maxAttempts = 10;
    const delayMs = 500;

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`${this.serverUrl}/health`);
        if (response.ok) {
          logger.info("Goose server is ready");
          return;
        }
      } catch {
        // Server not ready yet
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    throw new Error("Goose server failed to start");
  }

  private async createSession(): Promise<void> {
    try {
      const response = await fetch(`${this.serverUrl}/api/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workingDirectory: this.config?.workingDirectory,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.statusText}`);
      }

      const data = await response.json();
      this.sessionId = data.sessionId;
      logger.info("Goose session created", { sessionId: this.sessionId });
    } catch (error) {
      logger.error("Failed to create Goose session:", error);
      throw error;
    }
  }
}
