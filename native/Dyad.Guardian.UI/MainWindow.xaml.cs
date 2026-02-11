using System.Collections.ObjectModel;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Threading;
using Dyad.Guardian.Messages;
using Dyad.Guardian.Services;
using Microsoft.Extensions.Logging;

namespace Dyad.Guardian.UI;

public partial class MainWindow : Window
{
    private readonly DispatcherTimer _refreshTimer;
    private readonly ObservableCollection<SecurityEventViewModel> _events = new();
    private readonly JobObjectManager _jobManager;
    private readonly CapabilityTokenService _tokenService;
    private readonly WfpManager _wfpManager;
    
    public MainWindow()
    {
        InitializeComponent();
        
        // Initialize services (would normally use DI)
        var loggerFactory = LoggerFactory.Create(builder => builder.AddConsole());
        _jobManager = new JobObjectManager(loggerFactory.CreateLogger<JobObjectManager>());
        _tokenService = new CapabilityTokenService(loggerFactory.CreateLogger<CapabilityTokenService>());
        _wfpManager = new WfpManager(loggerFactory.CreateLogger<WfpManager>());
        
        // Setup data grid
        EventsDataGrid.ItemsSource = _events;
        
        // Setup refresh timer
        _refreshTimer = new DispatcherTimer
        {
            Interval = TimeSpan.FromSeconds(2)
        };
        _refreshTimer.Tick += async (s, e) => await RefreshDataAsync();
        _refreshTimer.Start();
        
        // Initial load
        Loaded += async (s, e) => await RefreshDataAsync();
    }
    
    private async Task RefreshDataAsync()
    {
        try
        {
            // Refresh job count
            var jobs = await _jobManager.ListJobsAsync();
            ActiveJobsCount.Text = jobs.JobNames.Count.ToString();
            
            // Refresh token count
            var tokens = await _tokenService.ListCapabilitiesAsync();
            ActiveTokensCount.Text = tokens.Capabilities.Count(c => !c.Revoked).ToString();
            
            // Refresh firewall rules
            var rules = await _wfpManager.ListRulesAsync();
            FirewallRulesCount.Text = rules.Count.ToString();
            
            // Update status indicator
            StatusIndicator.Fill = new SolidColorBrush(Colors.Green);
            StatusText.Text = "Connected";
        }
        catch (Exception ex)
        {
            StatusIndicator.Fill = new SolidColorBrush(Colors.Red);
            StatusText.Text = "Disconnected";
            AddEvent("Error", $"Failed to refresh: {ex.Message}", "Error");
        }
    }
    
    private void AddEvent(string eventType, string description, string status)
    {
        Dispatcher.Invoke(() =>
        {
            _events.Insert(0, new SecurityEventViewModel
            {
                Time = DateTime.Now.ToString("HH:mm:ss"),
                EventType = eventType,
                Description = description,
                Status = status
            });
            
            // Keep only last 100 events
            while (_events.Count > 100)
                _events.RemoveAt(_events.Count - 1);
        });
    }
    
    private void NavDashboard_Click(object sender, RoutedEventArgs e)
    {
        // Already on dashboard
    }
    
    private void NavJobs_Click(object sender, RoutedEventArgs e)
    {
        var jobsWindow = new JobObjectsWindow(_jobManager);
        jobsWindow.Show();
    }
    
    private void NavTokens_Click(object sender, RoutedEventArgs e)
    {
        var tokensWindow = new TokensWindow(_tokenService);
        tokensWindow.Show();
    }
    
    private void NavFirewall_Click(object sender, RoutedEventArgs e)
    {
        var firewallWindow = new FirewallWindow(_wfpManager);
        firewallWindow.Show();
    }
    
    private void NavEvents_Click(object sender, RoutedEventArgs e)
    {
        // Already showing events
    }
    
    protected override void OnClosing(System.ComponentModel.CancelEventArgs e)
    {
        _refreshTimer.Stop();
        e.Cancel = true;
        Hide();
    }
}

public class SecurityEventViewModel
{
    public string Time { get; set; } = "";
    public string EventType { get; set; } = "";
    public string Description { get; set; } = "";
    public string Status { get; set; } = "";
}