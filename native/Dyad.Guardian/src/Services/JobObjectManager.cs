using System.Runtime.InteropServices;
using Dyad.Guardian.Messages;
using Microsoft.Win32.SafeHandles;

namespace Dyad.Guardian.Services;

/// <summary>
/// Manages Windows Job Objects for process isolation and resource control
/// </summary>
public class JobObjectManager : IDisposable
{
    private readonly ILogger<JobObjectManager> _logger;
    private readonly Dictionary<string, JobObjectInfo> _jobs = new();
    private readonly object _lock = new();
    
    // Win32 API Constants
    private const int JOB_OBJECT_LIMIT_ACTIVE_PROCESS = 0x00000008;
    private const int JOB_OBJECT_LIMIT_PROCESS_MEMORY = 0x00000100;
    private const int JOB_OBJECT_LIMIT_JOB_MEMORY = 0x00000200;
    private const int JOB_OBJECT_LIMIT_CPU_RATE = 0x00008000;
    private const int JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x00002000;
    private const int JOB_OBJECT_LIMIT_PRIORITY_CLASS = 0x00000020;
    private const int JOB_OBJECT_POST_AT_END_OF_JOB = 1;
    private const uint JOB_OBJECT_MSG_END_OF_JOB_TIME = 1;
    private const uint JOB_OBJECT_MSG_END_OF_PROCESS_TIME = 2;
    private const uint JOB_OBJECT_MSG_ACTIVE_PROCESS_LIMIT = 3;
    private const uint JOB_OBJECT_MSG_ACTIVE_PROCESS_ZERO = 4;
    private const uint JOB_OBJECT_MSG_NEW_PROCESS = 6;
    private const uint JOB_OBJECT_MSG_EXIT_PROCESS = 7;
    private const uint JOB_OBJECT_MSG_ABNORMAL_EXIT_PROCESS = 8;
    private const uint JOB_OBJECT_MSG_PROCESS_MEMORY_LIMIT = 9;
    private const uint JOB_OBJECT_MSG_JOB_MEMORY_LIMIT = 10;
    private const uint INFINITE = 0xFFFFFFFF;
    
    public JobObjectManager(ILogger<JobObjectManager> logger)
    {
        _logger = logger;
    }
    
