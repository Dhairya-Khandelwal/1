@echo off
TITLE Vikas Message Automator - Local Database Backup
COLOR 0E

echo ===============================================================================
echo            VIKAS MESSAGE AUTOMATOR - LOCAL BACKUP UTILITY
echo                 Vikas Automobiles, Satna, M.P.
echo ===============================================================================
echo.
set "BACKUP_DIR=backups"
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%
set BACKUP_FILE=%BACKUP_DIR%\vikas_automator_db_%TIMESTAMP%.json

if exist "data\database.json" (
    copy "data\database.json" "%BACKUP_FILE%" >nul
    echo [SUCCESS] Local database snapshot created at: %BACKUP_FILE%
) else (
    echo [NOTICE] data\database.json not found. Run start.bat first to initialize data.
)

echo.
pause
