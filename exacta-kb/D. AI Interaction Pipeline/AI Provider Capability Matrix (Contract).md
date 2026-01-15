# AI Provider Capability Matrix (Contract)

## Purpose
Define the provider capability interface so behavior remains consistent across AI providers.

## Capabilities
- Max input tokens
- Max output tokens
- Streaming support
- JSON/schema support
- Tool/function calling (if any)
- Latency/cost metadata

## Selection Rules
- Deterministic provider selection
- User override rules

## Failure Rules
- Retry/backoff policy
- Fail-closed on inconsistent capabilities

## Compatibility
- Capability schema versioning