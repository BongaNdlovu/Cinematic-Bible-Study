# Stage, hash scripts and models, then deploy that directory to Vercel production.
# middleware.js and vercel.json stay in the stage on purpose: Vercel needs both
# (edge rate-gate middleware and the security headers).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$stage = Join-Path $root ".pages-deploy"

if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage | Out-Null

robocopy $root $stage /MIR `
  /XD .git node_modules .vercel qa .img2threejs .chrome_verify_tmp .pages-deploy .kilo originals assets\_glb_preview tools docs backups workers qa-e2e .github .vscode .wrangler __pycache__ `
  /XF *.bak *.pyc *.pyo .env* README.md server.py .oxlintrc.json package.json package-lock.json .gitignore start_website.bat auth-config.example.js *.example.js *.example.*.js wrangler.toml `
  /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed with exit code $LASTEXITCODE" }

if (Test-Path (Join-Path $stage "models\originals")) {
  Remove-Item (Join-Path $stage "models\originals") -Recurse -Force
}

# Explicit cleanup guarantee: remove any dotfiles, example configs, or sensitive root artifacts
Get-ChildItem -Path $stage -Force | Where-Object { $_.Name -like ".*" } | Remove-Item -Recurse -Force
Get-ChildItem -Path $stage -Recurse -Include *.example.js, *.example.*.js, *.bak, *.pyc, *.pyo, server.py, package.json, package-lock.json, README.md | Remove-Item -Force

node (Join-Path $root "tools\hash-release-assets.mjs") $stage
if ($LASTEXITCODE -ne 0) { throw "hash-release-assets failed" }

Push-Location $root
try {
  npx vercel deploy .pages-deploy --prod --yes --project cinematic-bible-study-daniel
} finally {
  Pop-Location
}
