# User Contract & Mental Model

This document explains how Exacta App Studio behaves from a user's perspective. It sets expectations clearly and honestly.

---

## What Exacta App Studio Is

Exacta App Studio is a **local desktop application** that helps you build Windows applications (.exe, .msi) using AI assistance.

It runs entirely on your machine. You provide:
- Your own AI API key (OpenAI-compatible, OpenRouter, or local)
- Your own build tools (dotnet, msbuild, etc.)
- Your project files

The application provides:
- A chat interface to describe what you want
- A planning engine that proposes changes
- A controlled execution system that applies changes safely
- Build and packaging integration

---

## What Exacta App Studio Is Not

**Not autonomous.** The AI does not run in the background. It does not make decisions without your approval. It does not execute code, write files, or invoke builds unless you explicitly approve a plan.

**Not a cloud service.** There is no account. There is no server. Your code never leaves your machine except when sent to your chosen AI provider.

**Not magic.** Every change is visible before it happens. Every file write is logged. Every operation can be rolled back. If something fails, you will see why.

**Not a replacement for your editor.** Exacta App Studio works alongside your existing tools. You can use VS Code, Visual Studio, or any editor. Exacta App Studio modifies files; your editor displays them.

---

## Why Approvals Exist

Every plan requires your explicit approval before execution.

This is intentional:
- **You own your code.** No automated system should modify it without your consent.
- **AI makes mistakes.** Plans may be incomplete, incorrect, or misaligned with your intent. You are the final check.
- **Reversibility has limits.** While rollback exists, preventing bad changes is better than recovering from them.

Approval is not a formality. It is a required gate. The system will not proceed without it.

---

## Why the AI May Refuse Requests

The AI will refuse to proceed when:

| Condition | Reason |
| --- | --- |
| Request is ambiguous | Multiple valid interpretations exist |
| Confidence is low | The system is not sure it understood correctly |
| Request is out of scope | Not a supported intent type in V1 |
| Constraints conflict | User requirements contradict each other |
| Target is unclear | Cannot determine which file or symbol to modify |
| Safety boundary violated | Request would escape project sandbox |

Refusal is not failure. It is the system protecting you from incorrect execution.

When the AI refuses, it will explain why and ask for clarification.

---

## Why Deterministic Execution Is Intentional

Exacta App Studio does not use "smart" heuristics, fuzzy matching, or best-effort behavior.

Every operation follows explicit rules:
- State transitions are defined in tables, not inferred
- Diffs must match exactly or they are rejected
- Paths are validated against explicit allow/deny rules
- Builds use explicitly configured toolchains

This means:
- **The same input produces the same output.** Behavior is predictable.
- **Failures are explicit.** When something goes wrong, you know what and why.
- **No hidden behavior.** Nothing happens "automatically" or "in the background."

Determinism is a feature, not a limitation. It makes the system auditable and trustworthy.

---

## Why Phase 1 Has Strict Limits

Phase 1 is intentionally constrained:

| Limitation | Reason |
| --- | --- |
| Single-file edits only | Multi-file atomicity is complex; deferred to Phase 2 |
| 4 intent types only | Fewer types = fewer edge cases = higher reliability |
| One AI provider | Provider abstraction exists but is not exposed yet |
| Linear plans only | Dependency graphs add complexity; deferred |
| No composite intents | "Do X and Y" is rejected; ask separately |

These limits exist because:
1. **Reliability over features.** A small system that works is better than a large system that breaks.
2. **Trust is earned.** Phase 1 proves the core loop works before expanding.
3. **Scope creep kills projects.** Hard limits prevent unbounded complexity.

Phase 2 and beyond will expand capabilities only after Phase 1 is stable.

---

## What You Can Expect

**Expect transparency.** You will see every plan, every diff, every file change before and after.

**Expect refusals.** The system will say "no" when it should. This is correct behavior.

**Expect failures.** Builds fail. Diffs don't apply. AI generates bad code. When this happens, you will see clear errors and recovery options.

**Expect control.** You approve. You cancel. You rollback. The system executes; you decide.

---

## What You Should Not Expect

**Do not expect autonomous operation.** The system will not "figure it out" without you.

**Do not expect perfection.** AI output requires validation. Plans require review. Builds require testing.

**Do not expect speed over safety.** The system will pause, ask, and wait rather than guess and proceed.

---

## Hard Invariants

This component enforces the following Global System Invariants:
- **INV-GLOBAL-1: Local-Only Execution**
- **INV-GLOBAL-2: Deterministic Orchestration**
- **INV-GLOBAL-3: Fail-Closed Behavior**
- **INV-GLOBAL-4: AI Treated as Untrusted Input**
- **INV-GLOBAL-5: User-Owned API Keys**
- **INV-GLOBAL-6: No Telemetry**