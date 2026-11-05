@echo off
TITLE Vikas Message Automator - Local Installer
COLOR 0B

echo ===============================================================================
echo            VIKAS MESSAGE AUTOMATOR - WINDOWS INSTALLER
echo   Automotive & Industrial WhatsApp Automation Suite for Vikas Automobiles
echo                 HP Lube Distributor & C&F Agent, Satna (M.P.)
echo ===============================================================================
echo.

:: Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not found on your system!
    echo Please install Node.js 18 or higher from https://nodejs.org/
    echo Once installed, reopen this script.
    pause
    exit /b 1
)

echo [1/3] Verifying Node.js environment...
node -v
npm -v
echo.

echo [2/3] Installing dependencies locally (zero cost, zero subscriptions)...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install packages. Please check internet connection.
    pause
    exit /b 1
)
echo.

echo [3/3] Initializing local database directory and sample HP Lubricants data...
if not exist "data" mkdir data
echo.

echo ===============================================================================
echo [SUCCESS] Vikas Message Automator installation completed successfully!
echo.
echo To launch the application:
echo   1. Double click 'start.bat'
echo   2. Open your web browser at http://localhost:3000
echo   3. Connect your WhatsApp Business account via QR Code
echo ===============================================================================
echo.
pause
