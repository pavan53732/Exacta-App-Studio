using System.Windows;
using Hardcodet.Wpf.TaskbarNotification;

namespace Dyad.Guardian.UI;

public partial class App : Application
{
    private TaskbarIcon? _trayIcon;
    private MainWindow? _mainWindow;

    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        // Create tray icon
        _trayIcon = new TaskbarIcon
        {
            Icon = new System.Drawing.Icon("guardian.ico"),
            ToolTipText = "Dyad Guardian - Security Monitor",
            Visibility = Visibility.Visible
        };

        // Create context menu
        var contextMenu = new System.Windows.Controls.ContextMenu();
        
        var openItem = new System.Windows.Controls.MenuItem { Header = "Open Dashboard" };
        openItem.Click += (s, args) => ShowMainWindow();
        
        var separator = new System.Windows.Controls.Separator();
        
        var exitItem = new System.Windows.Controls.MenuItem { Header = "Exit" };
        exitItem.Click += (s, args) => Shutdown();

        contextMenu.Items.Add(openItem);
        contextMenu.Items.Add(separator);
        contextMenu.Items.Add(exitItem);
        
        _trayIcon.ContextMenu = contextMenu;
        _trayIcon.TrayMouseDoubleClick += (s, args) => ShowMainWindow();

        // Show main window on startup
        ShowMainWindow();
    }

    private void ShowMainWindow()
    {
        if (_mainWindow == null || !_mainWindow.IsLoaded)
        {
            _mainWindow = new MainWindow();
            _mainWindow.Closed += (s, args) => _mainWindow = null;
        }
        
        _mainWindow.Show();
        _mainWindow.Activate();
    }

    protected override void OnExit(ExitEventArgs e)
    {
        _trayIcon?.Dispose();
        base.OnExit(e);
    }
}