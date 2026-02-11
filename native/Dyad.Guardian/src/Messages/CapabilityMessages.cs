namespace Dyad.Guardian.Messages;

/// <summary>
/// Request a capability token
/// </summary>
public record RequestCapabilityRequest
{
    public required string Subject { get; init; } // Who is requesting (user/app)
    public required string Resource { get; init; } // What resource (file:/path, process:cmd, network:host)
    public required string Action { get; init; } // read, write, execute, connect
    public Dictionary<string, object>? Constraints { get; init; } // Additional constraints
    public int? ExpiresInSeconds { get; init; } = 3600; // Default 1 hour
}

/// <summary>
/// Capability token response
/// </summary>
public record CapabilityTokenResponse
{
    public required bool Success { get; init; }
    public string? Token { get; init; }
    public string? TokenId { get; init; }
    public long? ExpiresAt { get; init; }
    public string? Error { get; init; }
}

/// <summary>
/// Validate a capability token
/// </summary>
public record ValidateCapabilityRequest
{
    public required string Token { get; init; }
    public string? Resource { get; init; }
    public string? Action { get; init; }
}

/// <summary>
/// Validation result
/// </summary>
public record ValidateCapabilityResponse
{
    public required bool Valid { get; init; }
    public string? Subject { get; init; }
    public string? Resource { get; init; }
    public string? Action { get; init; }
    public Dictionary<string, object>? Claims { get; init; }
    public string? Error { get; init; }
}

/// <summary>
/// Revoke a capability token
/// </summary>
public record RevokeCapabilityRequest
{
    public required string TokenId { get; init; }
    public string? Reason { get; init; }
}

/// <summary>
/// List active tokens
/// </summary>
public record ListCapabilitiesResponse
{
    public required List<CapabilityInfo> Capabilities { get; init; }
}

public record CapabilityInfo
{
    public required string TokenId { get; init; }
    public required string Subject { get; init; }
    public required string Resource { get; init; }
    public required string Action { get; init; }
    public required long ExpiresAt { get; init; }
    public required long IssuedAt { get; init; }
    public bool Revoked { get; init; }
}