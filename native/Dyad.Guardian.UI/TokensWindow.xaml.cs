using System.Collections.ObjectModel;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Threading;
using Dyad.Guardian.Messages;
using Dyad.Guardian.Services;

namespace Dyad.Guardian.UI
{
    public partial class TokensWindow : Window
    {
        private readonly CapabilityTokenService _tokenService;
        private readonly ObservableCollection<TokenViewModel> _tokens;
        private readonly DispatcherTimer _refreshTimer;
        private TokenViewModel? _selectedToken;

        public TokensWindow(CapabilityTokenService tokenService)
        {
            InitializeComponent();
            _tokenService = tokenService;
            _tokens = new ObservableCollection<TokenViewModel>();
            TokensDataGrid.ItemsSource = _tokens;

            // Setup refresh timer
            _refreshTimer = new DispatcherTimer
            {
                Interval = TimeSpan.FromSeconds(3)
            };
            _refreshTimer.Tick += async (s, e) => await RefreshTokensAsync();
            _refreshTimer.Start();

            // Initial load
            Loaded += async (s, e) => await RefreshTokensAsync();
        }

        private async Task RefreshTokensAsync()
        {
            try
            {
                var response = await _tokenService.ListCapabilitiesAsync();
                var currentTokens = new HashSet<string>(response.Capabilities.Select(c => c.TokenId));

                // Remove tokens that no longer exist
                for (int i = _tokens.Count - 1; i >= 0; i--)
                {
                    if (!currentTokens.Contains(_tokens[i].TokenId))
                    {
                        _tokens.RemoveAt(i);
                    }
                }

                // Add or update existing tokens
                foreach (var info in response.Capabilities)
                {
                    var existingToken = _tokens.FirstOrDefault(t => t.TokenId == info.TokenId);
                    if (existingToken == null)
                    {
                        _tokens.Add(new TokenViewModel
                        {
                            TokenId = info.TokenId,
                            Subject = info.Subject,
                            Resource = info.Resource,
                            Action = info.Action,
                            IssuedAt = DateTimeOffset.FromUnixTimeMilliseconds(info.IssuedAt).DateTime,
                            ExpiresAt = DateTimeOffset.FromUnixTimeMilliseconds(info.ExpiresAt).DateTime,
                            Revoked = info.Revoked
                        });
                    }
                    else
                    {
                        // Update revocation status
                        existingToken.Revoked = info.Revoked;
                    }
                }

                UpdateStatus($"Loaded {_tokens.Count} capability tokens");
            }
            catch (Exception ex)
            {
                UpdateStatus($"Error refreshing tokens: {ex.Message}");
            }
        }

        private void RequestToken_Click(object sender, RoutedEventArgs e)
        {
            // Reset form to defaults
            SubjectTextBox.Text = "user-session";
            ResourceTextBox.Text = "file:C:/test/*";
            ActionComboBox.SelectedIndex = 0;
            ExpiresInTextBox.Text = "3600";
            ValidateTokenPanel.Visibility = Visibility.Collapsed;
        }

        private async void RequestTokenConfirm_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var selectedAction = (ActionComboBox.SelectedItem as ComboBoxItem)?.Content?.ToString() ?? "read";
                var expiresInSeconds = int.TryParse(ExpiresInTextBox.Text, out var exp) ? exp : 3600;

                var request = new RequestCapabilityRequest
                {
                    Subject = SubjectTextBox.Text,
                    Resource = ResourceTextBox.Text,
                    Action = selectedAction,
                    ExpiresInSeconds = expiresInSeconds
                };

