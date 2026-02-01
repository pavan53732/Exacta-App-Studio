# Exacta App Studio: Detailed Development Plan

This plan is structured to build the application from the ground up, starting with the core security and architectural foundations before moving to features and the user interface.

## **Phase 1: The Foundation - Guardian Service & Core Runtime**

**Objective:** Establish the secure, high-integrity backbone of the application. This phase focuses on creating the two primary processes and the secure communication channel between them.

*   **Task 1: Guardian Process Implementation (Windows Service)**
    *   **Sub-task 1.1:** Create a new C# project for a Windows Service named `Guardian.Service`.
    *   **Sub-task 1.2:** Implement the Guardian's main service loop and state machine as defined in **Section 2.1**.
    *   **Sub-task 1.3: Implement Root of Trust & Integrity Attestation**
        *   On startup, implement the self-attestation logic described in **Section 11.2**, verifying the hash of its own executable and critical dependencies.
        *   Implement the hardware-anchored secret storage using Windows DPAPI (Machine Scope) to protect the `Guardian_Secret` as per **Section 11.2.1**.
    *   **Sub-task 1.4: Implement Secure IPC**
        *   Create an authenticated named pipe server.
        *   Implement the full IPC Handshake Protocol (**Section 13.1**) including challenge-response and replay protection.
    *   **Sub-task 1.5: Implement Sandbox Execution Engine**
        *   Create a module to manage Windows Job Objects (**Section 12.1**). This module must be able to create jobs, assign processes to them, and enforce limits (CPU, memory, breakaway).
        *   Implement the network filtering mechanism using the Windows Filtering Platform (WFP) as described in **Section 12.1**. Start with the User-Mode API (Tier 2) and create placeholders for a future WFP Callout Driver (Tier 1).

*   **Task 2: Core Runtime Implementation (Main Application)**
    *   **Sub-task 2.1:** Create a new .NET project for the main application logic named `Exacta.Core`.
    *   **Sub-task 2.2:** Implement the client side of the secure IPC to connect and handshake with the `Guardian.Service`.
    *   **Sub-task 2.3:** Stub out the main execution loop (**Section 6.1**): `Perceive -> Decide -> Act -> Observe -> Checkpoint`.
    *   **Sub-task 2.4:** Implement the Core's state machine (`BOOT`, `ATTEST`, `READY`, etc.) as per **Section 2.1**, which transitions based on successful connection and attestation with the Guardian.

## **Phase 2: Policy & Capability Enforcement**

**Objective:** Implement the core logic that allows the Guardian to make security decisions and grant permissions.

*   **Task 3: Policy Engine Implementation (in Guardian)**
    *   **Sub-task 3.1:** Implement the data structures from **Section 11.1.1** (`PolicyProfile`, `RiskRule`).
    *   **Sub-task 3.2:** Create the pure predicate-based policy evaluation engine as described in **Section 11.1**. It will take a snapshot of `(goal, action, state, policy)` and return a deterministic decision.
    *   **Sub-task 3.3:** Implement the default policy profile, including the system path protections from **Section 12.2**.

*   **Task 4: Capability Authority (in Guardian)**
    *   **Sub-task 4.1:** Implement the `Capability` enum and `Token` structure from **Appendix A**.
    *   **Sub-task 4.2:** Create the token issuance and validation logic. All tokens must be signed with the `Guardian_Secret`.
    *   **Sub-task 4.3:** Implement the `Action Identity Tags` (**Section 11.3.1**) for forensic attribution.

## **Phase 3: Project Indexing & Context Handling**

**Objective:** Build the system's "senses" – its ability to understand the project's codebase.

*   **Task 5: Project Indexer Implementation**
    *   **Sub-task 5.1:** Create a new project `Exacta.Indexer`.
    *   **Sub-task 5.2:** Implement the `Project Knowledge Graph` architecture (**Section 14.3**), including `FileNode`, `SymbolNode`, and `ConceptNode`.
    *   **Sub-task 5.3:** Integrate `Tree-sitter` to parse code and build the AST Index for structural information.
    *   **Sub-task 5.4:** Integrate a local vector database (e.g., USearch, SQLite-VSS) and an embedding model (`text-embedding-3-small` or equivalent) to build the Embedding Index (**Section 14.6**).
    *   **Sub-task 5.5:** Implement the index lifecycle (**Section 14.4**) using file watchers for incremental updates.
    *   **Sub-task 5.6:** Implement index signing and verification, where the Guardian attests to the index root (**Section 14.2**).

*   **Task 6: Context Assembly (in Core)**
    *   **Sub-task 6.1:** Implement the `Smart Hybrid Search` protocol (**Section 7.3**) to query the Indexer.
    *   **Sub-task 6.2:** Implement the `Progressive Context Mode` logic (**Section 7.2.1**) for iterative discovery.
    *   **Sub-task 6.3:** Implement the `Memory Injection Firewall` (**Section 7.4**) to redact all sensitive/operational data before it's used to build a prompt.

