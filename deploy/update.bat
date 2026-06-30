@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ============================================================
echo  NVR Dashboard - UPDATE (keeps your database + settings)
echo ============================================================
echo.
echo Run this from the NEW version folder. It carries over your
echo registered NVRs, your admin login, and your SERVER_IP from
echo the OLD install, so nothing is lost.
echo.

set "OLD=%~1"
if "%OLD%"=="" set /p OLD=Path to your CURRENT (old) install folder, e.g. C:\nvr-dashboard:

if not exist "%OLD%\backend\dist\index.js" (
  echo.
  echo [ERROR] "%OLD%" does not look like an NVR Dashboard install.
  echo         (expected %OLD%\backend\dist\index.js)
  exit /b 1
)

set "NEW=%~dp0"
if /i "%OLD%\"=="%NEW%" (
  echo [ERROR] Old and new folders are the same. Unzip the new version to a
  echo         DIFFERENT folder first ^(e.g. C:\nvr-dashboard-v1.1.2^).
  exit /b 1
)

echo.
echo Carrying over from: %OLD%

REM 1) Database = registered NVRs + users + your admin login (password lives here)
if exist "%OLD%\backend\data" (
  if not exist "%NEW%backend\data" mkdir "%NEW%backend\data"
  xcopy /E /I /Y "%OLD%\backend\data\*" "%NEW%backend\data\" >nul
  echo   [ok] database copied (NVRs + admin login preserved)
) else (
  echo   [..] no database in old install - a fresh one will be created
)

REM 2) SERVER_IP configuration
if exist "%OLD%\config.txt" (
  copy /Y "%OLD%\config.txt" "%NEW%config.txt" >nul
  echo   [ok] config.txt (SERVER_IP) copied
)

echo.
echo ============================================================
echo  UPDATE READY
echo ============================================================
echo  - Your NVRs and admin login are preserved (from the database).
echo  - You will need to LOG IN AGAIN after restart (new session key);
echo    your username/password are unchanged.
echo  - This version uses its own .env; you do NOT need the old one.
echo.
echo  NEXT STEPS:
echo    1) Stop the OLD version:  run  "%OLD%\stop.bat"
echo    2) Start THIS version:    run  "%NEW%start.bat"
echo    3) Check the version shown in the sidebar / VERSION.txt
echo.
echo  Rollback (if needed): just run the OLD start.bat again - the old
echo  folder is untouched.
echo ============================================================
endlocal