                var result = await _tokenService.RequestCapabilityAsync(request);
                if (result.Success)
                {
                    UpdateStatus($"Created token: {result.TokenId?.Substring(0, 8)}...");
                    await RefreshTokensAsync();
                    
                    // Show the token in a message box (truncated for security)
                    var displayToken = result.Token?.Length > 50 
                        ? result.Token.Substring(0, 50) + "..." 
                        : result.Token;
                    MessageBox.Show(
                        $"Token created successfully!\n\nToken ID: {result.TokenId}\nExpires: {DateTimeOffset.FromUnixTimeMilliseconds(result.ExpiresAt ?? 0):g}\n\nToken:\n{displayToken}\n\nCopy this token now - it won't be shown again!",
                        "Token Created",
                        MessageBoxButton.OK,
                        MessageBoxImage.Information);
                }
                else
                {
                    UpdateStatus($"Failed to create token: {result.Error}");
                    MessageBox.Show(
                        $"Failed to create token: {result.Error}",
                        "Error",
                        MessageBoxButton.OK,
                        MessageBoxImage.Error);
                }
            }
            catch (Exception ex)
            {
                UpdateStatus($"Error: {ex.Message}");
                MessageBox.Show(
                    $"Error creating token: {ex.Message}",
                    "Error",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error);
            }
        }

        private void ValidateToken_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && button.DataContext is TokenViewModel token)
            {
                _selectedToken = token;
                ValidateTokenPanel.Visibility = Visibility.Visible;
                ValidateTokenTextBox.Text = "";
                ValidateTokenTextBox.Focus();
                UpdateStatus($"Ready to validate token for {token.Subject}");
            }
        }

        private async void ValidateTokenConfirm_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var tokenString = ValidateTokenTextBox.Text?.Trim();
                if (string.IsNullOrEmpty(tokenString))
                {
                    MessageBox.Show("Please enter a token to validate.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }

                var request = new ValidateCapabilityRequest
                {
                    Token = tokenString,
                    Resource = _selectedToken?.Resource,
                    Action = _selectedToken?.Action
                };

                var result = await _tokenService.ValidateCapabilityAsync(request);
                if (result.Valid)
                {
                    var claimsText = result.Claims?.Count > 0
                        ? string.Join("\n", result.Claims.Select(c => $"  {c.Key}: {c.Value}"))
                        : "None";

                    MessageBox.Show(
                        $"Token is VALID!\n\nSubject: {result.Subject}\nResource: {result.Resource}\nAction: {result.Action}\n\nClaims:\n{claimsText}",
                        "Valid Token",
                        MessageBoxButton.OK,
                        MessageBoxImage.Information);
                    UpdateStatus("Token validation successful");
                }
                else
                {
                    MessageBox.Show(
                        $"Token is INVALID:\n{result.Error}",
                        "Invalid Token",
                        MessageBoxButton.OK,
                        MessageBoxImage.Warning);
                    UpdateStatus($"Token validation failed: {result.Error}");
                }
            }
            catch (Exception ex)
            {
                UpdateStatus($"Error validating token: {ex.Message}");
                MessageBox.Show(
                    $"Error validating token: {ex.Message}",
                    "Error",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error);
            }
        }

        private async void RevokeToken_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && button.DataContext is TokenViewModel token)
            {
                var result = MessageBox.Show(
                    $"Are you sure you want to revoke token '{token.TokenId.Substring(0, 8)}...' for '{token.Subject}'?\n\nThis action cannot be undone.",
                    "Confirm Revocation",
                    MessageBoxButton.YesNo,
                    MessageBoxImage.Warning);

                if (result == MessageBoxResult.Yes)
                {
                    try
                    {
                        var success = await _tokenService.RevokeCapabilityAsync(token.TokenId);
                        if (success)
                        {
                            UpdateStatus($"Revoked token: {token.TokenId.Substring(0, 8)}...");
                            await RefreshTokensAsync();
                        }
                        else
                        {
                            UpdateStatus($"Failed to revoke token: {token.TokenId.Substring(0, 8)}...");
                            MessageBox.Show(
                                "Failed to revoke token. It may have already been revoked or expired.",
                                "Error",
                                MessageBoxButton.OK,
                                MessageBoxImage.Error);
                        }
                    }
                    catch (Exception ex)
                    {
                        UpdateStatus($"Error: {ex.Message}");
                        MessageBox.Show(
                            $"Error revoking token: {ex.Message}",
                            "Error",
                            MessageBoxButton.OK,
                            MessageBoxImage.Error);
                    }
                }
            }
        }

        private void TokensDataGrid_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (TokensDataGrid.SelectedItem is TokenViewModel token)
            {
                _selectedToken = token;
                // Populate form with selected token info for reference
                SubjectTextBox.Text = token.Subject;
                ResourceTextBox.Text = token.Resource;
                
                // Try to match action in combo box
                for (int i = 0; i < ActionComboBox.Items.Count; i++)
                {
                    if ((ActionComboBox.Items[i] as ComboBoxItem)?.Content?.ToString()?.ToLower() == token.Action.ToLower())
                    {
                        ActionComboBox.SelectedIndex = i;
                        break;
                    }
                }
            }
        }

        private void UpdateStatus(string message)
        {
            Dispatcher.Invoke(() =>
            {
                StatusTextBlock.Text = $"{DateTime.Now:HH:mm:ss} - {message}";
            });
        }

        protected override void OnClosing(System.ComponentModel.CancelEventArgs e)
        {
            _refreshTimer.Stop();
            base.OnClosing(e);
        }
    }

    public class TokenViewModel
    {
        public string TokenId { get; set; } = "";
        public string Subject { get; set; } = "";
        public string Resource { get; set; } = "";
        public string Action { get; set; } = "";
        public DateTime IssuedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
        public bool Revoked { get; set; }
    }
}
