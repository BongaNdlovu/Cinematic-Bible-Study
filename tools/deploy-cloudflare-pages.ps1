# Build a clean static bundle and deploy to Cloudflare Pages.
# Excludes dev-only folders (original GLBs, tools, worktrees) that break the 25 MiB/file limit.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$stage = Join-Path $root ".pages-deploy"

node (Join-Path $root "tools\build-shelf-data.mjs")
if ($LASTEXITCODE -ne 0) { throw "build-shelf-data failed" }

if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage | Out-Null

robocopy $root $stage /MIR `
  /XD .git node_modules .vercel qa .img2threejs .chrome_verify_tmp .pages-deploy .kilo originals assets\_glb_preview tools docs backups workers qa-e2e .github .vscode .wrangler __pycache__ _factcheck _mig functions `
  /XF .* *.bak *.pyc *.pyo .env* README.md package.json package-lock.json server.py .oxlintrc.json vercel.json wrangler.toml start_website.bat .gitignore .vercelignore auth-config.example.js *.example.js *.example.*.js middleware.js __wiring_check.mjs qa_book_reader_full.log skills-lock.json tailwind.study.config.js study-tailwind-src.css glossary-enrichment-overrides.json three.core.js three.module.js `
  /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed with exit code $LASTEXITCODE" }

if (Test-Path (Join-Path $stage "models\originals")) {
  Remove-Item (Join-Path $stage "models\originals") -Recurse -Force
}

# Explicit cleanup guarantee: remove any dotfiles, example configs, or sensitive root artifacts
Get-ChildItem -Path $stage -Force | Where-Object { $_.Name -like ".*" } | Remove-Item -Recurse -Force
Get-ChildItem -Path $stage -Recurse -Include *.example.js, *.example.*.js, *.bak, *.pyc, *.pyo, server.py, package.json, package-lock.json, README.md, middleware.js | Remove-Item -Force

# Belt and braces: these two are research copies and build input, never release
# payload. Any surviving copy aborts the deploy rather than shipping silently.
foreach ($leak in @("_factcheck", "_mig", "__wiring_check.mjs", "qa_book_reader_full.log")) {
  $p = Join-Path $stage $leak
  if (Test-Path $p) { Remove-Item $p -Recurse -Force }
}
$leaksLeft = @("_factcheck", "_mig", "__wiring_check.mjs", "qa_book_reader_full.log") |
  Where-Object { Test-Path (Join-Path $stage $_) }
if ($leaksLeft) { throw ("deploy bundle still contains: " + ($leaksLeft -join ", ")) }

$devLeft = @("skills-lock.json", "tailwind.study.config.js", "functions", "css\study-tailwind-src.css", "js\study\glossary-enrichment-overrides.json", "vendor\three\build\three.core.js", "vendor\three\build\three.module.js") |
  Where-Object { Test-Path (Join-Path $stage $_) }
if ($devLeft) { throw ("deploy bundle still contains dev-only files: " + ($devLeft -join ", ")) }
$runtimeMissing = @("_headers", "_routes.json", "vendor\three\build\three.module.min.js", "vendor\three\build\three.core.min.js") |
  Where-Object { -not (Test-Path (Join-Path $stage $_)) }
if ($runtimeMissing) { throw ("deploy bundle is missing: " + ($runtimeMissing -join ", ")) }
$dotLeft = Get-ChildItem -Path $stage -Recurse -Force | Where-Object { $_.Name -like ".*" }
if ($dotLeft) { throw ("deploy bundle still contains dotfiles: " + (($dotLeft | ForEach-Object { $_.FullName.Substring($stage.Length + 1) }) -join ", ")) }

node (Join-Path $root "tools\hash-release-assets.mjs") $stage
if ($LASTEXITCODE -ne 0) { throw "hash-release-assets failed" }

# Clean up unhashed scripts if hashed versions were generated
Get-ChildItem -Path $stage -Recurse -Include *.example.js, *.example.*.js | Remove-Item -Force
$exampleLeft = Get-ChildItem -Path $stage -Recurse -Force -Include *.example.js, *.example.*.js, auth-config.example*
if ($exampleLeft) { throw ("deploy bundle still contains example configs: " + (($exampleLeft | ForEach-Object { $_.Name }) -join ", ")) }

Push-Location $root
try {
  npx wrangler pages deploy .pages-deploy `
    --project-name=cinematic-bible-study-daniel `
    --branch=main `
    --commit-dirty=true
} finally {
  Pop-Location
}
