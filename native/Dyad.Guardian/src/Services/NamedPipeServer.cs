using System.IO.Pipes;
using System.Text;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Dyad.Guardian.Messages;

namespace Dyad.Guardian.Services;

/// <summary>
/// Named Pipe Server for IPC communication with Electron
/// </summary>
public class NamedPipeServer : IDisposable
{
    private const string PipeName = "DyadGuardian";
    private const int BufferSize = 65536;
    
    private NamedPipeServerStream? _pipeServer;
    private StreamReader? _reader;
    private StreamWriter? _writer;
    private CancellationTokenSource? _cts;
    private readonly ILogger<NamedPipeServer> _logger;
    private readonly JobObjectManager _jobManager;
    private readonly CapabilityTokenService _tokenService;
    private readonly WfpManager _wfpManager;
    
    public event EventHandler<GuardianRequest>? OnRequestReceived;
    public event EventHandler<string>? OnClientConnected;
    public event EventHandler? OnClientDisconnected;
    
    public bool IsConnected => _pipeServer?.IsConnected ?? false;
    
    public NamedPipeServer(
        ILogger<NamedPipeServer> logger,
        JobObjectManager jobManager,
        CapabilityTokenService tokenService,
        WfpManager wfpManager)
    {
        _logger = logger;
        _jobManager = jobManager;
        _tokenService = tokenService;
        _wfpManager = wfpManager;
    }
    
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        _cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        
        try
        {
            while (!_cts.Token.IsCancellationRequested)
            {
                _logger.LogInformation("Named Pipe Server waiting for connection on \"{PipeName}\"", PipeName);
                
                _pipeServer = new NamedPipeServerStream(
                    PipeName,
                    PipeDirection.InOut,
                    1,
                    PipeTransmissionMode.Message,
                    PipeOptions.Asynchronous,
                    BufferSize,
                    BufferSize);
                
                await _pipeServer.WaitForConnectionAsync(_cts.Token);
                
                _logger.LogInformation("Client connected to Guardian pipe");
                OnClientConnected?.Invoke(this, PipeName);
                
                _reader = new StreamReader(_pipeServer, Encoding.UTF8);
                _writer = new StreamWriter(_pipeServer, Encoding.UTF8) { AutoFlush = true };
                
                await HandleClientAsync(_cts.Token);
                
                OnClientDisconnected?.Invoke(this, EventArgs.Empty);
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Named Pipe Server stopped");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in Named Pipe Server");
        }
    }
    
    private async Task HandleClientAsync(CancellationToken cancellationToken)
    {
        try
        {
            while (!cancellationToken.IsCancellationRequested && _pipeServer?.IsConnected == true)
            {
                var messageJson = await ReadMessageAsync(cancellationToken);
                
                if (string.IsNullOrEmpty(messageJson))
                    continue;
                
                _logger.LogDebug("Received message: {Message}", messageJson);
                
                try
                {
                    var request = JsonConvert.DeserializeObject<GuardianRequest>(messageJson);
                    if (request != null)
                    {
                        OnRequestReceived?.Invoke(this, request);
                        var response = await ProcessRequestAsync(request);
                        await SendResponseAsync(response, cancellationToken);
                    }
                }
                catch (JsonException ex)
                {
                    _logger.LogError(ex, "Failed to parse message");
                    await SendErrorResponseAsync(null, "Invalid message format", cancellationToken);
                }
            }
        }
        catch (IOException ex) when (ex.Message.Contains("broken pipe", StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogInformation("Client disconnected");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling client");
        }
    }
    
    private async Task<string?> ReadMessageAsync(CancellationToken cancellationToken)
    {
        if (_reader == null) return null;
        
        var sb = new StringBuilder();
        var buffer = new char[1024];
        
        try
        {
            // For message mode pipes, ReadAsync returns when a complete message is received
            int bytesRead;
            while ((bytesRead = await _reader.ReadAsync(buffer, 0, buffer.Length)) > 0)
            {
                sb.Append(buffer, 0, bytesRead);
                
                // Check if we have a complete JSON object
                var content = sb.ToString();
                if (IsCompleteJson(content))
                    break;
            }
            
            return sb.Length > 0 ? sb.ToString() : null;
        }
        catch
        {
            return null;
        }
    }
    
    private bool IsCompleteJson(string content)
    {
        try
        {
            JToken.Parse(content);
            return true;
        }
        catch
        {
            return false;
        }
    }
    
    private async Task<GuardianResponse> ProcessRequestAsync(GuardianRequest request)
    {
        try
        {
            var result = request.Action.ToLowerInvariant() switch
            {
                // Job Object actions
                "job:create" => await HandleCreateJobAsync(request.Payload),
                "job:assign" => await HandleAssignProcessAsync(request.Payload),
                "job:terminate" => await HandleTerminateJobAsync(request.Payload),
                "job:stats" => await HandleGetJobStatsAsync(request.Payload),
                "job:list" => await HandleListJobsAsync(),
                
                // Capability token actions
                "capability:request" => await HandleRequestCapabilityAsync(request.Payload),
                "capability:validate" => await HandleValidateCapabilityAsync(request.Payload),
                "capability:revoke" => await HandleRevokeCapabilityAsync(request.Payload),
                "capability:list" => await HandleListCapabilitiesAsync(),
                
                // WFP actions
                "wfp:create-rule" => await HandleCreateWfpRuleAsync(request.Payload),
                "wfp:delete-rule" => await HandleDeleteWfpRuleAsync(request.Payload),
                "wfp:list-rules" => await HandleListWfpRulesAsync(),
                
                // Health check
                "ping" => await Task.FromResult(new Dictionary<string, object> { ["status"] = "ok", ["timestamp"] = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() }),
                
                _ => throw new NotSupportedException($"Unknown action: {request.Action}")
            };
            
            return new GuardianResponse
            {
                MessageType = "response",
                RequestId = request.MessageId,
                Success = true,
                Data = result as Dictionary<string, object> ?? new Dictionary<string, object> { ["result"] = result }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing request {Action}", request.Action);
            return new GuardianResponse
            {
                MessageType = "response",
                RequestId = request.MessageId,
                Success = false,
                Error = ex.Message
            };
        }
    }
    
    private async Task SendResponseAsync(GuardianResponse response, CancellationToken cancellationToken)
    {
        if (_writer == null) return;
        
        var json = JsonConvert.SerializeObject(response);
        await _writer.WriteAsync(json);
    }
    
    private async Task SendErrorResponseAsync(string? requestId, string error, CancellationToken cancellationToken)
    {
        await SendResponseAsync(new GuardianResponse
        {
            MessageType = "response",
            RequestId = requestId ?? Guid.NewGuid().ToString(),
            Success = false,
            Error = error
        }, cancellationToken);
    }
    
    // Job Object Handlers
    private async Task<Dictionary<string, object>> HandleCreateJobAsync(Dictionary<string, object>? payload)
    {
        if (payload == null) throw new ArgumentException("Payload required");
        
        var request = new CreateJobObjectRequest
        {
            JobName = payload.GetValueOrDefault("jobName")?.ToString() ?? throw new ArgumentException("jobName required"),
            MemoryLimitBytes = payload.TryGetValue("memoryLimitBytes", out var mem) ? Convert.ToInt64(mem) : null,
            CpuRatePercent = payload.TryGetValue("cpuRatePercent", out var cpu) ? Convert.ToInt32(cpu) : null,
            ActiveProcessLimit = payload.TryGetValue("activeProcessLimit", out var proc) ? Convert.ToInt32(proc) : null
        };
        
        var result = await _jobManager.CreateJobObjectAsync(request);
        return new Dictionary<string, object>
        {
            ["success"] = result.Success,
            ["jobName"] = result.JobName,
            ["error"] = result.Error!
        };
    }
    
    private async Task<Dictionary<string, object>> HandleAssignProcessAsync(Dictionary<string, object>? payload)
    {
        if (payload == null) throw new ArgumentException("Payload required");
        
        var request = new AssignProcessToJobRequest
        {
            JobName = payload.GetValueOrDefault("jobName")?.ToString() ?? throw new ArgumentException("jobName required"),
            ProcessId = Convert.ToInt32(payload.GetValueOrDefault("processId"))
        };
        
        var success = await _jobManager.AssignProcessToJobAsync(request);
        return new Dictionary<string, object> { ["success"] = success };
    }
    
    private async Task<Dictionary<string, object>> HandleTerminateJobAsync(Dictionary<string, object>? payload)
    {
        if (payload == null) throw new ArgumentException("Payload required");
        
        var request = new TerminateJobRequest
        {
            JobName = payload.GetValueOrDefault("jobName")?.ToString() ?? throw new ArgumentException("jobName required"),
            ExitCode = payload.TryGetValue("exitCode", out var code) ? Convert.ToInt32(code) : 1
        };
        
        var success = await _jobManager.TerminateJobAsync(request);
        return new Dictionary<string, object> { ["success"] = success };
    }
    
    private async Task<Dictionary<string, object>> HandleGetJobStatsAsync(Dictionary<string, object>? payload)
    {
        var jobName = payload?.GetValueOrDefault("jobName")?.ToString() ?? throw new ArgumentException("jobName required");
        var stats = await _jobManager.GetJobStatisticsAsync(jobName);
        return JsonConvert.DeserializeObject<Dictionary<string, object>>(JsonConvert.SerializeObject(stats))!;
    }
    
    private async Task<Dictionary<string, object>> HandleListJobsAsync()
    {
        var jobs = await _jobManager.ListJobsAsync();
        return new Dictionary<string, object> { ["jobs"] = jobs.JobNames };
    }
    
    // Capability Handlers
    private async Task<Dictionary<string, object>> HandleRequestCapabilityAsync(Dictionary<string, object>? payload)
    {
        if (payload == null) throw new ArgumentException("Payload required");
        
        var request = new RequestCapabilityRequest
        {
            Subject = payload.GetValueOrDefault("subject")?.ToString() ?? throw new ArgumentException("subject required"),
            Resource = payload.GetValueOrDefault("resource")?.ToString() ?? throw new ArgumentException("resource required"),
            Action = payload.GetValueOrDefault("action")?.ToString() ?? throw new ArgumentException("action required"),
            ExpiresInSeconds = payload.TryGetValue("expiresInSeconds", out var exp) ? Convert.ToInt32(exp) : 3600
        };
        
        var result = await _tokenService.RequestCapabilityAsync(request);
        return new Dictionary<string, object>
        {
            ["success"] = result.Success,
            ["token"] = result.Token!,
            ["tokenId"] = result.TokenId!,
            ["expiresAt"] = result.ExpiresAt!
        };
    }
    
    private async Task<Dictionary<string, object>> HandleValidateCapabilityAsync(Dictionary<string, object>? payload)
    {
        if (payload == null) throw new ArgumentException("Payload required");
        
        var request = new ValidateCapabilityRequest
        {
            Token = payload.GetValueOrDefault("token")?.ToString() ?? throw new ArgumentException("token required"),
            Resource = payload.GetValueOrDefault("resource")?.ToString(),
            Action = payload.GetValueOrDefault("action")?.ToString()
        };
        
        var result = await _tokenService.ValidateCapabilityAsync(request);
        return JsonConvert.DeserializeObject<Dictionary<string, object>>(JsonConvert.SerializeObject(result))!;
    }
    
    private async Task<Dictionary<string, object>> HandleRevokeCapabilityAsync(Dictionary<string, object>? payload)
    {
        var tokenId = payload?.GetValueOrDefault("tokenId")?.ToString() ?? throw new ArgumentException("tokenId required");
        var success = await _tokenService.RevokeCapabilityAsync(tokenId);
        return new Dictionary<string, object> { ["success"] = success };
    }
    
    private async Task<Dictionary<string, object>> HandleListCapabilitiesAsync()
    {
        var result = await _tokenService.ListCapabilitiesAsync();
        return new Dictionary<string, object> { ["capabilities"] = result.Capabilities };
    }
    
    // WFP Handlers (placeholders - full implementation later)
    private async Task<Dictionary<string, object>> HandleCreateWfpRuleAsync(Dictionary<string, object>? payload)
    {
        var result = await _wfpManager.CreateRuleAsync(payload ?? new Dictionary<string, object>());
        return result;
    }
    
    private async Task<Dictionary<string, object>> HandleDeleteWfpRuleAsync(Dictionary<string, object>? payload)
    {
        var ruleId = payload?.GetValueOrDefault("ruleId")?.ToString() ?? throw new ArgumentException("ruleId required");
        var success = await _wfpManager.DeleteRuleAsync(ruleId);
        return new Dictionary<string, object> { ["success"] = success };
    }
    
    private async Task<Dictionary<string, object>> HandleListWfpRulesAsync()
    {
        var rules = await _wfpManager.ListRulesAsync();
        return new Dictionary<string, object> { ["rules"] = rules };
    }
    
    public void Stop()
    {
        _cts?.Cancel();
        _pipeServer?.Disconnect();
    }
    
    public void Dispose()
    {
        Stop();
        _reader?.Dispose();
        _writer?.Dispose();
        _pipeServer?.Dispose();
        _cts?.Dispose();
    }
}