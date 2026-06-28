# Training lesson images — developer guide

**Purpose:** Document how to **author, generate, wire up, and deploy** mobile-friendly poster images for **core Training lessons** (chapter JSON under `public/quizzes/chapter_*_*.json`), including Bengali headers, WebP output, and Supabase migrations.

**See also:** [Training lesson reader](./training-lesson-reader.md) (how images render in the app).

---

## Scope

This guide covers **toolbox / Safety chapter lessons** (e.g. `2.4`–`2.10`) where each section point and the myth buster can show a hero poster.

It does **not** cover:

| Topic | Guide |
|--------|--------|
| Hourly visual quiz photos | [Hourly Visual Quiz](./hourly-visual-quiz.md) |
| Life Skill module card art | [Life Skill / supplementary](./life-skills-supplementary.md) |
| Inline `[[…]]` chips in body text | [Training lesson reader](./training-lesson-reader.md) |

---

## File map

| Path | Role |
|------|------|
| `public/quizzes/chapter_X_Y.json` | Lesson manuscript; add `image_name` + `image_caption` on points and `myth_buster` |
| `public/images/loader/*.webp` | **Runtime URLs** used in JSON (`/images/loader/…`) |
| `public/quizzes/faq_images/*.webp` | Mirror copy for FAQ / search / reuse |
| `supabase/migrations/*_lesson_*_images.sql` | Updates `training_chapters.content` for production (bn) |
| `scratch/*.mjs` | **Local-only** build scripts (gitignored); patterns documented below |

**Runtime resolution:** `Training.jsx` loads chapter JSON from Supabase (`training_chapters`) in production, or from `public/quizzes/` in dev depending on sync. Images are static assets under `public/`.

---

## JSON contract

Add to each **section point** that needs a poster:

```json
{
  "item_name": "১. …",
  "image_name": "/images/loader/phase_ryb.webp",
  "image_caption": "R-Y-B Sequence · Clockwise RMF",
  "specifications": "…"
}
```

Add to **`myth_buster`** when the myth slide needs art:

```json
"myth_buster": {
  "title": "মিথ বাস্টার (Myth Buster)",
  "image_name": "/images/loader/phase_myth.webp",
  "image_caption": "Always Test · No Lamp Guess",
  "myths": [ … ]
}
```

**Conventions**

- **`image_name`:** always `/images/loader/<slug>.webp` (leading slash, loader path).
- **`image_caption`:** short English field terms + symbols; shown under the figure in the reader.
- **One image per guided step** — matches `sectionGuidedStepDone` flow (see lesson reader guide).
- Typical count: **3–4 section points + 1 myth buster** per lesson.

---

## Design standards (mobile textbook posters)

Lessons **2.4–2.10** established this look:

| Rule | Value |
|------|--------|
| Width | **768 px** max (natural height) |
| Format | **WebP** quality ~84–86 |
| Background | Cream `#f5f0e8` |
| Title | **Bengali** (Unicode) + English subtitle — see header pipeline below |
| Body text in art | **Minimal**; field terms in English (PTW, IR, FWD, Die, etc.) |
| Style | Clean textbook / lineman training illustration — not dense paragraphs |
| Real photos | Prefer for **specific tools** when available (e.g. wire grip photo for come-along) |

**Avoid**

- Long Bengali paragraphs baked into AI art (often garbled).
- Plain SVG box diagrams only (readable but weak for learners).
- Forced portrait **768×1024** except lesson **2.1** toolbox (special case).

---

## Pipelines (pick one per image)

### A — Illustrated poster + Bengali header overlay (recommended)

Used for lessons **2.5–2.10** (and regenerated **2.8–2.10**).

1. **Generate illustration** (Cursor GenerateImage or similar) with prompt:
   - Cream background, professional lineman training style.
   - **Leave top ~15% empty** — no title text in the art.
   - English labels only inside the illustration.
   - Save PNG to a local assets folder (e.g. Cursor project `assets/art_<slug>.png`).

