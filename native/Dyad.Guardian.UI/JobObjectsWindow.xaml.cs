using System.Collections.ObjectModel;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Threading;
using Dyad.Guardian.Messages;
using Dyad.Guardian.Services;

namespace Dyad.Guardian.UI
{
    public partial class JobObjectsWindow : Window
    {
        private readonly JobObjectManager _jobManager;
        private readonly ObservableCollection<JobViewModel> _jobs;
        private readonly DispatcherTimer _refreshTimer;
        private string? _selectedJobName;

        public JobObjectsWindow(JobObjectManager jobManager)
        {
            InitializeComponent();
            _jobManager = jobManager;
            _jobs = new ObservableCollection<JobViewModel>();
            JobsDataGrid.ItemsSource = _jobs;

            // Setup refresh timer
            _refreshTimer = new DispatcherTimer
            {
                Interval = TimeSpan.FromSeconds(2)
            };
            _refreshTimer.Tick += async (s, e) => await RefreshJobsAsync();
            _refreshTimer.Start();

            // Initial load
            Loaded += async (s, e) => await RefreshJobsAsync();
        }

        private async Task RefreshJobsAsync()
        {
            try
            {
                var jobList = await _jobManager.ListJobsAsync();
                var currentJobs = new HashSet<string>(jobList.JobNames);

                // Remove jobs that no longer exist
                for (int i = _jobs.Count - 1; i >= 0; i--)
                {
                    if (!currentJobs.Contains(_jobs[i].Name))
                    {
                        _jobs.RemoveAt(i);
                    }
                }

                // Add or update existing jobs
                foreach (var jobName in jobList.JobNames)
                {
                    var existingJob = _jobs.FirstOrDefault(j => j.Name == jobName);
                    if (existingJob == null)
                    {
                        try
                        {
                            var stats = await _jobManager.GetJobStatisticsAsync(jobName);
                            var jobInfo = await GetJobInfoAsync(jobName);
                            _jobs.Add(new JobViewModel
                            {
                                Name = jobName,
                                CreatedAt = jobInfo?.CreatedAt ?? DateTime.Now,
                                MemoryLimit = jobInfo?.MemoryLimit,
                                CpuRate = jobInfo?.CpuRate,
                                ActiveProcesses = stats.ActiveProcesses
                            });
                        }
                        catch { }
                    }
                    else
                    {
                        // Update process count
                        try
                        {
                            var stats = await _jobManager.GetJobStatisticsAsync(jobName);
                            existingJob.ActiveProcesses = stats.ActiveProcesses;
                        }
                        catch { }
                    }
                }

                UpdateStatus($"Loaded {_jobs.Count} job objects");
            }
            catch (Exception ex)
            {
                UpdateStatus($"Error refreshing jobs: {ex.Message}");
            }
        }

        private async Task<JobObjectInfo?> GetJobInfoAsync(string jobName)
        {
            // This would need to be exposed from JobObjectManager
            // For now, return null
            return null;
        }

        private void CreateJob_Click(object sender, RoutedEventArgs e)
        {
            // Clear form
            JobNameTextBox.Text = "";
            MemoryLimitTextBox.Text = "268435456";
            CpuRateTextBox.Text = "50";
            MaxProcessesTextBox.Text = "10";
            KillOnCloseCheckBox.IsChecked = true;
            AssignProcessPanel.Visibility = Visibility.Collapsed;
        }

        private async void CreateJobConfirm_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var request = new CreateJobObjectRequest
                {
                    JobName = JobNameTextBox.Text,
                    MemoryLimitBytes = long.TryParse(MemoryLimitTextBox.Text, out var mem) ? mem : null,
                    CpuRatePercent = int.TryParse(CpuRateTextBox.Text, out var cpu) ? cpu : null,
                    ActiveProcessLimit = int.TryParse(MaxProcessesTextBox.Text, out var proc) ? proc : null,
                    KillProcessesOnJobClose = KillOnCloseCheckBox.IsChecked
                };

                var result = await _jobManager.CreateJobObjectAsync(request);
                if (result.Success)
                {
                    UpdateStatus($"Created job object: {result.JobName}");
                    await RefreshJobsAsync();
                    AssignProcessPanel.Visibility = Visibility.Visible;
                    _selectedJobName = result.JobName;
                }
                else
                {
                    UpdateStatus($"Failed to create job: {result.Error}");
                }
            }
            catch (Exception ex)
            {
                UpdateStatus($"Error: {ex.Message}");
            }
        }

        private async void TerminateJob_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && button.DataContext is JobViewModel job)
            {
                var result = MessageBox.Show(
                    $"Are you sure you want to terminate job '{job.Name}'? This will kill all processes in the job.",
                    "Confirm Termination",
                    MessageBoxButton.YesNo,
                    MessageBoxImage.Warning);

                if (result == MessageBoxResult.Yes)
                {
                    try
                    {
                        var success = await _jobManager.TerminateJobAsync(new TerminateJobRequest
                        {
                            JobName = job.Name,
                            ExitCode = 1
                        });

                        if (success)
                        {
                            UpdateStatus($"Terminated job: {job.Name}");
                            await RefreshJobsAsync();
                        }
                        else
                        {
                            UpdateStatus($"Failed to terminate job: {job.Name}");
                        }
                    }
                    catch (Exception ex)
                    {
                        UpdateStatus($"Error: {ex.Message}");
                    }
                }
            }
        }

        private async void ViewJob_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && button.DataContext is JobViewModel job)
            {
                try
                {
                    var stats = await _jobManager.GetJobStatisticsAsync(job.Name);
                    MessageBox.Show(
                        $"Job: {job.Name}\n" +
                        $"Active Processes: {stats.ActiveProcesses}\n" +
                        $"Total Processes: {stats.TotalProcesses}\n" +
                        $"Total Page Faults: {stats.TotalPageFaults}\n" +
                        $"Terminated Processes: {stats.TotalTerminatedProcesses}",
                        "Job Statistics",
                        MessageBoxButton.OK,
                        MessageBoxImage.Information);
                }
                catch (Exception ex)
                {
                    UpdateStatus($"Error viewing job: {ex.Message}");
                }
            }
        }

        private async void AssignProcess_Click(object sender, RoutedEventArgs e)
        {
            if (string.IsNullOrEmpty(_selectedJobName))
            {
                UpdateStatus("No job selected");
                return;
            }

            if (!int.TryParse(ProcessIdTextBox.Text, out var processId))
            {
                UpdateStatus("Invalid process ID");
                return;
            }

            try
            {
                var success = await _jobManager.AssignProcessToJobAsync(new AssignProcessToJobRequest
                {
                    JobName = _selectedJobName,
                    ProcessId = processId
                });

                if (success)
                {
                    UpdateStatus($"Assigned process {processId} to job {_selectedJobName}");
                    await RefreshJobsAsync();
                }
                else
                {
                    UpdateStatus("Failed to assign process");
                }
            }
            catch (Exception ex)
            {
                UpdateStatus($"Error: {ex.Message}");
            }
        }

        private void JobsDataGrid_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (JobsDataGrid.SelectedItem is JobViewModel job)
            {
                _selectedJobName = job.Name;
                AssignProcessPanel.Visibility = Visibility.Visible;
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

    public class JobViewModel
    {
        public string Name { get; set; } = "";
        public DateTime CreatedAt { get; set; }
        public long? MemoryLimit { get; set; }
        public int? CpuRate { get; set; }
        public int ActiveProcesses { get; set; }
    }
}