# Implementation Plan: Windows Native App Builder

## Overview

This implementation plan breaks down the Windows Native App Builder feature into discrete coding tasks. The approach follows Dyad's existing RuntimeProvider pattern and integrates with the current AI agent architecture. Each task builds incrementally, ensuring the system remains functional at each checkpoint.

The implementation focuses on:
1. Core DotNetRuntimeProvider with full lifecycle support
2. Template system for WPF, WinUI3, and WinForms
3. Enhanced system prompts with Windows framework knowledge
4. Secure command execution through ExecutionKernel
5. Process management for running Windows applications
6. Comprehensive testing with property-based tests

## Tasks

- [x] 1. Set up core infrastructure and interfaces
  - Create `DotNetRuntimeProvider` class implementing `RuntimeProvider` interface
  - Define TypeScript interfaces for project configuration, build results, and error responses
  - Set up project directory structure under `src/main/runtime-providers/dotnet/`
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ] 2. Implement template system
  - [ ] 2.1 Create `TemplateManager` class for loading and managing templates
    - Implement template loading from `templates/dotnet/` directory
    - Implement placeholder replacement logic ({{ProjectName}}, {{Namespace}})
    - _Requirements: 9.4_
  
  - [ ] 2.2 Create WPF project template
    - Create `App.xaml` and `App.xaml.cs` template files
    - Create `MainWindow.xaml` and `MainWindow.xaml.cs` template files
    - Create `.csproj` template with WPF SDK references
    - _Requirements: 9.1, 9.5_
  
  - [ ] 2.3 Create WinUI3 project template
    - Create `App.xaml` and `App.xaml.cs` template files with WinUI3 namespaces
    - Create `MainWindow.xaml` and `MainWindow.xaml.cs` with WinUI3 controls
    - Create `.csproj` template with WinUI3 SDK references
    - Create `app.manifest` for Windows 10/11 compatibility
    - _Requirements: 9.2, 9.5_
  
  - [ ] 2.4 Create WinForms project template
    - Create `Program.cs` with WinForms entry point
    - Create `Form1.cs` and `Form1.Designer.cs` template files
    - Create `.csproj` template with WinForms SDK references
    - _Requirements: 9.3, 9.5_
  
  - [ ] 2.5 Write property test for template placeholder replacement
    - **Property 3: Template Placeholder Replacement**
    - **Validates: Requirements 9.4**
  
  - [ ] 2.6 Write unit tests for template loading
    - Test loading each framework template
    - Test template instantiation with custom values
    - _Requirements: 9.1, 9.2, 9.3_

- [ ] 3. Implement scaffold functionality
  - [ ] 3.1 Implement `scaffold()` method in DotNetRuntimeProvider
    - Determine framework type from projectType parameter
    - Load appropriate template using TemplateManager
    - Create project directory structure
    - Write all template files to disk
    - Initialize ProjectState with project metadata
    - _Requirements: 1.1, 1.2, 1.3, 1.5_
  
  - [ ] 3.2 Write property test for scaffold completeness
    - **Property 1: Scaffold Creates Complete Valid Projects**
    - **Validates: Requirements 1.1, 1.3, 1.5, 7.4**
  
  - [ ] 3.3 Write property test for framework-specific templates
    - **Property 2: Framework-Specific Templates**
    - **Validates: Requirements 1.2, 3.4, 9.5**
  
  - [ ] 3.4 Write unit tests for scaffold error handling
    - Test invalid framework type
    - Test invalid project name
    - Test file system permission errors
    - _Requirements: 8.1_

- [ ] 4. Implement ExecutionKernel security layer
  - [ ] 4.1 Create `ExecutionKernel` class with command validation
    - Implement allowed command list (new, restore, build, run)
    - Implement working directory validation
    - Implement command execution with timeout
    - Capture stdout, stderr, and exit code
    - _Requirements: 4.4, 12.4_
  
  - [ ] 4.2 Write property test for security command validation
    - **Property 11: Security Command Validation**
    - **Validates: Requirements 4.4, 12.4**
  
  - [ ] 4.3 Write unit tests for ExecutionKernel
    - Test allowed command execution
    - Test disallowed command rejection
    - Test working directory restriction
    - Test command timeout
    - _Requirements: 4.4_

