# Build a clean static bundle and deploy to Cloudflare Pages.
# Excludes dev-only folders (original GLBs, tools, worktrees) that break the 25 MiB/file limit.
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

Push-Location $root
try {
  npx wrangler pages deploy .pages-deploy `
    --project-name=cinematic-bible-study-daniel `
    --branch=main `
    --commit-dirty=true
} finally {
  Pop-Location
}
