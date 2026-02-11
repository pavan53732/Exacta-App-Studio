# Code Signing Script for Dyad Guardian Native Components
# Usage: .\scripts\sign-native.ps1 -CertificatePath "path\to\cert.pfx" -CertificatePassword "password"

param(
    [Parameter(Mandatory=$true)]
    [string]$CertificatePath,
    
    [Parameter(Mandatory=$true)]
    [string]$CertificatePassword,
    
    [string]$TimestampServer = "http://timestamp.digicert.com",
    
    [switch]$SignElectronApp
)

$ErrorActionPreference = "Stop"

# Find signtool.exe (part of Windows SDK)
$signToolPaths = @(
    "${env:ProgramFiles(x86)}\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe",
    "${env:ProgramFiles(x86)}\Windows Kits\10\bin\10.0.22000.0\x64\signtool.exe",
    "${env:ProgramFiles(x86)}\Windows Kits\10\bin\10.0.19041.0\x64\signtool.exe",
    "${env:ProgramFiles(x86)}\Windows Kits\8.1\bin\x64\signtool.exe",
    "${env:ProgramFiles}\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe"
)

$signTool = $null
foreach ($path in $signToolPaths) {
    if (Test-Path $path) {
        $signTool = $path
        break
    }
}

if (-not $signTool) {
    Write-Error "signtool.exe not found. Please install Windows SDK."
    exit 1
}

Write-Host "Using signtool: $signTool" -ForegroundColor Green

# Files to sign
$filesToSign = @(
    # Service
    "native\Dyad.Guardian\bin\Release\net8.0-windows\publish\Dyad.Guardian.exe",
    # Dashboard
    "native\Dyad.Guardian.UI\bin\Release\net8.0-windows\Dyad.Guardian.UI.exe",
    "native\Dyad.Guardian.UI\bin\Release\net8.0-windows\Dyad.Guardian.UI.dll"
)

# Validate certificate exists
if (-not (Test-Path $CertificatePath)) {
    Write-Error "Certificate not found at: $CertificatePath"
    exit 1
}

$signCount = 0

foreach ($file in $filesToSign) {
    $fullPath = Resolve-Path $file -ErrorAction SilentlyContinue
    if (-not $fullPath) {
        Write-Warning "File not found: $file"
        continue
    }
    
    Write-Host "Signing: $file" -ForegroundColor Cyan
    
    try {
        & $signTool sign `
            /f "$CertificatePath" `
            /p "$CertificatePassword" `
            /tr "$TimestampServer" `
            /td sha256 `
            /fd sha256 `
            /a `
            "$fullPath"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ Signed successfully" -ForegroundColor Green
            $signCount++
        } else {
            Write-Error "  ✗ Signing failed with exit code: $LASTEXITCODE"
        }
    }
    catch {
        Write-Error "  ✗ Error signing file: $_"
    }
}

# Sign Electron app if requested
if ($SignElectronApp) {
    $electronApps = @(
        "out\make\squirrel.windows\x64\Exacta.exe",
        "out\Exacta-win32-x64\Exacta.exe"
    )
    
    foreach ($app in $electronApps) {
        if (Test-Path $app) {
            Write-Host "Signing Electron app: $app" -ForegroundColor Cyan
            & $signTool sign `
                /f "$CertificatePath" `
                /p "$CertificatePassword" `
                /tr "$TimestampServer" `
                /td sha256 `
                /fd sha256 `
                /a `
                "$app"
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✓ Electron app signed successfully" -ForegroundColor Green
                $signCount++
            }
        }
    }
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Yellow
Write-Host "Signing complete: $signCount files signed" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Yellow
