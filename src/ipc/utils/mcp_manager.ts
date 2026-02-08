import { db } from "../../db";
import { mcpServers } from "../../db/schema";
import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import { eq } from "drizzle-orm";
import log from "electron-log";

import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CliAgentMcpBridge } from "./cli_agent_mcp_bridge";
import type { McpServer } from "@/ipc/types/mcp";

const logger = log.scope("mcp-manager");

/**
 * Check if a server is a CLI agent that needs the MCP bridge
 * CLI agents are identified by their command names
 */
function isCliAgentServer(server: McpServer): boolean {
  if (!server.command) return false;
  
  const cliAgentCommands = [
    "aider",
    "gpt-engineer",
    "goose",
    "opencode",
    "blackbox",
    "crush",
    "codex",
    "gemini",
  ];
  
  const cmd = server.command.toLowerCase().trim();
  return cliAgentCommands.some(agentCmd => cmd === agentCmd || cmd.endsWith(`/${agentCmd}`));
}

class McpManager {
  private static _instance: McpManager;
  static get instance(): McpManager {
    if (!this._instance) this._instance = new McpManager();
    return this._instance;
  }

  private clients = new Map<number, MCPClient>();
  private cliBridges = new Map<number, CliAgentMcpBridge>();

  async getClient(serverId: number): Promise<MCPClient> {
    const existing = this.clients.get(serverId);
    if (existing) return existing;
    
    const server = await db
      .select()
      .from(mcpServers)
      .where(eq(mcpServers.id, serverId));
    const s = server.find((x) => x.id === serverId);
    if (!s) throw new Error(`MCP server not found: ${serverId}`);
    
    // Check if this is a CLI agent that needs the bridge
    if (isCliAgentServer(s as McpServer)) {
      logger.info(`Using CLI agent bridge for: ${s.name} (${s.command})`);
      return this.createCliAgentClient(s as McpServer, serverId);
    }
    
    let transport: StdioClientTransport | StreamableHTTPClientTransport;
    if (s.transport === "stdio") {
      const args = s.args ?? [];
      const env = s.envJson ?? undefined;
      if (!s.command) throw new Error("MCP server command is required");
      transport = new StdioClientTransport({
        command: s.command,
        args,
        env,
      });
    } else if (s.transport === "http") {
      if (!s.url) throw new Error("HTTP MCP requires url");
      const headers = s.headersJson ?? {};
      transport = new StreamableHTTPClientTransport(new URL(s.url as string), {
        requestInit: {
          headers,
        },
      });
    } else {
      throw new Error(`Unsupported MCP transport: ${s.transport}`);
    }
    const client = await createMCPClient({
      transport,
    });
    this.clients.set(serverId, client);
    return client;
  }
  
  /**
   * Create an MCP client wrapper for a CLI agent using the bridge
   */
  private async createCliAgentClient(server: McpServer, serverId: number): Promise<MCPClient> {
    // Create or get existing bridge
    let bridge = this.cliBridges.get(serverId);
    if (!bridge) {
      bridge = new CliAgentMcpBridge(server);
      this.cliBridges.set(serverId, bridge);
    }
    
    // Create a mock MCP client that uses the bridge
    // CLI agents only support tools, not resources or prompts
    const mockClient: MCPClient = {
      tools: async <TOOL_SCHEMAS extends any>(_options?: { schemas?: TOOL_SCHEMAS }) => {
        const bridgeTools = bridge!.getTools();
        // Convert bridge tools to MCP tool format
        const mcpTools: Record<string, any> = {};
        
        for (const [name, tool] of Object.entries(bridgeTools)) {
          mcpTools[name] = {
            description: tool.description,
            inputSchema: tool.inputSchema,
            execute: async (args: unknown, execCtx: any) => {
              try {
                const result = await tool.execute(args, execCtx);
                return result;
              } catch (error: any) {
                logger.error(`CLI agent tool ${name} failed:`, error);
                throw error;
              }
            },
          };
        }
        
        return mcpTools as any;
      },
      // CLI agents don't support resources - return empty
      listResources: async () => ({ resources: [] }),
      readResource: async () => ({ contents: [] }),
      listResourceTemplates: async () => ({ resourceTemplates: [] }),
      // CLI agents don't support prompts - return empty  
      experimental_listPrompts: async () => ({ prompts: [] }),
      experimental_getPrompt: async () => ({ messages: [] }),
      // CLI agents don't support elicitation
      onElicitationRequest: () => {},
      close: async () => {
        this.cliBridges.delete(serverId);
      },
    };
    
    return mockClient;
  }

  dispose(serverId: number) {
    const c = this.clients.get(serverId);
    if (c) {
      c.close();
      this.clients.delete(serverId);
    }
    
    const bridge = this.cliBridges.get(serverId);
    if (bridge) {
      this.cliBridges.delete(serverId);
    }
  }
}

export const mcpManager = McpManager.instance;

