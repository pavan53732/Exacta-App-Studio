/**
 * Agent Sessions - Unified interface for CLI coding agents
 */

export * from "./base";
export { AiderSession } from "./aider_session";
export { GooseSession } from "./goose_session";
export { GeminiSession } from "./gemini_session";
export { GptEngineerSession } from "./gpt_engineer_session";
export { CodexSession } from "./codex_session";
export { BlackboxSession } from "./blackbox_session";
export { OpencodeSession } from "./opencode_session";
export { CrushSession } from "./crush_session";

// Import types for factory
import type { AgentSession } from "./base";
import { AiderSession } from "./aider_session";
import { GooseSession } from "./goose_session";
import { GeminiSession } from "./gemini_session";
import { GptEngineerSession } from "./gpt_engineer_session";
import { CodexSession } from "./codex_session";
import { BlackboxSession } from "./blackbox_session";
import { OpencodeSession } from "./opencode_session";
import { CrushSession } from "./crush_session";

export type AgentType =
  | "aider"
  | "gpt-engineer"
  | "goose-cli"
  | "opencode"
  | "blackbox-cli"
  | "crush-cli"
  | "codex-cli"
  | "gemini-cli";

/**
 * Factory function to create the appropriate agent session based on type
 */
export function createAgentSession(agentType: AgentType): AgentSession {
  switch (agentType) {
    case "aider":
      return new AiderSession();
    case "goose-cli":
      return new GooseSession();
    case "gemini-cli":
      return new GeminiSession();
    case "gpt-engineer":
      return new GptEngineerSession();
    case "codex-cli":
      return new CodexSession();
    case "blackbox-cli":
      return new BlackboxSession();
    case "opencode":
      return new OpencodeSession();
    case "crush-cli":
      return new CrushSession();
    default:
      throw new Error(`Unknown agent type: ${agentType}`);
  }
}

