using System.Collections.ObjectModel;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Threading;
using Dyad.Guardian.Services;

namespace Dyad.Guardian.UI
{
    public partial class FirewallWindow : Window
    {
        private readonly WfpManager _wfpManager;
        private readonly ObservableCollection<WfpRuleViewModel> _rules;
        private readonly DispatcherTimer _refreshTimer;
        private WfpRuleViewModel? _selectedRule;

        public FirewallWindow(WfpManager wfpManager)
        {
            InitializeComponent();
            _wfpManager = wfpManager;
            _rules = new ObservableCollection<WfpRuleViewModel>();
            RulesDataGrid.ItemsSource = _rules;

            // Setup refresh timer
            _refreshTimer = new DispatcherTimer
            {
                Interval = TimeSpan.FromSeconds(3)
            };
            _refreshTimer.Tick += async (s, e) => await RefreshRulesAsync();
            _refreshTimer.Start();

            // Initial load
            Loaded += async (s, e) => await InitializeAsync();
        }

        private async Task InitializeAsync()
        {
            try
            {
                // Initialize WFP engine
                var initialized = await _wfpManager.InitializeAsync();
                if (initialized)
                {
                    UpdateEngineStatus("WFP Engine: Connected", "#27AE60");
                }
                else
                {
                    UpdateEngineStatus("WFP Engine: Failed", "#E74C3C");
                }

                await RefreshRulesAsync();
            }
            catch (Exception ex)
            {
                UpdateStatus($"Initialization error: {ex.Message}");
                UpdateEngineStatus("WFP Engine: Error", "#E74C3C");
            }
        }

        private async Task RefreshRulesAsync()
        {
            try
            {
                var rules = await _wfpManager.ListRulesAsync();
                var currentRuleIds = new HashSet<string>(rules.Select(r => r["ruleId"]?.ToString() ?? ""));

                // Remove rules that no longer exist
                for (int i = _rules.Count - 1; i >= 0; i--)
                {
                    if (!currentRuleIds.Contains(_rules[i].RuleId))
                    {
                        _rules.RemoveAt(i);
                    }
                }

                // Add or update existing rules
                foreach (var ruleDict in rules)
                {
                    var ruleId = ruleDict["ruleId"]?.ToString() ?? "";
                    var existingRule = _rules.FirstOrDefault(r => r.RuleId == ruleId);
                    
                    if (existingRule == null)
                    {
                        _rules.Add(new WfpRuleViewModel
                        {
                            RuleId = ruleId,
                            Name = ruleDict["name"]?.ToString() ?? "",
                            Direction = ruleDict["direction"]?.ToString() ?? "outbound",
                            Protocol = ruleDict["protocol"]?.ToString() ?? "tcp",
                            LocalPort = ruleDict["localPort"]?.ToString() ?? "",
                            RemotePort = ruleDict["remotePort"]?.ToString() ?? "",
                            RemoteAddress = ruleDict["remoteAddress"]?.ToString() ?? "",
                            Action = ruleDict["action"]?.ToString() ?? "block",
                            Enabled = ruleDict["enabled"] is bool enabled && enabled,
                            CreatedAt = ruleDict["createdAt"] is long createdAt 
                                ? DateTimeOffset.FromUnixTimeMilliseconds(createdAt).DateTime 
                                : DateTime.Now
                        });
                    }
                    else
                    {
                        // Update status
                        existingRule.Enabled = ruleDict["enabled"] is bool enabled && enabled;
                    }
                }

                UpdateStatus($"Loaded {_rules.Count} firewall rules");
            }
            catch (Exception ex)
            {
                UpdateStatus($"Error refreshing rules: {ex.Message}");
            }
        }

        private void AddRule_Click(object sender, RoutedEventArgs e)
        {
            // Reset form to defaults
            RuleNameTextBox.Text = "Block-Outbound-HTTP";
            DirectionComboBox.SelectedIndex = 0;
            ProtocolComboBox.SelectedIndex = 0;
            LocalPortTextBox.Text = "";
            RemotePortTextBox.Text = "80";
            RemoteAddressTextBox.Text = "*";
            ActionComboBox.SelectedIndex = 0;
            ProcessIsolationPanel.Visibility = Visibility.Collapsed;
        }

