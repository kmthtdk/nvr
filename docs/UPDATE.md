# Updating an existing Production install (airgap)

The Production PC already runs an older version with registered NVRs, an admin
login, and a SERVER_IP. Updating **must keep those**. Every release is a separate
self-contained folder, so you update by deploying the new version *beside* the old
one and carrying over the data — the old folder stays intact for instant rollback.

## What is preserved vs replaced

| Item | Kept? | Where it lives |
|------|-------|----------------|
| Registered NVRs, cameras | ✅ kept | `backend\data\nvr-dashboard.db` |
| Admin login (username + password) | ✅ kept | stored in the database (NOT `.env`) |
| SERVER_IP | ✅ kept | `config.txt` |
| App code (Node, frontend, backend, go2rtc, ffmpeg) | 🔄 replaced | the new bundle |
| `.env` | 🔄 new version's | login is unaffected (it's in the DB) |

You will need to **log in again** after the restart (the session key is
regenerated) — your username/password are unchanged.

## Update steps

1. **Copy the new zip to the Production PC** (USB), e.g.
   `nvr-dashboard-prod-v1.1.2+<hash>.zip`.
2. **Unzip to a NEW folder** — a different name from the current one, e.g.
   `C:\nvr-dashboard-v1.1.2` (do not overwrite the old folder).
3. **Run `update.bat`** in the new folder. When asked, enter the path to your
   current install (e.g. `C:\nvr-dashboard`). It copies your database and
   `config.txt` into the new folder. (Or run: `update.bat C:\nvr-dashboard`.)
4. **Stop the old version:** run `stop.bat` in the old folder.
5. **Start the new version:** run `start.bat` in the new folder.
6. **Verify:** open `http://<SERVER_IP>:3001`, log in, confirm the **version in the
   sidebar** is the new one (also in `VERSION.txt` / `GET /api/health`). Your NVRs
   should already be listed.

The database schema upgrades automatically on first start (e.g. the new
`stream_profile` column) — existing NVRs are not affected.

## Manual update (without update.bat)

If you prefer to do it by hand, after unzipping the new folder:
- Copy `OLD\backend\data\`  → `NEW\backend\data\`   (the database)
- Copy `OLD\config.txt`     → `NEW\config.txt`      (SERVER_IP)
- Leave the NEW `backend\.env` as-is.
Then stop old `stop.bat`, start new `start.bat`.

## Rollback

The old folder is untouched. To roll back: stop the new version (`stop.bat`),
start the old version (`start.bat`). If you had registered new NVRs on the new
version and want them in the old DB too, copy `NEW\backend\data\` back first.

## After updating — H.265 cameras (QND-8011 etc.)

This version adds the **sub-stream profile** option. If some cameras showed
"Stream unavailable" (they are H.265 / play on the NVR but not the browser):
Device Manager → Edit that NVR → set **"Live grid stream profile"** to the H.264
sub-stream number (try **2**, then **3**) → Save. See `RUNNING.md`.
