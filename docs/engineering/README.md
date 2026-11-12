# Engineering handbook — The Shelf of Daniel

This handbook is the single place a developer or senior engineer reads to understand the site: what it is for, how it works, how the code is laid out, how it is secured, how it stays fast, and how its interface is built.

**Last verified against the code:** 12 November 2026 (working tree on `master` at `b443854` plus the uncommitted fixes in [CHANGELOG.md](CHANGELOG.md)).

## Reading order

| # | Chapter | Read it when you want to know… |
|---|---|---|
| 1 | [Overview](01-overview.md) | What the site is, who it is for, and its current state |
| 2 | [How it works](02-how-it-works.md) | What happens from a page load to a saved answer |
| 3 | [Project structure](03-project-structure.md) | Where any file lives and where new work goes |
| 4 | [Security](04-security.md) | Every protection layer, and the decisions behind it |
| 5 | [Performance](05-performance.md) | Caching, loading, 3D memory, and the budgets tests enforce |
| 6 | [User interface](06-ui.md) | Pages, shared components, themes, motion, and accessibility |
| 7 | [Develop, test, release](07-develop-test-release.md) | Running locally, the test suites, CI, deploys, and the database |
| — | [Changelog](CHANGELOG.md) | What changed, when, and which chapters it touched |

Older documents in `docs/` (audits, fix plans, specs) are history. When they disagree with this handbook, the handbook wins. [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) is kept for its detailed tables; its own introduction points here.

## Keeping this handbook current

The handbook is only useful if it matches the code. Every change to the site updates it **in the same change**, not later.

**For every change:**

1. Add an entry at the top of [CHANGELOG.md](CHANGELOG.md): the date, what changed, why, and which chapters you updated.
2. Update every chapter the change touches. Use this table to find them:

| If the change touches… | Update |
|---|---|
| A page, a route, or what a visitor can do | 01 Overview, 02 How it works, 06 UI |
| A file or folder (added, moved, removed) | 03 Project structure |
| Sign-in, access rules, headers, CSP, rate limits, the database, privacy or consent | 04 Security |
| Caching, asset size, loading order, 3D models, telemetry volume | 05 Performance |
| Layout, components, themes, motion, keyboard or screen-reader behaviour | 06 UI |
| Scripts, tests, CI, deploy, or SQL migrations | 07 Develop, test, release |

3. Change the **Last verified** date at the top of each chapter you checked.
4. Write only what you checked in the code, a test, or a tool. If something was not checked, say "not checked". Do not guess numbers.

**Before merging:** read the diff of `docs/engineering/` next to the code diff. A code change with no handbook or changelog change needs a reason in the commit message.

## Writing style for these pages

- Plain English, short sentences, one idea per paragraph.
- Tables for anything with more than three parallel items.
- Name files as repo-relative paths in backticks, for example `js/shared/auth.js`.
- Record decisions together with their reason, so a later reader does not "fix" them by mistake.
