# Network Egress Audit — Airgap Verification

**Question:** Does the software send any information to the internet when running?
**Answer:** **No.** The dashboard (backend + go2rtc + the web app) makes **zero**
external network connections. Verified statically and at runtime (v1.1.1+).

## What was checked

### A. Static — the shipped bundle (what actually runs on the Production PC)
- `frontend/dist/index.html`: no external `<link>`/`<script>`, **no CDN, no Google Fonts**.
- `frontend/dist/assets/*.css`: no external `@import`/`url()` (the "Inter" font is a
  CSS `font-family` fallback name only — it is never downloaded; it falls back to
  the system font if absent).
- `frontend/dist/assets/*.js`: `iceServers:[]` (no STUN/TURN). The only external
  URLs present are **inert string literals** in library code, never fetched:
  - `https://aomedia.org/emsg/ID3` — an HLS/ID3 spec identifier string in hls.js
  - `https://react.dev/errors/`, `https://reactrouter.com/...` — text in
    console error/warning messages
- `backend/dist/**`: no external hosts, no `stun:`, no telemetry/analytics.
- `go2rtc.template.yaml`: WebRTC candidate is the server's fixed LAN IP
  (`<SERVER_IP>:8555`) — **no STUN server contacted**.

### B. Runtime — actual outbound TCP connections
With the app running and streaming, `Get-NetTCPConnection` for the server
processes showed:
- **node (backend) + go2rtc: 0 connections to any non-local address.** Their only
  sockets are listeners on loopback/LAN: backend `:3001`, go2rtc API
  `127.0.0.1:1984`, RTSP `127.0.0.1:8554`, WebRTC media `:8555`.
- The web app's own traffic (measured via an instrumented browser session,
  login → select NVR → play): **0 non-local requests**.

### C. Dependencies
- **go2rtc**: no telemetry/analytics, no update check, no "phone home". Its only
  possible outbound is a STUN server *if configured* — which this build does not.
- Backend deps (express, better-sqlite3, jsonwebtoken, bcryptjs, zod, pino,
  helmet, cors): none perform runtime network calls to external services.
- Frontend deps (react, react-router, zustand, hls.js, lucide): none phone home.
- Outbound HTTP from the backend goes **only to NVR LAN IPs** (`http://<nvr.ip>`
  for Hanwha CGI) — never to the internet. The SSRF guard additionally blocks
  link-local/metadata/reserved ranges.

## About the `github.com/AlexxIT/go2rtc/...` log lines
These are **not** network activity. go2rtc's logger (Go) prints the **source-file
path** that emitted each line, e.g. `…/internal/rtsp/rtsp.go:262`. It is a
compile-time string written to the local log file. No data leaves the machine.

## Not part of the software (host/browser, not the dashboard)
On a normal (non-airgap) PC, **Chrome itself** may connect to Google
(e.g. port 5228, GCM/sync) — that is the browser application's own behaviour,
independent of this dashboard, and does not occur on an airgapped network. To
avoid even that on operator machines, use a browser without Google sync or rely
on the airgap. The dashboard never initiates such connections.

## Conclusion
Safe to run on an isolated/airgapped network. The software requires no internet
and transmits nothing externally. Outbound traffic is limited to: backend ↔
go2rtc (loopback), backend ↔ NVRs (LAN), browser ↔ backend/go2rtc (LAN).
