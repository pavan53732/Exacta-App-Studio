# A1. User Contract & Mental Model

> **Document ID:** A1
> 

> **Version:** V2 (Autonomous Agent)
> 

> **Status:** Canonical & Enforced
> 

This document explains how the autonomous agent behaves from a user's perspective. It sets expectations clearly and honestly.

---

## What the Agent Is

The agent is a **local desktop application** that helps you build Windows applications (.exe, .msi) using AI assistance.

It runs entirely on your machine. You provide:

- Your own AI API key (OpenAI-compatible, OpenRouter, or local)
- Your own build tools (dotnet, msbuild, etc.)
- Your project files

The application provides:

- A chat interface to describe what you want
- An autonomous planning and execution system
- Risk assessment and quality scoring
- Automatic retry on failures
- Background execution while you work
- Complete rollback capability

---

## What the Agent Is Not

**Not a cloud service.** There is no account. There is no server. Your code never leaves your machine except when sent to your chosen AI provider.

**Not reckless.** High-risk operations require confirmation. Low and medium risk operations proceed automatically with safety nets (rollback, validation, audit trail).

**Not a replacement for your editor.** The agent works alongside your existing tools. You can use VS Code, Visual Studio, or any editor. The agent modifies files; your editor displays them.

---

## What the Agent Does Automatically

The agent proceeds without asking when it's safe:

- **Extracts intent** from your requests
- **Generates and evaluates plans** based on risk and quality
- **Executes low-risk changes** immediately (risk score 0-30)
- **Executes medium-risk changes** with notification (risk score 31-65)
- **Retries on failures** up to 3 times with smart strategies
- **Works in background** while you continue other tasks
- **Notifies based on risk** (silent for low, status bar for medium, toast for high)
- **Rolls back on critical failures** automatically

---

## When the Agent Pauses for You

The agent will pause and ask for input only when:

| Condition | Why |
| --- | --- |
| **High risk** (score 66-100) | Deletions, breaking changes, security-sensitive code |
| **Low quality** (score <0.60) | Plan is incomplete, vague, or infeasible |
| **High ambiguity** | Multiple valid interpretations exist |
| **Retry exhausted** | 3 automatic retry attempts failed |
| **Non-recoverable error** | File not found, permission denied, etc. |
| **Conservative settings** | You've set autonomy level to conservative |

When paused, you'll see:

- Why confirmation is needed
- What the plan will do
- Detailed risk assessment
- Full diffs for review

---

## How to Interrupt the Agent

You have full control at any time:

- **Pause** — Stops at the next safe point (between steps)
- **Cancel** — Stops and rolls back all changes
- **Resume** — Continues from where it paused

The agent checks for interrupts:

- Before each step
- After each step
- Before file writes
- Before AI calls

---

## Risk Levels Explained

The agent scores every operation from 0-100:

**Low Risk (0-30)** — Auto-execute silently

- Single file modification
- No deletions
- No dependency changes
- Small changes (<50 lines)

**Medium Risk (31-65)** — Auto-execute with notification

- 2-5 file modifications
- No deletions
- No breaking changes
- Moderate complexity

**High Risk (66-100)** — Require confirmation

- Any file deletion
- >5 file modifications
- Dependency changes
- Breaking API changes
- Security-sensitive code
- Complex refactoring

---

## Quality Scoring

The agent evaluates plan quality across 5 dimensions:

| Dimension | Weight | What It Measures |
| --- | --- | --- |
| Completeness | 30% | All requirements addressed, no missing steps |
| Specificity | 25% | No placeholders, concrete values |
| Feasibility | 20% | No impossible operations, no conflicts |
| Safety | 15% | No unsafe patterns, no data loss risk |
| Clarity | 10% | Clear step descriptions |

**Quality thresholds:**

- **≥0.75** — Good quality (auto-execute medium risk)
- **0.60-0.75** — Moderate quality (request confirmation for medium risk)
- **<0.60** — Insufficient quality (reject, ask for clarification)

---

## Automatic Retry Strategies

When operations fail, the agent automatically selects a retry strategy:

| Error Type | Strategy |
| --- | --- |
| Context mismatch | Refresh context, then expand window |
| Syntax error | Regenerate with error feedback |
| Build error | Regenerate fix, then simplify |
| Network error | Exponential backoff (1s/2s/4s) |
| File not found | No retry (escalate to user) |
| Permission denied | No retry (escalate to user) |

After 3 failed attempts, the agent:

1. Rolls back any changes
2. Shows detailed error report
3. Asks you for guidance

---

## Background Execution

The agent can work while you do other things:

**When operations run in background:**

- Low-risk operations (always)
- Medium-risk operations (with notification)
- Operations estimated >5 seconds
- Queued operations while another runs

**Concurrency limits:**

- Maximum 5 operations run simultaneously
- Priority: user-initiated > quick > low-risk
- Retries get lower priority

**Background queue survives app restart:**

- State persists to disk
- On restart, you're notified of pending work
- You can resume, cancel, or review

---

## Notification Strategy

Notifications scale with risk:

| Risk Level | Started |
| --- | --- |
| **Low** | Silent |
| **Medium** | Status bar |
| **High** | Toast |

**Special cases:**

- Retry exhausted: **Modal** (any risk level)
- Needs clarification: **Modal**
- User viewing affected files: Toast (even if low risk)

Notifications batch to avoid spam (2-second window).

---

## What You Can Expect

**Expect fast iteration.** Low-risk changes happen immediately. You see results, not plans.

**Expect notifications for risky changes.** Medium and high-risk operations notify you before or during execution.

**Expect automatic recovery.** Failures retry automatically. Only after 3 attempts do you get involved.

**Expect full reversibility.** Every change has a checkpoint. Rollback is always available.

**Expect transparency.** Complete audit trail. View diffs anytime. See what the agent did and why.

---

## What You Should Not Expect

**Do not expect perfection.** AI makes mistakes. The agent catches most through validation and retries. Some require your attention.

**Do not expect mind-reading.** Ambiguous requests get clarification questions. Be specific.

**Do not expect instant execution.** Risk assessment, quality scoring, and safety checks take time. Speed is balanced with safety.

---

## Autonomy Levels

You control how autonomous the agent is:

**Conservative**

- Auto-execute: Low risk only
- Confirm: Medium and high risk
- Best for: Production code, critical projects

**Balanced (default)**

- Auto-execute: Low and medium risk
- Confirm: High risk only
- Best for: Most development work

**Aggressive**

- Auto-execute: Everything except deletions
- Confirm: File deletions only
- Best for: Experimental projects, rapid prototyping

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