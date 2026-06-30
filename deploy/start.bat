@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ============================================================
echo  NVR Dashboard - starting (offline / self-contained)
echo ============================================================

REM ── Resolve SERVER_IP from config.txt, else auto-detect ─────
set "SERVER_IP="
if exist "config.txt" (
  for /f "usebackq tokens=1,* delims==" %%A in ("config.txt") do (
    set "KEY=%%A"
    set "KEY=!KEY: =!"
    if /i "!KEY!"=="SERVER_IP" set "SERVER_IP=%%B"
  )
)
set "SERVER_IP=!SERVER_IP: =!"
if "!SERVER_IP!"=="" (
  for /f "delims=" %%I in ('powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 ^| Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } ^| Sort-Object InterfaceMetric ^| Select-Object -First 1 -ExpandProperty IPAddress)"') do set "SERVER_IP=%%I"
)
if "!SERVER_IP!"=="" set "SERVER_IP=127.0.0.1"
echo  Server IP : !SERVER_IP!

REM ── Generate go2rtc config from template ────────────────────
powershell -NoProfile -Command "(Get-Content 'go2rtc\go2rtc.template.yaml') -replace '__SERVER_IP__', '!SERVER_IP!' | Set-Content -Encoding ASCII 'go2rtc\go2rtc.yaml'"

REM ── PATH: bundled Node + bundled go2rtc/ffmpeg take precedence ─
set "PATH=%~dp0node;%~dp0go2rtc;%PATH%"

REM ── Backend runtime overrides (dotenv will NOT overwrite these) ─
set "GO2RTC_API_URL=http://!SERVER_IP!:1984"
set "CORS_ORIGIN=http://!SERVER_IP!:3001"

REM ── Launch go2rtc (own window, CWD = go2rtc dir) ────────────
start "NVR go2rtc" /D "%~dp0go2rtc" "%~dp0go2rtc\go2rtc.exe"

REM ── Launch backend (own window, CWD = backend dir) ──────────
start "NVR backend" /D "%~dp0backend" "%~dp0node\node.exe" dist\index.js

echo.
echo ============================================================
echo  Started. Open from any workstation on the LAN:
echo.
echo      http://!SERVER_IP!:3001
echo.
echo  Login: admin   (password is in README.txt - change it after first login)
echo  To stop: run stop.bat
echo ============================================================
endlocal