    public Task<CreateJobObjectResponse> CreateJobObjectAsync(CreateJobObjectRequest request)
    {
        return Task.Run(() =>
        {
            lock (_lock)
            {
                try
                {
                    // Close existing job with same name if it exists
                    if (_jobs.TryGetValue(request.JobName, out var existingJob))
                    {
                        _logger.LogWarning("Job '{JobName}' already exists, closing previous instance", request.JobName);
                        existingJob.Handle.Dispose();
                        _jobs.Remove(request.JobName);
                    }
                    
                    // Create the job object
                    var jobHandle = CreateJobObject(IntPtr.Zero, request.JobName);
                    if (jobHandle.IsInvalid)
                    {
                        var error = Marshal.GetLastWin32Error();
                        throw new InvalidOperationException($"Failed to create job object. Error: {error}");
                    }
                    
                    // Configure job limits
                    var limitInfo = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
                    var flags = 0u;
                    
                    // Memory limit
                    if (request.MemoryLimitBytes.HasValue && request.MemoryLimitBytes.Value > 0)
                    {
                        limitInfo.BasicLimitInformation.LimitFlags |= JOB_OBJECT_LIMIT_PROCESS_MEMORY;
                        limitInfo.ProcessMemoryLimit = new IntPtr(request.MemoryLimitBytes.Value);
                        flags |= JOB_OBJECT_LIMIT_PROCESS_MEMORY;
                        _logger.LogInformation("Setting memory limit: {MemoryLimit} bytes", request.MemoryLimitBytes.Value);
                    }
                    
                    // Active process limit
                    if (request.ActiveProcessLimit.HasValue && request.ActiveProcessLimit.Value > 0)
                    {
                        limitInfo.BasicLimitInformation.LimitFlags |= JOB_OBJECT_LIMIT_ACTIVE_PROCESS;
                        limitInfo.BasicLimitInformation.ActiveProcessLimit = (uint)request.ActiveProcessLimit.Value;
                        flags |= JOB_OBJECT_LIMIT_ACTIVE_PROCESS;
                        _logger.LogInformation("Setting active process limit: {ProcessLimit}", request.ActiveProcessLimit.Value);
                    }
                    
                    // Kill on close
                    if (request.KillProcessesOnJobClose ?? true)
                    {
                        limitInfo.BasicLimitInformation.LimitFlags |= JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
                        flags |= JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
                        _logger.LogInformation("Enabling kill on job close");
                    }
                    
                    // Apply limits
                    if (limitInfo.BasicLimitInformation.LimitFlags != 0)
                    {
                        var result = SetInformationJobObject(
                            jobHandle.DangerousGetHandle(),
                            JobObjectExtendedLimitInformation,
                            ref limitInfo,
                            (uint)Marshal.SizeOf<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>());
                        
                        if (!result)
                        {
                            var error = Marshal.GetLastWin32Error();
                            throw new InvalidOperationException($"Failed to set job limits. Error: {error}");
                        }
                    }
                    
                    // CPU rate limit (separate structure)
                    if (request.CpuRatePercent.HasValue && request.CpuRatePercent.Value > 0 && request.CpuRatePercent.Value <= 100)
                    {
                        var cpuInfo = new JOBOBJECT_CPU_RATE_CONTROL_INFORMATION
                        {
                            ControlFlags = 0x1 | 0x2, // Enable | Hard cap
                            CpuRate = (uint)request.CpuRatePercent.Value * 100 // Convert to tenths of percent
                        };
                        
                        var result = SetInformationJobObject(
                            jobHandle.DangerousGetHandle(),
                            JobObjectCpuRateControlInformation,
                            ref cpuInfo,
                            (uint)Marshal.SizeOf<JOBOBJECT_CPU_RATE_CONTROL_INFORMATION>());
                        
                        if (!result)
                        {
                            _logger.LogWarning("Failed to set CPU rate limit, may not be supported on this system");
                        }
                        else
                        {
                            _logger.LogInformation("Setting CPU rate limit: {CpuRate}%", request.CpuRatePercent.Value);
                        }
                    }
                    
                    // Store job info
                    _jobs[request.JobName] = new JobObjectInfo
                    {
                        Name = request.JobName,
                        Handle = jobHandle,
                        CreatedAt = DateTime.UtcNow,
                        MemoryLimit = request.MemoryLimitBytes,
                        CpuRate = request.CpuRatePercent,
                        ActiveProcessLimit = request.ActiveProcessLimit
                    };
                    
                    _logger.LogInformation("Created job object '{JobName}'", request.JobName);
                    
                    return new CreateJobObjectResponse
                    {
                        Success = true,
                        JobName = request.JobName
                    };
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to create job object '{JobName}'", request.JobName);
                    return new CreateJobObjectResponse
                    {
                        Success = false,
                        JobName = request.JobName,
                        Error = ex.Message
                    };
                }
            }
        });
    }
    