## **Phase 4: AI Integration & Decision Making**

**Objective:** Integrate AI providers as an untrusted source of proposals and decisions.

*   **Task 7: AI Routing & Management (in Guardian)**
    *   **Sub-task 7.1:** Implement the `Provider Registry` (**Section 26.3**) as a Guardian-signed and managed data store.
    *   **Sub-task 7.2:** Implement the `Live Model Discovery Protocol` (**Section 26.5**) to populate the registry.
    *   **Sub-task 7.3:** Implement the `Utility-Based Routing Function` (**Section 26.6**) for deterministic provider selection.
    *   **Sub-task 7.4:** Implement the `Credential Handling Protocol` (**Section 26.9**). The Guardian will inject credentials and terminate TLS, ensuring the Core process never handles raw keys.

*   **Task 8: AI Agent Logic (in Core)**
    *   **Sub-task 8.1:** Implement the `DECIDE` phase of the main loop. This involves constructing a detailed prompt based on the context from Phase 3.
    *   **Sub-task 8.2:** Send the prompt to the Guardian's AI Router for execution.
    *   **Sub-task 8.3:** Implement the internal cognitive pipeline (Planner, Specialist, Synthesizer) from **Section 6.1.1** to structure the AI's reasoning process.
    *   **Sub-task 8.4:** Parse the AI's `Decision` output and prepare it for the `ACT` phase.

## **Phase 5: Action Execution & State Management**

**Objective:** Enable the system to act on AI proposals by modifying the file system and running tools within the sandbox.

*   **Task 9: Action Execution Engine (in Core & Guardian)**
    *   **Sub-task 9.1:** In the `Core`, implement the `ACT` phase of the loop. For each `proposed_action`, request the appropriate capability token from the Guardian.
    *   **Sub-task 9.2:** For `FILE_WRITE` actions, implement an atomic write-via-temp-file-and-rename strategy.
    *   **Sub-task 9.3:** For `SHELL_EXEC`, `BUILD_EXEC`, etc., the `Core` will serialize the command and send it to the `Guardian`.
    *   **Sub-task 9.4:** The `Guardian` will receive the command, validate it against policy, and execute it within the Job Object sandbox created in Phase 1. It will stream stdout/stderr back to the Core.

*   **Task 10: State & Recovery**
    *   **Sub-task 10.1:** Implement the `Transactional State Commit Protocol` (**Section 9.3**) to ensure atomic updates across the filesystem, index, and budget state.
    *   **Sub-task 10.2:** Implement the silent self-healing and retry logic as defined in the failure taxonomy (**Section 6.3** and **Section 15**).
    *   **Sub-task 10.3:** Implement the Checkpoint and Snapshot system for crash recovery (**Section 24**).

## **Phase 6: User Interface & Export**

**Objective:** Create the user-facing surface of the application.

*   **Task 11: Operator UI (Electron Project)**
    *   **Sub-task 11.1:** Create a new Electron project for the UI.
    *   **Sub-task 11.2:** The UI will communicate *only* with the `Core` process via a standard IPC mechanism (e.g., websockets).
    *   **Sub-task 11.3:** Build the chat interface for goal input.
    *   **Sub-task 11.4:** Build the live preview pane.
    *   **Sub-task 11.5:** Build the Settings UI, especially the "AI Providers" panel (**Section 28.1**), which will be populated by data queried from the `Core`.

*   **Task 12: Build & Export Logic**
    *   **Sub-task 12.1:** Implement the `build_release` capability.
    *   **Sub-task 12.2:** Implement the `Export` feature (**Section 30**) to create clean `.exe`, `.msi`, and source `.zip` artifacts, ensuring all `.exacta` metadata is stripped.
    *   **Sub-task 12.3:** Integrate the bundled toolchains (e.g., WiX Toolset for `.msi` creation).

## **Phase 7: Hardening & Finalization**

**Objective:** Validate the security model and ensure stability.

*   **Task 13: Security Validation**
    *   **Sub-task 13.1:** Implement the entire `Sandbox Escape Test Suite` from **Section 16.1**.
    *   **Sub-task 13.2:** This test suite must be a mandatory part of the build pipeline. A failing test must block any release.

*   **Task 14: Stability & Heuristics**
    *   **Sub-task 14.1:** Implement the internal resource governor and circuit breakers (**Section 21**).
    *   **Sub-task 14.2:** Implement the `System Heuristics Engine` (**Section 21.1**) to track and optimize recovery strategies.

*   **Task 15: Final Packaging**
    *   **Sub-task 15.1:** Create the final MSI installer which correctly installs the `Guardian.Service` with the required privileges and sets up the Core application.
