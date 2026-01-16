# G1. Phase Plan and Scope Control

This document defines the development phases, scope boundaries, and explicit exclusions for Exacta App Studio. Its purpose is to prevent scope creep and ensure focused delivery.

## 10-Phase Plan (Titles + Meanings)

1. **Phase 1 — Autonomous Core Loop (Backend)**: Build the smallest end-to-end backend pipeline with autonomous execution: intent → plan → automatic diff validation → atomic apply/rollback → syntax/build checks, with explicit error codes, smart retries, and graceful degradation.
2. **Phase 2 — Stable IPC & Command Surface**: Define a versioned, testable IPC contract between UI and backend (commands, events, progress, cancellation, timeouts). Add compatibility rules and fixtures so changes do not break older clients.
3. **Phase 3 — Complete UI Shell with Notification & Monitoring**: Ship a usable desktop shell (project open, activity views, logs, notifications) with real-time monitoring: UI shows autonomous progress, displays notifications for important decisions, and provides interrupt capability for user oversight.
4. **Phase 4 — Large Codebase Memory & Index Scaling**: Scale to big repos: incremental scanning, caching, bounded memory, indexing pipelines, and fast retrieval. Add clear limits and degradation modes so performance stays predictable.
5. **Phase 5 — Plan Intelligence & Validation Hardening**: Improve plan quality and safety: richer plan structure, preflight checks, dependency awareness (where allowed), stronger diff constraints, and stricter validation so malformed or risky outputs trigger automatic retries.
6. **Phase 6 — Preview & Execution Sandboxing**: Add isolated preview and execution: dry-runs, sandboxed builds/runs, controlled filesystem/network access, and clear separation between proposed and applied changes.
7. **Phase 7 — AI Provider Expansion & Capability Matrix**: Add multiple providers behind a single interface plus a capability matrix (model limits, tool support, cost, latency). Ensure behavior remains consistent with graceful degradation across providers.
8. **Phase 8 — UX Explainability & Recovery Dashboard**: Make autonomous decisions transparent: show reasoning for actions taken, provide detailed traces, display retry attempts, and enable smooth rollback flows with clear explanations.
9. **Phase 9 — Packaging, Signing & Distribution**: Production-ready release pipeline: installers, signing, updates, artifact verification, prereq enforcement, and reproducible builds. Ensure installation and uninstallation is clean and reliable.
10. **Phase 10 — Hardening, Audit & Release Readiness**: Security and quality closure: threat model, audits, fuzzing, invariant checks, regression suites, performance baselines, documentation, and final go/no-go criteria for a stable release.

---

## Phase 1 — Autonomous Core Loop (Backend)

### Objective

Deliver the smallest complete backend system that can safely and autonomously execute the intent-to-build pipeline for a single-language, single-file editing scenario, with automatic retries and graceful degradation.

### Phase 1 Scope

**Phase 1 Scope Included:**

