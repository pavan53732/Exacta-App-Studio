# Exacta App Studio — Knowledge Base

This repository is the canonical internal specification for **Exacta App Studio**:
a local-only, deterministic, AI-assisted Windows application builder.

## Table of Contents
- [00. Overview](00-overview/scope.md)
- [01. Product & Principles](01-principles/product-principles.md)
- [02. Security & Trust](02-security/threat-model.md)
- [03. Core Architecture](03-architecture/high-level-architecture.md)
- [04. AI Interaction Pipeline](04-ai-pipeline/ai-contracts.md)
- [05. Execution & Validation](05-execution-validation/execution-gates.md)
- [06. Operations](06-operations/logging-audit-trail.md)
- [07. Roadmap](07-roadmap/roadmap.md)
- [99. Reference](99-reference/error-codes.md)

---

## 00. Overview
- [Scope](00-overview/scope.md)
- [Terminology](00-overview/terminology.md)

## 01. Product & Principles
- [Product principles](01-principles/product-principles.md)
- [Global system invariants](01-principles/global-invariants.md)

## 02. Security & Trust
- [Threat model](02-security/threat-model.md)
- [Trust boundaries](02-security/trust-boundaries.md)
- [Input validation rules](02-security/input-validation.md)

## 03. Core Architecture
- [High-level architecture](03-architecture/high-level-architecture.md)
- [Deterministic state machine](03-architecture/state-machine.md)
- [Storage model](03-architecture/storage-model.md)

## 04. AI Interaction Pipeline
- [AI contracts](04-ai-pipeline/ai-contracts.md)
- [Token estimation](04-ai-pipeline/token-estimation.md)
- [Token guard](04-ai-pipeline/token-guard.md)

## 05. Execution & Validation
- [Execution gates](05-execution-validation/execution-gates.md)
- [Unified diff parser spec](05-execution-validation/diff-parser-spec.md)
- [Execution token lifecycle](05-execution-validation/execution-token-lifecycle.md)

## 06. Operations
- [Logging and audit trail](06-operations/logging-audit-trail.md)
- [Installer prerequisites](06-operations/installer-prereqs.md)

## 07. Roadmap
- [Roadmap](07-roadmap/roadmap.md)

## 99. Reference
- [Error codes](99-reference/error-codes.md)

---

## Conventions
- **MUST / SHALL**: hard requirement, violation is a bug
- **SHOULD**: strong recommendation, deviation needs justification
- **MAY**: optional behavior