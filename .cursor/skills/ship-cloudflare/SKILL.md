---
name: ship-cloudflare
description: >-
  Commit, push, and deploy this study site to Cloudflare Pages production.
  Use whenever the user asks to commit, push, deploy, ship, or publish,
  including "commit all changes", "push", and "deploy to cloudflare".
---

# Ship to Cloudflare

Follow this whenever the user asks to commit, push, or deploy. Do not commit, push, or deploy in a turn where they did not ask.

## Commit

1. In parallel: `git status --short`, `git diff`, `git log -8 --oneline`. Stay on the current branch. Do not checkout `master`.
2. Read the diff. Do not stage secrets, `.env`, or the operator email. Do not stage `tools/review/final-gc/`.
3. `node --check` each changed `.js` and `.mjs` file.
4. Stage only the files that belong in the change. Commit with a PowerShell here-string, one or two sentences on why:

```powershell
git commit -m @"
First sentence on why.

Second sentence only if the first cannot carry it.
"@
```

5. `git status --short` afterwards. Do not amend unless the user asked and the amend rules allow it.

## Push

```powershell
git push origin HEAD
```

If Auto-review blocks the push, retry that exact command with `request_smart_mode_approval` true and `smart_mode_block_reason` set to the exact block text. Do not force-push `main` or `master`.

## Deploy

From the repo root:

```powershell
powershell -NoProfile -File tools/deploy-cloudflare-pages.ps1
```

This publishes project `cinematic-bible-study-daniel` with `--branch=main`, which updates production at https://cinematic-bible-study-daniel.pages.dev. The unique `https://<id>.cinematic-bible-study-daniel.pages.dev` URL is the receipt for that same upload.

If Auto-review blocks it, retry the exact same command with approval and the exact block reason. Ignore the npm `devdir` warning and the npm update notice.

`tools/` and `docs/` are not in the deploy bundle. JavaScript and models are content-hashed, so live URLs look like `js/shared/auth.<12-hex>.js`. `study.html` answers 308 to `/study`. `shelf.html` answers 308 to `/shelf`.

## Confirm production

- `curl.exe -sL` the affected production URL and check the new markup or script is present.
- When the change is visible in the UI, open the live page, lock the browser, exercise the changed flow, then unlock. A shot of the loading screen is not confirmation.
