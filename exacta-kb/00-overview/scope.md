# Scope

## Purpose
This document defines the scope of Exacta App Studio, including what the product is, what it does, and what it explicitly does not do. It serves as the foundational boundary for all development and feature decisions.

## Scope
- **In scope**:
  - Local-only Windows desktop application for building AI-assisted apps
  - Deterministic execution environment for app generation
  - AI integration for code assistance and automation
  - Windows-specific installer and deployment
  - Internal knowledge base and specification management

- **Out of scope**:
  - Cross-platform support (macOS, Linux)
  - Cloud-based features or hosting
  - Web-based interfaces or deployment
  - Third-party integrations beyond AI providers
  - Mobile app generation

## Requirements
- **MUST**:
  - Operate entirely offline after initial setup
  - Ensure deterministic outputs for given inputs
  - Support Windows 10 and later versions
  - Maintain security through local execution boundaries

- **SHOULD**:
  - Provide clear error messages and logging
  - Include comprehensive documentation
  - Support common AI model formats

- **MAY**:
  - Include optional cloud sync for backups
  - Support plugin architecture for extensibility

## Non-goals
- Becoming a general-purpose IDE
- Supporting legacy Windows versions
- Providing hosting or deployment services
- Competing with existing app builders on features

## Notes / Rationale
- Local-only design ensures user data privacy and control
- Deterministic behavior is critical for reliable app generation
- Windows focus allows for deep OS integration and performance optimizations