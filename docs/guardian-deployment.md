# Dyad Guardian - Deployment Guide

This guide covers building, signing, and deploying the Dyad Guardian Service and Dashboard.

## Prerequisites

### Required Tools

1. **.NET 8 SDK** - [Download](https://dotnet.microsoft.com/download/dotnet/8.0)
2. **Visual Studio 2022** or **Build Tools for Visual Studio 2022**
3. **WiX Toolset v4** - Install via: `dotnet tool install --global wix`
4. **Windows SDK** - For code signing (includes `signtool.exe`)
5. **Code Signing Certificate** - PFX file from a trusted CA (e.g., DigiCert, Sectigo)

### Optional Tools

- **Windows SDK for Windows 11** (10.0.22621.0 or later)
- **MSIX Packaging Tool** - For MSIX package creation

## Build Instructions

### 1. Build Native Components

```bash
# Build everything (service + dashboard + installer)
npm run guardian:installer

# Or manually:
# Build service
cd native/Dyad.Guardian
dotnet publish -c Release -r win-x64 --self-contained -p:PublishSingleFile=true

# Build dashboard
cd ../Dyad.Guardian.UI
dotnet build -c Release -r win-x64

# Build installer (requires WiX)
cd ../Dyad.Guardian.Installer
dotnet build -c Release
```

### 2. Output Locations

After building:

- **Service**: `native/Dyad.Guardian/bin/Release/net8.0-windows/publish/`
- **Dashboard**: `native/Dyad.Guardian.UI/bin/Release/net8.0-windows/`
- **Installer**: `native/Dyad.Guardian.Installer/bin/Release/DyadGuardianSetup.msi`

## Code Signing

### Certificate Setup

1. Obtain a code signing certificate from a trusted CA
2. Export as PFX file with password protection
3. Store securely (e.g., Azure Key Vault, GitHub Secrets, or local secure storage)

### Sign Binaries

```bash
# Sign all native components
npm run guardian:sign -- --CertificatePath "path\to\cert.pfx" --CertificatePassword "your-password"

# Or with PowerShell directly
.\scripts\sign-native.ps1 `
  -CertificatePath "C:\certs\dyad-signing-cert.pfx" `
  -CertificatePassword "SuperSecret123!"

# Sign including Electron app
npm run guardian:sign -- `
  --CertificatePath "path\to\cert.pfx" `
  --CertificatePassword "your-password" `
  --SignElectronApp
```

### Sign Individual Files

```powershell
# Find signtool (part of Windows SDK)
$signTool = "${env:ProgramFiles(x86)}\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe"

# Sign a file
& $signTool sign `
  /f "C:\certs\dyad-signing-cert.pfx" `
  /p "password" `
  /tr "http://timestamp.digicert.com" `
  /td sha256 `
  /fd sha256 `
  /a `
  "native\Dyad.Guardian\bin\Release\net8.0-windows\publish\Dyad.Guardian.exe"
```

## Complete Build & Sign Workflow

```bash
# 1. Build everything
npm run guardian:installer

# 2. Sign all binaries
npm run guardian:sign -- `
  --CertificatePath "$env:CERT_PATH" `
  --CertificatePassword "$env:CERT_PASSWORD"

# 3. Rebuild installer (to include signed binaries)
npm run guardian:installer

# 4. Sign the MSI installer (optional but recommended)
$signTool = "${env:ProgramFiles(x86)}\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe"
& $signTool sign `
  /f "$env:CERT_PATH" `
  /p "$env:CERT_PASSWORD" `
  /tr "http://timestamp.digicert.com" `
  /td sha256 `
  /fd sha256 `
  "native\Dyad.Guardian.Installer\bin\Release\DyadGuardianSetup.msi"
```

## Installer Details

### MSI Features

The WiX installer (`DyadGuardianSetup.msi`) includes:

1. **Service Installation**
   - Installs to `C:\Program Files\Dyad Guardian\Service\`
   - Registers as Windows Service "DyadGuardian"
   - Auto-starts on boot
   - Runs as LocalSystem

2. **Dashboard Installation**
   - Installs to `C:\Program Files\Dyad Guardian\Dashboard\`
   - Creates Start Menu shortcut
   - Creates Desktop shortcut (optional)

3. **Upgrade Support**
   - Supports in-place upgrades
   - Preserves configuration
   - Removes old versions cleanly

### Silent Installation

```cmd
# Silent install
msiexec /i DyadGuardianSetup.msi /qn /norestart

# Silent uninstall
msiexec /x DyadGuardianSetup.msi /qn /norestart

# Log installation
msiexec /i DyadGuardianSetup.msi /l*v install.log
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Sign Guardian

on:
  push:
    tags:
      - "guardian-v*"

jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET 8
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: "8.0.x"

      - name: Install WiX
        run: dotnet tool install --global wix

      - name: Build
        run: npm run guardian:installer

      - name: Sign Binaries
        env:
          CERTIFICATE_BASE64: ${{ secrets.CODE_SIGNING_CERT }}
          CERTIFICATE_PASSWORD: ${{ secrets.CODE_SIGNING_PASSWORD }}
        run: |
          $certBytes = [Convert]::FromBase64String($env:CERTIFICATE_BASE64)
          [IO.File]::WriteAllBytes("code-signing.pfx", $certBytes)
          npm run guardian:sign -- `
            --CertificatePath "code-signing.pfx" `
            --CertificatePassword "$env:CERTIFICATE_PASSWORD"

      - name: Upload Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: guardian-installer
          path: native/Dyad.Guardian.Installer/bin/Release/*.msi
```

### Azure DevOps Example

```yaml
trigger:
  tags:
    include:
      - guardian-v*

pool:
  vmImage: "windows-latest"

steps:
  - task: UseDotNet@2
    inputs:
      version: "8.0.x"

  - script: dotnet tool install --global wix
    displayName: "Install WiX"

  - script: npm run guardian:installer
    displayName: "Build Installer"

  - task: DownloadSecureFile@1
    name: signingCert
    inputs:
      secureFile: "dyad-signing-cert.pfx"

  - script: |
      npm run guardian:sign -- `
        --CertificatePath "$(signingCert.secureFilePath)" `
        --CertificatePassword "$(CODE_SIGNING_PASSWORD)"
    displayName: "Sign Binaries"
    env:
      CODE_SIGNING_PASSWORD: $(CodeSigningPassword)

  - task: PublishBuildArtifacts@1
    inputs:
      pathToPublish: "native/Dyad.Guardian.Installer/bin/Release"
      artifactName: "guardian-installer"
```

## Certificate Management

### Using Azure Key Vault (Recommended)

```powershell
# Install AzureSignTool
dotnet tool install --global AzureSignTool

# Sign using Azure Key Vault
azuresigntool sign `
  -kvu "https://your-keyvault.vault.azure.net" `
  -kvi "client-id" `
  -kvs "client-secret" `
  -kvc "certificate-name" `
  -tr "http://timestamp.digicert.com" `
  -v `
  "Dyad.Guardian.exe"
```

### Certificate Renewal

1. Renew certificate with CA before expiration
2. Update CI/CD secrets with new PFX
3. Rebuild and resign all components
4. Distribute new installer

## Troubleshooting

### Build Issues

**WiX not found:**

```bash
dotnet tool install --global wix
# Or update
wix extension add WixToolset.Util.wixext
```

**MSBuild not found:**

- Install Visual Studio Build Tools
- Or run from "Developer Command Prompt for VS 2022"

### Signing Issues

**signtool not found:**

- Install Windows SDK
- Or add Windows SDK bin folder to PATH

**Certificate validation fails:**

- Ensure certificate has Code Signing EKU
- Check certificate hasn't expired
- Verify password is correct

**Timestamp server errors:**

- Try alternative: `http://timestamp.sectigo.com`
- Or: `http://tsa.startssl.com/rfc3161`

### Service Issues

**Service fails to start:**

```cmd
# Check service status
sc query DyadGuardian

# View event logs
eventvwr.msc
# Navigate to: Windows Logs > Application

# Manual start for debugging
"C:\Program Files\Dyad Guardian\Service\Dyad.Guardian.exe" --console
```

## Security Considerations

1. **Certificate Storage**: Never commit certificates to source control
2. **Password Management**: Use CI/CD secret management
3. **Timestamping**: Always use timestamping to ensure signatures remain valid after certificate expiration
4. **Key Protection**: Use hardware security modules (HSM) or Azure Key Vault for production
5. **Access Control**: Limit who can access signing certificates

## Distribution

### Recommended Distribution Channels

1. **GitHub Releases** - Attach MSI to releases
2. **Website Download** - Host on official website with checksums
3. **Package Managers** - Consider WinGet/Chocolatey for future

### Verification

Users can verify the signature:

```powershell
# Check digital signature
Get-AuthenticodeSignature "C:\Program Files\Dyad Guardian\Service\Dyad.Guardian.exe"

# Or via Properties > Digital Signatures in Explorer
```

## Support

For issues with:

- **Build**: Check Visual Studio and .NET SDK installation
- **Signing**: Verify certificate and Windows SDK installation
- **Service**: Check Windows Event Logs
- **Installer**: Run with `/l*v install.log` for detailed logs
