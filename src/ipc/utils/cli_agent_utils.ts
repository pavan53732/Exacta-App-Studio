import type {
  CliAgentType,
  CliAgentDefaults,
  CliAgentConfig,
} from "@/ipc/types/cli_agents";

/**
 * Get default configuration for a CLI agent
 */
export function getCliAgentDefaults(agentType: CliAgentType): CliAgentDefaults {
  switch (agentType) {
    case "aider":
      return {
        command: "aider",
        args: ["--model", "gpt-4o"],
      };

    case "gpt-engineer":
      return {
        command: "gpt-engineer",
        args: [],
      };

    case "goose-cli":
      return {
        command: "goose",
        args: ["session"],
      };

    case "opencode":
      return {
        command: "opencode",
        args: [],
      };

    case "blackbox-cli":
      return {
        command: "blackbox",
        args: [],
      };

    case "crush-cli":
      return {
        command: "crush",
        args: [],
      };

    case "codex-cli":
      return {
        command: "codex",
        args: [],
      };

    case "gemini-cli":
      return {
        command: "gemini",
        args: [],
      };

    default:
      throw new Error(`Unknown CLI agent type: ${agentType}`);
  }
}

/**
 * Validate CLI agent configuration
 */
export function validateCliAgentConfig(
  agentType: CliAgentType,
  config: Partial<CliAgentConfig>,
): { valid: boolean; error?: string } {
  // Check if API key is required but not provided
  if (requiresApiKey(agentType) && !config.apiKey) {
    return {
      valid: false,
      error: `API key is required for ${agentType}`,
    };
  }

  // Validate API key format if provided
  if (config.apiKey) {
    const keyValidation = validateApiKey(agentType, config.apiKey);
    if (!keyValidation.valid) {
      return keyValidation;
    }
  }

  return { valid: true };
}

/**
 * Check if a CLI agent requires an API key
 */
function requiresApiKey(_agentType: CliAgentType): boolean {
  // Most CLI agents require an API key
  return true;
}

/**
 * Validate API key format for different agents
 */
function validateApiKey(
  agentType: CliAgentType,
  apiKey: string,
): { valid: boolean; error?: string } {
  if (!apiKey || apiKey.trim().length === 0) {
    return { valid: false, error: "API key cannot be empty" };
  }

  // Basic format validation for specific providers
  switch (agentType) {
    case "codex-cli":
    case "aider":
    case "gpt-engineer":
      // OpenAI keys typically start with "sk-"
      if (!apiKey.startsWith("sk-")) {
        return {
          valid: false,
          error: "OpenAI API key should start with 'sk-'",
        };
      }
      break;

    case "gemini-cli":
      // Google API keys are typically 39 characters
      if (apiKey.length < 20) {
        return {
          valid: false,
          error: "Google API key seems too short",
        };
      }
      break;

    default:
      // Generic validation - just check it's not empty
      break;
  }

  return { valid: true };
}

/**
 * Get the environment variable name for a CLI agent's API key
 */
export function getCliAgentEnvVar(agentType: CliAgentType): string | null {
  switch (agentType) {
    case "aider":
      return "OPENAI_API_KEY";
    case "gpt-engineer":
      return "OPENAI_API_KEY";
    case "goose-cli":
      return "GOOSE_API_KEY";
    case "opencode":
      return "OPENCODE_API_KEY";
    case "blackbox-cli":
      return "BLACKBOX_API_KEY";
    case "crush-cli":
      return "CRUSH_API_KEY";
    case "codex-cli":
      return "OPENAI_API_KEY";
    case "gemini-cli":
      return "GOOGLE_API_KEY";
    default:
      return null;
  }
}

/**
 * Get installation instructions for a CLI agent
 */
export function getInstallInstructions(agentType: CliAgentType): string {
  switch (agentType) {
    case "aider":
      return `pip install aider-chat

# Or with pipx (recommended)
pipx install aider-chat`;

    case "gpt-engineer":
      return `pip install gpt-engineer

# Or with pipx (recommended)
pipx install gpt-engineer`;

    case "goose-cli":
      return `# macOS/Linux
curl -fsSL https://github.com/block/goose/releases/latest/download/install.sh | bash

# Or with Homebrew (macOS)
brew install goose`;

    case "opencode":
      return `npm install -g opencode

# Or with Yarn
yarn global add opencode`;

    case "blackbox-cli":
      return `npm install -g @blackboxai/cli

# Or with Yarn
yarn global add @blackboxai/cli`;

    case "crush-cli":
      return `npm install -g crush-cli

# Or with Yarn
yarn global add crush-cli`;

    case "codex-cli":
      return `npm install -g @openai/codex

# Or with Yarn
yarn global add @openai/codex`;

    case "gemini-cli":
      return `npm install -g @google/gemini-cli

# Or with Yarn
yarn global add @google/gemini-cli`;

    default:
      return "Installation command not available";
  }
}

/**
 * Check if CLI agent is installed
 * This is a best-effort check that looks for the command in PATH
 */
export async function isCliAgentInstalled(
  agentType: CliAgentType,
): Promise<boolean> {
  const defaults = getCliAgentDefaults(agentType);
  const command = defaults.command;

  try {
    // Use 'which' on Unix or 'where' on Windows
    const { exec } = await import("node:child_process");
    const util = await import("node:util");
    const execAsync = util.promisify(exec);

    const checkCmd =
      process.platform === "win32" ? `where ${command}` : `which ${command}`;

    await execAsync(checkCmd);
    return true;
  } catch {
    return false;
  }
}
