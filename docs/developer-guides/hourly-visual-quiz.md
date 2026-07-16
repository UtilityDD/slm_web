# Hourly Visual Quiz

Image-capable hourly questions from a published Google Sheet CSV, merged with the Supabase hourly pool. Scoring and `submit_quiz_result_v2` are unchanged.

## File map

### Runtime (live hourly quiz)

| Path | Role |
|------|------|
| `src/components/Competitions.jsx` | Hourly fetch, deterministic 5-question pick, visual rendering, image retry UX |
| `src/utils/visualQuizService.js` | Fetches live sheet CSV via `requestManager` (60s TTL + SWR) |
| `src/utils/visualQuizCsv.js` | CSV parse, `rowToVisualQuestion`, `rowsToVisualQuestions` |
| `src/utils/visualQuizSanitize.js` | Answer-leak stripping + `detectAnswerLeakWarnings` (also used in maintenance scripts) |
| `src/utils/visualQuizImageUtils.js` | Local-first image paths, Drive fallbacks, `isImageOption`, load-error retry chain |

### Admin preview (no scoring / DB)

| Path | Role |
|------|------|
| `src/components/VisualQuizPreview.jsx` | Admin-only CSV reviewer: live sheet, batch 02, or uploaded CSV |
| `src/components/Admin.jsx` | **Quiz Preview** button → `setCurrentView('visual-quiz-preview')` |
| `src/SmartLinemanUI.jsx` | Route case `visual-quiz-preview` (admin role) |

Preview sources are defined in `VisualQuizPreview.jsx`:

- **Live Google Sheet** — same URL as production (`VISUAL_QUIZ_LIVE_CSV_URL`)
- **Draft: Spot-the-mistake preview** — `visual_quiz_batch_mistake_preview.csv`
- **Draft: Batch 02** … **Batch 08** — `public/quiz_management/visual_quiz_batch_0N.csv`
- **Upload CSV** — local file picker

Preview behaviour:

- Correct option is **always** marked (green border + **✓ সঠিক** / **✓ Correct** badge) for reviewer checking.
- Hint toggles separately (**ইঙ্গিত দেখুন** / **Hide hint**).
- Rows with `detectAnswerLeakWarnings` hits show ⚠ badges in the sidebar and header.
- Optional **enabled=FALSE** rows via checkbox (production ignores disabled rows).

### Sheet & catalog files (`quiz_management/`)

| File | Purpose |
|------|---------|
| `visual_quiz_template.csv` | Column-format example only — **not synced** with live sheet |
| `visual_quiz_batch_02.csv` … `visual_quiz_batch_08.csv` | Draft batches (`vq-120+` … `vq-395+`); also under `public/quiz_management/` for Admin preview |
| `visual_quiz_batch_mistake_preview.csv` | Draft **spot-the-mistake** samples (illustrative mistakes) — review before live paste |
| `visual_quiz_mistake_preview.html` | Static HTML review for the mistake draft |
| `live_visual_quiz_migrated_preview.csv` | **Master catalog** to paste into live Google Sheet (re-finalize after each batch merge) |
| `live_sheet_image_map.csv` | Drive ID → `img_{id}.jpg` map from migration script |
| `live_sheet_cutover_guide.txt` | Find/replace pairs for manual sheet migration |
| `live_visual_quiz_cutover_diff.txt` | Before/after diff from `apply_visual_quiz_local_urls.mjs` |

### Images on disk

| Path | Purpose |
|------|---------|
| `public/images/quizzes/img_{driveId}.jpg` | Migrated Drive assets (many are WebP bytes with `.jpg` extension — browsers still render) |
| `public/images/quizzes/dtr_*.webp` | DTR part photos used in `vq-120`–`vq-123` (`text_to_image`) |
| `public/images/quizzes/{shortname}.webp` | Any other local-only filename referenced directly in CSV cells |

## Question types

All rows in the visual quiz catalog should use an **image** type. Avoid `text_to_text` in the sheet.

| `question_type` | `question_image_url` | `option_1`…`option_4` | UI |
|-----------------|----------------------|------------------------|-----|
| `image_to_text` | Image URL or local filename | Bengali text labels | Show image above question; text options |
| `text_to_image` | Empty | Image URL or local filename per option | Text question; image grid options |

`Competitions.jsx` treats a question as **visual** when `question_image_url` is set **or** any option passes `isImageOption()`. `question_type` is metadata for editors; rendering follows image presence.

### Image cell formats

- **Local (preferred):** `img_1GN9r25E-vhH3o0PmYTh_CeHpvAREF_Dr.jpg` or `dtr_ht_bushing.webp`
- **Drive (migration fallback):** full `https://drive.google.com/file/d/{id}/view…` URL
- **Editor-only previews:** `preview_q`, `preview_o1`…`preview_o4` with `=IMAGE("https://drive.google.com/thumbnail?id=…")` — ignored by the app parser

