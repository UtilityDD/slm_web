# Life Skill (supplementary) modules — developer guide

**Purpose:** Document the **Life Skill** tab in Training: the **module catalogue**, **journal manuscripts**, **header lesson codes (`LS01`…)**, **GitHub-only hosted listen audio**, **local completion storage**, and how to **add or change** content safely.

**Primary files**

| Path | Role |
|------|------|
| `public/data/supplementary_modules.json` | Module list: ids, titles, `manuscript_url`, optional `audio_url_*`, `lesson_code`, blurbs, assets |
| `public/quizzes/lesson_10_*.json` | Manuscript JSON merged into `trainingContent` when a module opens (same slide model as core lessons — see [Training lesson reader](./training-lesson-reader.md)) |
| `src/components/safety/Training.jsx` | Tab UI, card grid, `getSlides`, merge of manuscript, `getTrainingHeaderLessonCode`, `isValidSupplementaryGithubListenUrl`, Listen button, completion auto-save |
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
| `image_url` | Optional | Under `public/`, e.g. `/assets/supplementary/stress_mgmt.png`. |
| `highlights_en` / `highlights_bn` | Optional | Chip text on the card. |
| `trusted_blurb_en` / `trusted_blurb_bn` | Optional | Small footnote under highlights (source alignment). |
| `category` | Optional | Styling / label (`mental`, `financial`, etc.). |
| `duration` | Optional | Badge when not completed. |
| `audio_url_en` / `audio_url_bn` | Optional | **Listen** button — see [Hosted listen audio](#hosted-listen-audio-github-only) below. |

**Adding a new module**

1. Add a row to `supplementary_modules.json` with a new `id` (e.g. `supp_10_6`) and `lesson_code` (e.g. `LS06`).
2. Add `public/quizzes/lesson_10_6.json` (or your chosen path) with **`level_id` equal to that `id`** and the usual `mission_briefing`, `sections`, optional `pro_tip` / `myth_buster` / `advanced_section` (see [Training lesson reader](./training-lesson-reader.md)).
3. Point `manuscript_url` at the new JSON.
4. Add a card image under `public/assets/supplementary/` if you use `image_url`.

Opening a module sets `trainingContent` with `isSupplementary: true`, `lesson_code`, `audio_url_*`, then fetches the manuscript and merges fields while **preserving** `lesson_code` / deriving it from `level_id` when needed.

---

## Header lesson code (`LS01`, …)

- **`lesson_code`** in the catalogue is the preferred display string (English stays Latin; Bengali may show Bengali numerals via `toBengaliNumber` on the string).
- If `lesson_code` is missing, **`deriveLifeSkillCodeFromLevelId`** maps `supp_10_N` (case-insensitive) → `LS` + zero-padded `N`.
- Core **Training** tab lessons are unchanged: they still show their normal `level_id` / numbering.

---

## Hosted listen audio (GitHub only)

The **Listen (full screen)** control is **enabled only** when the active language’s URL passes **`isValidSupplementaryGithubListenUrl`** in `Training.jsx`:

1. **Scheme:** must be **`https://`** (`http://` and relative paths like `/audio/foo.mp3` are rejected).
2. **Allowed hosts:**
   - **`raw.githubusercontent.com`** — path must be non-empty (typical: `https://raw.githubusercontent.com/<org>/<repo>/<ref>/<path>/file.mp3`).
   - **`github.com`** — URL path must include **`/releases/download/`** (release asset MP3).

The UI picks **`audio_url_bn`** when the app language is Bengali (fallback to `audio_url_en`), else **`audio_url_en`** (fallback to `audio_url_bn`).

### How to integrate an audio link

1. **Host the file** on GitHub (same repo or another) so it is reachable over **HTTPS** as **raw** content or as a **Release** asset.
2. **Raw file (common):**  
   - Commit `my-lesson-bn.mp3` to branch `main`.  
   - Use:  
     `https://raw.githubusercontent.com/<ORG>/<REPO>/main/<optional-folder>/my-lesson-bn.mp3`  
   - Put that string in **`audio_url_bn`** or **`audio_url_en`** in `supplementary_modules.json` for the right module.
3. **Release asset:** upload the MP3 to a GitHub Release and copy the **browser download** URL; it must contain **`github.com`** and **`/releases/download/`**.
4. **CORS / playback:** Raw GitHub URLs are widely used for static assets; if a file fails to load, check the URL in a new tab, branch/ref name, and that the repo is public (or that the client can access it).
5. **Per language:** set both `audio_url_en` and `audio_url_bn` if tracks differ; use `null` for a side with no track (Listen uses the other if valid).

If no URL passes validation, the Listen button stays **disabled**; read-aloud (TTS) may still appear for text unless a valid GitHub URL hides it — see `hideReadAloudForSupplementaryRadio` in `Training.jsx`.

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
