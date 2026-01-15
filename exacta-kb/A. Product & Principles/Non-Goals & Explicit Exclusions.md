# Non-Goals & Explicit Exclusions

This document defines what Exacta App Studio will **not** do. These are permanent exclusions, not deferred features.

---

## Purpose

This page exists to:
1. Prevent misinterpretation of product scope
2. Reject feature requests that violate core constraints
3. Provide a canonical reference for scope disputes

If a capability is listed here, it is **excluded by design**. Do not ask for it. Do not plan for it. Do not assume it will be added later.

---

## Platform Exclusions

Exacta App Studio does **not** build:

| Platform | Status |
| --- | --- |
| Mobile applications (iOS, Android) | Excluded |
| Web applications (SPA, SSR, static sites) | Excluded |
| macOS applications | Excluded |
| Linux applications | Excluded |
| Cross-platform applications (Electron, MAUI for non-Windows) | Excluded |
| Browser extensions | Excluded |
| Server-side applications | Excluded |

Exacta App Studio builds **Windows desktop applications only**. This is not a temporary limitation.

---

## Cloud & Network Exclusions

Exacta App Studio does **not**:

| Capability | Status |
| --- | --- |
| Sync projects to the cloud | Excluded |
| Store data on remote servers | Excluded |
| Require an account or login | Excluded |
| Phone home or check for updates automatically | Excluded |
| Proxy AI requests through a hosted backend | Excluded |
| Collect telemetry or usage analytics | Excluded |

All processing is local. The only network traffic is AI API calls to your configured provider.

---

## Collaboration Exclusions

Exacta App Studio does **not** support:

| Capability | Status |
| --- | --- |
| Multi-user editing | Excluded |
| Shared projects | Excluded |
| Real-time collaboration | Excluded |
| Team workspaces | Excluded |
| Permission management | Excluded |
| Audit logs for teams | Excluded |

Exacta App Studio is a **single-user, local tool**. Collaboration features are out of scope permanently.

---

## Autonomy Exclusions

Exacta App Studio does **not**:

| Capability | Status |
| --- | --- |
| Run autonomous background agents | Excluded |
| Execute plans without user approval | Excluded |
| Make decisions without user confirmation | Excluded |
| Learn from user behavior | Excluded |
| Maintain memory across sessions | Excluded |
| Perform actions while the app is closed | Excluded |

The AI is a **constrained assistant**. It advises; you approve; the system executes. This chain is never bypassed.

---

## Extensibility Exclusions

Exacta App Studio does **not** support:

| Capability | Status |
| --- | --- |
| Plugins | Excluded |
| Extensions | Excluded |
| Custom intent types | Excluded |
| User-defined validation rules | Excluded |
| Third-party integrations | Excluded |
| Scripting or macros | Excluded |

The system is **closed by design**. Extensibility introduces unpredictable behavior and security risks.

---

## Automation Exclusions

Exacta App Studio does **not**:

| Capability | Status |
| --- | --- |
| Perform silent file modifications | Excluded |
| Auto-save without explicit trigger | Excluded |
| Auto-build without explicit trigger | Excluded |
| Auto-install dependencies | Excluded |
| Auto-update packages | Excluded |
| Run scheduled tasks | Excluded |

Every action requires explicit user initiation or approval. There is no silent automation.

---

## Integration Exclusions

Exacta App Studio does **not** integrate with:

| System | Status |
| --- | --- |
| Git or other version control | Excluded |
| CI/CD pipelines | Excluded |
| Issue trackers (Jira, GitHub Issues) | Excluded |
| Cloud IDEs | Excluded |
| Package registries (for publishing) | Excluded |

Exacta App Studio is a standalone tool. It does not connect to external development infrastructure.

---

## AI Capability Exclusions

Exacta App Studio does **not**:

| Capability | Status |
| --- | --- |
| Ship built-in AI models | Excluded |
| Host AI inference | Excluded |
| Train or fine-tune models | Excluded |
| Store conversation history for AI | Excluded |
| Allow AI to execute arbitrary code | Excluded |

You provide the AI. Exacta App Studio constrains and validates its output.

---

## Interpretation Rules

**If a feature is not explicitly documented as supported, assume it is excluded.**  
**If a feature appears on this page, it will not be added.**  
**If you need a feature on this page, use a different tool.**

This document is authoritative. Ambiguity resolves to exclusion.

---

## Hard Invariants

This component enforces the following Global System Invariants:
- **INV-GLOBAL-1: Local-Only Execution**
- **INV-GLOBAL-2: Deterministic Orchestration**
- **INV-GLOBAL-3: Fail-Closed Behavior**
- **INV-GLOBAL-4: AI Treated as Untrusted Input**
- **INV-GLOBAL-5: User-Owned API Keys**
- **INV-GLOBAL-6: No Telemetry**