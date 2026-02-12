# AI Agent System Audit Report

## Executive Summary

This audit examines the AI agent system and tool definitions in the Exacta App Studio codebase. The system implements a sophisticated tool-based agent architecture with strong security controls, context management, and Windows-specific capabilities.

## System Architecture Overview

### Core Components

1. **Local Agent Handler** (`src/pro/main/ipc/handlers/local_agent/local_agent_handler.ts`)
   - Main orchestrator for tool-based agent interactions
   - Implements parallel tool execution with streaming support
   - Manages agent context, consent flows, and state persistence
   - Handles context compaction for long conversations

2. **Tool Definitions** (`src/pro/main/ipc/handlers/local_agent/tool_definitions.ts`)
   - Central registry of all available agent tools
   - Defines tool schemas, consent requirements, and execution logic
   - Implements tool filtering based on mode (read-only, plan mode, etc.)

3. **Agent Context Management** (`src/pro/main/ipc/handlers/local_agent/tools/types.ts`)
   - Maintains agent state including file edit tracking, todos, and chat summaries
   - Provides XML streaming interfaces for real-time UI updates
   - Handles consent management and security controls

## Tool System Analysis

### Available Tools (30+ tools identified)

#### File System Operations
- `read_file` - Read file contents with line range support
- `write_file` - Create or overwrite files
- `edit_file` - Edit existing files with surgical precision
- `search_replace` - Find and replace content in files
- `delete_file` - Remove files safely
- `rename_file` - Rename files with safety checks
- `list_files` - List directory contents with filtering

#### Code Analysis & Search
- `grep` - Search for text patterns across codebase
- `code_search` - Semantic code search capabilities
- `run_type_checks` - Execute TypeScript compilation checks

#### Dependency & Integration Management
- `add_dependency` - Add npm package dependencies
- `add_integration` - Add third-party service integrations
- `execute_sql` - Execute SQL commands on databases

#### Web & External Tools
- `web_search` - Search the web for information
- `web_crawl` - Crawl web pages and extract content
- `engine_fetch` - Fetch content from external APIs

#### Development Workflow
- `update_todos` - Manage task tracking and progress
- `set_chat_summary` - Set conversation summaries
- `read_logs` - Read application logs
- `planning_questionnaire` - Interactive planning tools

#### Planning Mode Tools
- `write_plan` - Generate development plans
- `exit_plan` - Exit planning mode
- `planning_questionnaire` - Structured planning workflows

### Security & Consent Mechanisms

#### Tool Consent System
- Granular consent controls per tool
- Three consent levels: `always`, `ask`, `never`
- Runtime consent prompts with user approval flows
- Persistent consent storage in user settings

#### Path Safety Controls
- `safeJoin` utility prevents directory traversal attacks
- Cross-platform path normalization
- Validation against absolute paths and UNC paths
- Base directory containment enforcement

#### Guardian Security Service
- Windows-specific process isolation via Job Objects
- Capability-based access control tokens
- Windows Filtering Platform (WFP) firewall integration
- Named pipe IPC communication with external guardian service

## Agent Modes & Capabilities

### Operating Modes

1. **Full Access Mode** (Pro users)
   - All tools available except planning-specific ones
   - Full file system and codebase modification rights
   - Real-time deployment and commit capabilities

2. **Basic Agent Mode** (Free tier)
   - Limited tool set (no `edit_file`, `code_search`, web tools)
   - Reduced functionality for cost management
   - Same core file operations with fewer advanced features

3. **Ask Mode** (Read-only)
   - Read-only file system access
   - No state-modifying operations allowed
   - Focused on code analysis and explanation

4. **Plan Mode**
   - Planning and questionnaire tools only
   - Read-only exploration capabilities
   - Structured development planning workflows

### Context Management

#### Conversation Compaction
- Automatic context window management
- LLM-powered conversation summarization
- Backup storage of original messages
- Threshold-based triggering (80% of context window)

#### Memory Management
- Per-file edit tracking for telemetry
- Todo list persistence during conversations
- Chat summary generation and storage
- Git integration for automatic commits

## Windows-Specific Capabilities

### Native Windows Integration
- **Guardian Service**: External Windows service for enhanced security
- **WFP Firewall Rules**: Network traffic control and monitoring
- **Job Objects**: Process isolation and resource limiting
- **Named Pipes**: Secure IPC communication mechanism

### Security Features
- Process sandboxing through Windows Job Objects
- Network access control via WFP rules
- Capability-based token authentication
- Encrypted credential storage using Windows DPAPI

## Prompt Engineering & System Design

### Multi-Modal Prompts
- Different system prompts for each agent mode
- Role-based instructions with clear constraints
- Tool calling best practices and workflow guidance
- Development methodology instructions

### XML-Based Communication
- Custom `<dyad-*>` XML tags for structured communication
- Real-time streaming of tool execution previews
- Rich output formatting with error handling
- Integration with UI components for live updates

### Reasoning Support
- Thinking block delimiters (`