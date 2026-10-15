---
name: complexity-ceiling
description: >-
  Enforce this repo's Oxlint cyclomatic-complexity ceiling, re-measure the
  linted files, and ratchet the maximum down after a split. Use when adding
  control flow, splitting a large function, editing .oxlintrc.json, or when
  the user mentions complexity, oxlint, the lint ceiling, or ratcheting it.
---

# Complexity ceiling

This repo already has the ceiling. Measure here. Do not copy a maximum, package manager, or changelog format from another project.

## Rule

- `.oxlintrc.json` sets `complexity` to `["error", 55]`.
- `npm run lint` is the check. `.github/workflows/lint.yml` runs that same command.
- 55 is the highest score on files that lint actually sees, plus 2. It is a regression ceiling, not the long-term target.
- No `oxlint-disable` or `eslint-disable` for `complexity`. No grandfathering.
- A function under the ceiling can still grow up to it. The rule does not stop that.

`ignorePatterns` omit `vendor/**`, `node_modules/**`, `qa/**`, `qa-e2e/**`, `tools/**`, `models/**`, and `assets/**`. A high score in those trees does not raise or lower the ceiling. Do not add an ignore to hide a new function.

## When lint fails

Split the function into focused functions. Do not raise 55. Do not suppress the diagnostic.

## Ratchet

1. From the repo root, run `node .cursor/skills/complexity-ceiling/scripts/rank.mjs`.
2. Set the maximum to the new highest linted score plus 2.
3. Update the table in `docs/ARCHITECTURE.md` and the ceiling sentence in `README.md`.
4. `npm run lint` must finish with no errors.

Last measured linted top scores are in `docs/ARCHITECTURE.md`. If that table and `.oxlintrc.json` disagree, re-measure. The config number is what CI enforces.

## Do not import

This is not a Bun repo, and it does not use Changesets. A ceiling of 80, or scores from functions named `App` and `validateFileViewLayout`, belong to a different codebase. Applying them here would loosen the existing gate.
