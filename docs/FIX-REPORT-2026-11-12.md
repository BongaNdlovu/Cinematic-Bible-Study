# Fix report — 12 November 2026

This report explains, in plain English, every fix made on 12 November 2026 for the audit list (P1, P2 and P3). For each fix it covers four things:

- **The problem**: what was going wrong.
- **Why it mattered**: who it affected and how.
- **The fix**: what was changed, and where.
- **What it means for users**: what a reader now sees or keeps.

Some findings turned out not to be bugs. They are listed at the end with the reason they were left alone.

Nothing in this report has been committed or deployed yet. A push to `master` deploys to production automatically (see [engineering/07-develop-test-release.md](engineering/07-develop-test-release.md)).

---

## At a glance

| Group | Findings | Fixed | Left alone on purpose |
|---|---:|---:|---:|
| P1 — must fix | 9 | 8 | 1 (not a bug) |
| P2 — edge cases | 23 | 17 | 6 (not bugs, or deliberate design) |
| P3 — dev tooling | 4 | 4 | 0 |

**Checks after the fixes**

| Check | Result |
|---|---|
| Lint (`npm run lint`) | Clean |
| Main test suite (`npm test`) | Passes, same as before the changes |
| Unit tests (`npm run test:unit`) | 68 pass, 0 fail. That is the 60 that existed before plus 8 new ones |
| Security audit script (`npm run test:security`) | 22 of 22 pass, same as before |
| New regression tests | All 7 bug tests fail on the old code and pass on the new code |
| Browser checks on the local site | Described under each fix where one was done |

---

## P1 — must fix

### 1. A "How clear was Sitting 0?" card appeared when it should not

- **The problem:** When no survey was waiting, the code read "nothing" as the number 0. Every time a reader opened a sitting, a survey card for Sitting 0 popped up. Once the reader dismissed it, the real Sitting 0 survey could never appear again. The same mistake meant invite links without a sitting number were recorded as "invited from Sitting 0" in the referral figures.
- **Why it mattered:** Readers got a confusing pop-up. The study figures collected wrong answers, and the referral numbers were wrong.
- **The fix:** A small helper, `storedInt`, now treats a missing value as "nothing". This applies to the survey card, to invite links when they arrive, and to the referral record when it is saved. An invite link without a sitting number no longer stores one. The stored sitting is cleared after it is used. (`js/shared/insights.js`)
- **What it means for users:** The survey card only appears after a sitting is actually finished. Referral figures only show a sitting when the link really had one.

### 2. Switching accounts on one device could lose unsaved notes and progress

- **The problem:** When a different account signed in on the same device, the site wiped the previous account's notes and progress from the device. Anything not yet saved to the cloud was gone. For progress there was a second problem: the previous account's unsaved progress stayed in the "waiting to send" queue, and could be sent to the **new** account.
- **Why it mattered:** A shared family or classroom computer could lose a reader's work. In the worst case, one person's progress could land in another person's account.
- **The fix:** Before clearing the device, the site now puts the previous account's unsaved changes aside under that account's name (`baStudySyncStash:<account>` and `baProgressStash:<account>`). It also clears the old "waiting to send" queue, so nothing goes to the new account. When the original owner signs in again, their changes are put back and saved to their own account. (`js/shared/study-sync.js`, `js/shared/progress-sync.js`, and the storage table in `privacy.html`)
- **What it means for users:** Unsaved notes and progress survive someone else signing in on the same device, and they never show up in the other person's account.

### 3. A slow answer check could mark the wrong sitting's question

- **The problem:** Answers are checked by the server. If a reader moved to another sitting while a check was still running, the late reply was applied to the new sitting's question. It could also open the gate to the next sitting.
- **Why it mattered:** A reader could be shown "correct" on a question they never answered, and skip ahead.
- **The fix:** The site now remembers which sitting the question belonged to. A reply that comes back after the reader has moved on is ignored. (`js/study/study-app.js`)
- **What it means for users:** Answers only count for the question that was actually answered.
- **Checked in the browser:** I held an answer check open, switched sittings, then let the reply arrive. The new sitting showed no feedback and its options stayed usable.

### 4. The question walkthrough could stop opening for good

- **The problem:** The step-by-step question dialog takes about half a second to close. If it was reopened during that time, the old close finished afterwards and hid the newly opened dialog. After that the button did nothing until the page was reloaded or Escape was pressed.
- **Why it mattered:** Readers who clicked quickly lost the walkthrough. While it was stuck, the keyboard Tab key was trapped too.
- **The fix:** Each close now has a ticket number. An old close cannot tear down a dialog that was opened after it. Reopening during the close also tidies up first. (`js/study/task-flow.js`)
- **What it means for users:** Quick clicks no longer break the walkthrough.
- **Checked in the browser:** I opened it, closed it, and reopened it within 100 ms. It stayed open and worked, then closed and opened normally afterwards.

