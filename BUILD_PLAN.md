# Exacta App Studio: Detailed Development Plan

This plan is structured to build the application from the ground up, starting with the core security and architectural foundations before moving to features and the user interface.

## **Phase 0: Technology Stack & Standards (Rigid Requirements)**

**Objective:** Eliminate implementation ambiguity by locking down core technologies and patterns.

- **0.1 UI/UX Standard:**
  - **Framework:** React 18+ (bundled in Electron).
  - **Styling:** TailwindCSS v3.4+ (for utility classes).
  - **Components:** Radix UI or Shadcn-compatible equivalents (no "building from scratch").
  - **Icons:** Lucide-React.
  - **Theme:** Dark Mode by default (System-Security aesthetic: Slate/Zinc capabilities).
- **0.2 Data Persistence:**
  - **Structured Data:** SQLite 3 via Entity Framework Core (Single `exacta.db` in `%AppData%`).
  - **Vector Data:** SQLite-VSS extension (1536 dim) for embeddings.
  - **Schema Migration:** EF Core Migrations (strict versioning).
- **0.3 Testing Standards:**
  - **Unit Testing:** xUnit for C# Core (.NET 8).
  - **Integration Testing:** Playwright for Electron UI.
  - **Mocking:** Moq for service isolation.
- **0.4 Versioning:**
  - **Standard:** Strict Semantic Versioning (Major.Minor.Patch).
    - **Release Channel:** "Canary" (Dev), "Stable" (Prod).