- [ ] 5. Checkpoint - Verify scaffolding and security
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement dependency resolution
  - [ ] 6.1 Implement `resolveDependencies()` method
    - Execute `dotnet restore` via ExecutionKernel
    - Parse command output for errors
    - Verify packages restored successfully
    - Return DependencyResult with success/failure status
    - _Requirements: 3.1, 3.3_
  
  - [ ] 6.2 Implement dependency error parsing
    - Parse NuGet error messages
    - Extract package names from error messages
    - Create descriptive error responses
    - _Requirements: 3.2, 8.4_
  
  - [ ] 6.3 Write property test for dependency resolution
    - **Property 6: Dependency Resolution Success Validation**
    - **Validates: Requirements 3.1, 3.3**
  
  - [ ] 6.4 Write unit tests for dependency errors
    - Test with invalid package reference
    - Test with network error simulation
    - Verify error messages contain package names
    - _Requirements: 3.2, 8.4_

- [ ] 7. Implement build functionality
  - [ ] 7.1 Implement `build()` method
    - Execute `dotnet build` via ExecutionKernel
    - Parse compiler output for errors and warnings
    - Locate output executable in bin/ directory
    - Return BuildResult with executable path
    - _Requirements: 4.1, 4.3_
  
  - [ ] 7.2 Implement compiler error parsing
    - Parse MSBuild error format (file, line, column, code, message)
    - Create CompilerError objects with all details
    - Categorize errors vs warnings
    - _Requirements: 4.2, 8.2_
  
  - [ ] 7.3 Write property test for build execution
    - **Property 9: Build Execution and Validation**
    - **Validates: Requirements 4.1, 4.3**
  
  - [ ] 7.4 Write property test for build error parsing
    - **Property 10: Build Error Parsing**
    - **Validates: Requirements 4.2**
  
  - [ ] 7.5 Write unit tests for build scenarios
    - Test successful build
    - Test build with syntax errors
    - Test build with missing references
    - _Requirements: 4.1, 4.2, 4.3_

- [ ] 8. Implement process management
  - [ ] 8.1 Create `ProcessManager` class
    - Implement `startProcess()` to launch Windows applications
    - Implement `stopProcess()` to terminate applications
    - Implement `getProcessOutput()` to capture console output
    - Implement `isProcessRunning()` to check process status
    - _Requirements: 5.1, 5.3, 5.4, 5.5_
  
  - [ ] 8.2 Write property test for process lifecycle
    - **Property 12: Process Lifecycle Round-Trip**
    - **Validates: Requirements 5.1, 5.3, 5.5**
  
  - [ ] 8.3 Write property test for console output capture
    - **Property 13: Console Output Capture**
    - **Validates: Requirements 5.4, 8.3**
  
  - [ ] 8.4 Write unit tests for process management
    - Test starting a simple console app
    - Test stopping a running process
    - Test capturing stdout/stderr
    - _Requirements: 5.1, 5.4, 5.5_

- [ ] 9. Implement run functionality
  - [ ] 9.1 Implement `run()` method in DotNetRuntimeProvider
    - Start application process using ProcessManager
    - Monitor process for crashes
    - Store process handle in ProjectState
    - Return RunResult with process information
    - _Requirements: 5.1, 5.3_
  
  - [ ] 9.2 Implement runtime error capture
    - Capture unhandled exceptions from stderr
    - Parse stack traces
    - Create runtime error responses
    - _Requirements: 8.3_
  
  - [ ] 9.3 Write unit tests for run functionality
    - Test running a simple WPF app
    - Test detecting application crashes
    - Test capturing runtime errors
    - _Requirements: 5.1, 5.3, 8.3_

