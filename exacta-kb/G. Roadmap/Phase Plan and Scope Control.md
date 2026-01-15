# Phase Plan and Scope Control

This document defines the development phases, scope boundaries, and explicit exclusions for Exacta App Studio. Its purpose is to prevent scope creep and ensure focused delivery.

## 10-Phase Plan (Titles + Meanings)

1. **Phase 1 — Deterministic Core Loop (Backend)**: Build the smallest end-to-end backend pipeline that is deterministic and fail-closed: intent → plan → diff validation → atomic apply/rollback → syntax/build checks, with explicit error codes and no side effects on failure.
2. **Phase 2 — Stable IPC & Command Surface**: Define a versioned, testable IPC contract between UI and backend (commands, events, progress, cancellation, timeouts). Add compatibility rules and fixtures so changes do not break older clients.
3. **Phase 3 — Complete UI Shell with Capability Gating**: Ship a usable desktop shell (project open, activity views, logs, approvals) with capability gating: UI only enables actions when required prerequisites and safety gates pass, and blocks unsafe operations by design.
4. **Phase 4 — Large Codebase Memory & Index Scaling**: Scale to big repos: incremental scanning, caching, bounded memory, indexing pipelines, and fast retrieval. Add clear limits and degradation modes so performance stays predictable.
5. **Phase 5 — Plan Intelligence & Validation Hardening**: Improve plan quality and safety: richer plan structure, preflight checks, dependency awareness (where allowed), stronger diff constraints, and stricter validation so malformed or risky outputs are rejected early.
6. **Phase 6 — Preview & Execution Sandboxing**: Add isolated preview and execution: dry-runs, sandboxed builds/runs, controlled filesystem/network access, and clear separation between proposed and applied changes.
7. **Phase 7 — AI Provider Expansion & Capability Matrix**: Add multiple providers behind a single interface plus a capability matrix (model limits, tool support, cost, latency). Ensure behavior remains consistent and fail-closed across providers.
8. **Phase 8 — UX Failure Recovery & Explainability**: Make failures understandable and recoverable: guided remediation, actionable messages, structured traces, why-blocked explanations for gates, and smooth retry/rollback flows.
9. **Phase 9 — Packaging, Signing & Distribution**: Production-ready release pipeline: installers, signing, updates, artifact verification, prereq enforcement, and reproducible builds. Ensure installation and uninstallation is clean and reliable.
10. **Phase 10 — Hardening, Audit & Release Readiness**: Security and quality closure: threat model, audits, fuzzing, invariant checks, regression suites, performance baselines, documentation, and final go/no-go criteria for a stable release.

---

## Phase 1 — Deterministic Core Loop (Backend)

### Objective
Deliver the smallest complete backend system that can safely and deterministically execute the intent-to-build pipeline for a single-language, single-file editing scenario.

### Phase 1 Scope

