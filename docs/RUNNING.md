# Running the NVR Dashboard

Centralized web app to view cameras from many Hanwha NVRs. Browsers cannot play
RTSP, so a **go2rtc** media proxy converts each NVR's RTSP channels into WebRTC
(low latency) with an HLS fallback. The architecture:

```
Hanwha NVR (RTSP, user-side network)  ──►  go2rtc  ──►  WebRTC/HLS  ──►  Browser <video>
        ▲                                     ▲
        │ camera-side LAN (invisible to app)  │ backend registers streams via go2rtc REST API
   IP cameras                            Express + SQLite (NVR/camera/auth)
```

## Verified status (2026-06-29)

End-to-end video render was proven with a synthetic RTSP source (ffmpeg test
pattern). A real browser logged in, assigned the camera in the grid, and the
`<video>` element painted **1280×720 @ readyState 4** via the app's own WebRTC
hook. See `Synthetic stream verification` below to reproduce.

Two go2rtc API bugs were fixed during verification (`backend/src/services/go2rtc.service.ts`):

- `addStream` sent the source in a JSON body; go2rtc requires it in the `?src=`
  query param (the body is silently ignored — 200 OK but **no stream created**,
  so no camera would ever display).
- `removeStream` deleted by `?name=`; go2rtc deletes by `?src=` (streams leaked
  on every NVR deletion).

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | **22 LTS** | `better-sqlite3` is a native module with **no prebuilt binary for Node 25**, and this machine has no MSVC C++ toolchain — Node 25 will fail `npm install`. A portable Node 22 is at `C:\tools\node-v22.20.0-win-x64`. |
| go2rtc | 1.9.x | binary at `C:\tools\go2rtc\go2rtc.exe` |
| ffmpeg | 8.x | required by go2rtc for snapshots and any codec transcoding; at `C:\tools\go2rtc\ffmpeg.exe`, and configured via `ffmpeg.bin` in the go2rtc config |

> **Do not use `docker-compose` on Windows for local runs.** It relies on
> `network_mode: host` for WebRTC UDP hole-punching, which is Linux-only. Use the
> native dev path below. The compose file is for Linux deployment.

### Two go2rtc configs — know which you're running

- **Repo `go2rtc.yaml`** targets the **docker/Linux** deploy: the `alexxit/go2rtc`
  image bundles ffmpeg in PATH, and `network_mode: host` makes the
  `stun:8555/udp` candidate work. It does **not** set `ffmpeg.bin` and does not
  list a host WebRTC candidate.
- **Bare-metal / Windows** runs need two additions (see the verification snippet
  below): `ffmpeg.bin` pointing at your ffmpeg.exe (otherwise snapshots and any
  transcode fail with `ffmpeg: executable file not found in %PATH%`), and an
  explicit `webrtc.candidates: ["127.0.0.1:8555"]` (no host networking to
  auto-discover the address). The verified local config lives at
  `C:\tools\go2rtc\go2rtc.yaml`.

## Install (once)

```bash
# Use Node 22 (PowerShell example: prepend it to PATH for the session)
# $env:Path = "C:\tools\node-v22.20.0-win-x64;" + $env:Path

npm install                 # root (concurrently)
cd backend && npm install   # express, better-sqlite3 (prebuilt on Node 22), ...
cd ../frontend && npm install
```

`backend/.env` already exists for local dev (admin / admin1234). For production,
rotate `JWT_SECRET` and `ADMIN_PASSWORD`.

## Run (three processes)

1. **go2rtc** (media proxy, ports 1984 API / 8554 RTSP / 8555 WebRTC):
   ```bash
   cd C:\tools\go2rtc && ./go2rtc.exe
   ```
2. **Backend** (API on :3001):
   ```bash
   cd backend && npm run dev      # or: npm run build && npm start
   ```
3. **Frontend** (Vite dev on :5173, proxies /api → :3001):
   ```bash
   cd frontend && npm run dev
   ```

Open http://localhost:5173, log in, add NVRs under **Devices**, then assign
cameras to cells in **Live View**.

## Synthetic stream verification (no real NVR required)

Use a ffmpeg test pattern as a fake camera. In the go2rtc config, name the stream
to match the RTSP path the backend builds (`/LiveChannel/01/media.smp`) so a
registered NVR pointed at `127.0.0.1:8554` resolves to it:

