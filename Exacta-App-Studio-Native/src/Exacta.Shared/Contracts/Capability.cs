namespace Exacta.Shared.Contracts;

/// <summary>
/// Capability tokens for action authorization.
/// Per specification Appendix A.4
/// </summary>
public enum Capability
{
    // File System
    FS_READ,
    FS_WRITE,
    
    // Process Execution
    PROCESS_EXEC,
    SHELL_EXEC,
    CLI_AGENT_EXEC,
    
    // Network
    NET_AI_ONLY,
    NET_DOCS_ONLY,
    NET_LOCAL_AI,
    NET_LOCALHOST,
    NET_REGISTRY,
    NET_VCS,
    NET_CONNECT,
    
    // Build & Package
    BUILD_EXEC,
    PACKAGE_EXEC,
    SIGN_EXEC,
    
    // Assets
    ASSET_GEN,
    
    // Web Development
    WEB_DEV_SERVER,
    WEB_BUILD,
    WEB_PREVIEW,
    WEB_DEPLOY,
    WEB_TEST,
    WEB_PACKAGE_INSTALL,
}

/// <summary>
/// Risk classification for actions and goals.
/// Per specification Appendix A.6
/// </summary>
public enum RiskClass
{
    LOW,      // Read-only or safe local mutation
    MEDIUM,   // Standard mutation (files, project structure)
    HIGH,     // System risk (Shell execution, new dependencies)
    CRITICAL  // Sandbox/Security/Identity impact (Guardian only)
}

/// <summary>
/// System boot and runtime states.
/// Per specification Section 2.1
/// </summary>
public enum SystemState
{
    BOOT,
    ATTEST,
    NO_AI_PROVIDER,
    READY,
    SAFE_MODE,
    OP_PRESERVE,
    SANDBOX_BREACH
}

/// <summary>
/// PDAO execution phases.
/// Per specification Section 6.1
/// </summary>
public enum ExecutionPhase
{
    PERCEIVE,
    DECIDE,
    ACT,
    OBSERVE,
    CHECKPOINT
}

/// <summary>
/// Provider types in the ecosystem.
/// Per specification Section 26.3
/// </summary>
public enum ProviderType
{
    CLOUD_API,
    CLI_AGENT,
    LOCAL_RUNTIME
}

/// <summary>
/// Provider health states.
/// Per specification Section 26.6
/// </summary>
public enum ProviderHealthState
{
    HEALTHY,
    DEGRADED,
    UNAVAILABLE
}

/// <summary>
/// Project lifecycle states.
/// Per specification Section 33.2
/// </summary>
public enum ProjectLifecycleState
{
    NEW,
    ACTIVE,
    PAUSED,
    ARCHIVED
}

/// <summary>
/// Policy decision outcomes.
/// Per specification Section 11.1
/// </summary>
public enum PolicyDecision
{
    DENY,
    ALLOW_WITH_LIMITS,
    ALLOW
}

/// <summary>
/// Command classification for shell execution.
/// Per specification Section 22.2
/// </summary>
public enum CommandClass
{
    READ,
    BUILD,
    FS_MUTATE,
    SYSTEM,
    NETWORK
}
