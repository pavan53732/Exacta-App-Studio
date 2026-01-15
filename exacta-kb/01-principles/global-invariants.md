# Global Invariants

## Purpose
This document defines the global invariants of Exacta App Studio – the fundamental rules and constraints that must hold true across all components, versions, and use cases. These invariants are never violated and serve as the bedrock for all design and implementation decisions.

## Scope
- **In scope**:
  - Core system behaviors that cannot change
  - Security and trust boundaries
  - Execution determinism guarantees
  - Data isolation principles

- **Out of scope**:
  - Implementation details that may evolve
  - Performance optimizations
  - UI/UX preferences

## Requirements
- **MUST**:
  - All execution be deterministic for identical inputs
  - User data remain strictly local to the user's machine
  - No external network calls during core app generation
  - Security boundaries prevent code injection or data leakage
  - Generated apps be self-contained and runnable offline

- **SHOULD**:
  - Maintain backward compatibility for generated apps
  - Provide clear error boundaries and failure modes

- **MAY**:
  - Allow user-configurable safety limits

## Non-goals
- Supporting non-deterministic features
- Allowing network-dependent functionality
- Compromising local data security

## Notes / Rationale
- Determinism ensures reproducible and reliable app generation
- Local-only operation protects user privacy and enables offline use
- Invariants provide a stable foundation for long-term evolution