# C. Core Architecture

## Purpose
This section describes the internal architecture of Exacta App Studio: component boundaries, data flow, and determinism guarantees.

## Documents
- [System Architecture](System Architecture.md)
- [Orchestration State Machine](Orchestration State Machine.md)
- [Memory Model and Large Codebase Handling](Memory Model and Large Codebase Handling.md)
- [File System Safety and Diff Engine](File System Safety and Diff Engine.md)
- [IPC Contract & Backend Command Surface](IPC Contract & Backend Command Surface.md)
- [Project Configuration Schema & Storage Layout](Project Configuration Schema & Storage Layout.md)
- [Context Builder Contract (Selection, Budgeting, Redaction)](Context Builder Contract (Selection, Budgeting, Redaction).md)
- [Drift Detection & Fingerprint Contract](Drift Detection & Fingerprint Contract.md)
- [Cancellation, Pause & Resume Semantics](Cancellation, Pause & Resume Semantics.md)
- [Project Root Detection & Multi-Project Handling](Project Root Detection & Multi-Project Handling.md)

## Scope Rules
- Architecture MUST be described as explicit components with explicit contracts.
- Execution side effects MUST remain gated and auditable.

## Navigation
- Back to KB root: [Exacta KB](../README.md)