# NVR Dashboard — QA + Pentest Report

**Date:** 2026-06-29
**Method:** 4 parallel agents — code review, TypeScript review, security/pentest
(static + safe live probing), and live Playwright E2E (24 tests). Findings
deduplicated and triaged below.

**Bottom line:** App is functionally sound (E2E 22/24 pass; live WebRTC video
render verified at 1280×720). It was **not** production-safe as found: 2 CRITICAL
+ ~13 HIGH issues. All CRITICAL and HIGH items are **now fixed**; the CRITICALs and
most HIGHs were re-verified live (Playwright + API), the remainder are verified at
build/code level only — see the "Verified" column for the exact status of each.
A set of MEDIUM hardening items is deferred (listed at the end).

---

## Fixed & verified

### CRITICAL
- **go2rtc unauthenticated API → RCE / credential theft.** `:1984` had no auth and
  `origin:"*"`; `exec:` sources allow process spawn. → go2rtc API/RTSP **bound to
  loopback** (`127.0.0.1`) in `go2rtc.yaml`; reverse-proxy template added
  (`docs/nginx-go2rtc.conf`, blocks management endpoints + adds auth). Verified the
  loopback bind + same-host render still works. *(nginx template is docs-only, not
  runtime-verified.)*
- **SSRF via NVR IP field.** `z.string().ip()` accepted `169.254.169.254` etc.;
  server fetched it every 60s. → denylist in `schemas.ts` (link-local/IMDS,
  `0.0.0.0/8`, multicast/reserved, loopback in prod). Verified: `169.254.169.254`
  → HTTP 400; private LAN IPs still allowed.

### HIGH
| Area | Fix | Verified |
|------|-----|----------|
| RTSP password returned in `/api/streams/:id/:ch` | Removed `rtsp` field from response | API shows only `streamName,webrtc,hls,mse` |
| RTSP username not URL-encoded | `encodeURIComponent` on user + pass in both builders | build |
| Camera auto-sync (SSRF trigger) ungated | Restricted auto-sync to `role==='admin'` | code |
| `jwt.verify() as TokenPayload` → ghost user; no alg pin | Narrow payload + `algorithms:['HS256']` | build |
| `Number(param)` NaN bypasses channel guard | `parsePositiveInt` integer validation (live + playback) | `/streams/abc/xyz` → 400 |
| `/api/streams/status/all` route-shadowed (dead) | Moved literal routes before `/:nvrId/:channel` | `/status/all` → 200 |
| Wrong password silently redirects, no error | 401 interceptor skips `/auth/login` | **Playwright**: error shown, stays on /login |
| `/api/streams/playback` after route reorder | Literal routes before wildcard | **Playwright**: Play → 200 + webrtc URL |
| HLS fallback fails silently (no retry) | Added `Hls.Events.ERROR` → fatal ⇒ `failed` state | **Playwright**: Retry overlay appears |
| Edit NVR form sends empty creds → opaque 400 | Omit blank username/password on edit | **Playwright**: edit w/ blank pw succeeds |
| HLS.js instance never destroyed (leak) | `hlsRef` + `destroy()` in cleanup | code |
| SDP answer / go2rtc JSON accepted as `any` | Validate shape before use | render still PASS (not over-narrowed) |
| Swallowed sync/register errors (no logging) | `logger.warn` in all `.catch` blocks | code |
| Fullscreen targets wrong camera w/ empty cells | VideoPlayer fullscreens its own `videoRef` | code (headless fullscreen not assertable) |

Also: bounded all backend→go2rtc fetches with a 5s timeout; `listStreams`
validates response shape; optional `GO2RTC_USERNAME/PASSWORD` for proxied auth;
fixed the stale `removeStream` API comment.

---

## Deferred — MEDIUM hardening (recommended before production)

Not yet implemented; tracked here so they aren't lost:
- Encrypt NVR passwords at rest (currently plaintext in SQLite) — AES-256-GCM with
  a dedicated key.
- Move JWT from `localStorage` to an **HttpOnly Secure cookie** (XSS exposure).
- Add `pino` `redact` for `password` / `authorization` paths.
- Per-account login lockout (current rate limit is per-IP only).
- Block default `JWT_SECRET` / `ADMIN_PASSWORD` values in production via env refine.
- Move NVR-create camera sync to background (currently blocks the response ~10s on
  unreachable IPs).
- JWT revocation / shorter expiry + refresh tokens.
- `parseCameraList` should honor the CGI `Status` field (don't enable disconnected
  channels).
- Playback streams are never evicted from go2rtc (add TTL/cleanup).

## Confirmed clean (no action)
Parameterized SQL (no injection), no `dangerouslySetInnerHTML` / XSS sink, Helmet +
CORS correctly configured on the Express API, bcrypt rounds = 12, `.env` not tracked
in git, `npm audit` clean (backend + frontend).

## E2E summary (Playwright, live)
22/24 pass. The 2 failures (wrong-password UX, HLS silent failure) are both fixed
and re-verified. Live video render confirmed: `videoWidth=1280, readyState=4,
currentTime>0`.
