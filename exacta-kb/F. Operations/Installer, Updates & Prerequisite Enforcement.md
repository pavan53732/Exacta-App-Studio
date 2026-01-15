# Installer, Updates & Prerequisite Enforcement

## Purpose
Specify installer behavior, prerequisites, signing, update policy, and uninstall guarantees to ensure secure, reliable deployment and maintenance.

## Prerequisites

### Required Components

#### WebView2 Runtime
- **Requirement**: Microsoft Edge WebView2 Runtime
- **Minimum version**: 120.0.0.0
- **Enforcement**:
	- Installer MUST detect presence + version before installing the app.
	- If missing or below minimum, installer MUST fail-fast with an actionable message and MUST NOT perform a partial install.
	- Installer MAY offer to download/install WebView2 automatically **only with explicit user consent**.
- **Detection (registry)**:
	- Installer MUST check both registry views:
		- `HKLM\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}\pv`
		- `HKLM\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}\pv`

#### .NET Desktop Runtime (x64)
- **Requirement**: .NET 8 Desktop Runtime (Windows Desktop)
- **Minimum version**: 8.0.1
- **Enforcement**:
	- Installer MUST detect presence + version before installing the app.
	- If missing or below minimum, installer MUST fail-fast with an actionable message and MUST NOT perform a partial install.
- **Detection (CLI)**:
	- Installer MUST run `dotnet --list-runtimes` and validate the required runtime is present at or above minimum.
	- Detection MUST verify a Desktop-capable runtime is installed (for example, `Microsoft.WindowsDesktop.App 8.0.1` or higher).

#### .NET SDK (x64) — Optional
- **Purpose**: Enables developer-only features (optional)
- **Minimum version**: 8.0.100
- **Detection**:
	- `dotnet --list-sdks` contains `8.0.100` or higher

### Hardware Requirements
- **RAM**: Minimum 4 GB, recommended 8 GB
- **Disk**: Minimum 500 MB free space, recommended 1 GB
- **OS**: Windows 10 version 1903 (19H1) or later, Windows 11

### Enforcement Rules
- **Pre-install check**: Installer MUST verify all required prerequisites before proceeding.
- **Fail-fast**: If any required prerequisite is missing or below minimum, installer MUST show a clear blocking error containing:
	- What is missing (component + required minimum version)
	- The detected value (if any)
	- How to install it (official link)
	- A Retry action after installation
- **Version validation**: MUST check minimum versions, not just presence.
- **No partial install**: If prerequisite enforcement fails, installer MUST abort cleanly and leave no partial install.

## Installer Behavior

### Package Types
- **MSI installer**: Primary, supports enterprise deployment
- **EXE installer**: Self-contained, includes MSI internally
- **Portable ZIP**: For testing/development (no system installation)

### Installation Process
1. **Elevation check**: Prompt for admin rights if installing system-wide
2. **Prerequisite validation**: Check all requirements (fail-fast, no partial install)
3. **File extraction**: Install to `C:\Program Files\Exacta App Studio\` (or user choice)
4. **Registry entries**: Add uninstall info, file associations (if applicable)
5. **Shortcut creation**: Desktop and Start Menu shortcuts
6. **First-run setup**: Launch app to complete configuration (optional, user-controlled)

### Rollback Guarantees
- **Atomic installation**: Either fully succeeds or fully rolls back
- **Cleanup on failure**: Remove all installed files and registry entries created by this installer run
- **No orphaned processes**: Installer MUST ensure the app is not running before install/update/uninstall

## Signing

### Code Signing Certificate
- **Certificate type**: EV Code Signing Certificate (Extended Validation)
- **Issuer**: Trusted CA (DigiCert, GlobalSign, or equivalent)
- **Subject**: Exacta App Studio LLC (or appropriate legal entity)
- **Key requirements**:
	- RSA 4096-bit minimum OR ECC P-384 preferred
	- Private key MUST be protected (HSM or equivalent)
- **Timestamp**: RFC 3161 timestamp from trusted TSA

### Signing Requirements
- **All executables**: `ExactaAppStudio.exe`, `*.dll`, `*.exe` in install directory MUST be signed
- **Installer packages**: MSI and EXE installers MUST be signed
- **Verification**: `signtool verify /pa /v installer.msi` MUST pass
- **Timestamp validity**: Signatures MUST remain valid after certificate expiry due to timestamping

### Signing Process
1. **Build pipeline**: Automated signing in CI/CD
2. **HSM**: Private keys stored in HSM (or equivalent secure key storage)
3. **Air-gapped signing**: For release builds, signing MAY be performed on an air-gapped machine
4. **Audit trail**: Log all signing operations with timestamps and artifact identifiers

## Updates

### Update Policy (V1)
- **Approach**: Manual updates only
- **Notification**: App MAY notify about updates **only if the user explicitly enables update checks**
- **Download**: Direct download from official website/releases
- **Installation**: User-initiated, may require admin rights depending on install scope

### Update Mechanism (Future)
- **Auto-update service**: Background service for automatic updates
- **Delta updates**: Binary diff patches to minimize download size
- **Rollback capability**: Ability to revert to previous version
- **Staged rollout**: Percentage-based rollout for gradual deployment

### Update Validation
- **Signature verification**: All update packages MUST be signed
- **Hash validation**: Compare downloaded hash with published hash
- **Backup**: Create backup of current installation before update
- **Rollback**: Automatic rollback on update failure

## Uninstall

### Clean Removal Guarantees
- **Complete artifact removal**:
	- All files in installation directory
	- Registry entries created by the installer (e.g., `HKLM\SOFTWARE\Exacta App Studio`)
	- File associations owned by the app (if any)
	- Start Menu/Desktop shortcuts
- **User data preservation**:
	- Project files remain untouched
	- User settings preserved (optional: user may choose to remove)
	- Logs and cache may be cleaned (user option)

### Uninstall Process
1. **App termination**: Close running instances
2. **Registry cleanup**: Remove app-owned registry keys
3. **File removal**: Delete installation directory
4. **Shortcut cleanup**: Remove Start Menu/Desktop entries
5. **System restore point**: Optional (enterprise environments)

### Partial Uninstall Handling
- **Corrupted installs**: Uninstall MUST attempt cleanup even if install is incomplete
- **Failed uninstall**: Log errors and provide manual cleanup instructions
- **Reinstall after failed uninstall**: Reinstall MUST detect and clean up remnants before proceeding

## Security Considerations

### Installation Security
- **Secure download**: HTTPS-only distribution
- **Integrity checks**: SHA-256 hashes published for all packages
- **Supply chain security**: Signed commits, reproducible builds (where feasible)

### Runtime Security
- **No auto-execution**: Installer MUST NOT execute untrusted code
- **Permission minimization**: Install with least required privileges
- **Sandboxing**: App runs with appropriate security boundaries

## Testing Requirements

### Installation Testing
- **Clean machine**: Test on fresh Windows installs
- **Prerequisite scenarios**: Test with/without each prerequisite
- **User privilege levels**: Test with/without admin rights
- **Disk space**: Test with minimal free space

### Update Testing
- **Version compatibility**: Test updates from all supported versions
- **Network failures**: Test interrupted downloads
- **Rollback scenarios**: Test update failure recovery

### Uninstall Testing
- **Complete removal**: Verify no artifacts remain
- **Reinstall capability**: Ensure clean reinstall after uninstall
- **Data preservation**: Verify user projects survive uninstall