**Included:**
- Project model and configuration schema
- File tree scanner and hash tracker
- Minimal symbol indexer (C# only, single-file scope)
- Single AI provider support (OpenAI-compatible)
- Intent extraction (4 intent types only)
- Linear plan generation (no dependency graphs)
- Unified diff generation and validation
- Atomic file writes with rollback
- Syntax validation (Roslyn parse check)
- Build execution (dotnet CLI)
- Orchestrator state machine (all states)
- Basic error handling and recovery
- CLI harness for testing

---

## Explicit Stubs and Simplifications

The following are intentionally simplified in Phase 1:

| Feature | Full Implementation | Phase 1 Stub |
| --- | --- | --- |
| Cross-file editing | Multi-file atomic transactions | Single-file only |
| Dependency graph | Full DAG with subgraphs | Linear step list |
| Symbol indexer | AST-level with cross-references | Type/method names only |
| Context resolution | Section-level slicing | Full file only |
| Multi-call chunking | Deterministic stitching | Single context window |
| File watcher | Real-time inotify | Poll on operation |
| Rollback persistence | Disk-persisted | In-memory only |
| Multiple providers | Provider abstraction | OpenAI-compatible only |
| Composite intents | Multi-intent splitting | Reject composites |
| Error classification | Code vs environment | Treat all as code error |

---

## Phase 1 Exit Criteria

Phase 1 is complete when the following scenario works reliably:

### Happy Path
1. User opens a C#/WPF project
2. User types: "Add a button that shows a message box when clicked"
3. System extracts intent: `AddFeature`
4. System generates plan with 1-2 steps
5. User approves plan
6. System generates unified diff
7. Diff passes validation
8. Diff is applied atomically
9. Syntax validation passes
10. Build succeeds
11. User can run the app and see the button work

### Failure Path
1. Any step above can fail
2. Failure is detected and surfaced clearly
3. Rollback restores previous state
4. User can retry or cancel
5. No data corruption occurs

### Quantitative Criteria
- Intent extraction accuracy: >80% on test set
- Plan generation success: >70% on test set
- Diff application success: >90% when plan succeeds
- Build success after apply: >95% when diff applies
- Rollback success: 100%

---

## Phases 2–10 (Aligned to the 10-Phase Plan)

The following items are explicitly planned for later phases (not Phase 1):

### Phase 2 — Stable IPC & Command Surface
- Versioned IPC contract (commands, events, progress)
- Cancellation, timeouts, and robust error surfaces
- Compatibility rules and contract test fixtures

### Phase 3 — Complete UI Shell with Capability Gating
- Full desktop UI shell (project open, activity views, logs, approvals)
- Capability gating (UI enables actions only when required gates/prereqs pass)
- Safe-by-default flows that block unsafe operations

### Phase 4 — Large Codebase Memory & Index Scaling
- Incremental scanning and caching
- Index scaling for large repos
- Bounded memory and predictable performance modes

### Phase 5 — Plan Intelligence & Validation Hardening
- Stronger plan structure and preflight validation
- Hardening of diff constraints and validators
- Better separation of code errors vs environment errors

### Phase 6 — Preview & Execution Sandboxing
- Graphical diff preview and approval UX
- Isolated preview/dry-run and sandboxed execution
- Persistent rollback stack

### Phase 7 — AI Provider Expansion & Capability Matrix
- Additional AI providers
- Provider abstraction + capability matrix
- Safer chunking strategies where required

### Phase 8 — UX Failure Recovery & Explainability
- Explainable "why blocked" messages for gates
- Guided recovery, retry, and diagnostics UX
- Debug bundle generation

### Phase 9 — Packaging, Signing & Distribution
- Installer and update pipeline
- Signing, artifact verification, and distribution hardening
- User preference storage and settings management

### Phase 10 — Hardening, Audit & Release Readiness
- Performance optimization and build caching
- Security hardening, audits, and regression suites
- Release readiness criteria and documentation

---

## Hard Exclusions for V1

The following will **not** be implemented in any V1 phase:

### Platform Exclusions
- macOS support
- Linux support
- Web application generation
- Mobile application generation
- Cross-platform frameworks (Electron, MAUI for non-Windows)

### Architecture Exclusions
- Cloud deployment
- Remote storage
- Multi-user collaboration
- Real-time sync
- Background AI tasks
- AI memory or learning

### Feature Exclusions
- Plugin/extension system
- Custom intent types
- Visual UI builder
- Database schema generation
- API client generation
- Test generation
- Documentation generation

### Integration Exclusions
- Source control integration (Git)
- CI/CD integration
- Issue tracker integration
- Cloud IDE integration

---

## Scope Control Process

### Adding Features
Before adding any feature:
1. Check if it's in Hard Exclusions (if yes: reject)
2. Check if it's in Deferred Features (if yes: defer)
3. Check if it's in Phase 1 Scope (if no: defer)
4. Verify it doesn't violate Core Principles
5. Estimate implementation cost
6. Evaluate impact on existing features
7. Document decision

### Rejecting Features
Feature requests are rejected if:
- They violate Core Principles (no exceptions)
- They are in Hard Exclusions (no exceptions for V1)
- They would delay Phase 1 exit criteria
- They add complexity without clear user value

### Scope Creep Indicators
Warning signs that scope is creeping:
- "While we're at it..." reasoning
- Features that require other deferred features
- Edge cases becoming primary cases
- "Nice to have" becoming "must have"
- Timeline extending without clear cause

---

## Decision Log

All scope decisions should be logged here:

| Date | Feature | Decision | Rationale |
| --- | --- | --- |
| (Initial) | Multi-language support | Deferred to Phase 3 | Complexity too high for V1 |
| (Initial) | Git integration | Hard excluded from V1 | Out of core scope |
| (Initial) | Plugin system | Hard excluded from V1 | Requires stable core first |

---

## Phase Transition Criteria

### Phase 1 → Phase 2
- All Phase 1 exit criteria met
- Core loop stable for 2 weeks
- No critical bugs in backlog
- Documentation complete for Phase 1 features

### Phase 2 → Phase 3
- All Phase 2 features complete
- User feedback incorporated
- Performance baseline established
- No regressions in Phase 1 functionality

---

## Hard Invariants
This component enforces the following Global System Invariants:
- **INV-GLOBAL-1: Local-Only Execution**
- **INV-GLOBAL-2: Deterministic Orchestration**
- **INV-GLOBAL-3: Fail-Closed Behavior**
- **INV-GLOBAL-4: AI Treated as Untrusted Input**
- **INV-GLOBAL-5: User-Owned API Keys**
- **INV-GLOBAL-6: No Telemetry