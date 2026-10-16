# Flow → map decisions: the five `flow` diagrams

**Question put to this report:** for each of the five diagrams authored with `"kind": "flow"` in `js/study/sheets-data.js`, is a branching cinematic mindmap (centre node → solid arrows → branches → dashed cross-links → clickable scenes) the right form, or is the diagram really a sequence that would be damaged by being fanned out?

**Answer in one line:** one of the five is a genuine fan (`s2-3`), one is a sequence whose argument needs a second axis and therefore wants a spine with branches (`s2-4`), and three are strict sequences whose whole point is their order (`s4-4`, `s4-5`, `s10-2`) and should stay flows with cinematic staging.

Nothing here is an implementation. No file other than this one was modified.

---

## 1. What was read

| Source | What it supplied |
| --- | --- |
| `js/study/sheets-data.js` | The five full specs (`s2-3`, `s2-4` at lines 1114–1161; `s4-4`, `s4-5` at 2163–2210; `s10-2` at 5666–5688), and the lesson prose around each `figure[data-diagram]` marker (sitting 2: 1163–1400; sitting 4: 2055–2440; sitting 10: 5728–5977). |
| `js/study/study-app.js` | `renderSheetDiagrams` (line 3004) and the six bodies: `bodyChain` 2299, `bodyComparison` 2320, `bodyTable` 2354, `bodyFlow` 2369, `bodyTimeline` 2390, `bodyStory` 2489. |
| `study.html` | The existing diagram CSS: `.flow-stack` / `.flow-step` (1450–1498), `.chain-flow.is-dense` (453–470), `.story-*` (585–860), `.cmp-*`, `.tl-*`. |
| `The Three Interpretive Schools — Cinematic Mindmap (1).html` (Downloads root, outside the repo) | The prototype form: centre `.core`, branch `.head` cards with `.leaf` clusters, `linkLayer` solid curves + arrowheads, `crossLayer` dashed `.xl` connectors with `.xlbl` pill labels, clickable heads that open full-stage `.scene`s, a 1600×900 fixed stage with camera fit, and a `.compact` outline fallback for narrow/portrait screens. |

