/**
 * Base interface for CLI agent sessions
 * Provides a unified API for interacting with various CLI coding agents
 */

export interface AgentConfig {
  apiKey?: string;
  customArgs?: string[];
  workingDirectory?: string;
  files?: string[];
}

export interface AgentMessage {
  prompt: string;
  files?: string[];
}

export interface AgentResponse {
  content: string;
  isComplete: boolean;
  metadata?: Record<string, any>;
}

/**
 * Base interface that all agent sessions must implement
 */
export interface AgentSession {
  /**
   * Start the agent session with the provided configuration
   */
  start(config: AgentConfig): Promise<void>;

  /**
   * Send a message to the agent and receive streaming responses
   */
  sendMessage(message: AgentMessage): AsyncIterableIterator<AgentResponse>;

  /**
   * Stop the agent session and clean up resources
   */
  stop(): Promise<void>;

  /**
   * Check if the agent is currently running
   */
  isRunning(): boolean;
}

/**
 * Abstract base class with common session management logic
 */
export abstract class BaseAgentSession implements AgentSession {
  protected running = false;
  protected config?: AgentConfig;

  abstract start(config: AgentConfig): Promise<void>;
  abstract sendMessage(message: AgentMessage): AsyncIterableIterator<AgentResponse>;
  abstract stop(): Promise<void>;

  isRunning(): boolean {
    return this.running;
  }

  protected setRunning(running: boolean): void {
    this.running = running;
  }

  protected setConfig(config: AgentConfig): void {
    this.config = config;
  }
}
