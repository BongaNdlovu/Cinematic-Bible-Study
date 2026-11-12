# 1. Overview

**Last verified:** 12 November 2026

## What the site is for

The Shelf of Daniel is a guided study of the Bible book of Daniel. It reads the book in the historicist tradition, with the teaching centred on Jesus Christ. It combines four things:

- a written course of 11 **sittings** (lessons 0 to 10), read like a book with checkpoint questions;
- an interactive **Map of History** that follows the kingdoms Daniel describes, year by year;
- a **3D gallery** of the statue from Daniel 2 (gold head, silver chest, bronze thighs, iron legs, feet of iron and clay) and the visions of the later chapters;
- **account features**: saved progress, notes and bookmarks, certificates, readers' notes (reviews), and a message desk.

The site credits Fanelesibonge Ndlovu as its creator (`index.html` footer).

## Who uses it

| Visitor | What they can do |
|---|---|
| Guest (not signed in) | Read sittings 0, 1 and 2 (`FREE_THROUGH = 2` in `js/shared/journey.js`), browse the home shelf, the privacy page and the terms. Progress stays on the device. |
| Member (signed in with Google) | Every sitting, opened in order as each earlier sitting is completed. Also the map, the gallery, cloud-saved progress, notes and bookmarks, certificates, and posting readers' notes. |
| Moderator | Everything a member can do, plus approving readers' notes, reading the study insights dashboard (`insights.html`), and previewing locked sittings. Moderator rights need a confirmed Google identity and an authenticator app (see [Security](04-security.md)). |

## Where it runs

| Part | Where |
|---|---|
| Live site | `https://cinematic-bible-study-daniel.pages.dev` (Cloudflare Pages project `cinematic-bible-study-daniel`) |
| Edge code | One Pages Functions middleware (`functions/_middleware.js`) and one rate-limit Worker with a Durable Object (`workers/exhibit-rate-gate/`) |
| Data and sign-in | Supabase (Postgres with row-level security, Auth with Google sign-in) |
| Error monitoring | Sentry (browser bundle vendored in `vendor/sentry/`) |
| Local copy | `python server.py`, serving the same files on `127.0.0.1` |

## Pages

| Page | File | Who can open it |
|---|---|---|
| Home (the shelf) | `index.html` | Everyone |
| Study desk | `study.html` | Everyone; sittings past 2 need a member |
| Map of History | `map.html` | Members (guests are sent to the account page) |
| 3D gallery | `gallery.html` | Members (guests are sent to the account page) |
| Account | `account.html` | Everyone; the hub needs a member |
| Readers' notes | `reviews.html` | Everyone reads; members write |
| Study insights | `insights.html` | Moderators |
| Privacy, Terms | `privacy.html`, `terms.html` | Everyone |
| Not found | `404.html` | Everyone |
| Old shelf link | `shelf.html` | Redirects to `index.html` |

## Current state (12 November 2026)

- The audit fixes of 12 November 2026 are written and tested locally, but **not yet committed or deployed**. See [`docs/FIX-REPORT-2026-11-12.md`](../FIX-REPORT-2026-11-12.md).
- Lint is clean. The main suite passes, 68 of 68 unit tests pass, and 22 of 22 security audit checks pass (all run 12 November 2026).
- In the live database, all 18 tables in the `public` schema have row-level security switched on (read-only query, 12 November 2026).

### Open questions

| Question | Status |
|---|---|
| The live database has a `site_notices` table that no code in this repo uses. Where did it come from, and is it still needed? | Not checked |
| No code in this repo calls the `/__rate` proxy. The smoke test only checks that it refuses callers without the secret. Who is meant to call it? | Not checked |
| A comment pass found that the `inert` attributes set when a diagram goes full screen (`js/study/study-app.js`, `wireDiagramFullscreen`) may be redundant, because CSS already hides those elements. | Not checked |