2. **Post-process with Sharp** (`scratch/convert_lessons_*_v2.mjs` pattern):
   - `trim({ threshold: 15–18 })`
   - Crop ~8–11% from top (removes any accidental AI title band)
   - `resize(768, null, { fit: 'inside' })`
   - Composite **SVG header** with Bengali title + English subtitle
   - Export WebP to `public/images/loader/` and copy to `faq_images/`

**Why overlay Bengali?** AI image generators often corrupt Bengali script. Sharp + `Segoe UI` / `Nirmala UI` renders titles reliably.

### B — Real photo + poster frame

Used for **2.4** point 1 (`clamp_anatomy.webp`) from `public/quizzes/faq_images/come_along_clamp.png`.

1. Resize photo to fit white/cream card on canvas.
2. Add Bengali title, spec badges (2 TON, 20 kN, etc.) via SVG composite.
3. Export WebP to loader + faq paths.

### C — AI poster + trim only

Used for early lessons **2.2–2.3**, **2.5–2.7** first pass:

```js
await sharp(src)
  .trim({ threshold: 15 })
  .resize({ width: Math.min(width, 768), withoutEnlargement: true })
  .webp({ quality: 84, effort: 6 })
  .toFile(out);
```

If Bengali in the AI title is wrong, switch to **pipeline A** and overlay the header.

---

## End-to-end workflow (new lesson)

Example: adding images to lesson **2.11**.

### 1. Plan slugs and captions

| Point | Slug | Caption (example) |
|-------|------|-------------------|
| 1 | `foo_anatomy.webp` | Tool · Spec · Field term |
| … | … | … |
| myth | `foo_myth.webp` | Myth ✗ · Fact ✓ |

Use a consistent prefix per lesson (`clamp_`, `stick_`, `megger_`, `phase_`, `hyd_`, `toolcare_`, …).

### 2. Generate art

Create one PNG per slug (pipeline A or B). Keep source files outside git or in a local assets folder.

### 3. Build WebP

Run or adapt a local script (see **Example scripts**). Verify:

```powershell
# Expect 768px width, ~10–100 KB each
Get-ChildItem public/images/loader/foo_*.webp
```

Open 2–3 posters on a phone-sized viewport: title readable, illustration not cropped awkwardly.

### 4. Update JSON

Edit `public/quizzes/chapter_2_11.json` — add `image_name` and `image_caption` on each point + myth buster.

Fix any mixed-script typos in body text while editing (e.g. Tamil/Hindi characters in Bengali fields).

### 5. Generate Supabase migration

Pattern (`scratch/regen_lesson_*_sql.mjs`):

```js
import fs from 'fs';

const content = JSON.parse(fs.readFileSync('public/quizzes/chapter_2_11.json', 'utf8'));
const escaped = JSON.stringify(content).replace(/'/g, "''");

const sql = `-- … images for lesson 2.11 (bn)
UPDATE training_chapters
SET
  content = '${escaped}'::jsonb,
  version = COALESCE(version, 0) + 1
WHERE id = '2.11' AND language = 'bn';
`;

fs.writeFileSync('supabase/migrations/20260624260000_lesson_2_11_foo_images.sql', sql);
```

**Migration timestamp:** use `YYYYMMDDHHMMSS` after the latest lesson migration in `supabase/migrations/`.

### 6. Verify build

```bash
npm run build
```

### 7. Commit (images + JSON + SQL only)

Stage:

- `public/quizzes/chapter_2_11.json`
- `public/images/loader/foo_*.webp`
- `public/quizzes/faq_images/foo_*.webp`
- `supabase/migrations/20260624260000_lesson_2_11_foo_images.sql`

Do **not** commit `scratch/` (gitignored) or `.cursor` assets.

### 8. Deploy content

1. Push to `main` (static assets deploy with the app).
2. Run the new migration in **Supabase SQL Editor** (updates `training_chapters` for `id = '2.11'`, `language = 'bn'`).

---

## Example scripts (local, gitignored)

`scratch/` is in `.gitignore`. Copy these patterns into new scripts when needed.

### Header overlay builder (core pattern)

