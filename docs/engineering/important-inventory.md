# `!important` in the study stylesheets

**Last verified:** 16 November 2026

Step 3.3 of the architecture plan: take stock before reducing. Nothing was changed. Every `!important` forces the next rule that wants to win to use one too, so the aim is to remove the root rules first and the rest after.

**How it was counted:** every declaration marked `!important` in `css/pages/study/parts/*.css`, sorted by where it sits (its media query) and what it targets (its selector). The plan's figure of 299 counted lines with `!important` in the old `css/study-page.css`. Counted as declarations there are 314, because some lines hold more than one.

| Group | Declarations | Why it is there |
|---|---|---|
| Print (`@media print`) | 61 | Print must beat the screen styles. Usually kept. |
| Reduced motion (`@media (prefers-reduced-motion: reduce)`) | 37 | Turns animation and transitions off whatever else set them. Usually kept. |
| Theme overrides (`paper-mode`, `white-mode`, `charcoal-mode`, `night-mode`, `html.dark`) | 78 | Each theme fights the default colours. A theme built on CSS custom properties would need none of these. |
| Full-screen diagrams (`.is-full`, `dfx-`) | 7 | The full-screen shell fights the in-page layout. |
| The two root rules | 2 | `.article-body p` (`font-size`, `css/pages/study/parts/01-article.css`) and `.article-body h4` (`font-size`, `css/pages/study/parts/10-desk.css`). |
| Everything else | 129 | See below. |

**Everything else, by property:** `font-size` 48, `margin` 27, `line-height` 18, `display` 12, `font-family` 5, `color` 5, others 14. By file: `04-story.css` 45, `07-mindmap.css` 33, `11-lesson-blocks.css` 12, `12-bible-and-player.css` 9, `20-themes-and-projection.css` 8, `19-sitting-page.css` 7, `21-timeline.css` 7, and 8 in three other files.

**What this suggests (not checked rule by rule):** the 48 `font-size` declarations sit mostly in the story reader and mind map, whose text is inside `.article-body`. They most likely fight the two root rules, which set `font-size` with `!important` on every paragraph and `h4` in a lesson. Removing those two root rules is the step most likely to free the most declarations. It changes behaviour, so it is a separate, later step with its own screenshots.

The plan expected most of the 299 to fight `.article-body p` and `h4`. The count does not support that. At most about 50 of 314 are likely to (the `font-size` ones). The two biggest real sources are the themes (78) and print plus reduced motion (98), and the last two are mostly legitimate.

**Re-count:** `node tools/count_important.mjs` prints these groups. Run it after each reduction step and update this page.