### 5. (Not a bug) "The deploy drops the server functions"

The audit said the deploy script leaves out `functions/`, so the live site could never run them. That is not what happens. The deploy tool reads `functions/` from the folder it runs in, which is the project root, not from the bundle it uploads. I checked this in the tool's own code. Keeping `functions/` out of the uploaded files is correct, because it keeps the source code private. Nothing was changed.

### 6. Tapping an event from another year on the map did not move the camera

- **The problem:** Tapping an event from a different year switched the year, but opening the event's details accidentally cancelled the camera flight to that year.
- **Why it mattered:** Readers saw the new year's details while the map stayed somewhere else.
- **The fix:** Opening the details for that tap no longer cancels the flight that the same tap started. (`js/map/map.js`)
- **What it means for users:** The map now flies to the event's year.
- **Checked in the browser:** Clicking an event from another year now starts a camera flight to the new location.

### 7. Building the insights report twice could show the older result

- **The problem:** Clicking "build" twice started two downloads. Whichever finished last was shown, even if it was the older request.
- **Why it mattered:** A moderator could print a report for the wrong date range without noticing.
- **The fix:** Only the newest build is shown. The button is disabled while a build runs. Closing the report cancels any build still in progress. (`js/insights/insights.js`)
- **What it means for users (moderators):** The report always matches the dates last asked for.

### 8. The 3D gallery slowly used more and more graphics memory

- **The problem:** Each time a reader switched artifacts, copies of the 3D materials were thrown away without being released. They built up over a long visit.
- **Why it mattered:** Long sessions could become slower, especially on phones and tablets.
- **The fix:** When a model is removed, the material copies made for it are now released. The shared originals are left alone. Materials kept for the "original look" are also released when a model leaves the cache. (`js/gallery/app.js`)
- **What it means for users:** The gallery stays smooth during long visits.
- **Checked in the browser:** I switched through six artifacts and between the gold, clay and wireframe looks with no errors. The golden head still rendered correctly afterwards.

### 9. One damaged saved value broke the "export my progress" backup

- **The problem:** The export read five saved values. If any one of them was damaged, the export crashed and no backup was made.
- **Why it mattered:** The backup failed in exactly the situation where a reader most needs it.
- **The fix:** Each value is read safely. A damaged value is left out of the backup, rather than replaced with an empty value that could wipe data when the file is imported. The file lists which parts were left out, and the reader is told. (`js/study/competency.js`)
- **What it means for users:** The backup always downloads with everything that can still be read.

---

## P2 — edge cases (fixed)

| # | The problem | The fix | What it means for users |
|---|---|---|---|
| 1 | The "notes per day" limit reset at midnight UTC, which is mid-afternoon in some places. | The limit now uses the reader's own calendar day. (`js/shared/reviews.js`) | The daily limit resets at the reader's midnight. |
| 2 | If the site could not check whether a reader had already written a note, it showed the "write a new note" card anyway. That invited duplicates. | Any failed check now hides both cards and explains what happened. Short outages retry on their own: 4 tries, about 10, 20, 40 and 60 seconds apart. The message clears once the check works. (`js/shared/reviews.js`) | No accidental duplicate notes. |
| 3 | A failed survey save freed the most recent survey slot, which might belong to a different, successful save. | Each save now frees only its own slot. (`js/shared/insights.js`) | Survey limits stay accurate. |
| 4 | A failed batch of study events still used up the per-minute event budget. | The row budget is given back when a batch fails. The number of requests per minute is still capped. (`js/shared/insights.js`) | Events are not held back for no reason after a hiccup. |
| 5 | The error reporter would stop entirely if an optional feature was missing. | Optional features are now only switched on when they exist. The bundle this site ships has them, so this is a safeguard. (`js/shared/sentry.js`) | Error reports keep flowing. |
| 6 | Pressing Escape with a full-screen diagram open could also close the message desk. | Escape now leaves the desk alone while a diagram is full screen. (`js/shared/desk.js`) | One Escape closes one thing. |
| 7 | After a failed "remove" action in the message desk, the next click removed straight away, with no confirmation. | After a failure the buttons go back to their normal, unconfirmed state. (`js/shared/desk.js`) | Removing always asks first. |
| 8 | A network helper left a listener behind after a cancelled request. | The listener is now always removed. (`js/shared/net.js`) | Tidier memory use. |
| 9 | The focus timer finished one second late, and it slowed down when the tab was in the background. | The timer now counts real clock time. It finishes on time and catches up when the tab comes back. (`js/study/study-app.js`) | The focus timer is accurate. |
| 10 | The "passages checked" count recorded the raw page header, entities included (`&bull;`). Old and new forms of the same passage could be counted twice. | The plain text is recorded, and older entries are cleaned when counted. (`js/study/study-app.js`, `js/study/competency.js`) | The count is honest. |
| 11 | Opening a new word card while the previous one was closing left the old card stuck on screen, with no way to close it. | The old card is removed at once, and the new one keeps a working Back button. (`js/study/term-overlay.js`) | Word cards always close. **Checked in the browser:** one card on screen after the race, and it closed cleanly. |
| 12 | A card could get a second minimise button in some redraws. | Any old button is removed before a new one is added. (`js/study/card-min.js`) | One button per card. |
| 13 | A diagram's Replay button could be wired to a different diagram, so one click replayed two. | Each diagram only looks for the Replay button that follows it, up to the next diagram. (`js/study/mindmap.js`, `js/study/study-app.js`) | Replay replays the right diagram. |
| 14 | On the home page, hovering the readers' notes card mid-fade left it dimmed. | Hovering, focusing, pausing or hiding the tab now finishes the fade first. (`js/home/home.js`) | The card is never stuck dim. |
| 15 | If a gallery background image failed to load once, it was never tried again. | A failed image is forgotten, so the next visit tries it again. (`js/gallery/app.js`) | Backgrounds recover after a network blip. |
| 16 | A double-tap on a touch screen zoomed twice, because the browser also sent its own double-click. | The browser's extra double-click is ignored for half a second after a touch double-tap. (`js/gallery/app.js`) | One smooth zoom per double-tap. |
| 17 | The map's flight badge could hide when some other map movement ended. | A flight now finishes only when it arrives, when a newer flight replaces it, or after a safety timeout of 2.6 seconds. (`js/map/map.js`) | The badge matches the flight. |

