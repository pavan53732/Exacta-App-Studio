namespace Dyad.Guardian.Messages;

/// <summary>
/// Network policy configuration for job isolation
/// </summary>
public record NetworkPolicy
{
    /// <summary>
    /// List of allowed hosts (IP addresses or hostnames)
    /// </summary>
    public List<string>? AllowedHosts { get; init; }
    
    /// <summary>
    /// List of blocked hosts (IP addresses or hostnames)
    /// </summary>
    public List<string>? BlockedHosts { get; init; }
    
    /// <summary>
    /// Allow all network traffic (overrides blocked hosts)
    /// </summary>
    public bool AllowAll { get; init; } = false;
    
    /// <summary>
    /// Block all network traffic (overrides allowed hosts)
    /// </summary>
    public bool BlockAll { get; init; } = false;
    
    /// <summary>
    /// Allow loopback traffic (127.0.0.1, ::1) - always true by default
    /// </summary>
    public bool AllowLoopback { get; init; } = true;
}

/// <summary>
/// Job Object creation request
/// </summary>
public record CreateJobObjectRequest
{
    public required string JobName { get; init; }
    public long? MemoryLimitBytes { get; init; }
    public int? CpuRatePercent { get; init; } // 1-100
    public int? ActiveProcessLimit { get; init; }
    public bool? KillProcessesOnJobClose { get; init; } = true;
    
    /// <summary>
    /// Disk I/O quota in bytes - limits total disk read/write operations
    /// </summary>
    public long? DiskQuotaBytes { get; init; }
    
    /// <summary>
    /// Network policy for process isolation
    /// </summary>
    public NetworkPolicy? NetworkPolicy { get; init; }
}

/// <summary>
/// Job Object creation response
/// </summary>
public record CreateJobObjectResponse
{
    public required bool Success { get; init; }
    public required string JobName { get; init; }
    public string? Error { get; init; }
}

/// <summary>
/// Assign process to job object
/// </summary>
public record AssignProcessToJobRequest
{
    public required string JobName { get; init; }
    public required int ProcessId { get; init; }
}

/// <summary>
/// Job statistics
/// </summary>
public record JobStatistics
{
    public required string JobName { get; init; }
    public int ActiveProcesses { get; init; }
    public long TotalPageFaults { get; init; }
    public long TotalProcesses { get; init; }
    public long TotalTerminatedProcesses { get; init; }
    public long PeakMemoryUsed { get; init; }
    public long CurrentMemoryUsage { get; init; }
    
    /// <summary>
    /// Total disk I/O read bytes
    /// </summary>
    public long TotalDiskReadBytes { get; init; }
    
    /// <summary>
    /// Total disk I/O write bytes
    /// </summary>
    public long TotalDiskWriteBytes { get; init; }
    
    /// <summary>
    /// Disk quota limit in bytes (if set)
    /// </summary>
    public long? DiskQuotaLimit { get; init; }
}

/// <summary>
/// Event arguments for quota exceeded events
/// </summary>
public class QuotaExceededEventArgs : EventArgs
{
    public required string JobName { get; init; }
    public required QuotaType QuotaType { get; init; }
    public required long Limit { get; init; }
    public required long CurrentValue { get; init; }
    public DateTime Timestamp { get; init; } = DateTime.UtcNow;
}

/// <summary>
/// Types of quotas that can be exceeded
/// </summary>
public enum QuotaType
{
    Memory,
    DiskRead,
    DiskWrite,
    DiskTotal,
    CpuRate,
    ProcessCount
}

/// <summary>
/// Terminate job (kill all processes)
/// </summary>
public record TerminateJobRequest
{
    public required string JobName { get; init; }
    public int ExitCode { get; init; } = 1;
}

/// <summary>
/// List all job objects
/// </summary>
public record ListJobsResponse
{
    public required List<string> JobNames { get; init; }
}