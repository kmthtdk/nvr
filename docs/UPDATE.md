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

## Update steps (in-place — recommended)

`update.bat` updates your existing install **in place** (same folder, e.g.
`C:\nvr-dashboard`). It stops the service, makes a full timestamped backup,
swaps in the new code, keeps your database + `config.txt`, and restarts.

1. **Copy the new zip to the Production PC** (USB), e.g.
   `nvr-dashboard-prod-v1.1.x+<hash>.zip`.
2. **Unzip it anywhere** (e.g. `C:\Users\you\Downloads\nvr-new`) — this is just
   the source of the new files, not the install.
3. **Run `update.bat`** from that unzipped folder and give it the install path:
   ```
   update.bat C:\nvr-dashboard
   ```
   (or run `update.bat` and type the path when asked.) It will:
   stop → back up to `C:\nvr-dashboard-backup-<timestamp>` → apply new code →
   restart.
4. **Verify:** open `http://<SERVER_IP>:3001`, **log in again** (session reset),
   confirm the **version in the sidebar** is the new one (also `VERSION.txt` /
   `GET /api/health`). Your NVRs are already listed.

The database schema upgrades automatically on first start (e.g. the
`stream_profile` column) — existing NVRs are not affected.

## Manual update (without update.bat)

With the service stopped (`stop.bat`), after unzipping the new bundle:
- Back up the whole current install folder somewhere safe.
- Copy `CURRENT\backend\data\` and `CURRENT\config.txt` into the new bundle.
- Replace the current folder's contents with the new bundle's contents.
- Run `start.bat`.

## Rollback

`update.bat` leaves a full backup at `<install>-backup-<timestamp>`. To roll back:
1. Stop the service (`stop.bat`).
2. Delete (or rename) the updated install folder.
3. Rename the backup folder back to the original install name.
4. Run its `start.bat`.

Delete old `*-backup-*` folders once the new version is confirmed working.

## After updating — H.265 cameras (QND-8011 etc.)

This version adds the **sub-stream profile** option. If some cameras showed
"Stream unavailable" (they are H.265 / play on the NVR but not the browser):
Device Manager → Edit that NVR → set **"Live grid stream profile"** to the H.264
sub-stream number (try **2**, then **3**) → Save. See `RUNNING.md`.
