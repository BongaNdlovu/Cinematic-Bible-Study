# Build a clean static bundle and deploy to Cloudflare Pages.
# Excludes dev-only folders (original GLBs, tools, worktrees) that break the 25 MiB/file limit.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$stage = Join-Path $root ".pages-deploy"

if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage | Out-Null

robocopy $root $stage /MIR `
  /XD .git node_modules .vercel qa .img2threejs .chrome_verify_tmp .pages-deploy .kilo originals assets\_glb_preview tools docs backups workers qa-e2e .github .vscode .wrangler __pycache__ `
  /XF .* *.bak *.pyc *.pyo .env* README.md package.json package-lock.json server.py .oxlintrc.json vercel.json wrangler.toml start_website.bat .gitignore .vercelignore auth-config.example.js *.example.js *.example.*.js middleware.js `
  /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed with exit code $LASTEXITCODE" }

if (Test-Path (Join-Path $stage "models\originals")) {
  Remove-Item (Join-Path $stage "models\originals") -Recurse -Force
}

# Explicit cleanup guarantee: remove any dotfiles, example configs, or sensitive root artifacts
Get-ChildItem -Path $stage -Force | Where-Object { $_.Name -like ".*" } | Remove-Item -Recurse -Force
Get-ChildItem -Path $stage -Recurse -Include *.example.js, *.example.*.js, *.bak, *.pyc, *.pyo, server.py, package.json, package-lock.json, README.md, middleware.js | Remove-Item -Force

node (Join-Path $root "tools\hash-release-assets.mjs") $stage
if ($LASTEXITCODE -ne 0) { throw "hash-release-assets failed" }

# Clean up unhashed scripts if hashed versions were generated
Get-ChildItem -Path $stage -Recurse -Include *.example.js, *.example.*.js | Remove-Item -Force

Push-Location $root
try {
  npx wrangler pages deploy .pages-deploy `
    --project-name=cinematic-bible-study-daniel `
    --branch=main `
    --commit-dirty=true
} finally {
  Pop-Location
}
