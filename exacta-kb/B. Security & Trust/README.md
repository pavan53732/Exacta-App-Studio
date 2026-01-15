# B. Security & Trust

## Purpose
This section defines the trust model, security boundaries, and privacy guarantees of Exacta App Studio.
It is the authoritative reference for what is trusted, what is untrusted, and how the system fails closed.

## Documents
- [Security, Privacy and Local-Only Guarantees](Security%2C%20Privacy%20and%20Local-Only%20Guarantees.md)
- [AI Trust Boundary & Threat Model](AI%20Trust%20Boundary%20%26%20Threat%20Model.md)

## Scope Rules
- All AI outputs MUST be treated as untrusted input.
- Any ambiguity MUST resolve to refusal or explicit user confirmation.
- This section MUST stay aligned with the global invariants.

## Navigation
- Back to KB root: [Exacta KB](../README.md)