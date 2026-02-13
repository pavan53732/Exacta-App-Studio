/**
 * Shared types for Local Agent tools that can be safely imported by renderer code.
 * This file MUST NOT import any tool implementations or Node.js modules.
 */

// List of all agent tool names
export const AGENT_TOOL_NAMES = [
  "write_file",
  "edit_file",
  "search_replace",
  "delete_file",
  "rename_file",
  "add_dependency",
  "execute_sql",
  "read_file",
  "list_files",
  "grep",
  "code_search",
  "get_supabase_project_info",
  "get_supabase_table_schema",
  "set_chat_summary",
  "add_integration",
  "read_logs",
  "web_search",
  "web_crawl",
  "update_todos",
  "run_type_checks",
  "run_dotnet_command",
  "run_cargo_command",
  "planning_questionnaire",
  "write_plan",
  "exit_plan",
] as const;

export type AgentToolName = (typeof AGENT_TOOL_NAMES)[number];
