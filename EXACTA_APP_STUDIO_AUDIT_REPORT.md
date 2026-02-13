# Exacta-App-Studio Codebase Audit Report

## Executive Summary

This audit reveals that Exacta-App-Studio (Dyad) is a sophisticated Electron-based AI app builder with a robust architecture for building web applications, but the Windows-native app building capabilities described in the plan are largely conceptual rather than implemented. The current system excels at React/Next.js web app generation but lacks the Windows runtime providers and execution kernel infrastructure outlined in the Windows-only app builder plan.

## Core AI Integration Points

### 1. AI Architecture & Communication Flow

**Current Implementation:**

- Uses Electron IPC boundary with secure main/renderer process separation
- Implements XML-based pseudo-tool calling system instead of native function calling
- Employs streaming responses with real-time UI updates through custom `<dyad-*>` tags
- Features sophisticated response processing pipeline that converts AI output to actual code changes

**Key Components:**

- `src/ipc/handlers/chat_stream_handlers.ts` - Core chat streaming logic
- `src/pro/main/ipc/handlers/local_agent/local_agent_handler.ts` - Main agent orchestration
- `src/components/chat/DyadMarkdownParser.tsx` - Custom XML tag parsing for UI display
- `src/ipc/processors/response_processor.ts` - Converts AI XML output to file operations

### 2. Agent Tool System

**Implemented Tools (24 total):**

- **File Operations**: `write_file`, `edit_file`, `search_replace`, `delete_file`, `rename_file`
- **Dependency Management**: `add_dependency`, `execute_sql`
- **Code Analysis**: `read_file`, `list_files`, `grep`, `code_search`
- **Research Tools**: `web_search`, `web_crawl`, `engine_fetch`
- **Planning Tools**: `planning_questionnaire`, `write_plan`, `exit_plan`
- **Utility Tools**: `set_chat_summary`, `update_todos`, `run_type_checks`

**Security Features:**

- Tool consent system with "always"/"ask"/"never" permissions
- Path safety validation in `src/pro/main/ipc/handlers/local_agent/tools/path_safety.ts`
- File operation tracking for telemetry and retry analysis

### 3. Template System & Scaffolding

**Current Templates:**

1. **React Template** (local) - Uses embedded `scaffold/` directory
2. **Next.js Template** (GitHub) - Clones from `dyad-sh/nextjs-template`
3. **Portal Mini Store** (GitHub) - Neon DB/Payload CMS template

**Scaffolding Mechanism:**

- Local templates copied from `src/scaffold/` directory
- Remote templates git-cloned with caching and update checking
- Template metadata managed in `src/shared/templates.ts`
- Repository cache management with SHA comparison for updates

**Scaffold Structure:**
The local React scaffold is a complete Vite + React + TypeScript + ShadCN/UI template with:

- 62 dependencies including Radix UI components
- TailwindCSS styling
- React Router for navigation
- TanStack Query for data fetching
- Comprehensive component library pre-installed

## Current App Building Workflows

### 1. Application Lifecycle

**Creation Flow:**

1. User selects template in UI (`CreateAppDialog.tsx`)
2. `createFromTemplate.ts` handles scaffolding (local copy or git clone)
3. Git repository initialized with initial commit
4. Database entry created with app metadata
5. Initial chat created for the application

**Runtime Management:**

- Supports both host and Docker execution modes
- Automatic port assignment and conflict resolution
- Process lifecycle management with proper cleanup
- Real-time log streaming to UI console

### 2. Code Generation Pipeline

**XML-Based Approach:**
The system uses custom XML tags that simulate tool calling:

```xml
<dyad-write path="src/components/Button.tsx">
// Component code here
</dyad-write>

<dyad-search-replace path="src/App.tsx">
// Search/replace operations
</dyad-search-replace>
```

**Processing Pipeline:**

1. AI generates XML-like responses during streaming
2. Custom parser renders these as interactive UI components
3. Post-processing applies actual file changes
4. Automatic deployment of Supabase functions when applicable
5. Git commits for version control

## Template Repositories & Project Generation

### Current State

**Template Sources:**

- **Embedded**: React template bundled with application
- **External**: GitHub repositories with caching mechanism
- **API-Fetched**: Planned dynamic template loading (partially implemented)

**Template Management:**

- Local cache in `userData/templates/{org}/{repo}`
- Smart update checking using GitHub API SHA comparison
- Graceful fallback when templates unavailable
- Support for official vs community templates

### Missing Features

The ambitious Windows app builder plan includes:

- .NET WPF/WinUI 3/WinForms runtime providers
- Tauri/Rust desktop application support
- Native Windows packaging (MSI, MSIX)
- Cross-runtime capability system

However, these are **planned but not implemented** in the current codebase.

## AI Agent Architecture

### Current Implementation

**Agent Modes:**

