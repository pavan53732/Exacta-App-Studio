# A2. Non-Goals & Explicit Exclusions

> **Document ID:** A2
> 

> **Version:** V2 (Autonomous Agent)
> 

> **Status:** Canonical & Enforced
> 

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

All processing is local.

Allowed network traffic is limited to:

- AI API calls to your configured provider (user-initiated, user-configured)
- Documentation retrieval (optional, user-initiated, allowlisted domains only, can be disabled)

No other network calls are made.

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

The agent does **not**:

| Capability | Status |
| --- | --- |
| Perform actions while the app is closed | Excluded |
| Learn user behavior for personalization | Excluded |
| Maintain long-term memory across sessions | Excluded |
| Execute high-risk operations without confirmation | Never (see risk assessment) |
| Execute low-quality plans (<0.60) | Never (rejected automatically) |
| Bypass safety checks or rollback capability | Never |

The agent **does**:

- Auto-execute low and medium risk operations
- Retry failures automatically (up to 3 attempts)
- Work in background while user continues
- Require confirmation only for high-risk or ambiguous operations

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
| Perform unaudited file modifications | Excluded |
| Auto-save without explicit trigger | Excluded |
| Auto-build without explicit trigger | Excluded |
| Auto-install dependencies | Excluded |
| Auto-update packages | Excluded |
| Run scheduled tasks | Excluded |

Every action requires explicit user initiation. Low and medium risk operations execute autonomously with audit trail. High-risk operations require confirmation. No scheduled or background-triggered automation.

---

### Integration Exclusions

Exacta App Studio does **not** integrate with:

| System | Status |
| --- | --- |
| Git or other version control | Excluded |
| CI/CD pipelines | Excluded |
| Issue trackers (Jira, GitHub Issues) | Excluded |
| Cloud IDEs | Excluded |
| Package registries (for publishing) | Excluded |

Exacta App Studio is a standalone tool. It does not connect to external development infrastructure.

**Clarification on Evidence Export** *(New in V2.2)*: The forensic evidence export feature (F8) produces file-based exports only. No network transmission, API integration, or automatic upload is supported. Exported evidence packages are written to user-specified local paths and must be manually transferred if external review is required.

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
- **INV-GLOBAL-2: Autonomous Execution**
- **INV-GLOBAL-3: Background Operation**
- **INV-GLOBAL-4: Graceful Degradation**
- **INV-GLOBAL-5: AI Treated as Trusted Advisor**
- **INV-GLOBAL-6: User-Owned API Keys**
- **INV-GLOBAL-7: No Telemetry**
- **INV-GLOBAL-8: All Changes Reversible**
- **INV-GLOBAL-9: Complete Audit Trail**