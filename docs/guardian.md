# Dyad Guardian Service

The **Dyad Guardian Service** is a .NET 8 Windows service that provides enterprise-grade process isolation, capability-based security, and network filtering for the Exacta/Dyad desktop application.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Electron Renderer Process                        │
│                          (React UI, Sandboxed)                           │
├─────────────────────────────────────────────────────────────────────────┤
│                         Node.js Main Process                             │
│                    (IPC Handlers, App Logic)                             │
│         ┌─────────────────────────────────────────┐                     │
│         │     guardian_handlers.ts                │                     │
│         │  - Named pipe client                    │                     │
│         │  - Message routing                      │                     │
│         └─────────────────────────────────────────┘                     │
├─────────────────────────────────────────────────────────────────────────┤
│                        Named Pipe (\\.\pipe\DyadGuardian)               │
├─────────────────────────────────────────────────────────────────────────┤
│                      .NET 8 Guardian Service                             │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐   │
│  │ NamedPipe    │  │ JobObject    │  │ Capability   │  │ WFP        │   │
│  │ Server       │  │ Manager      │  │ Token Svc    │  │ Manager    │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Windows Kernel (Win32 APIs)                          │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │ Job Objects  │  │ ACL/Security │  │ WFP Filters  │                   │
│  └──────────────┘  └──────────────┘  └──────────────┘                   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Features

### 1. Process Isolation (Job Objects)

Windows Job Objects allow grouping processes together and enforcing resource limits:

- **Memory Limits**: Restrict maximum memory per process
- **CPU Rate Limiting**: Throttle CPU usage (1-100%)
- **Process Limits**: Cap maximum concurrent processes
- **Kill on Close**: Automatically terminate all processes when job closes
- **Statistics**: Track page faults, active processes, memory usage

### 2. Capability-Based Security

JWT-based capability tokens provide fine-grained access control:

```
Resource Format:  <type>:<identifier>
  - file:/path/to/file
  - process:node
  - network:api.example.com
  - app:my-app-id

Actions: read, write, execute, connect, admin
```

**Features:**
- Time-limited tokens (default 1 hour, max 24 hours)
- Wildcard resource matching (`file:/home/user/*`)
- Hierarchical action permissions (admin > write > read)
- Token revocation
- Constraint system for additional restrictions

### 3. Network Filtering (WFP)

Windows Filtering Platform integration for network isolation:

- **Per-Process Rules**: Block/allow traffic by process
- **Protocol Filtering**: TCP, UDP, or any
- **Port Filtering**: Local and remote port ranges
- **Address Filtering**: IP-based allowlists/blocklists
- **Dynamic Updates**: Add/remove rules at runtime

## Project Structure

```
native/Dyad.Guardian/
├── Dyad.Guardian.csproj          # .NET 8 project file
├── Dyad.Guardian.sln             # Solution file
├── Program.cs                    # Service entry point
├── appsettings.json              # Configuration
└── src/
    ├── Messages/                 # Message contracts
    │   ├── GuardianMessage.cs    # Base message types
    │   ├── JobObjectMessages.cs  # Job Object DTOs
    │   ├── CapabilityMessages.cs # Token DTOs
    │   └── ...
    └── Services/
        ├── NamedPipeServer.cs    # IPC server
        ├── GuardianWorker.cs     # Hosted service
        ├── JobObjectManager.cs   # Job Object implementation
        ├── CapabilityTokenService.cs  # Token management
        └── WfpManager.cs         # Firewall management (stub)
```

## Building

### Prerequisites

- .NET 8 SDK
- Windows 10/11 (for Job Object and WFP APIs)

### Build Commands

```bash
# Restore dependencies
npm run guardian:restore

# Build (debug)
npm run guardian:build

# Publish (release, single-file, self-contained)
npm run guardian:publish

# Run interactively
npm run guardian:start

# Watch mode (development)
npm run guardian:watch
```

## Integration with Electron

### 1. IPC Contracts (TypeScript)

Located in `src/ipc/types/guardian.ts`:

```typescript
// Job Object operations
export const guardianContracts = {
  createJob: defineContract({
    channel: "guardian:create-job",
    input: CreateJobRequestSchema,
    output: CreateJobResponseSchema,
  }),
  // ... more contracts
};
```

### 2. Using from React

```typescript
import { guardianClient } from "@/ipc/types/guardian";
import { IpcClient } from "@/ipc/ipc_client";

// Create a job with resource limits
const createSandboxedProcess = async (command: string) => {
  const ipc = IpcClient.getInstance();
  
  // 1. Create job object
  await ipc.createJob({
    jobName: "sandbox-1",
    memoryLimitBytes: 512 * 1024 * 1024,  // 512MB
    cpuRatePercent: 50,                   // 50% CPU
    activeProcessLimit: 5,
    killProcessesOnJobClose: true,
  });
  
  // 2. Spawn process
  const proc = spawn(command, [], { detached: true });
  
  // 3. Assign to job
  await ipc.assignProcessToJob({
    jobName: "sandbox-1",
    processId: proc.pid!,
  });
  
  return proc;
};

// Request capability token
const requestFileAccess = async (path: string) => {
  const ipc = IpcClient.getInstance();
  
  const token = await ipc.requestCapability({
    subject: "user-session-1",
    resource: `file:${path}`,
    action: "read",
    expiresInSeconds: 3600,
  });
  
  return token;
};
```

