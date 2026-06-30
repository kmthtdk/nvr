@echo off
echo Stopping NVR Dashboard...
taskkill /F /IM go2rtc.exe >nul 2>&1
REM NOTE: this stops ALL node.exe processes. On a dedicated server PC that is the
REM backend only. If this PC runs other Node apps, stop the "NVR backend" window
REM manually instead.
taskkill /F /IM node.exe >nul 2>&1
echo Done.
