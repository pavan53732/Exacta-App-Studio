namespace Dyad.Guardian.Messages;

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