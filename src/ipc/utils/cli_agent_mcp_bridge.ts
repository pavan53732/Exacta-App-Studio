import { spawn } from "node:child_process";
import log from "electron-log";
import type { McpServer } from "@/ipc/types/mcp";

const logger = log.scope("cli-agent-mcp-bridge");

/**
 * Creates an MCP-compatible wrapper for CLI agents.
 * This bridge converts MCP tool calls into CLI command executions.
 */
export class CliAgentMcpBridge {
  private server: McpServer;

  constructor(server: McpServer) {
    this.server = server;
  }

  /**
   * Get available tools for this CLI agent
   */
  getTools(): Record<string, any> {
    const agentName = this.server.name.toLowerCase();

    // Each CLI agent gets a generic "execute" tool
    // plus any specific tools based on the agent type
    const baseTools: Record<string, any> = {
      execute: {
        description: `Execute ${this.server.name} with the given prompt`,
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description: "The prompt or task to send to the agent",
            },
            files: {
              type: "array",
              items: { type: "string" },
              description: "Optional list of file paths to include in context",
            },
          },
          required: ["prompt"],
        },
        execute: this.execute.bind(this),
      },
    };

    // Add agent-specific tools
    if (agentName.includes("aider")) {
      baseTools.addFiles = {
        description: "Add files to the chat context",
        inputSchema: {
          type: "object",
          properties: {
            files: {
              type: "array",
              items: { type: "string" },
              description: "Files to add to context",
            },
          },
          required: ["files"],
        },
        execute: this.executeAiderAddFiles.bind(this),
      };
    }

    return baseTools;
  }

  /**
   * Execute the CLI agent with a prompt
   */
  private async execute(args: { prompt: string; files?: string[] }): Promise<string> {
    const { prompt, files } = args;
    const agentName = this.server.name.toLowerCase();

    logger.info(`Executing ${this.server.name} with prompt:`, prompt);

    try {
      // Build command based on agent type
      const result = await this.runCliCommand(agentName, prompt, files);
      return result;
    } catch (error: any) {
      logger.error(`Failed to execute ${this.server.name}:`, error);
      return `Error: ${error.message}`;
    }
  }

  /**
   * Execute aider add files command
   */
  private async executeAiderAddFiles(args: { files: string[] }): Promise<string> {
    const filesList = args.files.join(" ");
    const command = `${this.server.command} ${filesList}`;
    
    logger.info(`Aider add files: ${command}`);
    
    try {
      const result = await this.runShellCommand(command);
      return result;
    } catch (error: any) {
      return `Error adding files: ${error.message}`;
    }
  }

  /**
   * Build and run CLI command based on agent type
   */
  private async runCliCommand(
    agentName: string,
    prompt: string,
    files?: string[]
  ): Promise<string> {
    let command: string;
    const args: string[] = [...(this.server.args || [])];

    // Build command based on agent type
    if (agentName.includes("aider")) {
      // Aider: aider [files] --message "prompt"
      const filesList = files?.join(" ") || "";
      command = `${this.server.command} ${filesList} --message "${this.escapeShellArg(prompt)}"`;
    } else if (agentName.includes("codex")) {
      // Codex: codex "prompt"
      command = `${this.server.command} "${this.escapeShellArg(prompt)}"`;
    } else if (agentName.includes("gemini")) {
      // Gemini: gemini "prompt"
      command = `${this.server.command} "${this.escapeShellArg(prompt)}"`;
    } else if (agentName.includes("goose")) {
      // Goose: goose run "prompt"
      command = `${this.server.command} run "${this.escapeShellArg(prompt)}"`;
    } else {
      // Generic: command [args] "prompt"
      const argsStr = args.length > 0 ? args.join(" ") : "";
      command = `${this.server.command} ${argsStr} "${this.escapeShellArg(prompt)}"`;
    }

    return this.runShellCommand(command);
  }

  /**
   * Run a shell command and return output
   */
  private runShellCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      logger.debug(`Running command: ${command}`);

      const child = spawn(command, {
        shell: true,
        cwd: process.cwd(),
        env: {
          ...process.env,
          ...this.server.envJson,
        },
      });

      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve(stdout || "Command completed successfully");
        } else {
          reject(new Error(stderr || `Command failed with exit code ${code}`));
        }
      });

      child.on("error", (error) => {
        reject(error);
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        child.kill();
        reject(new Error("Command timed out after 5 minutes"));
      }, 5 * 60 * 1000);
    });
  }

  /**
   * Escape shell arguments
   */
  private escapeShellArg(arg: string): string {
    return arg.replace(/"/g, '\\"').replace(/\$/g, '\\$');
  }
}

/**
 * Create an MCP bridge for a CLI agent server
 */
export function createCliAgentMcpBridge(server: McpServer): CliAgentMcpBridge {
  return new CliAgentMcpBridge(server);
}
