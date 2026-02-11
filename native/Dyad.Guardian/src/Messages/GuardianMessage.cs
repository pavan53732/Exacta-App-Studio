namespace Dyad.Guardian.Messages;

/// <summary>
/// Base message type for all Guardian IPC communication
/// </summary>
public abstract record GuardianMessage
{
    public string MessageId { get; init; } = Guid.NewGuid().ToString();
    public required string MessageType { get; init; }
    public long Timestamp { get; init; } = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
}

/// <summary>
/// Request message from Electron to Guardian
/// </summary>
public record GuardianRequest : GuardianMessage
{
    public required string Action { get; init; }
    public Dictionary<string, object>? Payload { get; init; }
}

/// <summary>
/// Response message from Guardian to Electron
/// </summary>
public record GuardianResponse : GuardianMessage
{
    public required string RequestId { get; init; }
    public bool Success { get; init; }
    public object? Data { get; init; }
    public string? Error { get; init; }
}

/// <summary>
/// Event message for async notifications
/// </summary>
public record GuardianEvent : GuardianMessage
{
    public required string EventType { get; init; }
    public Dictionary<string, object>? Data { get; init; }
}