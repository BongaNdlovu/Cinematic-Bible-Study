## What and why

<!-- One or two sentences: what changes for a reader, and why. -->

## Where things go

- **Feature name** (use the word *sitting* for a lesson):
- **Files touched**, and why each is in its folder (`js/core`, `js/features`, `js/content`, `js/pages/<page>`; `css/` mirrors it; see `docs/engineering/03-project-structure.md`, "The layout rule"):
- **New page script?** It is an `import` in `js/pages/<page>/main.js`, not a `<script>` tag.
- **Database change?** It is the next file in `db/migrations/`, and it runs in Supabase before this deploys.

## Checks

- [ ] `npm run lint` passes (file and function size limits, complexity, undefined names)
- [ ] `npm run test:unit` passes
- [ ] `npm test` passes
- [ ] `npm run test:browser` passes, or the reason it was not run is below
- [ ] Tests added or changed for this change:
- [ ] Moves are proved unchanged (`tools/verify/verify_moved_functions.mjs` or `verify_equivalence.mjs`)

## Handbook

- [ ] `docs/engineering/CHANGELOG.md` has an entry for this change
- [ ] Chapters updated:
- [ ] Every fact in them was checked in this change; anything else says "not checked"
