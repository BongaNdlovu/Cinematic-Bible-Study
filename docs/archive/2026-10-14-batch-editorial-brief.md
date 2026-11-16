# Editorial batch — bridge texts and mindmap cross-links

Two batches of learner-facing prose, drafted for review before they are wired into the course.

---

## Batch A — bridge texts (story diagrams)

The story reader's edge arrows open a small panel between two adjacent movements. It shows a `Shared thread` line and a forward explanation. Today those fields do not exist, so the panel shows only names.

Two optional fields per story step, both rendered by `wireStory`:

| Field | Meaning | Rendered as |
|---|---|---|
| `bridgeShare` | the thread the two adjacent movements hold in common | `Shared thread: …` |
| `bridgeAhead` | how *this* movement leads into the next one | the panel's forward explanation |

Both fields are read from the step you are *leaving*, so one authored transition serves both directions.

**Corrected after the code was read** (`js/study/study-app.js`, `linkFor`): the backward panel shows **only** `bridgeShare`. There is no authored backward copy, and `linkFor` deliberately returns an empty `ahead` when looking back rather than reusing the forward sentence out of turn. The consequence for authoring is real — **each `share` is the only prose a backward panel will ever display, so it must stand alone as a sentence.**

**21 transitions, not the 24 first estimated.** Counted from the data across nine story diagrams: `s0-2` 2, `s0-3` 2, `s1-1` 2, `s2-1` 5, `s4-1` 2, `s4-3` 2, `s5-2` 2, `s9-4` 2, `s9-5` 2. Sitting 10 has no story diagram. `s4-4`, `s4-5` and `s10-2` are `kind: "flow"` and are out of scope: their panels are not wired.

## Batch B — mindmap cross-links

`s2-3` (a fan) and `s2-4` (a spine) render a mindmap. Connectors between nodes already work; their labels are the four vocabulary words `TEXT`, `HISTORY`, `INTERPRETATION`, `CHRIST`, which are exempt from the claim audit because they are vocabulary rather than prose.

This batch adds `links[]` entries: `{ from, to, kind, route }`, where `from`/`to` name declared step ids and `kind` is one of those four words. No new prose is needed for the connectors themselves.

## The rules both batches must hold

1. **Nothing in either batch may assert anything the sitting does not already assert.** The source of truth is the sitting's own prose in `js/study/sheets-data.js` plus the reference pack in `js/study/sheet-verify.js`. A bridge is a *connection*, not new teaching.
2. **No date, no citation, and no doctrinal claim that is not already in the sitting.** The course forbids teaching prophetic dates (457 / 27 / 31 / 34 / 1844 / 1,260) as if printed in the verse.
3. **No quotation marks around anything that is not verbatim KJV** in `bible/kjv.json`, or verbatim from the sitting's own prose.
4. **No Tone-risk jabs and no brand names.** No "Adventist", no "Ellen G.", no "Great Controversy" in learner-facing copy.
5. **Every entry must earn its place.** A bridge that only restates the two titles is filler; say nothing rather than something obvious.

## Review process

`docs/batch-editorial-draft.md` holds the drafts. Each is audited sentence by sentence against the sitting's prose, the reference pack and the KJV before anything is wired in, by a reviewer who did not write it. Findings are fixed, then the copy is wired into `js/study/sheets-data.js` and checked mechanically by `tools/verify/verify_bridge_copy.mjs`.