- [ ] 10. Checkpoint - Verify full lifecycle
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement file management utilities
  - [ ] 11.1 Create file management helper functions
    - Implement XAML/C# file pairing logic
    - Implement .csproj update logic for new files
    - Implement namespace generation from project structure
    - _Requirements: 7.2, 7.5_
  
  - [ ] 11.2 Write property test for project file synchronization
    - **Property 18: Project File Synchronization**
    - **Validates: Requirements 7.2**
  
  - [ ] 11.3 Write property test for project organization
    - **Property 19: Project Organization Consistency**
    - **Validates: Requirements 7.3, 7.5**
  
  - [ ] 11.4 Write unit tests for file management
    - Test adding new XAML file updates .csproj
    - Test namespace generation
    - Test directory structure validation
    - _Requirements: 7.2, 7.3, 7.5_

- [ ] 12. Implement iterative editing support
  - [ ] 12.1 Add file edit tracking to DotNetRuntimeProvider
    - Track which files have been modified
    - Trigger rebuild after edits
    - Restart application after successful rebuild
    - _Requirements: 6.4, 6.5_
  
  - [ ] 12.2 Implement XAML validation for edits
    - Validate XAML is well-formed XML after edits
    - Preserve XAML namespace declarations
    - _Requirements: 6.2_
  
  - [ ] 12.3 Implement surgical C# editing
    - Ensure edits only modify targeted code sections
    - Preserve unrelated code unchanged
    - _Requirements: 6.3_
  
  - [ ] 12.4 Write property test for XAML structure preservation
    - **Property 14: XAML Structure Preservation**
    - **Validates: Requirements 6.2**
  
  - [ ] 12.5 Write property test for surgical code edits
    - **Property 15: Surgical Code Edits**
    - **Validates: Requirements 6.3**
  
  - [ ] 12.6 Write property test for edit-rebuild-run workflow
    - **Property 16: Edit-Rebuild-Run Workflow**
    - **Validates: Requirements 6.4, 6.5**
  
  - [ ] 12.7 Write unit tests for iterative editing
    - Test editing XAML preserves structure
    - Test editing C# preserves unrelated code
    - Test edit triggers rebuild
    - _Requirements: 6.2, 6.3, 6.4, 6.5_

- [ ] 13. Create enhanced system prompts
  - [ ] 13.1 Create WPF system prompt
    - Add XAML syntax examples (Grid, StackPanel, Button, TextBox)
    - Add C# code-behind patterns (event handlers, INotifyPropertyChanged)
    - Add data binding examples
    - Add MVVM architecture guidance
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [ ] 13.2 Create WinUI3 system prompt
    - Add WinUI3-specific control examples (NavigationView, InfoBar)
    - Add modern XAML patterns
    - Add WinUI3 package references
    - _Requirements: 10.3, 10.6_
  
  - [ ] 13.3 Create WinForms system prompt
    - Add WinForms control examples (Form, Button, TextBox, DataGridView)
    - Add designer-generated code patterns
    - Add event handler patterns for WinForms
    - _Requirements: 10.3, 10.6_
  
  - [ ] 13.4 Write unit tests for system prompt content
    - Verify WPF prompt contains required examples
    - Verify WinUI3 prompt contains framework-specific guidance
    - Verify WinForms prompt contains appropriate patterns
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [ ] 14. Implement AI agent tool integration
  - [ ] 14.1 Register dotnet tools with AI agent
    - Register `write_file` tool
    - Register `edit_file` tool
    - Register `run_dotnet_command` tool
    - _Requirements: 12.1, 12.2, 12.3_
  
  - [ ] 14.2 Implement tool result feedback
    - Ensure all tools return success/failure status
    - Include relevant details in tool results
    - _Requirements: 12.5_
  
  - [ ] 14.3 Write property test for tool operation feedback
    - **Property 21: Tool Operation Feedback**
    - **Validates: Requirements 12.5**
  
  - [ ] 14.4 Write unit tests for tool integration
    - Test write_file tool creates files
    - Test edit_file tool modifies files
    - Test run_dotnet_command tool executes commands
    - _Requirements: 12.1, 12.2, 12.3, 12.5_