### 3. React Hook Example

```typescript
// src/hooks/useGuardian.ts
import { useMutation, useQuery } from "@tanstack/react-query";
import { guardianClient } from "@/ipc/types/guardian";

export function useGuardian() {
  const createJob = useMutation({
    mutationFn: guardianClient.createJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guardian", "jobs"] });
    },
  });
  
  const listJobs = useQuery({
    queryKey: ["guardian", "jobs"],
    queryFn: guardianClient.listJobs,
  });
  
  return { createJob, listJobs };
}
```

## Message Protocol

### Request Format

```json
{
  "MessageId": "uuid",
  "MessageType": "request",
  "Timestamp": 1234567890,
  "Action": "job:create",
  "Payload": {
    "jobName": "my-job",
    "memoryLimitBytes": 536870912
  }
}
```

### Response Format

```json
{
  "MessageId": "uuid",
  "MessageType": "response",
  "Timestamp": 1234567890,
  "RequestId": "original-uuid",
  "Success": true,
  "Data": {
    "success": true,
    "jobName": "my-job"
  }
}
```

### Error Response

```json
{
  "MessageId": "uuid",
  "MessageType": "response",
  "Timestamp": 1234567890,
  "RequestId": "original-uuid",
  "Success": false,
  "Error": "Job already exists"
}
```

## Configuration

### appsettings.json

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Dyad.Guardian": "Debug"
    }
  },
  "Guardian": {
    "PipeName": "DyadGuardian",
    "MaxConcurrentConnections": 1,
    "RequestTimeoutSeconds": 30,
    "CapabilityTokenExpiryHours": 1,
    "MaxCapabilityTokenExpiryHours": 24
  }
}
```

## Security Considerations

1. **Named Pipe Security**: The pipe `\\.\pipe\DyadGuardian` is accessible to any process running as the same user. Consider adding ACL restrictions for production.

2. **Token Signing**: Currently uses per-session random keys. For production, use a persisted secure key (e.g., Windows DPAPI or TPM).

3. **Elevation**: Job Object and WFP operations require elevated privileges. Run the Guardian service as Administrator or as a Windows Service.

4. **Input Validation**: All inputs are validated via Zod schemas before reaching the Guardian service.

## Future Enhancements

### Phase 4: WPF Dashboard

A system tray dashboard for real-time monitoring:

```
native/Dyad.Guardian.UI/
├── MainWindow.xaml          # Process monitor
├── TrayIcon.xaml            # System tray integration
├── TokenViewer.xaml         # Active capability tokens
└── EventLog.xaml            # Security events
```

### Phase 5: Full WFP Implementation

Complete Windows Filtering Platform integration:

- Kernel-level network filtering
- Per-process firewall rules
- Traffic inspection and logging
- Integration with Windows Defender

### Windows Service Mode

Convert from console app to Windows Service:

```csharp
// In Program.cs, uncomment:
builder.Services.AddWindowsService(options =>
{
    options.ServiceName = "Dyad Guardian Service";
});
```

Then install:
```powershell
sc create "Dyad Guardian" binPath="C:\Program Files\Dyad\Dyad.Guardian.exe"
sc start "Dyad Guardian"
```

## Troubleshooting

### Connection Issues

```bash
# Check if pipe exists
dir \\.\pipe\ | findstr DyadGuardian

# Check for service process
tasklist | findstr Dyad.Guardian

# View logs
dotnet run --project native/Dyad.Guardian -- --verbosity debug
```

### Build Issues

```bash
# Clean and rebuild
cd native/Dyad.Guardian
dotnet clean
dotnet restore
dotnet build

# For single-file publish issues
dotnet publish -r win-x64 --self-contained -p:PublishSingleFile=true
```

## API Reference

### Job Object Actions

| Action | Description |
|--------|-------------|
| `job:create` | Create a new job object with limits |
| `job:assign` | Assign process to job |
| `job:terminate` | Kill all processes in job |
| `job:stats` | Get job statistics |
| `job:list` | List all active jobs |

### Capability Actions

| Action | Description |
|--------|-------------|
| `capability:request` | Issue new capability token |
| `capability:validate` | Validate token |
| `capability:revoke` | Revoke token |
| `capability:list` | List active tokens |

### WFP Actions

| Action | Description |
|--------|-------------|
| `wfp:create-rule` | Create firewall rule |
| `wfp:delete-rule` | Delete firewall rule |
| `wfp:list-rules` | List active rules |

## License

This component follows the same license as the main Dyad project (MIT).