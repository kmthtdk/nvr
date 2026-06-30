============================================================
 NVR DASHBOARD - OFFLINE PRODUCTION BUNDLE
============================================================

This bundle is fully self-contained. It needs NO internet and NO installation
of any package. Everything required (Node.js runtime, all dependencies, go2rtc,
ffmpeg, the built web app) is included.

Target: Windows 10/11, 64-bit (x64).

------------------------------------------------------------
 1. INSTALL
------------------------------------------------------------
- Copy this entire folder onto the Production PC (e.g. C:\nvr-dashboard).
  Keep the folder structure intact.

------------------------------------------------------------
 2. CONFIGURE (one value)
------------------------------------------------------------
- Open config.txt and set SERVER_IP to this PC's LAN IPv4 address, the one that
  operator workstations will use to open the dashboard. Example:
      SERVER_IP=192.168.1.50
- If you leave it blank, start.bat auto-detects the primary adapter (verify the
  IP it prints is the correct LAN interface - this PC may have multiple NICs).

------------------------------------------------------------
 3. RUN
------------------------------------------------------------
- Double-click start.bat (or run it from a terminal).
- It opens two windows: "NVR go2rtc" and "NVR backend". Keep them running.
- From ANY PC on the LAN, open:   http://<SERVER_IP>:3001
- To stop: run stop.bat.
- To start automatically on boot: create a Scheduled Task that runs start.bat
  at logon/startup (the bundle does not install a Windows service).

------------------------------------------------------------
 4. FIRST LOGIN
------------------------------------------------------------
- Username: admin
- Password: see ADMIN_PASSWORD in  backend\.env  (a strong random password was
  generated at build time). CHANGE IT after first login if a UI option exists,
  or edit backend\.env and delete data\nvr-dashboard.db to re-seed, then restart.

------------------------------------------------------------
 5. ADD NVRs
------------------------------------------------------------
- Go to "Devices", add each Hanwha NVR using its USER-SIDE network IP, RTSP port
  (default 554), and credentials. Then assign cameras to cells in "Live View".
- The Production PC must be able to reach every NVR's user-side IP.

------------------------------------------------------------
 SECURITY NOTES (airgap LAN)
------------------------------------------------------------
- go2rtc's API (port 1984) is reachable on the LAN so browsers can play video.
  It is unauthenticated by design and is acceptable ONLY because this network is
  isolated (airgap). Do not bridge this LAN to the internet.
- For extra hardening, put an authenticated reverse proxy in front of go2rtc
  (see docs\nginx-go2rtc.conf) and restrict who can reach port 1984.
- NVR passwords are stored in backend\data\nvr-dashboard.db. Protect this PC's
  disk/OS accounts accordingly.

------------------------------------------------------------
 TROUBLESHOOTING
------------------------------------------------------------
- Backend window closes immediately: open a terminal, run
      node\node.exe backend\dist\index.js
  from the bundle root to see the error (usually a bad value in backend\.env).
- Video doesn't play from other PCs: confirm SERVER_IP is this PC's real LAN IP,
  Windows Firewall allows inbound TCP 3001 and TCP/UDP 8555, and the NVR is
  reachable from this PC.
- "ffmpeg not found": ensure the go2rtc folder (with ffmpeg.exe) was copied.
- Rare: if the backend fails to load better_sqlite3, install the Microsoft
  Visual C++ Redistributable (x64) - use an OFFLINE installer (vc_redist.x64.exe)
  copied to the Production PC.
============================================================
