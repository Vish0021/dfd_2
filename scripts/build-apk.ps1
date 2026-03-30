# Build Android APK locally without Android Studio
# Prerequisites: JDK 17 must be installed

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DFD - Android APK Build Script" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Java
try {
    $javaVersion = java -version 2>&1 | Select-Object -First 1
    Write-Host "[OK] Java found: $javaVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Java (JDK 17) is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install JDK 17 using one of these methods:" -ForegroundColor Yellow
    Write-Host "  Option 1: winget install Microsoft.OpenJDK.17" -ForegroundColor White
    Write-Host "  Option 2: Download from https://adoptium.net/temurin/releases/" -ForegroundColor White
    Write-Host ""
    Write-Host "After installing, restart your terminal and run this script again." -ForegroundColor Yellow
    exit 1
}

# Set ANDROID_HOME to the SDK bundled with Capacitor's android project
$sdkRoot = "$env:LOCALAPPDATA\Android\Sdk"
if (-not (Test-Path $sdkRoot)) {
    Write-Host "[INFO] Android SDK not found at $sdkRoot" -ForegroundColor Yellow
    Write-Host "[INFO] The Gradle wrapper will download required SDK components automatically." -ForegroundColor Yellow
}

# Step 1: Build web app
Write-Host ""
Write-Host "[1/4] Building web app..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Web build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Web build complete" -ForegroundColor Green

# Step 2: Sync to Android
Write-Host ""
Write-Host "[2/4] Syncing to Android..." -ForegroundColor Cyan
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Capacitor sync failed!" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Sync complete" -ForegroundColor Green

# Step 3: Build Debug APK
Write-Host ""
Write-Host "[3/4] Building Debug APK..." -ForegroundColor Cyan
Push-Location android
.\gradlew.bat assembleDebug
$buildResult = $LASTEXITCODE
Pop-Location

if ($buildResult -ne 0) {
    Write-Host "[ERROR] APK build failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common fixes:" -ForegroundColor Yellow
    Write-Host "  1. Make sure JDK 17 is installed (not JDK 21+)" -ForegroundColor White
    Write-Host "  2. Run: winget install Microsoft.OpenJDK.17" -ForegroundColor White
    Write-Host "  3. Accept Android SDK licenses: .\android\gradlew.bat --accept-licenses" -ForegroundColor White
    exit 1
}

# Step 4: Copy APK to project root
Write-Host ""
Write-Host "[4/4] Copying APK..." -ForegroundColor Cyan
$apkSource = "android\app\build\outputs\apk\debug\app-debug.apk"
$apkDest = "DFD-debug.apk"

if (Test-Path $apkSource) {
    Copy-Item $apkSource $apkDest -Force
    $apkSize = [math]::Round((Get-Item $apkDest).Length / 1MB, 2)
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  BUILD SUCCESSFUL!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  APK Location: $apkDest" -ForegroundColor White
    Write-Host "  APK Size: ${apkSize} MB" -ForegroundColor White
    Write-Host ""
    Write-Host "  To install on your phone:" -ForegroundColor Yellow
    Write-Host "  1. Transfer $apkDest to your phone" -ForegroundColor White
    Write-Host "  2. Open the file and tap Install" -ForegroundColor White
    Write-Host "  3. Allow 'Install from unknown sources' if prompted" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "[ERROR] APK not found at expected location" -ForegroundColor Red
    exit 1
}
