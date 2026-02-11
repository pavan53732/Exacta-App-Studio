namespace Dyad.Guardian.Services;

/// <summary>
/// Background worker that hosts the Guardian service
/// </summary>
public class GuardianWorker : BackgroundService
{
    private readonly ILogger<GuardianWorker> _logger;
    private readonly NamedPipeServer _pipeServer;
    
    public GuardianWorker(
        ILogger<GuardianWorker> logger,
        NamedPipeServer pipeServer)
    {
        _logger = logger;
        _pipeServer = pipeServer;
    }
    
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Dyad Guardian Service starting...");
        
        _pipeServer.OnClientConnected += (sender, pipeName) =>
        {
            _logger.LogInformation("Electron client connected via pipe: {PipeName}", pipeName);
        };
        
        _pipeServer.OnClientDisconnected += (sender, args) =>
        {
            _logger.LogInformation("Electron client disconnected");
        };
        
        _pipeServer.OnRequestReceived += (sender, request) =>
        {
            _logger.LogDebug("Request received: {Action} ({MessageId})", request.Action, request.MessageId);
        };
        
        await _pipeServer.StartAsync(stoppingToken);
    }
    
    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Dyad Guardian Service stopping...");
        _pipeServer.Stop();
        await base.StopAsync(cancellationToken);
    }
}