# Project Root Detection & Multi-Project Handling

## Purpose
Define how the system detects project root and handles multi-project workspaces.

## Root Detection Rules
- Preferred markers (.exacta/, .sln, .csproj)
- Ambiguity handling

## Multi-Project
- Allowed or not in V1
- Selection UI/CLI requirements

## Requirements
- MUST be deterministic.
- MUST log detected root and rationale.