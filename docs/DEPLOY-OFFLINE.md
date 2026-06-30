# Offline Release — Airgapped Production PC

The Production PC is **airgapped** (no internet). The release bundle is fully
self-contained: it installs **nothing** from the network. It includes a portable
Node 22 runtime, all `node_modules` (with the already-compiled `better-sqlite3`),
go2rtc + ffmpeg, the built backend (`dist`), and the built frontend (static).

## Build the bundle (on the Dev PC, which has internet)

```powershell
# 1. Build the apps with Node 22 (see RUNNING.md for why not Node 25)
cd backend  ; npm run build
cd ..\frontend ; npm run build
# 2. Assemble the offline bundle + zip
cd ..
powershell -ExecutionPolicy Bypass -File scripts\build-release.ps1
```

Output (gitignored):
- `release\nvr-dashboard-prod\` — the bundle folder
- `release\nvr-dashboard-prod-v<version>.zip` — copy this to the Production PC
  (~97 MB). The filename carries the version (package.json version + git short
  hash); the bundle also includes `VERSION.txt` and a version banner in
  `README.txt`, and the running app shows the version in the sidebar and at
  `GET /api/health`.

The script prints the version and the generated admin password (also written to
`backend\.env` inside the bundle).

## Bundle layout

```
nvr-dashboard-prod/
├── node/         portable Node 22 (node.exe)
├── go2rtc/       go2rtc.exe + ffmpeg.exe + go2rtc.template.yaml
├── backend/      dist/ + node_modules/ + package.json + .env + data/
├── frontend/dist/  built SPA (served by the backend, same-origin)
├── docs/         nginx-go2rtc.conf
├── config.txt    set SERVER_IP here
├── start.bat / stop.bat
└── README.txt
```

`backend\.env` must stay at the backend root with `dist/` beneath it — dotenv
resolves `../../.env` from `dist/config`, so flattening the layout breaks startup.

## Deploy on the Production PC

1. Unzip onto the PC (e.g. `C:\nvr-dashboard`).
2. Edit `config.txt` → `SERVER_IP=<this PC's LAN IPv4>` (blank = auto-detect).
3. Run `start.bat`. It generates `go2rtc\go2rtc.yaml` from the template with that
   IP, puts the bundled Node + ffmpeg on PATH, and launches go2rtc + backend.
4. Open `http://<SERVER_IP>:3001` from any workstation on the LAN.
5. Login `admin` / password from `backend\.env`. Add NVRs under **Devices**.
6. Firewall: allow inbound **TCP 3001** (dashboard) and **TCP/UDP 8555** (WebRTC).

`stop.bat` stops go2rtc and Node. For auto-start, register `start.bat` as a
Scheduled Task at startup.

## Verified (Dev PC, bundled binaries only, clean PATH)

- Boots in **production** mode using only the bundled `node.exe` (no system Node);
  `better-sqlite3` native module loads; serves the SPA + `/api` on :3001; login
  with the generated password works; production SSRF guard active.
- Renders **live video** end-to-end via the bundled go2rtc + ffmpeg (verified with
  a synthetic RTSP test source: `<video>` 1280×720, readyState 4).

## Notes / caveats

- **LAN mode** exposes go2rtc's unauthenticated API on :1984 so browsers can play
  video. Acceptable only on the isolated airgap LAN; for defense in depth front it
  with `docs/nginx-go2rtc.conf`. (Local-only mode = set go2rtc back to a loopback
  bind and `GO2RTC_API_URL=http://localhost:1984`, viewed on the PC itself.)
- Both PCs must be **Windows x64** (native module ABI). Rare clean machines may
  need the offline **Microsoft VC++ Redistributable (x64)** — see README troubleshooting.
- Architecture/security details: `docs/RUNNING.md`, `docs/SECURITY-QA-REPORT.md`.