        private void ProcessIsolation_Click(object sender, RoutedEventArgs e)
        {
            ProcessIsolationPanel.Visibility = Visibility.Visible;
            IsolationProcessIdTextBox.Text = "";
            AllowedHostsTextBox.Text = "localhost,127.0.0.1";
            IsolationProcessIdTextBox.Focus();
        }

        private async void CreateRuleConfirm_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var direction = (DirectionComboBox.SelectedItem as ComboBoxItem)?.Content?.ToString() ?? "outbound";
                var protocol = (ProtocolComboBox.SelectedItem as ComboBoxItem)?.Content?.ToString() ?? "tcp";
                var action = (ActionComboBox.SelectedItem as ComboBoxItem)?.Content?.ToString() ?? "block";

                var config = new Dictionary<string, object>
                {
                    ["name"] = RuleNameTextBox.Text,
                    ["direction"] = direction,
                    ["protocol"] = protocol,
                    ["localPort"] = LocalPortTextBox.Text,
                    ["remotePort"] = RemotePortTextBox.Text,
                    ["remoteAddress"] = RemoteAddressTextBox.Text,
                    ["action"] = action
                };

                var result = await _wfpManager.CreateRuleAsync(config);
                if (result.TryGetValue("created", out var created) && created is true)
                {
                    var ruleId = result["ruleId"]?.ToString() ?? "";
                    UpdateStatus($"Created rule: {result["name"]} ({ruleId.Substring(0, 8)}...)");
                    await RefreshRulesAsync();
                    
                    MessageBox.Show(
                        $"Firewall rule created successfully!\n\nRule: {result["name"]}\nID: {ruleId}\n\nDirection: {direction}\nProtocol: {protocol}\nAction: {action}",
                        "Rule Created",
                        MessageBoxButton.OK,
                        MessageBoxImage.Information);
                }
                else
                {
                    var error = result.TryGetValue("error", out var err) ? err?.ToString() : "Unknown error";
                    UpdateStatus($"Failed to create rule: {error}");
                    MessageBox.Show(
                        $"Failed to create rule: {error}",
                        "Error",
                        MessageBoxButton.OK,
                        MessageBoxImage.Error);
                }
            }
            catch (Exception ex)
            {
                UpdateStatus($"Error creating rule: {ex.Message}");
                MessageBox.Show(
                    $"Error creating rule: {ex.Message}",
                    "Error",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error);
            }
        }

        private async void CreateIsolationConfirm_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                if (!int.TryParse(IsolationProcessIdTextBox.Text, out var processId))
                {
                    MessageBox.Show("Please enter a valid process ID.", "Invalid Input", MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }

                var allowedHosts = AllowedHostsTextBox.Text
                    .Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(h => h.Trim())
                    .Where(h => !string.IsNullOrEmpty(h))
                    .ToArray();

                if (allowedHosts.Length == 0)
                {
                    MessageBox.Show("Please enter at least one allowed host.", "Invalid Input", MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }

                var ruleId = await _wfpManager.CreateProcessIsolationRuleAsync(processId, allowedHosts);
                if (!string.IsNullOrEmpty(ruleId))
                {
                    UpdateStatus($"Created isolation rule for PID {processId}");
                    await RefreshRulesAsync();
                    
                    MessageBox.Show(
                        $"Process isolation rule created successfully!\n\nProcess ID: {processId}\nRule ID: {ruleId}\nAllowed Hosts: {string.Join(", ", allowedHosts)}\n\nAll other network traffic from this process will be blocked.",
                        "Isolation Rule Created",
                        MessageBoxButton.OK,
                        MessageBoxImage.Information);
                    
                    ProcessIsolationPanel.Visibility = Visibility.Collapsed;
                }
                else
                {
                    UpdateStatus($"Failed to create isolation rule for PID {processId}");
                    MessageBox.Show(
                        "Failed to create isolation rule. Check the logs for details.",
                        "Error",
                        MessageBoxButton.OK,
                        MessageBoxImage.Error);
                }
            }
            catch (Exception ex)
            {
                UpdateStatus($"Error creating isolation: {ex.Message}");
                MessageBox.Show(
                    $"Error creating isolation rule: {ex.Message}",
                    "Error",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error);
            }
        }

        private void EditRule_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && button.DataContext is WfpRuleViewModel rule)
            {
                _selectedRule = rule;
                
                // Populate form with rule data
                RuleNameTextBox.Text = rule.Name;
                DirectionComboBox.SelectedItem = FindComboBoxItem(DirectionComboBox, rule.Direction);
                ProtocolComboBox.SelectedItem = FindComboBoxItem(ProtocolComboBox, rule.Protocol);
                LocalPortTextBox.Text = rule.LocalPort;
                RemotePortTextBox.Text = rule.RemotePort;
                RemoteAddressTextBox.Text = rule.RemoteAddress;
                ActionComboBox.SelectedItem = FindComboBoxItem(ActionComboBox, rule.Action);
                
                UpdateStatus($"Editing rule: {rule.Name}");
                MessageBox.Show(
                    $"Editing rule: {rule.Name}\n\nNote: To modify the rule, delete it and create a new one with the updated settings.",
                    "Edit Rule",
                    MessageBoxButton.OK,
                    MessageBoxImage.Information);
            }
        }

        private async void DeleteRule_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && button.DataContext is WfpRuleViewModel rule)
            {
                var result = MessageBox.Show(
                    $"Are you sure you want to delete rule '{rule.Name}'?\n\nThis action cannot be undone.",
                    "Confirm Deletion",
                    MessageBoxButton.YesNo,
                    MessageBoxImage.Warning);

                if (result == MessageBoxResult.Yes)
                {
                    try
                    {
                        var success = await _wfpManager.DeleteRuleAsync(rule.RuleId);
                        if (success)
                        {
                            UpdateStatus($"Deleted rule: {rule.Name}");
                            await RefreshRulesAsync();
                        }
                        else
                        {
                            UpdateStatus($"Failed to delete rule: {rule.Name}");
                            MessageBox.Show(
                                "Failed to delete rule. It may have already been removed.",
                                "Error",
                                MessageBoxButton.OK,
                                MessageBoxImage.Error);
                        }
                    }
                    catch (Exception ex)
                    {
                        UpdateStatus($"Error deleting rule: {ex.Message}");
                        MessageBox.Show(
                            $"Error deleting rule: {ex.Message}",
                            "Error",
                            MessageBoxButton.OK,
                            MessageBoxImage.Error);
                    }
                }
            }
        }

        private async void RefreshRules_Click(object sender, RoutedEventArgs e)
        {
            UpdateStatus("Refreshing rules...");
            await RefreshRulesAsync();
        }

        private ComboBoxItem? FindComboBoxItem(ComboBox comboBox, string content)
        {
            foreach (ComboBoxItem item in comboBox.Items)
            {
                if (item.Content?.ToString()?.Equals(content, StringComparison.OrdinalIgnoreCase) == true)
                {
                    return item;
                }
            }
            return null;
        }

        private void UpdateStatus(string message)
        {
            Dispatcher.Invoke(() =>
            {
                StatusTextBlock.Text = $"{DateTime.Now:HH:mm:ss} - {message}";
            });
        }

        private void UpdateEngineStatus(string message, string color)
        {
            Dispatcher.Invoke(() =>
            {
                EngineStatusTextBlock.Text = message;
                EngineStatusTextBlock.Foreground = new System.Windows.Media.SolidColorBrush(
                    (System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString(color)!);
            });
        }

        protected override void OnClosing(System.ComponentModel.CancelEventArgs e)
        {
            _refreshTimer.Stop();
            base.OnClosing(e);
        }
    }

    public class WfpRuleViewModel
    {
        public string RuleId { get; set; } = "";
        public string Name { get; set; } = "";
        public string Direction { get; set; } = "";
        public string Protocol { get; set; } = "";
        public string LocalPort { get; set; } = "";
        public string RemotePort { get; set; } = "";
        public string RemoteAddress { get; set; } = "";
        public string Action { get; set; } = "";
        public bool Enabled { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
