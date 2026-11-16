# Implicit State Machines — Research Inventory

> Research only; no code was changed. Every entry lists where the machine lives
> (file:line), its inferred states, its transitions, and the smells that hurt
> UX (users hit stuck/impossible states), DX (humans must update N mirrors per
> change), and AX (agents can't safely reason about one source of truth).

---

## Legend

- **Mirror count** — how many places encode the same logical state (variable,
  CSS class, aria attribute, DOM text, localStorage, URL param).
- **Generation counter** — a hand-rolled monotonic token used to invalidate
  in-flight async work (poor-man's cancellation).
- **Dead end** — a reachable state with no outgoing transition (stuck UI).

---

## 1. Study app (`js/study/`)

### SM-1. Task wizard screen — `task-flow.js:18`
`screen ∈ closed | intro | step | done | waiting`.
Transitions: `open/showIntro/showStep/showDone/showWaiting/close`.
- Mirrors the state in 5 CSS classes (`is-intro`, `is-done`, `is-answered`,
  `is-open`, `is-leaving`) — nothing derives them from `screen`.
- `'waiting'` copy says "try again" but the only retry is close → reopen
  (**UX dead end**).

### SM-2. Wizard step cursor — `at`, `steps[]`, `stepDone()`
Progress = "first-undone-in-plan-order", recomputed from
`StudyTasks.snapshot()` which mixes memory, DOM queries and module calls —
two layers of derivation that can drift (task-flow.js:104, study-app.js:5929).

### SM-3. Close-animation generation guard — `closeGen` (task-flow.js:19)
Token invalidating a 460 ms close animation if reopened.

### SM-4. Card minimize — `card-min.js`
One bit stored 3 ways: sessionStorage `baCardMinState`, `is-card-min` class,
`data-cardmin-hidden` attrs + `aria-expanded`. Half-collapsed hybrid possible
after re-render; key includes sibling index so inserting a card resets state.

### SM-5. Card enhancement batch queue — `card-min.js:258`
Four parallel pieces (`timer`, `roots[]`, `resize[]`, `fullPass`) encode
idle/queued/full-pass.

### SM-6. Placement track — `competency.js:41`
`'foundations' | 'scholarly'` in localStorage + body classes. Admins are
silently forced to `scholarly` — invisible transition, no UI. Capstone
`completed` is a one-way latch with no reset.

### SM-7. Quiz attempt per-question state — `competency.js:93`
`{attempts, passed, firstTry}` + monotonic `firstTryPassedAll` latch;
overloaded signature (two schemas, one store key).

### SM-8. Audio checkpoint gate — `study-app.js:1044` — *explicit enum, best in class*
`state: idle | offer | held`, mirrored to `data-state` attribute. But the
plate's pass-state lives separately in a tri-state string attribute
`data-checkpoint-passed = 'true' | 'auth' | absent` — duplicated state
across module and DOM; a seek silently cancels an `offer`.

### SM-9. Quiz question lifecycle — `study-app.js:5408` — *the worst cluster*
Four dictionaries (`verifiedQuiz`, `quizPending`, `answeredQuestions`,
`quizAttemptCounts`) encode per-question
`fresh → pending → correct | wrong-locked | error(keep-pick | clear-pick)`.
Staleness checked by three-way identity compare; error split into two
behaviors by kind; a fifth visual state in CSS class names. `sheetQuizComplete`
+ `canAdvancePath()` boolean ladders recompute everything from 10+ call sites.

### SM-10. Sheet load lifecycle — `sheetLoadTicket` (study-app.js:5168)
Generation counter + recursive re-entry + separately managed DOM bar.

### SM-11. Sitting path — `sittingPhase: study | tasks | next` + `sittingVisited`
Adding a phase means touching three places; 'next' is terminal side-effecting.

### SM-12. Sitting guide — `sittingGuideMode` + `endCardShownForSheet` + DOM `hidden`
Three sources of truth for one overlay; three-condition guard stands in for
an "idle" state.

### SM-13. Story reader — `study-app.js:3323`
Position persisted in a `data-start` DOM attribute; autoplay = interval +
aria attr; bridge panel open state = 5 fields (sign int, hidden, two aria
attrs, opener ref); photo layer = 3-slot rotating buffer invalidated by token
compare at six checkpoints.

### SM-14. Timeline selection — `current = -1` sentinel vs panel content
Visual state and variable disagree by design on first paint.

### SM-15. Diagram fullscreen + Escape arbitration — class-only machine
The "topmost open layer" is decided by DOM selector queries in ≥4 places
(mindmap.js:1183, study-app.js:4075, 3692, 6027) — an implicit layer-stack
machine nobody owns; scroll lock is a reference count implemented by DOM
query, duplicated across two files.

### SM-16. Pomodoro — `isTimerRunning` + `timeRemaining` + `timerEndsAt` + interval
State derivable from two of the four variables, yet three variables plus four
text/class mirrors are maintained independently; "completed" routes through
"paused" so only the sub-label distinguishes them.

### SM-17. Weather — `weatherPreset`/`currentWeatherType`/`weatherRunning`
The same continuous "atmosphere" value is bucketed with **three different
threshold sets** (0.2/0.42/0.78 vs 0.22/0.43/0.72/0.9 vs 0.34/0.78) — the
label can say "Building" while the type is "storm". Manual presets repurpose
the variable as a constant.

### SM-18. Station walker — journey state in localStorage
"Current station" is persisted journey state with **two different defaults
for the same act**, repeated three times; `sittingBusy` is a mutex flag over
a machine whose real state lives in storage.

### SM-19. Theme/font enums — `study-app.js:1632`
One theme enum fans out to ~8 DOM writes re-listed in every `applyTheme`;
font size is enum + `fontAuto` boolean with legacy migration archaeology.

### SM-20. Mindmap monolith — `state` object, six interleaved machines
Scene (`scene` + redundant `inScene`), tour (boolean + polling guards),
fullscreen (boolean + 5 DOM mirrors + 5 exit paths + defensive duplicate
teardown), visibility (4 booleans gating one frame loop), focus/touch-tap
modal sub-state, `compact`. The clearest single-file candidate for an
explicit machine.

### SM-21. Term overlay history handshake — 4 variables, 3 real states
`overlay`, `historyPushed`, `backPending`, `closingNode` encode
`closed → open → closing-via-history.back()`. Browser Back is a second
transition source for the same state; every field reset in two places.

---

## 2. Shared infrastructure (`js/shared/`)

### SM-22. net.js request lifecycle + error classifier
Per-request: `pending → slow → ok | http-error | timeout | cancelled | network | offline`.
Ambiguous abort-vs-timeout resolved by flag precedence, not state.
Error classification is **triplicated** (`classifyStatus` / `classifyThrow` /
`classify`) with divergent regexes — identical failures classify differently
per caller. `cancelled` has an empty message special case.

### SM-23. progress-sync.js — the biggest machine
- **Sync lifecycle**: `isSyncing` + `pushAfterSync` two booleans = 3 states;
  invariant "queued ⇒ syncing" unenforced.
- **Retry ladder**: 8 attempts, exhaustion is a **silent dead end** — the
  outbox stays pending with no user-visible transition; a fresh push resets
  backoff unconditionally.
- **Outbox**: `{payload, expectedRevision}` in localStorage; `hasPending()` =
  debounce-timer OR outbox (3 causes, 1 bit). `lastPushAt` stored in **three**
  places reconciled with `Math.max`.
- **Account switch**: stash lifecycle with no GC (zombie stashes keyed by
  dead uids); account-moved modeled as unbounded recursion.
- **Conflict CAS**: unknown RPC status re-queues with the stale revision.
- **Merge guard**: `applyingMerge` reset without try/finally in
  `restoreStashFor` — one throw permanently disables `syncNow`.

### SM-24. study-sync.js — sibling sync machine, divergent copy
Same conceptual machine as progress-sync but: no conflict detection at all
(read-merge-upsert, last-writer-wins); push retry MAX 5 with no report;
**pull retry never gives up** (no max); outbox is a flag not a payload;
`lastPushAt` set before the request (attempted ≡ succeeded); sign-out reset
touches seven variables in unison. `armRetry` and `errorCause` are
near-duplicate code across the two files.

### SM-25. insights.js (shared) — flush + rate windows + reading timer
- Flush: `flushing` boolean; failure indistinguishable from nothing-to-flush.
- Rate limits: rows refunded by timestamp equality (same-ms collision);
  posts never refunded (failed batch burns a slot).
- Reading timer: 4-state boolean cluster where only one state accumulates;
  `readingTimer()` returns seconds before any tick (always 0).
- Pulse/profile cards: lifecycle keyed on DOM element existence; a pending
  pulse persists forever if the user never changes sheets.

### SM-26. desk.js — desk panel
- Generation guard races `inflight` locks: a stale callback unlocks a lock
  owned by a newer request (double-click protection broken) — desk.js:614.
- Thread view `'' | 'loading' | 'error'`; empty maps to error; error state
  hides the reply form with no retry affordance.
- Inflight map + DOM busy labels updated in pairs at ~8 call sites; retract
  buttons read a mismatched key namespace.
- Confirm-armed buttons: state in `data-confirm` attr, no timeout, disarmed
  only implicitly by re-render.

### SM-27. reviews.js
- `submitBusy` + `flagBusy`: four combos, nothing prevents both; boolean
  return collapses busy/invalid/unsigned-in/failed into one bit.
- Review row triple `approved/rejected/approved_at`: `(T,T)` writable;
  display mapping derived on the fly.
- Own-review retry ladder: exhaustion silent; two uncoordinated recovery
  channels (ladder + online event) can double-fire.
- **`surveyRetry` text-match hazard**: identical review text short-circuits
  the insert and bypasses the daily limit — a real wrong-state transition.
- Error/empty state lives in `empty.textContent` string literals.

---

## 3. Gallery (`js/gallery/app.js`)

### SM-28. Boot/loading pipeline
`loadProgress` + `heroAssetCounted` latch written from 3 paths + failure path
still increments count → percent isn't pure progress; "entered" state exists
as latch + overlay class.

### SM-29. Stage transition guard — `selectAsset._busy`
State on a function object; 4-class DOM phase cluster (`active/out/in/glitch`);
clicks during transition silently dropped, no queue.

### SM-30. Exhibit display mode — three visibility booleans
`still | assembled | single` modeled as booleans — nothing prevents two
containers visible; altar toggle can be ON while the altar is hidden.

### SM-31. Camera mode cluster — `autoSpin` triplicated
Copy-pasted "turn spin off and sync both buttons" block in ≥6 places;
`userHasAimed` is a one-way latch with no return to auto framing.

### SM-32. Guided tour — `tourRunning`, **no abort transition**
Cannot be cancelled except by waiting; steps can be swallowed by `_busy`.

### SM-33. Feature toggles — seven copy-paste 2-state machines
`explodeAmount`, `pedestal`, `dust`, `altar`, `torches`, audio mute, theme —
each mirrored in boolean + `.active` class + `ON/OFF` text.

### SM-34. Panel open-state cluster
`rail-open`, `narrative-open`, `modal-open`, `timeline-mode`, lab drawer —
an exclusive enum implemented as independent booleans; Escape misses the lab
drawer; every new panel must be added to `closeAllPanels` by hand.

### SM-35. GLTF cache LRU
Per-key `unloaded → loading → resident(pinned|recent|evictable) → evicted`,
with hidden alias states (`full_body`) and a vestigial 1-element retry loop.

---

## 4. Map (`js/map/map.js`)

### SM-36. View mode map/globe — **four copies of one bit**
`state.view`, root class, button attrs, URL param; globe transition sets the
state only after async init + token check; zoom-out-to-globe and
globe-zoom-through are implicit transitions from other machines.

### SM-37. Globe lifecycle
`unsupported → loading → ready | failed(terminal, buttons removed)` — three
nullables plus Promise.race timeout layer.

### SM-38. Chronicle playback — stop idiom duplicated 4×
`state.playing = false; playBtn.textContent = '▶'` copy-pasted in four
handlers; **year/search selection does not stop playback** — racing writers.

### SM-39. Scrub — one `scrubbing` flag, two unrelated writers
User drag vs programmatic animation share the flag; interlock with chrome
updates is implicit.

### SM-40. Year selection — `yearGen` + 4-boolean transition descriptor
`setYear(id, {animate, chapter, open, focusId})` — a boolean cluster encoding
what should be a transition name; URL params as persisted selection requiring
manual reconciliation.

### SM-41. Load status — state in `loadEl.textContent`
Status/error-kind machine lives entirely in DOM text plus an inline-styled
Retry button created in the error path.

### SM-42. Basemap / layers / dossier / help
Basemap priority (URL > localStorage > default) implicit; layer toggles are
checkboxes as second sources of truth with full rebuilds; dossier open state
is one CSS class + `routeRun` counter to remember to bump; Escape implements
a one-level modal stack by hand.

---

## 5. Home & Insights

### SM-43. Reader-notes carousel — `home.js:71`
`showing → fading → showing`; one `timer` handle for two phases; `is-fading`
class is a DOM state variable; `focusout` within the card false-pauses.

### SM-44. Insights dashboard load — `loadGen` + abort + slow timer + cache
One machine across 5 variables + 2 DOM affordances; error path overwrites
the previous render (error replaces data, no back transition);
`cache.graduates` is a tri-state `null | failed(null) | array`.

### SM-45. Quarterly report builder — four parallel representations
`reportGen`, `setBuilding` (disabled + aria-busy), status text, `sid-open`
class; sticky validation errors with no clearing timeout.

### SM-46. HUD book-view enum — index.html:137
Five `data-view` buttons with `aria-pressed` booleans — an enum encoded as
five independent DOM booleans (managed by shelf.js).

---

## 6. Server (`server.py`)

- **Range request machine**: `self._range_remaining` threaded between
  `send_head` and `copyfile` on a keep-alive-reused handler instance —
  stale-attribute risk if the connection aborts mid-response.
- **Path authorization**: error state encoded as the sentinel fake path
  `__forbidden__`; the extension allowlist skips directories.
- Port resolution and origin-echo are small, well-contained 2–3 state machines.

---

## Cross-cutting patterns (the actual disease)

1. **Mirror explosion.** The median machine stores one logical state in 3–5
   places (variable, CSS class, aria attr, DOM text, localStorage, URL).
   This is the #1 DX/AX cost: every transition must update N mirrors, and
   agents/humans can't tell which copy is authoritative.
2. **Boolean clusters standing in for enums.** Exhibit mode, camera mode,
   sync lifecycle, reading timer, layer toggles, HUD views, `setYear` flags.
3. **Generation counters as hand-rolled cancellation**, ≥10 independent
   implementations (`closeGen`, `sheetLoadTicket`, `photoSeq`, `loadGen`,
   `reportGen`, `yearGen`, `playRun`, `routeRun`, `globeAsk`, `generation`)
   each with hand-written guards and easy-to-miss await points.
4. **Silent dead ends.** Every retry ladder (progress-sync, study-sync,
   own-review, gallery tour, waiting screen, thread error) exhausts quietly,
   leaving UI stuck or lying ("trying again shortly").
5. **Divergent sibling machines.** Two sync modules, three error classifiers,
   two Escape-arbitration implementations, duplicated `armRetry`/`errorCause`.
6. **DOM-as-state.** Confirm buttons, insight cards, edit-in-place flags,
   `empty.textContent` error states, `data-start` position persistence.
7. **Concrete bugs found by this research** (worth fixing first):
   - desk.js stale-unlock race destroying a newer request's inflight lock
   - reviews.js `surveyRetry` text-match bypassing insert + daily limit
   - progress-sync `applyingMerge` unguarded reset in `restoreStashFor`
   - weather's three contradictory threshold sets
   - insights `readingTimer()` returning always-0
   - map playback not stopped by year/search selection

---

## Recommended direction (when changes are wanted)

The single highest-leverage move — improving UX, DX and AX simultaneously
without rewriting anything — is **"one owner per state"**: for each machine,
name the states (a const object or string union), route every transition
through one function that owns all mirrors (classes, aria, storage, URL),
and derive everything else. Start where bugs already surfaced:

1. Unify the two sync modules' retry/outbox/classifier into one shared
   implementation with an explicit `exhausted → notify` transition (UX: no
   silent give-up; DX: one ladder not three; AX: one code path to reason
   about).
2. Give the quiz-question lifecycle one explicit per-question state enum
   replacing the four dictionaries.
3. Centralize the Escape/layer-stack arbitration into one owned layer
   registry (removes 4 duplicated query-based arbitrators).
4. Adopt one shared `createMachine({states, transitions})` micro-helper for
   the copy-paste families (gallery feature toggles, map stop-playback idiom,
   camera autoSpin) so each mirror update lives in exactly one place.

None of this changes behavior if the state sets are transcribed faithfully;
it makes the currently-possible-but-unintended states (half-collapsed cards,
(approved, rejected) rows, both-containers-visible, slow-label-vs-storm-type)
structurally impossible instead of merely untested.
