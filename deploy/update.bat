@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ============================================================
echo  NVR Dashboard - UPDATE the running install (IN PLACE)
echo ============================================================
echo.
echo Run this from the NEW (just-unzipped) version folder. It updates
echo your EXISTING install in place:
echo   stop -> back up (for rollback) -> swap in new code -> restart,
echo keeping your database (NVRs + login) and SERVER_IP.
echo.

set "NEW=%~dp0"
set "TARGET=%~1"
if "%TARGET%"=="" set /p TARGET=Path to the install to update (e.g. C:\nvr-dashboard):
if "%TARGET:~-1%"=="\" set "TARGET=%TARGET:~0,-1%"

if not exist "%TARGET%\start.bat" (
  echo [ERROR] "%TARGET%" is not an NVR Dashboard install ^(no start.bat^).
  exit /b 1
)
if /i "%NEW%"=="%TARGET%\" (
  echo [ERROR] Run this from the NEW unzipped folder, not the install itself.
  exit /b 1
)
if not exist "%NEW%backend\dist\index.js" (
  echo [ERROR] This folder is not a valid new version bundle.
  exit /b 1
)

echo Target install : %TARGET%
echo New version     : %NEW%
echo.

REM 1) Stop the running install (frees locked files: node.exe, go2rtc.exe, ...)
echo [1/5] Stopping current version...
if exist "%TARGET%\stop.bat" call "%TARGET%\stop.bat"
timeout /t 3 /nobreak >nul

REM 2) Full timestamped backup for rollback (ABORT if it fails - install untouched)
for /f %%t in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TS=%%t"
set "BACKUP=%TARGET%-backup-%TS%"
echo [2/5] Backing up to: %BACKUP%
robocopy "%TARGET%" "%BACKUP%" /E /NFL /NDL /NJH /NJS /NP /R:1 /W:1 >nul
if errorlevel 8 (
  echo [ERROR] Backup failed - aborting. Your install was not modified.
  exit /b 1
)

REM 3) Preserve database + SERVER_IP by staging them into the NEW bundle
echo [3/5] Preserving database + config...
if exist "%TARGET%\backend\data" robocopy "%TARGET%\backend\data" "%NEW%backend\data" /E /NFL /NDL /NJH /NJS /NP /R:1 /W:1 >nul
if exist "%TARGET%\config.txt" copy /Y "%TARGET%\config.txt" "%NEW%config.txt" >nul

REM 4) Mirror new version onto the install (data/config already staged into NEW).
REM    /MIR also removes stale old files (e.g. old hashed frontend assets).
echo [4/5] Applying new version...
robocopy "%NEW%." "%TARGET%" /MIR /NFL /NDL /NJH /NJS /NP /R:1 /W:1 >nul
if errorlevel 8 (
  echo [ERROR] Update copy failed. Restore the install from: %BACKUP%
  exit /b 1
)

REM 5) Restart
echo [5/5] Starting updated install...
call "%TARGET%\start.bat"

echo.
echo ============================================================
echo  UPDATE COMPLETE
echo  - Open http://^<SERVER_IP^>:3001 and LOG IN AGAIN (session reset).
echo  - Your NVRs + login are preserved; version shows in the sidebar.
echo  - Rollback: stop, delete %TARGET%, rename the backup folder
echo    "%BACKUP%" back to "%TARGET%", run its start.bat.
echo  - You can delete old "*-backup-*" folders once the new version is OK.
echo ============================================================
endlocal