No `mindmap` kind exists anywhere in the repo today (searched the repo's JS, Markdown, HTML, CSS and JSON): the prototype is a form to port, not a component to wire up.

*Line numbers were accurate when read. `js/study/study-app.js` and `study.html` carry uncommitted working-tree changes from other work, so re-check the anchors before editing either file; the specs in `js/study/sheets-data.js` were unmodified.*

### The four questions applied to each diagram

1. Does step *N* depend on step *N−1* causally or temporally, or is the set parallel?
2. Does the diagram's claim live in the **order** of the nodes, or in a **contrast** between nodes?
3. If the nodes were re-laid around a centre, would any argument be lost?
4. Do branch-worthy nodes actually exist in the sitting's own text (not invented)?

### The verdict vocabulary

- **`mindmap`** — the content is a fan/convergence; a centre with branches is the honest picture.
- **`mindmap with a spine`** — the content is a sequence, but the argument also needs a second axis (a contrast, a rail of what was passed over, a cluster of witnesses). The spine keeps the order; branches carry the rest.
- **`keep as flow`** — the order *is* the argument, or the spec has nothing branch-worthy in it. Fanning it out would assert something the sitting does not say.

---

## 2. `s2-3` — "The Post-Roman Dilemma (Daniel 2:43)" · Sitting 2

### 2.1 What it argues

The divided feet of Daniel 2 are a **mechanical mixture, not a union**: iron's strength survives in them and clay's peoples will not bond, so every attempt to rebuild one European empire fractures.

### 2.2 Its real shape

**(b) a branch/fan from one cause to several effects, crossed with (c) a set of parallel items.** There is no temporal order anywhere in this diagram — unlike the other four.

The step roles/titles announce a composition-then-verdict structure, not a sequence:

- step 1 — role `"Iron + Clay"`, title `"Iron (strength that remains) + Clay (the mixture that will not hold)"`: two constituents named side by side.
- step 2 — role `"Mixture, Not Union"`, title `"They Shall Not Cleave"`, and four `points`: `"Charlemagne (800)"`, `"Charles V (1519)"`, `"Napoleon (1804-1815)"`, `"Hitler (1939-1945)"` — four **instances of the same verdict**, in no order relative to each other.
- the sitting's own ASCII artwork draws this as a bracket, not a chain: two columns `Iron (strength that remains)` and `Clay (the mixture that will not hold)` joined by `└─── Mechanical Mixture, Not Union ─┘`, then `"THEY SHALL NOT CLEAVE"`, then the four bullets.
- the `note` states the outcome as a generalisation, not a next step: `"Every attempt to rebuild a single European empire fractures"`.

The current `bodyFlow` renderer flattens this: it prints one card for step 1 (the two constituents fused into one title) and one card with the four names as a bullet list. The bracket — which is the diagram's actual claim — is invisible.

### 2.3 Verdict

**`mindmap`.** Shape (b)/(c) with no dependency chain to protect, and every branch label below is already in the sitting's text. This is the one place where the prototype's form matches the content as authored.

### 2.4 The skeleton

**Centre node label:** `The Post-Roman Dilemma` — from the spec `title`, `"The Post-Roman Dilemma (Daniel 2:43)"`.
**Kicker:** `Daniel 2:43` — same spec title.
**Centre sub-line:** `a divided kingdom, and no longer a world empire` — sitting 2: "This signifies that the kingdom shall be divided: a divided kingdom, and no longer a world empire (BRI, Lessons from Daniel 2 §E)."

**Primary branches and the steps they own**

| # | Branch label | Step it owns | Leaves (all quoted from the sitting) |
| --- | --- | --- | --- |
| 1 | `Iron (strength that remains)` | the **Iron half of step 1** (split out of the title `"Iron (strength that remains) + Clay (the mixture that will not hold)"`) | · `partly strong, and partly broken` — Dan. 2:42 KJV as quoted in the historical-note<br>· `the hardness of Rome that still lives on in them` — historical-note: "the iron for the hardness of Rome that still lives on in them" |
| 2 | `Clay (the mixture that will not hold)` | the **Clay half of step 1** (same title) | · `the peoples of divided Western Europe` — historical-note: "The clay stands for the peoples of divided Western Europe"<br>· `the successor nations` — "in A.D. 476 it divided into separate kingdoms, the successor nations"<br>· dashed rival leaf (see cross-links): `religious power allied with the state` |
| 3 | `Mixture, Not Union → They Shall Not Cleave` | **all of step 2** (role `"Mixture, Not Union"`, title `"They Shall Not Cleave"`) | · `they shall mingle themselves with the seed of men` — Dan. 2:43 KJV (historical-note and the pull-quote)<br>· `Their mingling is royal intermarriage` — "Their mingling is royal intermarriage, and it does not hold (Daniel 2:43)"<br>· `a royal marriage made to seal an agreement does not stand` — "Daniel 11 uses the same motif: a royal marriage made to seal an agreement does not stand (Daniel 11:6, 17)" |
| 4 | `Every attempt to rebuild a single European empire fractures` | **step 2's four `points`** (the spec `note` is used here as the branch label, since the four names are what it generalises) | the four named attempts, verbatim from `points`: `Charlemagne (800)` · `Charles V (1519)` · `Napoleon (1804-1815)` · `Hitler (1939-1945)` |

**Cross-links (dashed connectors between branches)**

| From → to | Connector label (source quote) | Why |
| --- | --- | --- |
| 1 ↔ 2 | `even as iron is not mixed with clay` — Dan. 2:43 KJV quoted in the historical-note | The text's own image is the whole reason the two materials never bond; this is the hinge the map exists to show. |
| 2 ↔ 3 | `royal intermarriage` — "Their mingling is royal intermarriage" | The mingling named in 2:43 is marriage alliance, so the clay branch is what produces the verdict. |
| 2 ↔ 4 | `Some historicists take the clay as religious power allied with the state` — historical-note, explicitly headed **"Rival reading (interpretation)"** | If the clay is read as a religious power rather than as the peoples, the four attempts are read differently. The sitting adds why it needs help: "That reading needs Revelation 17 to carry it". Draw it dashed and marked as the rival reading, never as the map's spine. |
| 3 → 4 | `The prophecy declared in advance: they shall not hold together` | The four attempts are not causes; they are instances of a verdict already given. Keep the arrow pointing text → history, matching the sitting's own order of statement. |
| 3 ↔ centre (guardrail) | `No fifth metal appears` — "No fifth metal appears: the feet are part iron and part potters' clay (Daniel 2:41)" | Prevents the division from being read as a fifth kingdom. A dashed "not a fifth kingdom" note, not a branch. |
| 4 ↔ `s2-1` `Feet of Iron & Clay / Divided Europe` (cross-diagram) | `the mixture will not hold` — s2-1's detail: "The feet are the only part of the image God's kingdom strikes, and 2:43 says the mixture will not hold" | `s2-3` is the zoom of one node of sitting 2's framework diagram; say so with a link rather than repeating the framework. |

**Scene sources available in the sitting (what a click would legitimately open):** the three bullets of the historical-note (text / this sitting's reading / rival reading), the Daniel 11:6, 17 motif, and the sentence about Charles the Great. **Caveat:** the sitting narrates none of the four attempts; a scene for branch 4 must stay at the level of the names and dates the spec already carries, or it will start inventing history.

**Provenance discipline:** the four dates in branch 4 are the spec's own `points` and sit under the sitting's "History:" convention (compare "History: in A.D. 476 it divided into separate kingdoms"). They are secular history attached to a verdict, not dates read out of Daniel 2:43. No 457 / 27 / 31 / 34 / 1844 / 1260 claim is involved, and none may be added.

---

## 3. `s2-4` — "The Smiting Stone" · Sitting 2

### 3.1 What it argues

The Stone is supernatural in origin, it strikes the statue **at the feet** — that position is what fixes the timing — it pulverises every metal at once, and it becomes a mountain filling the earth.

### 3.2 Its real shape

**(a) a sequence with a strict order**, whose second node additionally carries a **contrast** (what the strike passed over) — the contrast is the argument.

The four roles are transitive verbs in a fixed order, and each step presupposes the one before it:

- `"Cut Out"` → `"Cut out without human hands"`, `"Divine origin, Supernatural"`
- `"Strikes"` → `"Strikes the Statue at the FEET"`, `"Dan. 2:34"`
- `"Pulverizes"` → `"Pulverizes Gold, Silver, Bronze, Iron, & Clay"`, `"Becomes like chaff blown away"`
- `"Becomes"` → `"Becomes a Mountain Filling the Earth"`, `"The Everlasting Kingdom of God"`

Nothing can be pulverised before it is struck; nothing becomes a mountain before it pulverises. But the diagram's *timing* claim is positional, not temporal, and it is spelled out inside step 2: `"Not during Babylon, Persia, Greece, or Pagan Rome, but during the divided kingdoms after Rome (the feet)"`. The sitting reinforces it twice more: "It did not strike during the Babylonian, Persian, Greek, or unified pagan Roman legs," and "the climax is the Second Coming, not the incarnation. Jesus' earthly ministry took place during the iron legs; the stone does not strike the legs."

That is a second axis — a list of what was passed over — which a one-column stack cannot show and a free fan would destroy.

### 3.3 Verdict

**`mindmap with a spine`.** The four steps stay chained along one axis with solid arrows; the timing rail, the Stone's identity, the manner of the abolition and the redemptive choice hang off as branches; the cross-links carry the "all metals at once" and origin/eternity relations.

Note what the spine buys, beyond looks: the historicist timing claim is carried by **position on the statue** — "during the divided kingdoms after Rome (the feet)" — so the rail of passed-over kingdoms needs **no date at all**. That is the course's own way of teaching it and the safest possible form.

### 3.4 The skeleton

**Centre node label:** `The Smiting Stone` — the spec `title`.
**Kicker:** `Daniel 2:34–35, 44–45` — the sitting's own range (`christology.scripture`: "Daniel 2:34–35, 44–45; Psalm 118:22; ...").

**The spine (solid arrows, order preserved, labels verbatim from the spec)**

`Cut Out — Cut out without human hands` → `Strikes — Strikes the Statue at the FEET (Dan. 2:34)` → `Pulverizes — Pulverizes Gold, Silver, Bronze, Iron, & Clay` → `Becomes — Becomes a Mountain Filling the Earth`.

**Branches (dashed off the spine node they annotate)**

| Off | Branch label | Leaves (quoted) |
| --- | --- | --- |
| `Strikes` | **The timing rail:** `Not during Babylon, Persia, Greece, or Pagan Rome` / `but during the divided kingdoms after Rome (the feet)` — step 2's `text`, split into the two halves it already contains | · `It did not strike during the Babylonian, Persian, Greek, or unified pagan Roman legs.`<br>· `in the days of these kings` — Dan. 2:44 quoted in the prose: "'And in the days of these kings shall the God of heaven set up a kingdom, which shall never be destroyed.'"<br>· `the Second Coming, not the incarnation`<br>· `Jesus' earthly ministry took place during the iron legs; the stone does not strike the legs.` |
| `Cut Out` | `The Stone is Jesus Christ.` — prose, verbatim | · `The Stone rejected by the builders that becomes the chief cornerstone` — "(Psalm 118:22; 1 Peter 2:6–8)"<br>· `That Rock was Christ` — "(1 Corinthians 10:4)"<br>· `The Rock upon which the Church is built` — "(Matthew 16:18)"<br>· `The Stone that shatters all opposition` — "(Luke 20:17–18)" |
| `Pulverizes` | `Abolition, not political reformation` — the sitting's own sub-heading | · `does not merge with the statue, reform its politics, or Christianize its laws through social evolution`<br>· `like the chaff of the summer threshingfloors, swept away by the wind (Daniel 2:35)` |
| `Becomes` | `he shall reign for ever and ever` — Rev. 11:15 as quoted in the prose | · `the kingdoms of this world are become the kingdoms of our Lord, and of his Christ`<br>· `The Everlasting Kingdom of God` — step 4's `text` |
| `Becomes` (pastoral) | `repentance or ruin` — the sitting's own sub-heading "3. The redemptive choice: repentance or ruin" | · `If you fall upon Christ today in contrite repentance, your sins are forgiven through His blood, and you are saved`<br>· `On whomsoever it shall fall, it will grind him to powder (Luke 20:18).` |

**Cross-links (dashed)**

| From → to | Connector label (source quote) | Why |
| --- | --- | --- |
| `Strikes` ↔ `Pulverizes` | `It pulverizes every metal kingdom at once` — `christology.body` | The strike at the feet is a strike on the whole image; that is why the pulverising names all five materials even though the blow lands on one part. |
| `Cut Out` ↔ `Becomes` | `the kingdom is of God, not of human empire-building (Daniel 2:34, 44–45)` | Origin and duration are the same claim: what is not quarried by human power is what never gets destroyed — `which shall never be destroyed` (Dan. 2:44, quoted in the prose). |
| `Strikes` ↔ `s2-3` `They Shall Not Cleave` (cross-diagram) | `the divided kingdoms after Rome (the feet)` | The Stone lands exactly where the mixture fails; the two sitting-2 maps share one node of the statue and should share one node style. |
| `Becomes` ↔ `s2-1` `The Striking Stone / Christ's Kingdom` (cross-diagram) | `It breaks the whole image at once and then becomes a mountain that fills the earth` — s2-1's detail | Keeps the zoom tied to the framework it zooms into, and reuses the framework's own sentence. |

**Scene sources available:** rich — the three `biblical-case` blocks (the divine identity of the Stone, the timing and nature of the impact, the redemptive choice) and the `christology` body. Scenes can be built from the sitting without inventing anything.

**Provenance discipline:** the timing is carried "at the feet", never by a date. The sitting names no calendar year in this diagram; `Dan. 2:34` is the only cite. Do not let a map label introduce 457 / 27 / 31 / 34 / 1844 / 1260.

---

## 4. `s4-4` — "Daniel's Account" · Sitting 4

### 4.1 What it argues

Daniel's own account runs in one causal line — the boast provokes the sentence, the humiliation lasts seven times, and understanding returns only when the king lifts his eyes — a chain inside one man's lifetime, not a 2,520-year span.

### 4.2 Its real shape

**(a) a sequence with a strict order, and nothing else.** Five steps, no `role`, no `text`, no `points`, and the identical `cite` `"Daniel 4:30–34"` on every one — the spec carries pure ordinal information:

`The king's boast` → `Sentence from heaven` → `Seven times pass` → `He lifts his eyes` → `His understanding returns`.

The sitting states the dependency explicitly: "The chapter connects the king's boast with the sentence he receives, **then** records his understanding returning after he lifts his eyes to heaven (Daniel 4:30–34). It presents this sequence as a lesson in the Most High's rule, not as a diagnosis of a medical condition." The lesson's own ASCII is a single arrow chain.

### 4.3 Verdict

**`keep as flow`.**

### 4.4 What would be lost

1. **The doctrinal guardrail the sequence carries.** The caution card argues from the chain's brevity: "If the seven times were 2,520 years, Nebuchadnezzar would still be eating grass today. The narrative concludes with the king personally returning to his throne within his own natural lifespan (Daniel 4:36)." Break the chain into a fan and the reader can no longer see "within his own natural lifespan".
2. **The "not a diagnosis of a medical condition" claim** is a claim about the *order and kind* of events (boast → sentence → humiliation → looking up), not about any one node.
3. **There is nothing branch-worthy in the spec.** Five bare titles. Any branch a mindmap drew would have to be invented — which the label rule forbids. Its branch material (the boast's three clauses, the twelve months of mercy) belongs to neighbouring diagrams `s4-3` and the prose, not here.

### 4.5 Smallest change that gets it the cinematic treatment without changing shape

**Option A (one field, zero code).** Change the spec's `"kind": "flow"` to `"kind": "steps"`. `renderSheetDiagrams` already routes `steps` to `bodyStory`, which is the course's existing cinematic form: staged card reveal, a step track with `.story-connector` spans drawn between the steps, a travelling active highlight, prev/next, play-the-story autoplay, and a full-screen reader with arrow-key navigation. The shape (a strict sequence) is unchanged, and sitting 4's other diagrams (`s4-1`, `s4-3`) already render this way, so the sitting becomes internally consistent. `bodyStory` does not render `points` — `s4-4` has none, so nothing is lost.

**Option B (if the order must stay visible at once).** Keep `kind: "flow"`, and upgrade `bodyFlow` with what it lacks: connectors drawn between the stacked steps, a travelling highlight down the rail on scroll-in and on the existing Replay button, and click-to-open on each step using the existing `story-read` dialog. That is one renderer change serving all three `keep as flow` diagrams.

I would take **A** here: the chain is presented one beat at a time, which is how the prose reads it, and the caesura between beats is what makes "then" audible.

---

## 5. `s4-5` — "Daniel 4:34–37" · Sitting 4

### 5.1 What it argues

Restoration is a four-beat movement in the chapter's own order — the look upward, the return of understanding, the blessing, the acknowledgment of an everlasting dominion — so the doxology is the fruit of the humiliation, not a separate episode.

### 5.2 Its real shape

**(a) a sequence with a strict order.** Four steps, all cited `"Daniel 4:34–37"`, no `role`/`text`/`points`:

`Nebuchadnezzar lifts his eyes to heaven` → `His understanding returns` → `He blesses the Most High` → `He acknowledges God's everlasting dominion`.

The sitting marks the dependency with "only when" and "after which": "Restoration came **only when** the king looked beyond his own achievements", and "his understanding returned when he lifted his eyes to heaven, **after which** he blessed and honored the Most High (Daniel 4:34–37)."

Its first two nodes are **verbatim the last two nodes of `s4-4`** — the two diagrams are one seven-step chain split at Daniel 4:34, which the two `cite` ranges overlap on (`4:30–34` / `4:34–37`).

### 5.3 Verdict

**`keep as flow`.**

### 5.4 What would be lost

1. **The "only when" dependency** — the diagram exists to say the understanding did not return on its own schedule; fanned out, the four beats become four topics.
2. **The continuation.** If `s4-4` stays a chain and `s4-5` is re-laid as a map, the reader loses the fact that these are the same two events carried forward. The overlap is the diagram's strongest structural feature and a fan would hide it.

### 5.5 Smallest change

Same as `s4-4`: **Option A**, `"kind": "steps"` (no `points` to lose), which gives sitting 4 one consistent cinematic treatment for all four of its sequential diagrams. Add one cheap touch that costs no shape change: give the two shared nodes (`lifts his eyes to heaven`, `his understanding returns`) the same node styling in both diagrams, so `s4-5` visibly continues `s4-4` rather than restarting. If Option B is taken instead, the travelling highlight should enter `s4-5` already "on" the shared node.

Scene sources are ample: the Daniel 4:34 quotation, the banded-stump mercy paragraph, the Daniel 4:37 doxology, and the `CHRIST` card contrasting Philippians 2:6–8 with the king's boast.

---

## 6. `s10-2` — "Daniel 12:1-2 in Its Own Order" · Sitting 10

### 6.1 What it argues

The order of Daniel 12:1–2 is itself the argument: Michael's standing up (a king taking power) precedes the close of probation, which precedes the time of trouble, which precedes deliverance, which precedes the waking of the dust — and the sequence cannot be rearranged.

### 6.2 Its real shape

**(a) a sequence with a strict order — and, alone among the five, the order is named in the title.** `"Daniel 12:1-2 in Its Own Order"`. The lesson's ASCII is an arrow chain, not a bracket:

`Michael stands up` (`"'amad: kingly stance"`, cite `"Dan 11:2-4"`) → `Close of human probation` → `A time of trouble such as never was` → `Those written in the book are delivered` → `Many who sleep in the dust awake (12:2)`.

The prose states every junction as a temporal one: "**Immediately following** Michael's standing up, Scripture warns"; "**When** Michael stands up, the time of turning ends: human probation closes, and **there follows** a time of trouble such as never was"; "Daniel 12:1 is the moment that priestly work is finished and the King stands — **then** the settled word of Revelation 22:11"; and the sitting's self-check asks exactly this order back: "Does Daniel 12:1 declare that Michael stands up, a time of trouble follows, and those written in the book are delivered?"

The `role` field is absent and the whole spec is titles — the only non-title content is step 1's `text` `"'amad: kingly stance"`, which is a lexical footnote to the first node, not a second branch.

### 6.3 Verdict

**`keep as flow`.**

### 6.4 What would be lost

Exactly the thesis in the title. Every branch a map could draw is an annotation of **one** step, and fanning them would make them look like parallel causes of the standing up:

- `'amad` word study → step 1 ("There shall stand up ['amad] yet three kings in Persia" … "it signifies Jesus Christ assuming His royal kingly stance!")
- `Hebrews 7:25 is the ministry of this age` → the step 1 / step 2 boundary ("Michael has not yet stood up in the sense of Daniel 12:1. Hebrews 7:25 is His intercession in this age, until that standing, when human probation closes.")
- `the time of Jacob's trouble` (Jeremiah 30:7) and the seven last plagues (Revelation 16) → step 3
- `having your name written in the Book` (Philippians 4:3; Revelation 3:5; 20:12, 15; 21:27) → step 4
- the two destinies and "do not flatten 12:2 into a political metaphor" → step 5

An annotation that is drawn as a peer becomes a rival cause. That is precisely the rearrangement the title refuses.

### 6.5 Smallest change that gets it the cinematic treatment without changing shape

Keep `kind: "flow"` — the whole sequence must stay visible at once; the story carousel's one-card-at-a-time presentation would hide the order this diagram exists to prove. Then:

1. draw a continuous connector rail through the five stacked steps (the stack currently has no connectors at all);
2. run a travelling highlight down the rail once on scroll-in, and re-run it from the existing "Replay animation" control;
3. make each step clickable to open the existing full-screen `story-read` reader as a "scene", so the clickable-node payoff arrives without a map;
4. attach the `'amad` note to step 1 as a dashed side-note, labelled `'amad: kingly stance` with the sitting's grammar reason ("consistently designates a king assuming sovereign executive reign or entering royal authority"), and mark the `"not yet"` state as its counter-node: `Hebrews 7:25 is the ministry of this age`.

Scene sources: the `'amad` framework card, the probation paragraph and Revelation 22:11, the time-of-trouble card, the Book of Life card, and the Daniel 12:2 framework card.

**Provenance discipline:** this diagram carries no dates and must not acquire any. The sitting's 1798 / 508 / 1843 material belongs to `s10-3` and to the sitting's "History:" lines, and the sitting itself calls 508 "a **reconstructed civil start**". Keep that boundary: the map-free flow in `s10-2` is the version of Daniel 12 that a reader can hold without a calendar.

---

## 7. Summary table

| Diagram id | Sitting | Shape | Verdict | One-line reason |
| --- | --- | --- | --- | --- |
| `s2-3` | 2 | (b) fan — two constituents → one verdict → four parallel instances (with a labelled rival reading) | **`mindmap`** | No temporal order exists in it to protect: the four named attempts are instances of one verdict, and the sitting's own artwork already draws a bracket. |
| `s2-4` | 2 | (a) strict sequence carrying a (b)-style positional contrast | **`mindmap with a spine`** | Cut out → strikes the feet → pulverises → becomes a mountain cannot be reordered, but the timing claim ("not during Babylon, Persia, Greece, or Pagan Rome") needs a second rail beside the spine. |
| `s4-4` | 4 | (a) strict sequence, spec is five bare titles | **`keep as flow`** | The chain's brevity inside one lifetime is the argument against the 2,520-year reading; a fan would have nothing true to branch on. |
| `s4-5` | 4 | (a) strict sequence, and the second half of `s4-4`'s chain | **`keep as flow`** | "Restoration came only when…" is the whole claim, and its first two nodes are `s4-4`'s last two — a fan would hide the continuation. |
| `s10-2` | 10 | (a) strict sequence whose order is the thesis | **`keep as flow`** | The title says "in Its Own Order"; every branchable item is a footnote to a single step, and drawing footnotes as peers is the rearrangement the diagram refutes. |

**Tally:** 1 mindmap · 1 mindmap with a spine · 3 keep as flow.

---

## 8. Cross-link candidates that recur across diagrams

Seven link *types* recur across the sittings often enough to justify one shared visual vocabulary. Quoted evidence is given for each. Where the proposed connector label is a phrase the sitting already uses it is quoted; where no single phrase exists, the label is marked **descriptive** and is named after the course's own heading — no label below adds a claim the sitting does not make.

| # | Link type | Where it recurs (with quotes) | Proposed connector label |
| --- | --- | --- | --- |
| 1 | **Zoom: the same node, read in detail** | `s2-1` "Feet of Iron & Clay / Divided Europe" → `s2-3` ("The feet are the only part of the image God's kingdom strikes, and 2:43 says the mixture will not hold"); `s2-1` "The Striking Stone / Christ's Kingdom" → `s2-4` ("It breaks the whole image at once and then becomes a mountain that fills the earth"); `s10-1` "Michael Stands Up" → `s10-2`; `s4-4` → `s4-5` (the nodes "he lifts his eyes" / "his understanding returns" appear in both) | **"The feet"** / **"The striking Stone"** — carrying `s2-1`'s own node names down to the diagrams that read them in full (this is the one link type with no single existing phrase, because its label is always the framework node's own name) |
| 2 | **The order is the argument (TEXT guardrail)** | `s10-2` title "in Its Own Order"; `s4-4` "The chapter connects the king's boast with the sentence he receives, then records…"; `s4-4` caution card "This is an exegetical error" / "Daniel 4 is a literal court narrative"; sitting 2's interpretation card "You start at the named head and walk the chain; you do not restart it in a modern century"; sitting 2's quiz at 1418 "The sequence is strictly contiguous and non-repeatable" | **"In its own order"** — the `s10-2` title |
| 3 | **Not X, but Y (contrast rail)** | `s2-3` "Mechanical Mixture, Not Union"; `s2-4` "Not during Babylon, Persia, Greece, or Pagan Rome, but during the divided kingdoms after Rome (the feet)"; `s2-4` "the Second Coming, not the incarnation"; `s2-4` "Abolition, not political reformation"; `s2-4` "not a policy program or a better emperor"; `s4-4` "not as a diagnosis of a medical condition"; `s10-2` "do not flatten 12:2 into a political metaphor" | **"But not…"** (rendered as the dashed rail, one per negation) |
| 4 | **Rival reading, marked as interpretation** | sitting 2, `s2-3`'s historical-note "**Rival reading (interpretation):** Some historicists take the clay as religious power allied with the state"; sitting 2, Main Point 4 "Preterism and futurism break the text"; sitting 4 "Some modern interpreters have attempted to apply the year-day principle to Daniel 4"; sitting 10 "Liberal higher criticism often reduces Daniel 12:2 to a poetic metaphor" | **"Rival reading"** — the sitting's own heading |
| 5 | **Prophecy declared in advance → the historical instances (History:)** | `s2-3` "The prophecy declared in advance: they shall not hold together" → "Attempts to unify Europe under Charles the Great (eighth century) failed"; `s2-4` "in the days of these kings" → the sitting's "History:" lines; `s10-3`'s 508 → 1798 → 1843 rail | **"Declared in advance"** — the sitting's phrase, carried on the instance side with the sitting's own "History:" prefix |
| 6 | **The same motif, or the same figure, in another text** | `s2-3` "Daniel 11 uses the same motif: a royal marriage made to seal an agreement does not stand (Daniel 11:6, 17)"; `s2-4` "Psalm 118:22; 1 Peter 2:6–8", "1 Corinthians 10:4", "Matthew 16:18", "Luke 20:17–18", "Revelation 11:15"; `s10-2` "Jeremiah 30:7", "Revelation 16", "Revelation 22:11", "Hebrews 7:25", "Philippians 4:3; Revelation 3:5; 20:12, 15; 21:27" | **"The same motif"** — the sitting's phrase (descriptive of the link; the destination is always the quoted reference) |
| 7 | **The terminal CHRIST node** | Every sitting ends its sections with a `level-kicker` "CHRIST" card; in these five: `s2-4` "The stone is not a policy program or a better emperor. It is Jesus Christ"; `s4-5` "Philippians 2:6–8 presents Christ's humility as the contrast to the king's boast"; `s10-2` "it signifies Jesus Christ assuming His royal kingly stance!" | **"CHRIST"** — the course's own card kicker |

### The vocabulary already exists in the course — use it

Every sitting in the file carries a closing self-check with the same four headings, e.g. sitting 2: "**Before you accept a prophetic conclusion** — **TEXT** — Does Daniel 2:38 fix Babylon as the non-repeatable head? / **HISTORY** — Does the chain stay contiguous…? / **INTERPRETATION** — Does the stone strike the feet 'in the days of these kings'…? / **CHRIST** — Does this lead you to the Stone who fills the earth…?" The same four appear in sittings 4 and 10 ("**TEXT** — Does Daniel 12:1 declare that Michael stands up…", "**HISTORY** — Did Daniel 11 accurately trace Persia, Greece, Rome…", "**INTERPRETATION** — Does Michael's standing up ('amad) follow Daniel 11's kingly grammar…", "**CHRIST** — Is Jesus Christ your King…").

That maps onto the seven link types above with almost no remainder, and it means a reader who learns four connector colours meets them again in the sitting's own self-check:

| Connector | Meaning on the map | Link types it covers |
| --- | --- | --- |
| **TEXT** | the order or the image as written | 1, 2 |
| **HISTORY** | declared in advance, then the historical instances | 5 |
| **INTERPRETATION** | this sitting's reading, the rival reading, and the "not X" rails | 3, 4 |
| **CHRIST** | the same figure in another text, and the terminal node of every chain | 6, 7 |

If the two mindmaps (`s2-3`, `s2-4`) ship with one shared connector vocabulary, the three `keep as flow` diagrams can carry the same four labels on their connector rails — so the cinematic treatment reads as one course-wide grammar rather than five unrelated set pieces.

---

## 9. Port constraints worth deciding before any build (verified in the code)

These do not change the verdicts, but they change what "cinematic" can mean inside `study.html`:

1. **The study diagrams are inline figures, not a fixed stage.** Each sits in a `figure[data-diagram]` inside the lesson column, wrapped by `renderSheetDiagrams` in a collapsible body with a "Replay animation" button, and must survive narrow widths, `prefers-reduced-motion`, and the page's paper/white modes (`body.paper-mode .flow-step`, `body.white-mode .flow-step` at `study.html` 1514–1527). The prototype's 1600×900 stage with camera fit is a full-viewport presentation; inline, the map needs either a bounded stage of its own or the prototype's own `.compact` fallback — which it already has: links, rays and scenes are hidden and each branch becomes a left-bordered outline block on `(max-width: 860px), (max-aspect-ratio: 1/1)`.
2. **`bodyFlow` draws no connectors at all** — it is a staggered vertical stack (`study.html` 1450–1468). Any "sequence kept as flow" upgrade therefore has to add the rail; the connectors are the missing piece, not the animation.
3. **`bodyStory` (the existing cinematic form) does not render `points`.** Only `bodyFlow` and `bodyComparison` print them. `s2-3`'s four named attempts live in `points`, so a mechanical `kind → "steps"` flip would silently drop Charlemagne, Charles V, Napoleon and Hitler, and any map renderer for `s2-3` must carry `points` as leaves. `s2-4` has no `points`, and the three `keep as flow` diagrams have none either, so the one-field flip is safe for them.
4. **Cites become chips.** A spec `cite` that the sitting's reference list can resolve renders as a clickable chip; ones it cannot (chapter-only labels) print flat (`diagramCite`, `makeCiteResolver`). `s10-2` step 1's cite is `"Dan 11:2-4"` — a cross-reference for the word study, not the verse that reports the event. Keep it as authored; it is doing real work.
5. **The ASCII artwork is preserved.** `renderSheetDiagrams` keeps the original `<pre class="chain-ascii">` inside the figure, hidden, so it survives for search and copy. Whatever renders the two maps must keep that line intact.
