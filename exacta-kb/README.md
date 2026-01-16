# Exacta App Studio — Knowledge Base

> **Version:** V2 — Policy-Governed Autonomous Agent
> 

## What Exacta App Studio Is

Exacta App Studio is a **local-only, deterministic, AI-assisted Windows application builder**. It creates and modifies desktop applications (.exe, .msi) end-to-end using:

- User-provided AI API keys (OpenAI-compatible, OpenRouter, local CLIs)
- Local toolchains (dotnet, msbuild, NSIS, WiX)
- A chat-driven interface for intent capture
- An **autonomous orchestration engine** with policy-based approval
- **Autonomy Profiles** (PROFILE-SAFE, PROFILE-DEV, PROFILE-FULL-AUTO)
- **Sandboxed shell execution** with allowlist/blocklist filtering
- **Controlled self-upgrade** capability (agent can upgrade but never self-authorize)

The AI is a **trusted advisor** that autonomously executes plans via a **Gate Pipeline** (Security → Policy → Risk → Quality → User Confirm). All changes are reversible with **automatic rollback** on failures, and users can interrupt at any time.

---

## What Exacta App Studio Is NOT

- **Not a cloud service** — No hosted backend, no remote storage, no account required
- **Not a learning AI** — AI does not learn from past sessions or adapt behavior over time
- **Not a general-purpose IDE** — Focused on Windows desktop app creation only
- **Not a code editor replacement** — Works alongside existing editors, not instead of them
- **Not magic** — Every operation is explicit, logged, and reversible

---

## Target Users

- Windows desktop developers building WPF, WinUI, or WinForms applications
- Developers who want AI assistance without cloud dependencies
- Users who want **policy-controlled autonomy** with configurable approval levels
- Users who require auditable build processes with automatic rollback
- Solo developers or small teams who value speed and iteration

---

## Supported Platforms

- **Host OS:** Windows 10/11 (x64)
- **Output formats:** .exe, .msi
- **Target frameworks:** .NET Framework 4.8, .NET 6/7/8, WPF, WinUI 3, WinForms
- **Build tools:** dotnet CLI, MSBuild, NSIS, WiX, Inno Setup

**Explicitly unsupported:** macOS, Linux, cross-platform targets, web applications, mobile applications.

---

## High-Level Lifecycle

Every user request follows this deterministic pipeline:

```jsx
Chat (user input)
    ↓
Intent Extraction (classify request, extract constraints)
    ↓
Plan Generation (produce step list with dependencies)
    ↓
Gate Pipeline Evaluation (Security → Policy → Risk → Quality)  ← V2
    ↓
Approval Decision (ALLOW / DENY / CONFIRM per profile)  ← V2
    ↓
Diff Generation (produce unified diffs per step)
    ↓
Diff Validation (syntax, path safety, encoding)
    ↓
File Apply (atomic writes with rollback capability)
    ↓
Shell Execution (sandboxed, filtered, resource-limited)  ← V2
    ↓
Syntax Validation (parse check before build)
    ↓
Build Execution (invoke toolchain)
    ↓
Smart Retry (up to 3 attempts on failure)
    ↓
Auto-Rollback on Critical Failure  ← V2
    ↓
Result (success, auto-recovered, or escalated to user)
```

The orchestrator executes autonomously via the **Gate Pipeline**. Approval comes from **User**, **Policy Engine**, or **Active Profile**. Users can interrupt at any time, and all changes are reversible with automatic rollback.

---

## Document Purpose

This knowledge base serves as the **single source of truth** for system behavior, guarantees, and constraints. All content is written as specification, not marketing.

| Audience | Purpose |
| --- | --- |
| Developers | Implementation reference |
| QA | Test oracle for expected behavior |
| Security reviewers | Trust model and threat surface |
| Future maintainers | Architectural rationale |

---

## Core Invariants (Summary)

| Invariant | Enforcement |
| --- | --- |
| **Local-only execution** | No network calls except user-configured AI APIs + package managers |
| **Policy-based approval** | Actions approved by User, Policy Engine, or Active Profile |
| **Autonomous execution** | Low/medium risk actions can auto-execute per policy |
| **Shell sandbox** | Commands filtered, jailed to project root, resource-limited |
| **Self-upgrade (controlled)** | Can upgrade itself, but never self-authorize |
| **Auto-rollback** | Autonomous failures trigger automatic rollback |
| **Complete audit trail** | Every action logged with approval source, profile, gates, rollback path |

---

## Sections

---

[A. Product & Principles](Exacta%20App%20Studio%20%E2%80%94%20Knowledge%20Base/A%20Product%20&%20Principles%2069ff5b1188fb4a93a85ff9767af785e6.md)

[B. Security & Trust](Exacta%20App%20Studio%20%E2%80%94%20Knowledge%20Base/B%20Security%20&%20Trust%20b6226f759c074c6980648b38abdf3dba.md)

[C. System Core Specification](Exacta%20App%20Studio%20%E2%80%94%20Knowledge%20Base/C%20System%20Core%20Specification%207be177922ed442348f14e80610d62472.md)

[D. AI Interaction Pipeline](Exacta%20App%20Studio%20%E2%80%94%20Knowledge%20Base/D%20AI%20Interaction%20Pipeline%206b1631edcdb2428a9d984d05411a1158.md)

[E. Safe Execution Engine Specification](Exacta%20App%20Studio%20%E2%80%94%20Knowledge%20Base/E%20Safe%20Execution%20Engine%20Specification%209ec59ab1b84042a2b4f970b551ebb011.md)

[F. Resilience & Operations Specification](Exacta%20App%20Studio%20%E2%80%94%20Knowledge%20Base/F%20Resilience%20&%20Operations%20Specification%20e4e38d55737e4e878e008d85d0ea2925.md)

[G. Roadmap](Exacta%20App%20Studio%20%E2%80%94%20Knowledge%20Base/G%20Roadmap%20187e3b7dac394b38be070da465935394.md)

[H. Reference](Exacta%20App%20Studio%20%E2%80%94%20Knowledge%20Base/H%20Reference%2098820968bb98437695af8fb6cfe07f74.md)

## Navigation Conventions

- **MUST / SHALL** — Hard requirement; violation is a bug
- **SHOULD** — Strong recommendation; deviation requires justification
- **MAY** — Optional behavior
- **DOES / DOES NOT** tables — Explicit boundary definitions
- **Invariants** — Properties that hold at all times; tested continuously

[Global System Invariants](Exacta%20App%20Studio%20%E2%80%94%20Knowledge%20Base/Global%20System%20Invariants%20f5a2e8a82d1541d1ad2b32f3b29f2016.md)