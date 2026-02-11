@echo off
setlocal enabledelayedexpansion

echo ==========================================
echo Dyad Guardian - Build and Package Script
echo ==========================================
echo.

REM Check for Visual Studio / MSBuild
set "MSBUILD="
for /f "usebackq tokens=*" %%i in (`"%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe" -latest -products * -requires Microsoft.Component.MSBuild -property installationPath 2^>nul`) do (
    set "MSBUILD=%%i\MSBuild\Current\Bin\MSBuild.exe"
)

if not exist "%MSBUILD%" (
    echo ERROR: MSBuild not found. Please install Visual Studio.
    exit /b 1
)

echo Using MSBuild: %MSBUILD%
echo.

REM Configuration
set "CONFIGURATION=Release"
set "PLATFORM=x64"
set "SOLUTION_DIR=native"

REM Step 1: Clean
echo [1/5] Cleaning solution...
cd /d "%~dp0\.."
dotnet clean "%SOLUTION_DIR%\Dyad.Guardian\Dyad.Guardian.sln" -c %CONFIGURATION%
if errorlevel 1 (
    echo ERROR: Clean failed
    exit /b 1
)

REM Step 2: Restore packages
echo [2/5] Restoring NuGet packages...
dotnet restore "%SOLUTION_DIR%\Dyad.Guardian\Dyad.Guardian.sln"
if errorlevel 1 (
    echo ERROR: Restore failed
    exit /b 1
)

REM Step 3: Publish Service (single file, self-contained)
echo [3/5] Publishing Guardian Service...
dotnet publish "%SOLUTION_DIR%\Dyad.Guardian\Dyad.Guardian.csproj" ^
    -c %CONFIGURATION% ^
    -r win-x64 ^
    --self-contained true ^
    -p:PublishSingleFile=true ^
    -p:PublishTrimmed=false ^
    -p:IncludeNativeLibrariesForSelfExtract=true ^
    -o "%SOLUTION_DIR%\Dyad.Guardian\bin\%CONFIGURATION%\net8.0-windows\publish"
if errorlevel 1 (
    echo ERROR: Service publish failed
    exit /b 1
)

REM Step 4: Build Dashboard
echo [4/5] Building Guardian Dashboard...
dotnet build "%SOLUTION_DIR%\Dyad.Guardian.UI\Dyad.Guardian.UI.csproj" ^
    -c %CONFIGURATION% ^
    -r win-x64
if errorlevel 1 (
    echo ERROR: Dashboard build failed
    exit /b 1
)

REM Step 5: Build Installer (if WiX is installed)
echo [5/5] Building MSI Installer...
where wix >nul 2>&1
if %ERRORLEVEL% == 0 (
    dotnet build "%SOLUTION_DIR%\Dyad.Guardian.Installer\Dyad.Guardian.Installer.wixproj" ^
        -c %CONFIGURATION% ^
        -p:Platform=%PLATFORM%
    if errorlevel 1 (
        echo WARNING: Installer build failed. WiX Toolset may not be properly installed.
        echo The binaries are still available in the publish directory.
    ) else (
        echo.
        echo ==========================================
        echo MSI Installer created successfully!
        echo Location: %SOLUTION_DIR%\Dyad.Guardian.Installer\bin\%CONFIGURATION%\DyadGuardianSetup.msi
        echo ==========================================
    )
) else (
    echo WARNING: WiX Toolset not found. Skipping MSI creation.
    echo Install WiX Toolset to build the installer: dotnet tool install --global wix
)

echo.
echo ==========================================
echo Build Complete!
echo ==========================================
echo.
echo Output locations:
echo   Service:    %SOLUTION_DIR%\Dyad.Guardian\bin\%CONFIGURATION%\net8.0-windows\publish\
echo   Dashboard:  %SOLUTION_DIR%\Dyad.Guardian.UI\bin\%CONFIGURATION%\net8.0-windows\
echo.

endlocal