* **0.5 Project Structure (Canonical Paths):**
  - **Root:** `d:\Exacta-App-Studio`
  - **Source:** `src\`
    - `src\Guardian.Service\` (Windows Service, .NET 8)
    - `src\Exacta.Core\` (Main Runtime, .NET 8)
    - `src\Exacta.Indexer\` (Knowledge Graph, .NET 8)
    - `src\Exacta.UI\` (Electron + React + Vite)
  - **Artifacts:** `dist\` (Build outputs)

## **Phase 1: The Foundation - Guardian Service & Core Runtime**

**Objective:** Establish the secure, high-integrity backbone.

- **Task 1: Guardian Process Implementation (Windows Service)**
  - **Sub-task 1.1:** Create project `src\Guardian.Service\Guardian.Service.csproj`.
  - **Sub-task 1.2:** Implement `src\Guardian.Service\Program.cs` and `ServiceWorker.cs` for the main loop.
  - **Sub-task 1.3: Implement Root of Trust**
    - Create `src\Guardian.Service\Security\AttestationService.cs`.
    - Create `src\Guardian.Service\Security\DpapiStorage.cs` (Machine Scope).
  - **Sub-task 1.4: Implement Secure IPC (Internal API)**
    - Create `src\Guardian.Service\Ipc\NamedPipeServer.cs` (`\\.\pipe\ExactaSecurePipe`).
    - **Protocol:** Implement `src\Shared\Ipc\JsonRpcMessages.cs` (JSON-RPC 2.0).
  - **Sub-task 1.5: Implement Sandbox Execution Engine**
    - Create `src\Guardian.Service\Sandbox\JobObjectManager.cs` (P/Invoke `CreateJobObject`).
    - Create `src\Guardian.Service\Network\WfpManager.cs` (User-Mode API wrapper).

- **Task 2: Core Runtime Implementation (Main Application)**
  - **Sub-task 2.1:** Create project `src\Exacta.Core\Exacta.Core.csproj`.
  - **Sub-task 2.2:** Create `src\Exacta.Core\Ipc\NamedPipeClient.cs` for secure Guardian connection.
  - **Sub-task 2.3:** Implement `src\Exacta.Core\Execution\MainLoop.cs` (`Perceive -> Decide -> Act`).
  - **Sub-task 2.4:** Implement `src\Exacta.Core\State\RuntimeState.cs` (Boot -> Attest -> Ready).

## **Phase 2: Policy & Capability Enforcement**

**Objective:** Implement the core logic that allows the Guardian to make security decisions and grant permissions.

- **Task 3: Policy Engine Implementation (in Guardian)**
  - **Sub-task 3.1:** Create `src\Guardian.Service\Policy\Models\PolicyProfile.cs` and `RiskRule.cs`.
  - **Sub-task 3.2:** Implement `src\Guardian.Service\Policy\PolicyEngine.cs` (Predicate Evaluator).
  - **Sub-task 3.3:** Define defaults in `src\Guardian.Service\Policy\DefaultProfile.cs`.

- **Task 4: Capability Authority (in Guardian)**
  - **Sub-task 4.1:** Create `src\Guardian.Service\Capabilities\TokenFactory.cs`.
  - **Sub-task 4.2:** Implement issuance in `src\Guardian.Service\Capabilities\TokenIssuer.cs` (Signed).
  - **Sub-task 4.3:** Implement `src\Guardian.Service\Audit\ActionTag.cs`.
  - **Sub-task 4.4: Capability Token Details**
    - Implement HMAC signer in `src\Guardian.Service\Crypto\HmacSigner.cs`.
    - Implement `SequenceTracker.cs` for monotonic numbering.

## **Phase 3: Project Indexing & Context Handling**

**Objective:** Build the system's "senses" – its ability to understand the project's codebase.

- **Task 5: Project Indexer Implementation**
  - **Sub-task 5.1:** Create project `src\Exacta.Indexer\Exacta.Indexer.csproj`.
  - **Sub-task 5.2:** Implement Knowledge Graph in `src\Exacta.Indexer\Graph\NodeTypes.cs` (FileNode, SymbolNode).
  - **Sub-task 5.3:** Integrate Tree-sitter in `src\Exacta.Indexer\Parsing\CodeParser.cs`.
  - **Sub-task 5.4:** Implement Vector Store in `src\Exacta.Indexer\Vectors\SqliteVssStorage.cs`.
  - **Sub-task 5.5:** Implement watcher in `src\Exacta.Indexer\Ingestion\FileWatcherService.cs`.
  - **Sub-task 5.6:** Implement index signing in `src\Exacta.Indexer\Security\IndexSigner.cs`.
  - **Sub-task 5.7:** Configure embedding in `src\Exacta.Indexer\Vectors\Embedder.cs`.

* **Task 6: Context Assembly (in Core)**
  - **Sub-task 6.1:** Implement the `Smart Hybrid Search` protocol (**Section 7.3**) to query the Indexer.
  - **Sub-task 6.2:** Implement the `Progressive Context Mode` logic (**Section 7.2.1**) for iterative discovery.
  - **Sub-task 6.3:** Implement the `Memory Injection Firewall` (**Section 7.4**) to redact all sensitive/operational data before it's used to build a prompt.

## **Phase 4: AI Integration & Decision Making**

**Objective:** Integrate AI providers as an untrusted source of proposals and decisions.

- **Task 7: AI Routing & Management (in Guardian)**
  - **Sub-task 7.1:** Implement the `Provider Registry` (**Section 26.3**) as a Guardian-signed and managed data store.
  - **Sub-task 7.2:** Implement the `Live Model Discovery Protocol` (**Section 26.5**) to populate the registry.
  - **Sub-task 7.3:** Implement the `Utility-Based Routing Function` (**Section 26.6**) for deterministic provider selection.
  - **Sub-task 7.4:** Implement the `Credential Handling Protocol` (**Section 26.9**). The Guardian will inject credentials and terminate TLS, ensuring the Core process never handles raw keys.

- **Task 8: AI Agent Logic (in Core)**
  - **Sub-task 8.1:** Implement the `DECIDE` phase of the main loop. This involves constructing a detailed prompt based on the context from Phase 3.
  - **Sub-task 8.2:** Send the prompt to the Guardian's AI Router for execution.
  - **Sub-task 8.3:** Implement the internal cognitive pipeline (Planner, Specialist, Synthesizer) from **Section 6.1.1** to structure the AI's reasoning process.
  - **Sub-task 8.4:** Parse the AI's `Decision` output and prepare it for the `ACT` phase.

## **Phase 5: Action Execution & State Management**

**Objective:** Enable the system to act on AI proposals by modifying the file system and running tools within the sandbox.

- **Task 9: Action Execution Engine (in Core & Guardian)**
  - **Sub-task 9.1:** Implement `src\Exacta.Core\Actions\ActionDispatcher.cs` (Token Requester).
  - **Sub-task 9.2:** `FILE_WRITE`: Implement `src\Exacta.Core\Actions\filesystem\AtomicWriter.cs`.
  - **Sub-task 9.3:** `SHELL_EXEC`: Implement serializer in `src\Exacta.Core\Actions\shell\CommandSerializer.cs`.
  - **Sub-task 9.4:** Guardian Exec: Implement `src\Guardian.Service\Execution\JobExecutor.cs`.
  - **Sub-task 9.5: CLI Agent Support (CLI_AGENT_EXEC)**
    - Create `src\Guardian.Service\Agents\AgentRegistry.cs` (Hash verification).
    - Create `src\Guardian.Service\Agents\Helpers\CredentialLinker.cs`.
  - **Sub-task 9.6: Package Manager Support (PACKAGE_EXEC)**
    - Create `src\Guardian.Service\Execution\PackageManagerWrapper.cs` (NuGet/npm/pip).

- **Task 10: State & Recovery**
  - **Sub-task 10.1:** Implement `src\Exacta.Core\State\TransactionManager.cs`.
  - **Sub-task 10.2:** Implement `src\Exacta.Core\Resilience\SelfHealer.cs`.
  - **Sub-task 10.3:** Implement `src\Exacta.Core\State\CheckpointService.cs`.
  - **Sub-task 10.4:** Implement `src\Guardian.Service\Quotas\BudgetTracker.cs`.

## **Phase 6: User Interface & Export**

**Objective:** Create the user-facing surface.

- **Task 11: Operator UI (Electron Project)**
  - **Sub-task 11.1:** Initialize `src\Exacta.UI\` using Vite + React + Tailwind.
  - **Sub-task 11.2:** Implement IPC Bridge in `src\Exacta.UI\electron\preload.ts`.
  - **Sub-task 11.3:** Build Chat in `src\Exacta.UI\src\components\Chat\MessageList.tsx`.
  - **Sub-task 11.4:** Build Editor in `src\Exacta.UI\src\components\Editor\MonacoWrapper.tsx`.
  - **Sub-task 11.5:** Build Settings in `src\Exacta.UI\src\components\Settings\AiProviders.tsx`.

* **Task 12: Build & Export Logic**
  - **Sub-task 12.1:** Implement the `build_release` capability.
  - **Sub-task 12.2:** Implement the `Export` feature (**Section 30**) to create clean `.exe`, `.msi`, and source `.zip` artifacts, ensuring all `.exacta` metadata is stripped.
  - **Sub-task 12.3:** Integrate the bundled toolchains (e.g., WiX Toolset for `.msi` creation).

## **Phase 7: Hardening & Finalization**

**Objective:** Validate the security model and ensure stability.

- **Task 13: Security Validation**
  - **Sub-task 13.1:** Implement the entire `Sandbox Escape Test Suite` from **Section 16.1**.
  - **Sub-task 13.2:** This test suite must be a mandatory part of the build pipeline. A failing test must block any release.
    - **Sub-task 13.3: Complete Test Suite Implementation**
      - **Unit Tests:** Implement xUnit tests for Policy Engine and IPC logic.
      - **Integration:** Implement Playwright smoke tests for UI startup.
      - **Security:** Implement Sandbox tests: **SBX-001** to **SBX-007**.
      - Implement Ollama tests: **OLLAMA-001** and **OLLAMA-002**.
      - Implement AI Provider tests: **AI-001** to **AI-005**.
      - Implement CLI Agent tests: **CLI-001** to **CLI-007**.

- **Task 14: Stability & Heuristics**
  - **Sub-task 14.1:** Implement the internal resource governor and circuit breakers (**Section 21**).
  - **Sub-task 14.2:** Implement the `System Heuristics Engine` (**Section 21.1**) to track and optimize recovery strategies.

- **Task 15: Final Packaging**
  - **Sub-task 15.1:** Create the final MSI installer which correctly installs the `Guardian.Service` with the required privileges and sets up the Core application.