1. **Pro Mode**: Full tool access including web research
2. **Basic Mode**: Limited tools (no web search/crawl)
3. **Ask Mode**: Read-only analysis capabilities
4. **Plan Mode**: Structured planning with questionnaire

**Key Architecture Features:**

- Parallel tool execution support
- Context compaction for long conversations
- Todo tracking and progress management
- Multi-turn conversation memory
- Automatic type checking and error fixing

### Security Infrastructure

**Guardian Service (Windows Only):**

- .NET 8 Windows service providing native security
- Process isolation using Windows Job Objects
- JWT-based capability tokens for fine-grained access control
- Windows Filtering Platform (WFP) integration for network control
- Named pipe communication with Electron main process

**Security Layers:**

1. Electron IPC boundary (renderer ↔ main)
2. Guardian Service sandboxing (Windows processes)
3. Path validation and file operation restrictions
4. Tool consent system for user approval
5. Capability-based access tokens

## Current Stack Support

### Fully Implemented

✅ **Web Technologies:**

- React.js with TypeScript
- Next.js applications
- Vite build system
- TailwindCSS + ShadCN/UI components
- Node.js/npm/pnpm package management

✅ **Backend Services:**

- Supabase integration (functions, database)
- Neon PostgreSQL support
- GitHub integration and deployment
- Vercel hosting platform

### Planned But Not Implemented

❌ **Windows Native:**

- WPF applications
- WinUI 3 desktop apps
- .NET MAUI cross-platform
- WinForms traditional desktop

❌ **Desktop Frameworks:**

- Tauri (Rust + WebView2)
- Electron alternative runtimes
- Native Windows packaging

❌ **Mobile:**

- React Native support
- iOS/Android cross-platform

## Template System Analysis

### Strengths

- Robust caching mechanism prevents repeated downloads
- Flexible template sources (embedded + remote + API)
- Git-based versioning and history tracking
- Automatic dependency resolution

### Limitations

- Only web-focused templates currently available
- No mobile or desktop native templates
- Template discovery limited to predefined list
- No user template submission mechanism

## AI Prompting & Response Processing

### System Prompts

Located in `src/prompts/` directory:

- `local_agent_prompt.ts` - Main agent instructions
- `system_prompt.ts` - Core behavioral guidelines
- Specialized prompts for different modes (plan, security review, etc.)

### Key Prompt Features

- Detailed tech stack instructions
- XML tag usage guidelines
- Tool calling conventions
- Error handling protocols
- Security awareness training

### Response Processing

- Custom XML parser for `<dyad-*>` tags
- Streaming display during generation
- Post-generation file operations
- Automatic testing and validation
- Git integration for version control

## File Manipulation Capabilities

### Current Tools

1. **write_file** - Create new files or overwrite existing ones
2. **search_replace** - Precise text replacement with context requirements
3. **edit_file** - Advanced editing with marker-based modifications
4. **delete_file** - Safe file removal with validation
5. **rename_file** - File movement with path safety checks

### Advanced Features

- Multi-file operation coordination
- Conflict detection and resolution
- Automatic backup creation
- Git integration for all changes
- Supabase function deployment automation

## Security Architecture Assessment

### Strong Points

✅ **Multi-layered security model**
✅ **Process isolation on Windows**
✅ **Capability-based access control**
✅ **Path traversal prevention**
✅ **Tool consent system**

### Areas for Enhancement

⚠️ **Cross-platform consistency** (Guardian service Windows-only)
⚠️ **Template source verification** (external GitHub repos)
⚠️ **AI output validation** (malicious code generation prevention)
⚠️ **Network access controls** (beyond Guardian service)

## Recommendations

### Immediate Priorities

1. **Implement Execution Kernel** - Centralize command execution as planned
2. **Add .NET Runtime Provider** - Enable Windows native app building
3. **Enhance template discovery** - Dynamic template marketplace
4. **Improve error handling** - Better recovery from AI mistakes

### Long-term Vision

1. **Cross-platform runtime abstraction** - Unified interface for all targets
2. **Advanced context management** - Intelligent file selection
3. **Collaborative features** - Multi-user AI pair programming
4. **Enterprise security** - Advanced permission and audit systems

## Conclusion

Exacta-App-Studio represents a mature and sophisticated AI-powered web application builder with strong architectural foundations. The current implementation excels at React/Next.js development with robust security measures and intelligent tooling.

However, the Windows-native app building capabilities described in the planning documents remain largely conceptual. The existing Guardian service provides excellent security infrastructure, but the runtime abstraction layer and Windows-specific providers needed for true cross-platform app building are planned but not yet implemented.

The project demonstrates excellent software engineering practices with clear separation of concerns, comprehensive testing, and thoughtful security design - making it well-positioned for expansion into the broader app building domain outlined in its roadmap.