- Project model and configuration schema
- File tree scanner and hash tracker
- Minimal symbol indexer (C# only, single-file scope)
- Single AI provider support (OpenAI-compatible)
- Intent extraction (4 intent types only)
- Linear plan generation (no dependency graphs)
- Unified diff generation and validation
- **Approval Gate present with Guardian stub** *(Corrected in V2.2)* — Guardian stub enforces AUTO-ALLOW policy for all operations. All execution MUST still flow through Guardian IPC to preserve authority flow and future hardening path.
- **Smart retry logic** (3 attempts with context refresh)
- Atomic file writes with rollback
- Syntax validation (Roslyn parse check)
- Build execution (dotnet CLI)
- Orchestrator state machine (autonomous states)
- Graceful error handling and recovery
- CLI harness for testing

**Security Note:** Phase 1 Guardian stub satisfies INV-GLOBAL-2 (Policy-Based Approval Gate), C2 (Profile Authority), and C3 (Approval Gate Specification) architectural requirements while providing frictionless development experience. The stub returns AUTO-ALLOW but preserves IPC contract, audit logging, and authority flow patterns required for later hardening.

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
| Risk assessment | Multi-level risk classification | Simple retry policy only |

---

## Phase 1 Exit Criteria

Phase 1 is complete when the following scenario works reliably:

### Happy Path

1. User opens a C#/WPF project
2. User types: "Add a button that shows a message box when clicked"
3. System extracts intent: `AddFeature`
4. System generates plan with 1-2 steps
5. **System automatically executes plan** (no approval required)
6. System generates unified diff
7. Diff passes validation
8. Diff is applied atomically
9. Syntax validation passes
10. Build succeeds
11. User can run the app and see the button work

### Autonomous Retry Path

1. System generates diff with context mismatch
2. System detects mismatch during validation
3. **System automatically retries** with refreshed context
4. Retry succeeds and diff is applied
5. Build succeeds
6. User sees final result without manual intervention

### Failure Path

1. System attempts operation 3 times with different strategies
2. All retries fail
3. **System notifies user** with clear explanation
4. Rollback restores previous state
5. User can review error and manually intervene if needed
6. No data corruption occurs

### Quantitative Criteria

- Intent extraction accuracy: >80% on test set
- Plan generation success: >70% on test set
- Diff application success: >90% when plan succeeds (including retries)
- Build success after apply: >95% when diff applies
- Rollback success: 100%
- **Autonomous success rate: >85%** (operations that complete without user intervention)
- **Retry effectiveness: >60%** (failures that succeed after retry)

---

## Phases 2–10 (Aligned to the 10-Phase Plan)

The following items are explicitly planned for later phases (not Phase 1):

### Phase 2 — Stable IPC & Command Surface

- Versioned IPC contract (commands, events, progress)
- Cancellation, timeouts, and robust error surfaces
- Compatibility rules and contract test fixtures

### Phase 3 — Complete UI Shell with Notification & Monitoring

- Full desktop UI shell (project open, activity views, logs, notifications)
- Real-time monitoring of autonomous operations
- Notification system for important decisions
- User interrupt capability with 2-second response time

### Phase 4 — Large Codebase Memory & Index Scaling

- Incremental scanning and caching
- Index scaling for large repos
- Bounded memory and predictable performance modes

### Phase 5 — Plan Intelligence & Validation Hardening

- Stronger plan structure and preflight validation
- Hardening of diff constraints and validators
- Better separation of recoverable vs unrecoverable errors
- Enhanced retry strategies

### Phase 6 — Preview & Execution Sandboxing

- Graphical diff preview in activity log
- Isolated preview/dry-run and sandboxed execution
- Persistent rollback stack

### Phase 7 — AI Provider Expansion & Capability Matrix

- Additional AI providers
- Provider abstraction + capability matrix
- Graceful degradation across providers
- Provider-specific retry strategies

### Phase 8 — UX Explainability & Recovery Dashboard

- Transparent decision-making display
- "Why did the system do this?" explanations
- Retry attempt visualization
- Debug bundle generation
- Smooth rollback flows

### Phase 9 — Packaging, Signing & Distribution

- Installer and update pipeline
- Signing, artifact verification, and distribution hardening
- User preference storage and settings management
- Autonomy level configuration

### Phase 10 — Hardening, Audit & Release Readiness

- Performance optimization and build caching
- Security hardening, audits, and regression suites
- Release readiness criteria and documentation
- Autonomous behavior validation suite

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
| --- | --- | --- | --- |
| (Initial) | Multi-language support | Deferred to Phase 3 | Complexity too high for V1 |
| (Initial) | Git integration | Hard excluded from V1 | Out of core scope |
| (Initial) | Plugin system | Hard excluded from V1 | Requires stable core first |
| 2026-01-16 | Autonomous execution | Included in Phase 1 | Core capability for competitive positioning |
| 2026-01-16 | Manual approval gates | Removed from V1 | Replaced by autonomous execution with notification |

---

## Phase Transition Criteria

### Phase 1 → Phase 2

- All Phase 1 exit criteria met
- Autonomous core loop stable for 2 weeks
- Autonomous success rate >85% sustained
- Retry effectiveness >60% sustained
- No critical bugs in backlog
- Documentation complete for Phase 1 features
- **B5 Security Review PASS** for all Phase 1 subsystems *(New in V2.2)*
- **INV-GLOBAL compliance verified** *(New in V2.2)*
- **Guardian attestation generated** *(New in V2.2)*

### Phase 2 → Phase 3

- All Phase 2 features complete
- IPC contract stable and versioned
- No breaking changes in command surface
- User feedback incorporated
- Performance baseline established
- No regressions in Phase 1 functionality
- **B5 Security Review PASS** for Phase 2 subsystems *(New in V2.2)*
- **INV-GLOBAL compliance verified** *(New in V2.2)*

### Phase 3 → Phase 4

- All Phase 3 features complete
- UI shell stable with real-time monitoring
- Notification system functioning correctly
- User interrupt response time <2 seconds
- No critical UI bugs
- No regressions in Phases 1-2
- **B5 Security Review PASS** *(New in V2.2)*
- **INV-GLOBAL compliance verified** *(New in V2.2)*

### Phase 4 → Phase 5

- All Phase 4 features complete
- Indexing scales to 10,000+ files
- Memory usage stays within bounds
- Performance remains predictable under load
- No critical scaling issues
- No regressions in Phases 1-3

### Phase 5 → Phase 6

- All Phase 5 features complete
- Plan validation catches 95%+ of malformed outputs
- Enhanced retry strategies reduce failure rate by 20%
- Diff constraint validation robust
- No critical validation bugs
- No regressions in Phases 1-4

### Phase 6 → Phase 7

- All Phase 6 features complete
- Preview and sandboxing functional
- Persistent rollback stack working correctly
- Dry-run mode accurate
- No critical preview bugs
- No regressions in Phases 1-5

### Phase 7 → Phase 8

- All Phase 7 features complete
- Multiple AI providers integrated
- Capability matrix accurate
- Graceful degradation across providers working
- No critical provider integration bugs
- No regressions in Phases 1-6

### Phase 8 → Phase 9

- All Phase 8 features complete
- Decision transparency clear to users
- Retry visualization helpful
- Recovery dashboard intuitive
- User feedback positive on explainability
- No regressions in Phases 1-7

### Phase 9 → Phase 10

- All Phase 9 features complete
- Installer and update pipeline working
- Signing and verification functioning
- Prerequisite enforcement effective
- Clean install/uninstall verified
- No regressions in Phases 1-8

### Phase 10 → Release

- All Phase 10 features complete
- Security audit passed with no critical findings
- Performance baselines met
- Regression suite passes 100%
- Documentation complete
- Go/no-go criteria satisfied
- Release candidate stable for 4 weeks

---

## Hard Invariants

This component enforces the following Global System Invariants:

- **INV-GLOBAL-1: Local-Only Execution**
- **INV-GLOBAL-2: Policy-Based Approval Gate** *(Changed in V2)*
- **INV-GLOBAL-3: Background Operation**
- **INV-GLOBAL-4: Graceful Degradation with Auto-Rollback** *(Enhanced in V2)*
- **INV-GLOBAL-5: AI Treated as Trusted Advisor**
- **INV-GLOBAL-6: User-Owned API Keys**
- **INV-GLOBAL-7: No Telemetry**
- **INV-GLOBAL-8: All Changes Reversible**
- **INV-GLOBAL-9: Complete Audit Trail** *(Enhanced in V2)*
- **INV-GLOBAL-10: Shell Execution Sandbox** *(New in V2)*
- **INV-GLOBAL-11: Self-Improving, Never Self-Authorizing** *(New in V2)*