- [ ] 15. Implement error handling system
  - [ ] 15.1 Create error categorization system
    - Implement ErrorResponse interface
    - Create error category enum (scaffold, dependency, build, runtime)
    - Implement error code generation
    - _Requirements: 8.5_
  
  - [ ] 15.2 Implement user-facing error messages
    - Create plain language error translations
    - Add suggested actions for common errors
    - _Requirements: 8.1, 8.2, 8.4_
  
  - [ ] 15.3 Write property test for error categorization
    - **Property 8: Error Type Categorization**
    - **Validates: Requirements 8.5**
  
  - [ ] 15.4 Write property test for descriptive error messages
    - **Property 7: Descriptive Error Messages**
    - **Validates: Requirements 3.2, 8.1, 8.2, 8.4**
  
  - [ ] 15.5 Write unit tests for error handling
    - Test scaffold error messages
    - Test build error messages
    - Test runtime error messages
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 16. Implement state management
  - [ ] 16.1 Implement ProjectState persistence
    - Store project path, framework, executable path
    - Maintain state across lifecycle method calls
    - _Requirements: 11.6_
  
  - [ ] 16.2 Write property test for state persistence
    - **Property 20: RuntimeProvider State Persistence**
    - **Validates: Requirements 11.6**
  
  - [ ] 16.3 Write unit tests for state management
    - Test state persists from scaffold to build
    - Test state persists from build to run
    - _Requirements: 11.6_

- [ ] 17. Checkpoint - Verify complete system
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 18. Create integration tests
  - [ ] 18.1 Write E2E test for WPF application flow
    - Test complete flow: scaffold → restore → build → run
    - Test iterative editing: edit XAML → rebuild → restart
    - _Requirements: 1.1, 3.1, 4.1, 5.1, 6.4, 6.5_
  
  - [ ] 18.2 Write E2E test for WinUI3 application flow
    - Test complete flow with WinUI3-specific features
    - Test WinUI3 template and build process
    - _Requirements: 1.1, 3.1, 4.1, 5.1_
  
  - [ ] 18.3 Write E2E test for WinForms application flow
    - Test complete flow with WinForms-specific features
    - Test WinForms template and build process
    - _Requirements: 1.1, 3.1, 4.1, 5.1_

- [ ] 19. Implement remaining property tests
  - [ ] 19.1 Write property test for XAML validity
    - **Property 4: XAML Validity**
    - **Validates: Requirements 2.1, 2.3**
  
  - [ ] 19.2 Write property test for event handler signatures
    - **Property 5: Event Handler Signatures**
    - **Validates: Requirements 2.5**
  
  - [ ] 19.3 Write property test for file extension correctness
    - **Property 17: File Extension Correctness**
    - **Validates: Requirements 7.1**

- [ ] 20. Wire everything together
  - [ ] 20.1 Register DotNetRuntimeProvider with Dyad's runtime system
    - Add provider to runtime provider registry
    - Configure provider selection based on project type
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  
  - [ ] 20.2 Integrate with Dyad's AI agent
    - Load system prompts for Windows frameworks
    - Configure tool access for AI agent
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  
  - [ ] 20.3 Add UI for Windows app preview
    - Display process status (running/stopped)
    - Show console output
    - Add stop/restart controls
    - _Requirements: 5.1, 5.4, 5.5_
  
  - [ ] 20.4 Write integration tests for complete system
    - Test user prompt → working application flow
    - Test iterative development workflow
    - _Requirements: All requirements_

- [ ] 21. Final checkpoint - Complete system validation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks include comprehensive testing for quality assurance
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout implementation
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end workflows
- The implementation follows Dyad's existing patterns (RuntimeProvider, ExecutionKernel, AI agent tools)
- All code should follow TypeScript best practices and Electron security guidelines
- Tests should be co-located with implementation files where possible
