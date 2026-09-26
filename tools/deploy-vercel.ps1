# Stage, hash scripts and models, then deploy that directory to Vercel production.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$stage = Join-Path $root ".pages-deploy"

if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage | Out-Null

robocopy $root $stage /MIR `
  /XD .git node_modules .vercel qa .img2threejs .chrome_verify_tmp .pages-deploy .kilo originals assets\_glb_preview tools `
  /XF *.bak *.pyc *.pyo .env* `
  /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed with exit code $LASTEXITCODE" }

if (Test-Path (Join-Path $stage "models\originals")) {
  Remove-Item (Join-Path $stage "models\originals") -Recurse -Force
}

node (Join-Path $root "tools\hash-release-assets.mjs") $stage
if ($LASTEXITCODE -ne 0) { throw "hash-release-assets failed" }

Push-Location $root
try {
  npx vercel deploy .pages-deploy --prod --yes --project cinematic-bible-study-daniel
} finally {
  Pop-Location
}