```yaml
ffmpeg:
  bin: "C:/tools/go2rtc/ffmpeg.exe"
streams:
  "LiveChannel/01/media.smp":
    - "exec:C:/tools/go2rtc/ffmpeg.exe -hide_banner -re -f lavfi -i testsrc=size=1280x720:rate=15 -c:v libx264 -preset ultrafast -tune zerolatency -pix_fmt yuv420p -g 30 -f rtsp -rtsp_transport tcp {output}"
```

Then register an NVR with IP `127.0.0.1`, RTSP port `8554`, `max_channels: 1`.
Quick frame check (proves the media pipeline decodes real frames):

```bash
curl "http://localhost:1984/api/frame.jpeg?src=nvr_1_ch1" -o frame.jpg
```

## Security hardening

A QA + pentest pass (2026-06-29) drove these fixes. **Applied & verified in code:**
- **SSRF guard** on the NVR IP field — link-local/IMDS (`169.254.0.0/16`), `0.0.0.0/8`,
  multicast/reserved, and (in production) loopback are rejected. Private LAN ranges
  stay allowed because real NVRs live there.
- **No credentials in API responses** — the live-stream endpoint no longer returns
  the RTSP URL (it embedded the NVR password); username is now URL-encoded too.
- **Auth hardening** — `jwt.verify` pins `HS256` and validates the payload shape;
  bad-credential 401s surface a real error instead of silently redirecting.
- **Route + param validation** — `/api/streams/status/all` no longer shadowed;
  non-integer `nvrId`/`channel` rejected (was producing `…/NaN/…` URLs).
- **Camera auto-sync** (an SSRF-capable side effect) restricted to admins.
- **go2rtc bound to loopback** (`127.0.0.1`) — see below.

**Production checklist (must do before exposure):**
1. **Never expose go2rtc :1984/:8554 to the LAN.** Its API is unauthenticated and
   supports `exec:` sources (= RCE). It is bound to loopback in `go2rtc.yaml`; keep
   it that way and front it with `docs/nginx-go2rtc.conf` (auth + blocks management
   endpoints). *That nginx template is a deployment artifact and was NOT runtime-
   verified in this environment — test it in staging.*
2. Rotate `JWT_SECRET` (32+ random bytes) and set a strong `ADMIN_PASSWORD`
   (the env-validation guards enforce minimums; defaults are dev-only).
3. **Still TODO (deferred MEDIUM, not yet implemented):** encrypt NVR passwords at
   rest (currently plaintext in SQLite), move the JWT from `localStorage` to an
   HttpOnly cookie, add `pino` `redact` for `password`/`authorization`, per-account
   login lockout, and block default secrets in production. See the QA/pentest report.

## Connecting real Hanwha NVRs — what to verify

The scaffold targets **Hanwha XRN-1620SB1** but the exact RTSP path and codec
**must be confirmed against one real device before trusting it for all 40**:

- **RTSP path** (`HanwhaService.buildRtspUrl`): assumes
  `rtsp://user:pass@ip:554/LiveChannel/<2-digit>/media.smp`, 1-indexed channels.
  Wisenet URL format and channel indexing vary by model/firmware.
- **Codec**: Hanwha cameras often emit **H.265/HEVC**, which WebRTC cannot carry —
  go2rtc must transcode to H.264 via ffmpeg = heavy CPU **per stream** (16
  transcodes on a 4×4 wall). If H.265, register the camera **sub-stream**
  (lower-res secondary profile) for the grid instead.
- **Reachability (dual network)**: each NVR has a camera-side LAN and a user-side
  network. The app only needs the **user-side** IP — the camera LAN stays
  invisible, and the architecture already handles this correctly. The go2rtc
  host must be able to route to **all 40 user-side NVR IPs**.

## Scale gaps for 40 NVRs / ~320–640 cameras

The core viewing path works, but for the full fleet these are real limitations
(not yet implemented):

- **Live grid caps at 4×4 (16 cells)** with **manual per-cell assignment**. There
  is no per-NVR view, pagination, multi-page camera wall, or saved/named layouts.
- **No bulk NVR import** — 40 devices must be added one at a time via the UI. A
  CSV/JSON import or seed script is recommended.
- **Stream lifecycle**: streams are registered on demand and are not torn down
  when a cell is cleared; at fleet scale a reference-count/idle-eviction policy
  for go2rtc streams is advisable.
- **go2rtc capacity**: WebRTC fan-out and any H.265→H.264 transcoding for
  hundreds of cameras may need multiple go2rtc instances / a media server tier.