```js
import sharp from 'sharp';

const W = 768;
const HEADER_H = 92;
const BG = '#f5f0e8';

function headerSvg(totalH, titleBn, titleEn) {
  return `<svg width="${W}" height="${totalH}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${BG}"/>
    <text x="${W/2}" y="40" text-anchor="middle"
      font-family="Segoe UI, Nirmala UI, Arial, sans-serif"
      font-size="28" font-weight="700" fill="#1e3a5f">${titleBn}</text>
    <text x="${W/2}" y="68" text-anchor="middle"
      font-family="Segoe UI, Nirmala UI, Arial, sans-serif"
      font-size="16" font-weight="600" fill="#475569">${titleEn}</text>
    <line x1="64" y1="82" x2="${W-64}" y2="82" stroke="#cbd5e1" stroke-width="2"/>
  </svg>`;
}

// trim → crop top band → resize width 768 → composite header → webp
```

### Trim-only converter

```js
await sharp('assets/source.png')
  .trim({ threshold: 15 })
  .resize({ width: 768, withoutEnlargement: true })
  .webp({ quality: 84, effort: 6 })
  .toFile('public/images/loader/slug.webp');
```

### Batch regen SQL (multiple lessons)

See pattern in local `scratch/regen_lessons_2_8_9_10_sql.mjs`: fix JSON typos first, then `JSON.stringify` → escape `'` → `UPDATE training_chapters`.

---

## Lessons completed (reference)

| Lesson | Topic | Image prefix | Migration |
|--------|--------|--------------|-----------|
| 2.4 | Come-along clamp | `clamp_*` | `20260624190000_lesson_2_4_clamp_images.sql` |
| 2.5 | Hot stick | `stick_*` | `20260624200000_lesson_2_5_hot_stick_images.sql` |
| 2.6 | Cable skinning | `skin_*` | `20260624210000_lesson_2_6_skinning_images.sql` |
| 2.7 | Megger | `megger_*` | `20260624220000_lesson_2_7_megger_images.sql` |
| 2.8 | Phase sequence | `phase_*` | `20260624230000_lesson_2_8_phase_images.sql` |
| 2.9 | Hydraulic tools | `hyd_*` | `20260624240000_lesson_2_9_hydraulic_images.sql` |
| 2.10 | Tool care | `toolcare_*` | `20260624250000_lesson_2_10_toolcare_images.sql` |

Chapter **1.x** safety lessons use the same JSON fields and loader paths; earlier migrations live under `20260624120000`–`20260624180000`.

---

## GenerateImage prompt template

```
Clean textbook technical poster, cream #f5f0e8 background, mobile-focused landscape.
TOP 15% empty cream margin — NO text in that band.
Main illustration: [describe scene — tool, steps, comparison panels].
Minimal English field labels only inside the art: "[Label 1]" "[Label 2]".
Professional lineman training illustration, rich but not cluttered.
Do not use Bengali text in the image.
```

After generation, **always** add Bengali title via SVG overlay (pipeline A).

---

## Gotchas

1. **Garbled Bengali in AI art** — overlay header with Sharp; do not trust generator for Unicode titles.
2. **`scratch/` not in repo** — workflow lives in this guide; keep personal scripts locally or paste patterns from here.
3. **JSON vs Supabase** — editing JSON alone does not update production until the migration runs.
4. **Duplicate paths** — copy every loader WebP to `public/quizzes/faq_images/` with the same filename.
5. **SQL escaping** — single quotes in JSON must become `''` inside the migration string.
6. **Lesson 2.1 portrait** — only chapter using forced **768×1024** contain layout; other chapters use natural ~768×500 aspect.
7. **Build before commit** — run `npm run build` to ensure assets are present and paths valid.

---

## Checklist (copy for each lesson)

- [ ] Slugs planned; captions written
- [ ] WebP built at 768px width to `public/images/loader/`
- [ ] Mirror copied to `public/quizzes/faq_images/`
- [ ] `chapter_X_Y.json` updated with `image_name` + `image_caption`
- [ ] Supabase migration generated and reviewed
- [ ] `npm run build` passes
- [ ] Committed: JSON + webp + sql (not scratch/)
- [ ] Migration executed in Supabase SQL Editor after deploy