## P3 — developer tooling (fixed)

| The problem | The fix | What it means for developers |
|---|---|---|
| `start_website.bat` printed "'Daniel' is not recognized…" because of the `&` in the window title. It also only tried `python`. | The `&` is escaped. The launcher tries `py -3` first, then `python`, and explains what to do if neither exists. It also switches the console to UTF-8 and starts in its own folder. | Double-click starts the site cleanly. **Checked:** a dry run of a copy printed no error and chose `py -3`. |
| `server.py` crashed with a raw `WinError 10048` error when all 10 ports were busy. | A plain message names the busy ports and says what to do. | No confusing error screens. |
| `server.py` checked ports by connecting to them, which can hang behind a firewall. | It now checks ports by trying to reserve them, which answers at once. | Faster, more reliable start-up. |
| A non-number `PORT` setting crashed `server.py`. | It falls back to port 8000 and says so. | No crash on a typo. |
| The local server always answered cross-origin requests for `127.0.0.1`, even when the page was opened as `localhost`. | It now echoes whichever of the two local addresses asked. | Both local addresses work alike. |
| `wrangler.toml` pointed at the whole project folder. A direct deploy would have published private working files. | It now points at the cleaned deploy folder, `.pages-deploy`. | A manual deploy cannot leak working files. |

## Left alone on purpose

| Finding | Why it was not changed |
|---|---|
| Error reports ignore the analytics consent setting (`js/shared/ops.js`) | This is a documented decision. The privacy page lists error reports under "Legitimate interests (keeping the site working)". Without analytics consent, these reports use a visit-only ID that is deleted when the tab closes. |
| Pages are never sent through the server functions (`_routes.json`) | This is deliberate, and a test enforces it (`tools/verify/verify_pages_deny.mjs`). Pages are served as plain files, so page views do not use up the paid server-function quota. The page-level code in the middleware is therefore not used for pages today. See [engineering/04-security.md](engineering/04-security.md). |
| `/js/*` and `/css/*` are cached for a year | The deploy step renames every script and stylesheet with a fingerprint of its content, so a changed file always gets a new name. I found no un-fingerprinted script or stylesheet reference in the last deploy bundle. |
| The gallery's "dead" download cancel | It works. The bundled three.js passes that cancel signal into every download. |
| The insights row cap could overshoot | It cannot: page size 1,000, caps 20,000 and 5,000. |
| The shelf "lean" does not wrap round from the last volume to the first | The lean is the physical neighbour on the shelf. The first volume has no book to its left. |

## New tests

`tests/unit/audit-fixes.test.mjs` adds 8 tests. They run with `npm run test:unit`, and CI runs them on every push.

1. No pending survey means no Sitting 0 card.
2. A real pending survey for Sitting 0 still shows.
3. An invite link without a sitting stores no sitting.
4. A failed survey frees only its own slot.
5. Switching accounts keeps the previous account's notes and gives them back.
6. Switching accounts keeps the previous account's progress for its owner and never sends it to the new account.
7. A passage written two ways is counted once.
8. The export still works when one saved value is damaged.

## What was not checked

- None of the fixes has been tried on the live site. They are not deployed.
- The member-only pages (map, gallery) were tested locally with the project's built-in local test session, not with a real account.
- The message desk and readers' notes fixes were checked by tests and by reading the code, not by clicking them in the browser.
- The double-tap fix was not tried on a real touch device.