    public Task<bool> AssignProcessToJobAsync(AssignProcessToJobRequest request)
    {
        return Task.Run(() =>
        {
            lock (_lock)
            {
                try
                {
                    if (!_jobs.TryGetValue(request.JobName, out var jobInfo))
                    {
                        throw new InvalidOperationException($"Job '{request.JobName}' not found");
                    }
                    
                    // Open the target process
                    var processHandle = OpenProcess(ProcessAccessFlags.PROCESS_SET_QUOTA | ProcessAccessFlags.PROCESS_TERMINATE, false, (uint)request.ProcessId);
                    if (processHandle == IntPtr.Zero)
                    {
                        var error = Marshal.GetLastWin32Error();
                        throw new InvalidOperationException($"Failed to open process {request.ProcessId}. Error: {error}");
                    }
                    
                    try
                    {
                        // Check if process is already in a job
                        if (IsProcessInJob(processHandle, IntPtr.Zero, out var inJob) && inJob)
                        {
                            _logger.LogWarning("Process {ProcessId} is already in a job object", request.ProcessId);
                            // Try to assign anyway (will fail if the job doesn't allow breakaway)
                        }
                        
                        // Assign process to job
                        var result = AssignProcessToJobObject(jobInfo.Handle.DangerousGetHandle(), processHandle);
                        if (!result)
                        {
                            var error = Marshal.GetLastWin32Error();
                            throw new InvalidOperationException($"Failed to assign process to job. Error: {error}");
                        }
                        
                        jobInfo.ProcessIds.Add(request.ProcessId);
                        _logger.LogInformation("Assigned process {ProcessId} to job '{JobName}'", request.ProcessId, request.JobName);
                        
                        return true;
                    }
                    finally
                    {
                        CloseHandle(processHandle);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to assign process {ProcessId} to job '{JobName}'", request.ProcessId, request.JobName);
                    return false;
                }
            }
        });
    }
    
    public Task<bool> TerminateJobAsync(TerminateJobRequest request)
    {
        return Task.Run(() =>
        {
            lock (_lock)
            {
                try
                {
                    if (!_jobs.TryGetValue(request.JobName, out var jobInfo))
                    {
                        throw new InvalidOperationException($"Job '{request.JobName}' not found");
                    }
                    
                    var result = TerminateJobObject(jobInfo.Handle.DangerousGetHandle(), (uint)request.ExitCode);
                    if (!result)
                    {
                        var error = Marshal.GetLastWin32Error();
                        throw new InvalidOperationException($"Failed to terminate job. Error: {error}");
                    }
                    
                    _logger.LogInformation("Terminated job '{JobName}' with exit code {ExitCode}", request.JobName, request.ExitCode);
                    
                    // Clean up
                    jobInfo.Handle.Dispose();
                    _jobs.Remove(request.JobName);
                    
                    return true;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to terminate job '{JobName}'", request.JobName);
                    return false;
                }
            }
        });
    }
    
    public Task<JobStatistics> GetJobStatisticsAsync(string jobName)
    {
        return Task.Run(() =>
        {
            lock (_lock)
            {
                if (!_jobs.TryGetValue(jobName, out var jobInfo))
                {
                    throw new InvalidOperationException($"Job '{jobName}' not found");
                }
                
                var accountingInfo = new JOBOBJECT_BASIC_ACCOUNTING_INFORMATION();
                var returnLength = 0u;
                
                var result = QueryInformationJobObject(
                    jobInfo.Handle.DangerousGetHandle(),
                    JobObjectBasicAccountingInformation,
                    ref accountingInfo,
                    (uint)Marshal.SizeOf<JOBOBJECT_BASIC_ACCOUNTING_INFORMATION>(),
                    ref returnLength);
                
                if (!result)
                {
                    var error = Marshal.GetLastWin32Error();
                    _logger.LogWarning("Failed to query job statistics. Error: {Error}", error);
                }
                
                return new JobStatistics
                {
                    JobName = jobName,
                    ActiveProcesses = (int)accountingInfo.ActiveProcesses,
                    TotalPageFaults = accountingInfo.TotalPageFaults,
                    TotalProcesses = (int)accountingInfo.TotalProcesses,
                    TotalTerminatedProcesses = (int)accountingInfo.TotalTerminatedProcesses,
                    PeakMemoryUsed = 0, // Would need JOBOBJECT_EXTENDED_LIMIT_INFORMATION for this
                    CurrentMemoryUsage = 0
                };
            }
        });
    }
    
    public Task<ListJobsResponse> ListJobsAsync()
    {
        return Task.Run(() =>
        {
            lock (_lock)
            {
                return new ListJobsResponse
                {
                    JobNames = _jobs.Keys.ToList()
                };
            }
        });
    }
    
    public void Dispose()
    {
        lock (_lock)
        {
            foreach (var job in _jobs.Values)
            {
                try
                {
                    job.Handle.Dispose();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error disposing job '{JobName}'", job.Name);
                }
            }
            _jobs.Clear();
        }
    }
    
    // Win32 API Imports
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern SafeFileHandle CreateJobObject(IntPtr lpJobAttributes, string lpName);
    
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool AssignProcessToJobObject(IntPtr hJob, IntPtr hProcess);
    
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool TerminateJobObject(IntPtr hJob, uint uExitCode);
    
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool QueryInformationJobObject(IntPtr hJob, int JobObjectInfoClass, ref JOBOBJECT_BASIC_ACCOUNTING_INFORMATION lpJobObjectInfo, uint cbJobObjectInfoLength, ref uint lpReturnLength);
    
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool SetInformationJobObject(IntPtr hJob, int JobObjectInfoClass, ref JOBOBJECT_EXTENDED_LIMIT_INFORMATION lpJobObjectInfo, uint cbJobObjectInfoLength);
    
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool SetInformationJobObject(IntPtr hJob, int JobObjectInfoClass, ref JOBOBJECT_CPU_RATE_CONTROL_INFORMATION lpJobObjectInfo, uint cbJobObjectInfoLength);
    
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool IsProcessInJob(IntPtr ProcessHandle, IntPtr JobHandle, out bool Result);
    
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr OpenProcess(ProcessAccessFlags dwDesiredAccess, bool bInheritHandle, uint dwProcessId);
    
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr hObject);
    