## Public contract

### Google Sheet source

- CSV endpoint: published sheet URL in `visualQuizCsv.js` (`VISUAL_QUIZ_LIVE_CSV_URL`, gid `160776708`).
- Required columns:
  - `id`, `language`, `question_type`, `question_text`, `question_image_url`
  - `option_1`…`option_4`, `correct_index`, `category`, `tags`, `hint`, `enabled`
- Optional: `preview_q`, `preview_o1`…`preview_o4` (sheet thumbnails only).
- Parser rules (`rowsToVisualQuestions`):
  - Only `language=bn` rows (unless you change the fetch call site).
  - Only `enabled=TRUE` in production (`includeDisabled: false`).
  - `correct_index` is **zero-based** (`0`…`3`).
  - Each row is passed through `sanitizeVisualQuestionRow` before use.

### Hourly selection behaviour

- Supabase still provides base pool via `get_random_hourly_questions`.
- Visual sheet rows are merged into that pool by `id`.
- Final user quiz remains exactly **5** questions (deterministic per user + hour).
- Visual mix in the final 5:
  - minimum **1** visual question when available
  - maximum **2** visual questions when non-visual replacements exist
- Soft preference: avoid repeating the same image for **10 hours** (per-user local history).

## Answer-leak sanitization

Some sheet rows give away the answer via parentheses in the stem, letter-labelled diagram options (`A (shell)`), or numbered DTR diagrams. Runtime mitigation lives in `visualQuizSanitize.js` and runs on every parse (live fetch + admin preview).

| Function | What it does |
|----------|----------------|
| `stripAnswerLeaksFromQuestionText` | Removes parenthetical hints that overlap the correct option; normalizes shape giveaways in stems |
| `sanitizeLetterLabeledOptions` | Replaces `A (name)` style options with neutral “চিহ্নিত অংশ 'A'” text |
| `sanitizeVisualQuestionRow` | Applies both when building a question |
| `detectAnswerLeakWarnings` | Returns warning codes for admin preview / audits (does not block live play) |

Warning codes include: `question_paren_matches_answer`, `letter_label_options_include_names`, `question_describes_correct_option`, `numbered_labeled_diagram`, `letter_labeled_diagram`.

### Maintenance scripts

```bash
# Report leak flags (default: migrated preview + batch 02)
node scripts/maintenance/audit_visual_quiz_answer_leaks.mjs
node scripts/maintenance/audit_visual_quiz_answer_leaks.mjs quiz_management/visual_quiz_batch_02.csv

# Rewrite CSV stems/options in place (plus disable/remove known-bad ID sets)
node scripts/maintenance/fix_visual_quiz_answer_leaks.mjs

# Merge live + batch 02, drop duplicates, apply row fixes, enable all, rewrite master CSV
node scripts/maintenance/finalize_visual_quiz_catalog.mjs
```

After editing batch rows or fixing leaks, run **finalize** then re-paste `live_visual_quiz_migrated_preview.csv` into the live sheet.

## Difficulty tags (`easy` / `medium` / `hard`)

- Stored on `hourly_questions.tags` (text array) and the visual sheet `tags` column (comma-separated).
- Untagged questions are treated as **easy**.
- Selection uses `src/utils/hourlyDifficulty.js` + `startQuiz` in `Competitions.jsx`:
  - &lt; 10k lifetime: easy only (5× easy)
  - 10k–30k: 3 easy + 2 medium
  - 30k–50k: 2 medium + 3 hard
  - 50k+: 1 medium + 4 hard
- DB tags: `quiz_management/hourly_difficulty_tags.json`
- Re-assess: `node scripts/maintenance/assess_hourly_difficulty.mjs`
- Re-apply: `npx supabase db push` or `node scripts/maintenance/apply_hourly_difficulty_tags.mjs`

## Scoring and database safety

- Gross score unchanged (50 pts max, 10 per correct).
- Penalties use lifetime `profiles.points` tiers in `hourlyDifficulty.js`.
- `submitHourlyQuiz()` and RPC `submit_quiz_result_v2` unchanged.
- Hourly `quiz_id` format unchanged (`hourly-challenge-YYYY-MM-DD-HH`).

## Hour rollover

- `beginHourlyQuiz` compares `hourlyQuiz.id` to `getHourlyQuizId()` and **force-refetches** when they differ before `startQuiz`.
- Background interval (~12s) refetches when the hour id drifts (skipped while `activeQuiz` is set or refresh in progress).
- Mid-quiz: user keeps the same `quiz.id` and question set for the hour they started in.
- `hourlyQuizRefreshBusy` disables the live card briefly while refreshing.

