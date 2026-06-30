# Usage Guide — NVR Dashboard

A web dashboard to view cameras from many Hanwha NVRs in one place.

## 1. Open & log in
- From any PC on the LAN, open `http://<SERVER_IP>:3001` (the Production PC's IP).
- Log in with `admin` and the password (first install: from `backend\.env`;
  after that: whatever you've set). The version shows in the sidebar.

## 2. Add an NVR (Devices)
- Go to **Devices → Add NVR**. Enter:
  - **Name**, **IP address** (the NVR's user-side LAN IP), **RTSP port** (usually
    554), **HTTP port** (usually 80), **Username / Password**, **Max channels**
    (8–16).
  - **Live grid stream profile** (optional): leave blank to use the main stream.
    If cameras are **H.265** (they play on the NVR but show "Stream unavailable"
    in the browser), set this to the **H.264 sub-stream** profile number — try
    **2**, then **3**.
- Save. The NVR appears as a card; **Check** updates its online status; **Edit /
  Delete** manage it.

## 3. Live View
- **Quick way — pick an NVR:** use the **"Select NVR"** dropdown at the top of Live
  View. It loads **all that NVR's cameras** into the grid and starts them live.
- **Manual way:** click an empty cell → choose NVR → choose a camera channel.
- **Layout:** switch 1×1 / 2×2 / 3×3 / 4×4 with the buttons (top-right).
- **Fullscreen:** hover a tile → click the ⛶ button.
- **Auto-reload:** after a browser refresh, the grid reconnects automatically — no
  need to re-add cameras.
- A red "Stream unavailable" tile with **Retry** means that stream failed (often
  H.265 — set the sub-stream profile, see step 2).

## 4. Playback
- Go to **Playback** → pick NVR + camera + date + duration → **Play** to view
  recorded video for that channel.

## 5. Tips & limits
- The live grid shows up to **16 tiles** at once; pick the NVR/cameras you need.
- Many cameras at once is heavy — if some don't start, open fewer at a time, or use
  the H.264 sub-stream (lighter than H.265). If cameras fail only when *many* are
  open (not the same ones each time), raise the NVR's **max RTSP clients** setting.
- Everything runs offline on the LAN — the app never contacts the internet
  (see `NETWORK-AUDIT.md`).

## Admin / ops
- **Start / stop:** `start.bat` / `stop.bat` on the Production PC.
- **Change SERVER_IP:** edit `config.txt`, then restart.
- **Update to a new version:** see `UPDATE.md` (keeps your NVRs & login).
- **Change admin password:** edit `ADMIN_PASSWORD` in `backend\.env`, delete
  `backend\data\nvr-dashboard.db`, restart (re-seeds admin). Note: this also clears
  registered NVRs — only do it on a fresh setup.
