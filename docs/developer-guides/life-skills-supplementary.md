# Life Skill (supplementary) modules — developer guide

**Purpose:** Document the **Life Skill** tab in Training: the **module catalogue**, **journal manuscripts**, **header lesson codes (`LS01`…)**, **hosted listen audio** (GitHub or same-origin `/audio/`), **local completion storage**, and how to **add or change** content safely.

**Primary files**

| Path | Role |
|------|------|
| `public/data/supplementary_modules.json` | Module list: ids, titles, `manuscript_url`, optional `audio_url_*`, `lesson_code`, blurbs, assets |
| `public/quizzes/lesson_10_*.json` | Manuscript JSON merged into `trainingContent` when a module opens (same slide model as core lessons — see [Training lesson reader](./training-lesson-reader.md)) |
| `src/components/safety/Training.jsx` | Tab UI, card grid, `getSlides`, merge of manuscript, `getTrainingHeaderLessonCode`, `isValidSupplementaryListenUrl`, Listen button, completion auto-save |
| `src/components/safety/LessonRadioOverlay.jsx` | Full-screen `<audio>` player for the Listen flow |
| `src/utils/supplementaryProgressStorage.js` | `localStorage` progress keyed by user; optional future Supabase sync |

---

## Catalogue: `supplementary_modules.json`

Each entry is one card on the **Life Skill** tab. Typical fields:

| Field | Required | Notes |
|--------|----------|--------|
| `id` | Yes | Internal id, e.g. `supp_10_1`. Must match `level_id` inside the linked manuscript JSON. |
| `lesson_code` | Recommended | Short label for UI, e.g. `LS01`. Shown in the journal header / hero; if omitted, `Training.jsx` can still derive `LS0N` from `supp_10_N` pattern. |
| `number` | Optional | Display helper (e.g. `S1`); not used for the LS header. |
| `title_en` / `title_bn` | Yes | Card + journal title by language. |
| `description_en` / `description_bn` | Yes | Card body. |
| `manuscript_url` | Yes | Path under `public/`, e.g. `/quizzes/lesson_10_1.json`. Fetched when the user opens the module. |
| `image_url` | Optional | Under `public/`, e.g. `/assets/supplementary/stress_mgmt.webp`. |
| `highlights_en` / `highlights_bn` | Optional | Chip text on the card. |
| `trusted_blurb_en` / `trusted_blurb_bn` | Optional | Small footnote under highlights (source alignment). |
| `category` | Optional | Styling / label (`mental`, `financial`, etc.). |
| `duration` | Optional | Badge when not completed. |
| `audio_url_en` / `audio_url_bn` | Optional | **Listen** button — see [Hosted listen audio](#hosted-listen-audio) below. |

**Adding a new module**

1. Add a row to `supplementary_modules.json` with a new `id` (e.g. `supp_10_6`) and `lesson_code` (e.g. `LS06`).
2. Add `public/quizzes/lesson_10_6.json` (or your chosen path) with **`level_id` equal to that `id`** and the usual `mission_briefing`, `sections`, optional `pro_tip` / `myth_buster` / `advanced_section` (see [Training lesson reader](./training-lesson-reader.md)).
3. Point `manuscript_url` at the new JSON.
4. Add a card image under `public/assets/supplementary/` (prefer WebP; run `node scripts/optimize-supplementary-webp.mjs` if you start from PNG) if you use `image_url`.

Opening a module sets `trainingContent` with `isSupplementary: true`, `lesson_code`, `audio_url_*`, then fetches the manuscript and merges fields while **preserving** `lesson_code` / deriving it from `level_id` when needed.

---

## Header lesson code (`LS01`, …)

- **`lesson_code`** in the catalogue is the preferred display string (English stays Latin; Bengali may show Bengali numerals via `toBengaliNumber` on the string).
- If `lesson_code` is missing, **`deriveLifeSkillCodeFromLevelId`** maps `supp_10_N` (case-insensitive) → `LS` + zero-padded `N`.
- Core **Training** tab lessons are unchanged: they still show their normal `level_id` / numbering.

---

## Hosted listen audio

The **Listen (full screen)** control is **enabled only** when the active language’s URL passes **`isValidSupplementaryListenUrl`** in `Training.jsx`.

### Option A — GitHub (public repo only)

Browsers load audio **without** your users’ GitHub logins. **Private** GitHub repos return 404/403 for raw URLs, so this path only works if the audio repo is **public**.

1. **Scheme:** must be **`https://`** (`http://` is rejected).
2. **Allowed patterns:**
   - **`raw.githubusercontent.com`** — non-empty path (e.g. `https://raw.githubusercontent.com/<org>/<repo>/main/folder/file.mp3`).
   - **`github.com`** with **`/releases/download/`** — release asset download URL.

### Option B — Same-origin `/audio/` (private GitHub alternative)

Put the file in **`public/audio/`** in this app (e.g. `life_skill_01.wav`) and set **`audio_url_en` / `audio_url_bn`** to a path like **`/audio/life_skill_01.wav`**. The path must start with **`/audio/`**, must not contain **`..`**, and is served with the web app (no anonymous access to a separate private repo required).

The UI picks **`audio_url_bn`** when the app language is Bengali (fallback to `audio_url_en`), else **`audio_url_en`** (fallback to `audio_url_bn`).

### How to integrate an audio link

1. **Public GitHub:** commit the file, use a **raw** or **releases/download** URL as above in `supplementary_modules.json`.
2. **Private audio:** copy the asset into **`public/audio/`**, reference **`/audio/<filename>`**.
3. **Per language:** set both `audio_url_en` and `audio_url_bn` if tracks differ; use `null` for a side with no track (Listen uses the other if valid).

If no URL passes validation, the Listen button stays **disabled**; read-aloud (TTS) may still appear for text unless a valid listen URL hides it — see `hideReadAloudForSupplementaryRadio` in `Training.jsx`.

---

## Completion & progress

- **`appendSupplementaryCompletion(userId, moduleId)`** records completion in `localStorage` (see `supplementaryProgressStorage.js` for schema and future Supabase notes).
- When the user reaches the **completion** slide, an effect calls **`handleMarkSupplementaryRead`** once per module session (silent save).

---

## UI conventions (short)

- **Suraksha Sathi** FAB is hidden for the whole **`training`** view in `SmartLinemanUI.jsx` (cleaner Training chrome).
- **Side prev/next arrows** are omitted on the **last** slide (completion uses in-content actions).
- Supplementary **completion** slide may use `overflow-y-hidden` on the scroll pane to avoid extra vertical scroll on small viewports.

---

## Related

- [Training lesson reader](./training-lesson-reader.md) — slide types, guided sections, advance lock, `renderTextWithImages`, media chips.
- [Life Skills Quiz Generation](./life-skills-quiz-generation.md) — rules on creating quiz JSON files, schema details, and anti-cheating bracket balance guidelines.
