@echo off
TITLE Vikas Message Automator - Shutdown
COLOR 0C

echo ===============================================================================
echo            VIKAS MESSAGE AUTOMATOR - SHUTDOWN
echo ===============================================================================
echo.
echo Stopping local node processes running on port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    taskkill /F /PID %%a >nul 2>nul
)
echo Server stopped successfully.
pause
