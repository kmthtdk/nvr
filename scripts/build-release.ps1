# Builds a self-contained, offline NVR Dashboard bundle for an airgapped Windows
# x64 Production PC. No internet needed on the target: bundles portable Node,
# pre-installed node_modules (with compiled better-sqlite3), go2rtc + ffmpeg, the
# built backend (dist) and the built frontend (static).
#
# Run on the Dev PC AFTER building backend + frontend:
#   powershell -ExecutionPolicy Bypass -File scripts\build-release.ps1
$ErrorActionPreference = 'Stop'

$Root      = Split-Path -Parent $PSScriptRoot          # repo root
$NodeSrc   = 'C:\tools\node-v22.20.0-win-x64'
$Go2rtcDir = 'C:\tools\go2rtc'
$OutRoot   = Join-Path $Root 'release'
$Bundle    = Join-Path $OutRoot 'nvr-dashboard-prod'

function Assert-Path($p, $what) { if (-not (Test-Path $p)) { throw "Missing $what`: $p" } }

Write-Host '== Preflight ==' -ForegroundColor Cyan
Assert-Path $NodeSrc 'portable Node 22'
Assert-Path (Join-Path $Go2rtcDir 'go2rtc.exe') 'go2rtc.exe'
Assert-Path (Join-Path $Go2rtcDir 'ffmpeg.exe') 'ffmpeg.exe'
Assert-Path (Join-Path $Root 'backend\dist\index.js') 'built backend (run npm run build in backend)'
Assert-Path (Join-Path $Root 'backend\node_modules\better-sqlite3') 'backend node_modules'
Assert-Path (Join-Path $Root 'frontend\dist\index.html') 'built frontend (run npm run build in frontend)'

Write-Host '== Clean output ==' -ForegroundColor Cyan
if (Test-Path $Bundle) { Remove-Item -Recurse -Force $Bundle }
New-Item -ItemType Directory -Force -Path $Bundle | Out-Null

# robocopy: exit codes 0-7 are success; treat >=8 as failure
function Robo($src, $dst, $extra = @()) {
  $args = @($src, $dst, '/E', '/NFL', '/NDL', '/NJH', '/NJS', '/NP', '/R:1', '/W:1') + $extra
  & robocopy @args | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "robocopy failed ($LASTEXITCODE): $src -> $dst" }
}

Write-Host '== Copy portable Node ==' -ForegroundColor Cyan
Robo $NodeSrc (Join-Path $Bundle 'node')

Write-Host '== Copy go2rtc + ffmpeg ==' -ForegroundColor Cyan
$bGo = Join-Path $Bundle 'go2rtc'
New-Item -ItemType Directory -Force -Path $bGo | Out-Null
Copy-Item (Join-Path $Go2rtcDir 'go2rtc.exe') $bGo
Copy-Item (Join-Path $Go2rtcDir 'ffmpeg.exe') $bGo
Copy-Item (Join-Path $Root 'deploy\go2rtc.template.yaml') $bGo

Write-Host '== Copy backend (dist + node_modules + package.json) ==' -ForegroundColor Cyan
$bBe = Join-Path $Bundle 'backend'
New-Item -ItemType Directory -Force -Path $bBe | Out-Null
Robo (Join-Path $Root 'backend\dist') (Join-Path $bBe 'dist')
Robo (Join-Path $Root 'backend\node_modules') (Join-Path $bBe 'node_modules')
Copy-Item (Join-Path $Root 'backend\package.json') $bBe

Write-Host '== Copy frontend (static dist) ==' -ForegroundColor Cyan
$bFe = Join-Path $Bundle 'frontend'
New-Item -ItemType Directory -Force -Path $bFe | Out-Null
Robo (Join-Path $Root 'frontend\dist') (Join-Path $bFe 'dist')

Write-Host '== Generate backend\.env with random secrets ==' -ForegroundColor Cyan
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$jb = New-Object byte[] 32; $rng.GetBytes($jb)
$jwt = ([Convert]::ToBase64String($jb)) -replace '[^A-Za-z0-9]', 'x'   # keep it simple/safe
$pb = New-Object byte[] 12; $rng.GetBytes($pb)
$pw = (([Convert]::ToBase64String($pb)) -replace '[^A-Za-z0-9]', '') + 'A9'
$envText = Get-Content (Join-Path $Root 'deploy\env.template') -Raw
$envText = $envText.Replace('__JWT_SECRET__', $jwt).Replace('__ADMIN_PASSWORD__', $pw)
# .env must sit at the backend root (dotenv resolves ../../.env from dist/config)
Set-Content -Path (Join-Path $bBe '.env') -Value $envText -Encoding ASCII -NoNewline

Write-Host '== Copy launch scripts + config + docs ==' -ForegroundColor Cyan
Copy-Item (Join-Path $Root 'deploy\start.bat')  $Bundle
Copy-Item (Join-Path $Root 'deploy\stop.bat')   $Bundle
Copy-Item (Join-Path $Root 'deploy\config.txt') $Bundle
Copy-Item (Join-Path $Root 'deploy\README.txt') $Bundle
$bDocs = Join-Path $Bundle 'docs'
New-Item -ItemType Directory -Force -Path $bDocs | Out-Null
# Bundle ALL project docs so the airgapped Production PC has the full reference
# (deploy, run, security/QA report, nginx template).
Copy-Item (Join-Path $Root 'docs\*') $bDocs -Recurse -Force -ErrorAction SilentlyContinue

# Pre-create the SQLite data dir
New-Item -ItemType Directory -Force -Path (Join-Path $bBe 'data') | Out-Null

Write-Host '== Zip ==' -ForegroundColor Cyan
$Zip = Join-Path $OutRoot 'nvr-dashboard-prod.zip'
if (Test-Path $Zip) { Remove-Item -Force $Zip }
Compress-Archive -Path $Bundle -DestinationPath $Zip

$sizeMB = [math]::Round(((Get-ChildItem -Recurse $Bundle | Measure-Object Length -Sum).Sum / 1MB), 0)
Write-Host ''
Write-Host "== DONE ==" -ForegroundColor Green
Write-Host "  Bundle : $Bundle  (~$sizeMB MB)"
Write-Host "  Zip    : $Zip"
Write-Host "  Admin password (also in backend\.env): $pw"
