using Dyad.Guardian;
using Dyad.Guardian.Services;

var builder = Host.CreateApplicationBuilder(args);

// Configure as console app (not Windows Service) for Dyad-launched mode
// Can be switched to Windows Service by uncommenting below:
// builder.Services.AddWindowsService(options =>
// {
//     options.ServiceName = "Dyad Guardian Service";
// });

// Add singleton services
builder.Services.AddSingleton<NamedPipeServer>();
builder.Services.AddSingleton<JobObjectManager>();
builder.Services.AddSingleton<CapabilityTokenService>();
builder.Services.AddSingleton<WfpManager>();

// Add hosted service
builder.Services.AddHostedService<GuardianWorker>();

var host = builder.Build();
await host.RunAsync();