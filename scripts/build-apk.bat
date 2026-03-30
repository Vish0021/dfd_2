@echo off
setlocal enabledelayedexpansion

echo ============================================
echo   DFD - Complete Android APK Build Script
echo ============================================
echo.

REM ========== STEP 1: JAVA ==========
set "JAVA_HOME="
for /d %%D in ("C:\Program Files\Microsoft\jdk-21.*") do (
    if exist "%%D\bin\java.exe" set "JAVA_HOME=%%D"
)
if not defined JAVA_HOME (
    for /d %%D in ("C:\Program Files\Eclipse Adoptium\jdk-21.*") do (
        if exist "%%D\bin\java.exe" set "JAVA_HOME=%%D"
    )
)
if not defined JAVA_HOME (
    for /d %%D in ("%USERPROFILE%\jdk-21\jdk-21.*") do (
        if exist "%%D\bin\java.exe" set "JAVA_HOME=%%D"
    )
)

if not defined JAVA_HOME (
    echo [ERROR] Java JDK 21 not found!
    echo Capacitor 8 requires Java 21 to build the Android app.
    echo Install with: winget install Microsoft.OpenJDK.21
    echo Then close and reopen your terminal and run this script again.
    pause
    exit /b 1
)

set "PATH=%JAVA_HOME%\bin;%PATH%"

echo [1/6] Checking Java...
java -version 2>&1
echo [OK] Java found
echo.

REM ========== STEP 2: ANDROID SDK ==========
set "ANDROID_SDK_ROOT=%LOCALAPPDATA%\Android\Sdk"
set "ANDROID_HOME=%ANDROID_SDK_ROOT%"
set "SDKMANAGER=%ANDROID_SDK_ROOT%\cmdline-tools\latest\bin\sdkmanager.bat"

echo [2/6] Setting up Android SDK at %ANDROID_SDK_ROOT%...

if not exist "%ANDROID_SDK_ROOT%" mkdir "%ANDROID_SDK_ROOT%"

if exist "%SDKMANAGER%" goto sdk_ready

echo        Downloading Android SDK command-line tools...
echo        This is a one-time download, please wait...

if exist "%TEMP%\cmdline-tools.zip" del "%TEMP%\cmdline-tools.zip"

curl -L -o "%TEMP%\cmdline-tools.zip" "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"

if not exist "%TEMP%\cmdline-tools.zip" (
    echo [ERROR] Download failed! Check your internet connection.
    pause
    exit /b 1
)

echo        Extracting SDK tools...
if not exist "%ANDROID_SDK_ROOT%\cmdline-tools" mkdir "%ANDROID_SDK_ROOT%\cmdline-tools"

tar -xf "%TEMP%\cmdline-tools.zip" -C "%ANDROID_SDK_ROOT%\cmdline-tools"

REM The zip extracts to a subfolder called "cmdline-tools", rename to "latest"
if exist "%ANDROID_SDK_ROOT%\cmdline-tools\latest" rmdir /s /q "%ANDROID_SDK_ROOT%\cmdline-tools\latest"
if exist "%ANDROID_SDK_ROOT%\cmdline-tools\cmdline-tools" (
    rename "%ANDROID_SDK_ROOT%\cmdline-tools\cmdline-tools" "latest"
)

del "%TEMP%\cmdline-tools.zip" 2>nul
echo [OK] SDK command-line tools installed

:sdk_ready
echo [OK] SDK tools ready
echo.

REM ========== STEP 3: ACCEPT LICENSES AND INSTALL COMPONENTS ==========
echo [3/6] Installing SDK components...
echo        Accepting licenses...

REM Create licenses directory and accept all licenses
if not exist "%ANDROID_SDK_ROOT%\licenses" mkdir "%ANDROID_SDK_ROOT%\licenses"
echo 24333f8a63b6825ea9c5514f83c2829b004d1fee> "%ANDROID_SDK_ROOT%\licenses\android-sdk-license"
echo 84831b9409646a918e30573bab4c9c91346d8abd>> "%ANDROID_SDK_ROOT%\licenses\android-sdk-license"
echo d56f5187479451eabf01fb78af6dfcb131a6481e>> "%ANDROID_SDK_ROOT%\licenses\android-sdk-license"
echo e6b7c2ab7fa2298c15165e9583d0cbd0846b80b3> "%ANDROID_SDK_ROOT%\licenses\android-sdk-arm-dbt-license"

echo        Installing platform-tools...
call "%SDKMANAGER%" "platform-tools" 2>nul

echo        Installing Android SDK platform 36...
call "%SDKMANAGER%" "platforms;android-36" 2>nul

echo        Installing build-tools 36.0.0...
call "%SDKMANAGER%" "build-tools;36.0.0" 2>nul

REM Fallback if SDK 36 not available
if not exist "%ANDROID_SDK_ROOT%\platforms\android-36" (
    echo        SDK 36 not found, trying SDK 35...
    call "%SDKMANAGER%" "platforms;android-35" "build-tools;35.0.0" 2>nul
)

echo [OK] SDK components installed
echo.

REM ========== STEP 4: BUILD WEB APP ==========
echo [4/6] Building web app...
cd /d "%~dp0.."
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Web build failed!
    pause
    exit /b 1
)
echo [OK] Web build complete
echo.

REM ========== STEP 5: SYNC CAPACITOR ==========
echo [5/6] Syncing to Android...
if exist "android\app\src\main\assets\public" (
    rmdir /s /q "android\app\src\main\assets\public"
)
call npx cap sync android
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Capacitor sync failed!
    pause
    exit /b 1
)
echo [OK] Sync complete
echo.

REM ========== STEP 6: BUILD APK ==========
echo [6/6] Building APK - this takes several minutes on first run...
cd android
call gradlew.bat clean
call gradlew.bat assembleDebug
set BUILD_EXIT=%ERRORLEVEL%
cd ..

if %BUILD_EXIT% NEQ 0 (
    echo.
    echo [ERROR] APK build failed!
    echo Try running this script again - Gradle caches downloads.
    pause
    exit /b 1
)

REM ========== DONE ==========
if exist "android\app\build\outputs\apk\debug\app-debug.apk" (
    copy "android\app\build\outputs\apk\debug\app-debug.apk" "DFD-debug.apk" /Y >nul
    echo.
    echo ============================================
    echo   BUILD SUCCESSFUL!
    echo ============================================
    echo.
    echo   APK file: DFD-debug.apk
    echo.
    echo   Transfer this file to your phone and install it.
    echo.
) else (
    echo [ERROR] APK not found!
)

pause