    // Job Object Information Classes
    private const int JobObjectBasicAccountingInformation = 1;
    private const int JobObjectExtendedLimitInformation = 9;
    private const int JobObjectCpuRateControlInformation = 15;
    
    [Flags]
    private enum ProcessAccessFlags : uint
    {
        PROCESS_TERMINATE = 0x00000001,
        PROCESS_CREATE_THREAD = 0x00000002,
        PROCESS_SET_SESSIONID = 0x00000004,
        PROCESS_VM_OPERATION = 0x00000008,
        PROCESS_VM_READ = 0x00000010,
        PROCESS_VM_WRITE = 0x00000020,
        PROCESS_DUP_HANDLE = 0x00000040,
        PROCESS_CREATE_PROCESS = 0x00000080,
        PROCESS_SET_QUOTA = 0x00000100,
        PROCESS_SET_INFORMATION = 0x00000200,
        PROCESS_QUERY_INFORMATION = 0x00000400,
        PROCESS_SUSPEND_RESUME = 0x00000800,
        PROCESS_QUERY_LIMITED_INFORMATION = 0x00001000,
        PROCESS_ALL_ACCESS = 0x001F0FFF
    }
    
    // Structures
    [StructLayout(LayoutKind.Sequential)]
    private struct JOBOBJECT_BASIC_LIMIT_INFORMATION
    {
        public long PerProcessUserTimeLimit;
        public long PerJobUserTimeLimit;
        public uint LimitFlags;
        public IntPtr MinimumWorkingSetSize;
        public IntPtr MaximumWorkingSetSize;
        public uint ActiveProcessLimit;
        public IntPtr Affinity;
        public uint PriorityClass;
        public uint SchedulingClass;
    }
    
    [StructLayout(LayoutKind.Sequential)]
    private struct IO_COUNTERS
    {
        public ulong ReadOperationCount;
        public ulong WriteOperationCount;
        public ulong OtherOperationCount;
        public ulong ReadTransferCount;
        public ulong WriteTransferCount;
        public ulong OtherTransferCount;
    }
    
    [StructLayout(LayoutKind.Sequential)]
    private struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION
    {
        public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
        public IO_COUNTERS IoInfo;
        public IntPtr ProcessMemoryLimit;
        public IntPtr JobMemoryLimit;
        public IntPtr PeakProcessMemoryUsed;
        public IntPtr PeakJobMemoryUsed;
    }
    
    [StructLayout(LayoutKind.Sequential)]
    private struct JOBOBJECT_BASIC_ACCOUNTING_INFORMATION
    {
        public long TotalUserTime;
        public long TotalKernelTime;
        public long ThisPeriodTotalUserTime;
        public long ThisPeriodTotalKernelTime;
        public uint TotalPageFaults;
        public uint TotalProcesses;
        public uint ActiveProcesses;
        public uint TotalTerminatedProcesses;
    }
    
    [StructLayout(LayoutKind.Sequential)]
    private struct JOBOBJECT_CPU_RATE_CONTROL_INFORMATION
    {
        public uint ControlFlags;
        public uint CpuRate;
    }
    
    private class JobObjectInfo
    {
        public required string Name { get; init; }
        public required SafeFileHandle Handle { get; init; }
        public required DateTime CreatedAt { get; init; }
        public long? MemoryLimit { get; init; }
        public int? CpuRate { get; init; }
        public int? ActiveProcessLimit { get; init; }
        public List<int> ProcessIds { get; } = new();
    }
}
