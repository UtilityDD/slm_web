# Hourly Visual Quiz

Adds image-capable hourly questions from Google Sheets while preserving the existing scoring and Supabase submission pipeline.

## File map

- `src/components/Competitions.jsx`
  - hourly fetch (`fetchHourlyQuiz`)
  - deterministic 5-question selection (`startQuiz`)
  - visual rendering + retry fallback for question/option images
- `src/utils/visualQuizService.js`
  - fetches/parses published Google Sheet CSV
  - maps rows into hourly question shape
- `quiz_management/visual_quiz_template.csv`
  - authoring template for visual questions

## Public contract

### Google Sheet source

- CSV endpoint: published sheet URL (public read).
- Required columns:
  - `id`, `language`, `question_type`, `question_text`, `question_image_url`
  - `option_1..option_4`, `correct_index`, `category`, `tags`, `hint`, `enabled`
- Behavior:
  - only `language=bn` and `enabled=TRUE` rows are included
  - `correct_index` is zero-based (`0..3`)

### Hourly selection behavior

- Supabase still provides base pool via `get_random_hourly_questions`.
- Visual sheet rows are merged into that pool by `id`.
- Final user quiz remains exactly 5 questions (deterministic per user + hour).
- Enforces visual mix target in final 5:
  - minimum 1 visual question when available
  - maximum 2 visual questions when non-visual replacements are available
- Avoids repeating the same image for 10 hours (soft preference, per-user local history).

## Scoring and database safety

The visual integration does not modify the scoring path:

- `submitQuiz()` scoring formula unchanged.
- `calculatePenalty()` unchanged.
- `submitHourlyQuiz()` unchanged.
- Supabase RPC `submit_quiz_result_v2` unchanged.
- Hourly `quiz_id` format unchanged (`hourly-challenge-YYYY-MM-DD-HH`).

## State and lifecycle notes

- Image retry state:
  - `failedImageKeys` tracks exhausted image loads.
  - `imageRetryTick` forces cache-busting retry URL updates.
- Image history state:
  - persisted in local storage key `slm_hourly_image_history_<userId>`.
  - stores image URL + timestamp, pruned to last 10 hours.

## Image loading strategy

For Google Drive links, the UI attempts these sources in order:

1. `drive.google.com/thumbnail?id=...`
2. `drive.google.com/uc?export=view&id=...`
3. `lh3.googleusercontent.com/d/...`

If all fail, a visible retry button is shown for question/option images.

## Extension points

- To change the visual ratio:
  - update selection logic in `startQuiz` (keep deterministic seed behavior).
- To support English visual sheet rows:
  - change `visualQuizService.fetchVisualQuestions({ language: 'bn' })` call site to dynamic language mapping.
- To increase variety:
  - raise Supabase `limit_count` in `fetchHourlyQuiz`.

## Gotchas

- Duplicate `id` between Supabase and sheet favors latest map insert in merge order.
- Very small pools can still cause image repetition despite 10-hour preference.
- Ensure Drive assets are shared publicly; otherwise retries still fail.