## State and lifecycle notes

- Image retry: `failedImageKeys`, `imageRetryTick` in `Competitions.jsx`.
- Image history: local storage `slm_hourly_image_history_<userId>`, pruned to last 10 hours.

## Image loading strategy

Sheet cells may use **local filenames** or **Google Drive URLs** during migration.

`buildImageFallbackCandidates` order:

1. `/images/quizzes/{filename}` (or `img_{driveId}.jpg` derived from a Drive URL)
2. `drive.google.com/thumbnail?id=…`
3. `drive.google.com/uc?export=view&id=…`
4. `lh3.googleusercontent.com/d/…`

If all fail, a visible retry button is shown in the hourly quiz UI.

### Migrating images off Drive (safe rollout)

1. `node scripts/maintenance/migrate_live_visual_quiz_images.mjs` (live CSV) or pass a local export path.
2. Deploy app + `public/images/quizzes/` — **live sheet unchanged**; users still on Drive until you edit the sheet.
3. Use `live_sheet_image_map.csv` / `live_sheet_cutover_guide.txt` to replace Drive URLs in the live sheet.
4. Rollback: revert sheet cells to Drive URLs (no redeploy required).

### Other image / sheet helpers

```bash
node scripts/maintenance/generate_visual_quiz_sheet_cutover.mjs
# → live_sheet_cutover_guide.txt

node scripts/maintenance/retry_missing_visual_quiz_images.mjs
# Retries failed downloads (thumbnail / uc / lh3)

node scripts/maintenance/apply_visual_quiz_local_urls.mjs
# → live_visual_quiz_migrated_preview.csv + live_visual_quiz_cutover_diff.txt

node scripts/maintenance/validate_visual_quiz_sheet.mjs
# After sheet edit: confirm local files exist
```

## Adding new questions (workflow)

For **illustration style, option anti-cheat, and spot-the-mistake rules**, follow **[Hourly Visual Quiz — Image Generation](./hourly-visual-quiz-generation.md)** first.

1. Draft rows in a batch CSV under `quiz_management/` (e.g. `visual_quiz_batch_08.csv` or `visual_quiz_batch_mistake_preview.csv`).
2. Add images under `public/images/quizzes/` (prefer small `.webp`; `img_{driveId}.jpg` for Drive-sourced photos).
3. Review: Admin → **Quiz Preview** (matching draft source) and/or the static HTML review page when present.
4. Run `audit_visual_quiz_answer_leaks.mjs` — aim for **0** warnings on new IDs.
5. Run `finalize_visual_quiz_catalog.mjs` (or equivalent merge) into `live_visual_quiz_migrated_preview.csv`.
6. Paste into the live Google Sheet **quiz** tab (gid `160776708`) — not the Safety Library FileList tab.
7. Run `validate_visual_quiz_sheet.mjs` after paste.

**ID conventions:** live pool uses `vq-001`…; drafts may use temporary ids (e.g. `vq-mistake-01`) then renumber before paste. Do not duplicate `id` values between Supabase and the sheet (merge favors later insert in map order).

## Extension points

- Visual ratio: `startQuiz` in `Competitions.jsx` (keep deterministic seed).
- English sheet rows: change `visualQuizService.fetchVisualQuestions({ language: 'bn' })` call site.
- Larger pool: raise Supabase `limit_count` in `fetchHourlyQuiz`.
- Stricter leak policy: call `detectAnswerLeakWarnings` in `rowToVisualQuestion` and drop flagged rows (currently warn-only in preview).

## Gotchas

- Duplicate `id` between Supabase and sheet: later merge wins.
- Very small pools can still repeat images despite the 10-hour preference.
- Drive assets must be shared publicly, or fallbacks fail even with local-first code.
- `text_to_text` rows parse but are not real image quizzes — keep them out of the catalog.
- WebP files saved as `.jpg` in `public/images/quizzes/` are intentional; do not assume JPEG magic bytes.
- Some Drive IDs in `live_sheet_image_map.csv` may be `on_disk=no` — those rows keep Drive URLs until downloaded.
- Admin preview uses the same `visualQuizCsv` + sanitize path as production, so preview text may differ slightly from raw sheet cells (sanitized stems/options).

## Related guides

- [Hourly Visual Quiz — Image Generation](./hourly-visual-quiz-generation.md) — authoring illustrations + anti-cheat options
- [Reading habit and gate](./reading-habit-and-gate.md) — quiz entry after gate passes
- [Safety Library](./safety-library.md) — FileList tab of the same workbook (not quiz rows)
