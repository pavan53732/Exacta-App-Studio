# Installer, Updates & Prerequisite Enforcement

## Purpose
Specify installer behavior, prerequisites, signing, update policy, and uninstall guarantees.

## Prerequisites (Draft)
- WebView2 runtime
- .NET SDK / Build tools (as required)

## Enforcement
- MUST fail early with actionable remediation.
- MUST leave no partial install.

## Signing
(TBD)

## Updates
- Manual only in V1 (if applicable)

## Uninstall
- MUST remove app artifacts cleanly.
- MUST preserve user projects.