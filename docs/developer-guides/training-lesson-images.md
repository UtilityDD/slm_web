# Training lesson images — developer guide

**Purpose:** Document how to **author, generate, wire up, and deploy** mobile-friendly poster images for **core Training lessons** (chapter JSON under `public/quizzes/chapter_*_*.json`): **realistic equipment** art, **mostly Bangla** labels, WebP output, and Supabase migrations.

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
  "image_caption": "R-Y-B ক্রম · ঘড়ির কাঁটার দিক",
  "specifications": "…"
}
```

Add to **`myth_buster`** when the myth slide needs art:

```json
"myth_buster": {
  "title": "মিথ বাস্টার (Myth Buster)",
  "image_name": "/images/loader/phase_myth.webp",
  "image_caption": "পরীক্ষা করুন ✓ · অনুমান ✗",
  "myths": [ … ]
}
```

**Conventions**

- **`image_name`:** always `/images/loader/<slug>.webp` (leading slash, loader path).
- **`image_caption`:** short **mostly Bangla** line under the figure; keep English only for standard field acronyms (`kV`, `HT`, `LT`, `ACSR`, `DTR`, `SLD`, etc.).
- **One image per guided step** — matches `sectionGuidedStepDone` flow (see lesson reader guide).
- Typical count: **3–4 section points + 1 myth buster** per lesson (skip a point if no realistic art is possible — text-only slide is OK).

---

## Design standards (mobile textbook posters)

Lessons **2.4–2.10** and **3.1–3.10** established this look:

| Rule | Value |
|------|--------|
| Width | **768 px** max (natural height) |
| Format | **WebP** quality ~84–86 |
| Background | Cream `#f5f0e8` |
| Title band | **Bengali** title + **Bengali** subtitle via Sharp SVG overlay (see header pipeline) |
| Labels in art | **Mostly clean Bangla** (Unicode); English only for acronyms/units (`11kV`, `415V`, `kWh`, `GI`) |
| Subject | **The actual lesson item or equipment** — must look like the real field object, not a generic icon |
| Style | Realistic lineman training poster — photo-real or high-fidelity technical illustration on cream card |
| Real photos | **Preferred** when a good field photo exists (e.g. come-along clamp, pin insulator on pole) |

**Realism rules (equipment must match the lesson point)**

- Read the **Supabase** `training_chapters.content` for the lesson (not stale local JSON).
- Each poster depicts **one** `item_name` topic: the exact tool, insulator, fuse, transformer part, guard wire setup, etc.
- Show **correct proportions, materials, and mounting** (e.g. DO fuse on cross-arm, disc string on tower, cradle guard under road crossing).
- Use **Indian/WB distribution context** where relevant (PCC pole, 11 kV DTR, LT feeder pillar).
- **Do not** invent rare variants (e.g. cage guarding on vertical LT) if the field photo reference is weak — leave that point **text-only**.

**Bangla label rules**

| Where | Language |
|--------|----------|
| Header band (Sharp overlay) | **Bangla title + Bangla subtitle** — always |
| Short callout labels inside art | **Bangla** (2–4 words max per label) |
| Units / codes in art | English OK: `11kV`, `415V`, `HT`, `LT`, `ACSR`, `kWh` |
| `image_caption` in JSON | Mostly Bangla · acronyms where needed |
| Long sentences in art | **Never** — garbled by AI; keep in lesson body text |

**Avoid**

- Generic clip-art that does not match the named equipment.
- Fantasy or wrong anatomy (wrong insulator type, fuse shape, transformer layout).
- Long Bengali paragraphs baked into AI art.
- Plain SVG box diagrams only (readable but weak for learners).
- Forced portrait **768×1024** except lesson **2.1** toolbox (special case).

---

## Pipelines (pick one per image)

### A — Realistic poster + Bangla header overlay (recommended)

Used for lessons **2.5–2.10**, **3.1–3.10**, **4.1–4.5**, and all new chapters.

1. **Plan from lesson content** — one slug per `item_name`; list 2–4 Bangla label strings before generating.
2. **Generate illustration** (Cursor GenerateImage or similar):
   - Cream `#f5f0e8` background, mobile landscape.
   - **Leave top ~15% empty** — header text is added later by Sharp.
   - **Realistic equipment** matching the lesson item (see prompt template below).
   - **Short Bangla labels** inside the art for parts/steps (verify script in preview; regenerate if garbled).
   - Save PNG locally (e.g. `scratch/art_<lesson>/slug.png`).
3. **Post-process with Sharp** (`scratch/build_chapter_*_posters.mjs` pattern):
   - `trim({ threshold: 15–18 })`
   - Crop ~8–11% from top (removes accidental AI title band)
   - `resize(768, null, { fit: 'inside' })`
   - Composite **SVG header** with **Bangla title + Bangla subtitle** (`Nirmala UI`, `Segoe UI`)
   - Export WebP to `public/images/loader/` and copy to `faq_images/`

**Header vs in-art Bangla**

- **Header (Sharp):** main title and subtitle — always Bangla; 100% reliable.
- **In-art labels (AI):** use for part names (`বুশিং`, `ফিউজ ব্যারেল`, `বাসবার`) — keep to 2–4 short labels; regenerate if conjuncts break.
- **Fallback:** if Bangla in art is garbled after 2 tries, use **English acronyms only** in art and put full Bangla in header + `image_caption`.

### B — Real photo + poster frame (best realism)

Use when a **field photo** of the exact item exists under `public/quizzes/faq_images/` or `public/images/quizzes/`.

1. Crop/trim photo; show the **actual equipment** (not a similar substitute).
2. Add Bangla title + Bangla subtitle via SVG composite on cream card.
3. Optional: add 2–3 Bangla callout labels via Sharp SVG (more reliable than AI text).
4. Export WebP to loader + faq paths.

Example: **2.4** `clamp_anatomy.webp` from `come_along_clamp.png`.

### C — AI poster + trim only (legacy)

Early lessons **2.2–2.3**, **2.5–2.7** first pass. Prefer **pipeline A or B** for new work.

```js
await sharp(src)
  .trim({ threshold: 15 })
  .resize({ width: Math.min(width, 768), withoutEnlargement: true })
  .webp({ quality: 84, effort: 6 })
  .toFile(out);
```

If Bangla in the AI title is wrong, switch to **pipeline A** and overlay the header.

---

## End-to-end workflow (new lesson)

Example: adding images to lesson **2.11**.

### 1. Plan slugs and captions

| Point | Slug | Caption (example — mostly Bangla) |
|-------|------|-----------------------------------|
| 1 | `foo_anatomy.webp` | `বাসবার · ফিউজ · নিউট্রাল লিঙ্ক` |
| … | … | … |
| myth | `foo_myth.webp` | `ভুল ✗ · সঠিক ✓` |

Use a consistent prefix per lesson (`clamp_`, `stick_`, `cond_`, `dtr_`, `guard_`, …).

**Before generating:** confirm the item exists in **Supabase** lesson text and you can describe the **real** object (photo reference, field memory, or manufacturer shape).

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

function headerSvg(totalH, titleBn, titleSub) {
  return `<svg width="${W}" height="${totalH}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${BG}"/>
    <text x="${W/2}" y="42" text-anchor="middle"
      font-family="Nirmala UI, Segoe UI, Arial, sans-serif"
      font-size="26" font-weight="700" fill="#1e3a5f">${titleBn}</text>
    <text x="${W/2}" y="72" text-anchor="middle"
      font-family="Nirmala UI, Segoe UI, Arial, sans-serif"
      font-size="16" font-weight="600" fill="#475569">${titleSub}</text>
    <line x1="64" y1="86" x2="${W-64}" y2="86" stroke="#cbd5e1" stroke-width="2"/>
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
| 3.1–3.5 | Conductors, insulators, hardware | `cond_*`, `insul_*`, … | `20260628120000_lesson_3_1_to_3_5_images.sql` |
| 3.6–3.10 | DTR, LT box, service, guard, SLD | `dtr_*`, `ltbox_*`, … | `20260628130000_lesson_3_6_to_3_10_images.sql` |
| 4.1–4.5 | Insulator replace, jumper, service, DO fuse, DTR check | `ins_*`, `jump_*`, `conn_*`, `dofop_*`, `dtrchk_*` | `20260628140000_lesson_4_1_to_4_5_images.sql` |
| 5.1–5.3 | Line trip response, patrolling, common faults | `trip_*`, `patrol_*`, `fault_*` | `20260628150000_lesson_5_1_to_5_3_images.sql` |
| 6.1 | Distribution transformer (DTR) | `dtr61_*` | `20260628160000_lesson_6_1_dtr_images.sql` |
| 6.2–6.3 | Circuit breaker, fuse types | `cb62_*`, `fuse63_*` | `20260628170000_lesson_6_2_to_6_3_images.sql` |
| 6.4–6.6 | AB switch, UG cable, AB cable | `abs64_*`, `ug65_*`, `abc66_*` | `20260628180000_lesson_6_4_to_6_6_images.sql` |

Chapter **1.x** safety lessons use the same JSON fields and loader paths; earlier migrations live under `20260624120000`–`20260624180000`.

---

## GenerateImage prompt template

Use this for **pipeline A**. Replace bracketed parts from the lesson `item_name` and `specifications`.

```
Realistic lineman training poster, cream #f5f0e8 background, mobile landscape.
TOP 15% empty cream margin — NO title text in that band (header added later).

Subject (must look like real field equipment):
[Exact item from lesson — e.g. "11kV distribution transformer on PCC pole with HT bushings,
conservator drum, silica gel breather" OR "drop-out fuse on cross-arm in open position"]

Realism: accurate shape, material, scale, and mounting for Indian/WB overhead distribution.
Photoreal or high-fidelity technical illustration — NOT generic clip-art or cartoon.

Bangla labels (clean Unicode, 2–4 words each, legible):
"[বাংলা লেবেল ১]" "[বাংলা লেবেল ২]" "[বাংলা লেবেল ৩]"
English OK only for units/codes: 11kV, 415V, HT, LT, kWh, ACSR, GI.

Layout: one clear hero subject; comparison/myth panels only when the lesson needs them.
No long sentences. Not cluttered.
```

**After generation**

1. Check Bangla labels in preview — regenerate if script is broken.
2. **Always** composite Bangla title + subtitle via Sharp header (pipeline A).
3. Set `image_caption` in JSON to mostly Bangla.

**Example labels by topic**

| Topic | Bangla labels in art |
|--------|----------------------|
| DO fuse | `ফিউজ ব্যারেল`, `ইনসুলেটর`, `ড্রপ-আউট` |
| Pin insulator | `পিন`, `পেটিকোট`, `বাইন্ডিং তার` |
| DTR | `HT বুশিং`, `LT বুশিং`, `কনজারভেটর`, `ব্রিদার` |
| Cradle guard | `লাইভ তার`, `গার্ড তার`, `রাস্তা` |

---

## Gotchas

1. **Wrong or unrealistic equipment** — if AI art does not match the real item (e.g. cage guarding on vertical LT), **drop the image** for that point; text-only is better than misleading art.
2. **Garbled Bangla in AI art** — use short labels only; regenerate twice, then fall back to Sharp header + English acronyms in art.
3. **Header always Bangla** — title band via Sharp is mandatory; never rely on AI for the main title.
4. **Read Supabase first** — `training_chapters.content` is source of truth for lesson text before planning slugs.
5. **`scratch/` not in repo** — workflow lives in this guide; keep personal scripts locally or paste patterns from here.
6. **JSON vs Supabase** — editing JSON alone does not update production until the migration runs.
7. **Duplicate paths** — copy every loader WebP to `public/quizzes/faq_images/` with the same filename.
8. **SQL escaping** — single quotes in JSON must become `''` inside the migration string.
9. **Lesson 2.1 portrait** — only chapter using forced **768×1024** contain layout; other chapters use natural ~768×500 aspect.
10. **Build before commit** — run `npm run build` to ensure assets are present and paths valid.

---

## Checklist (copy for each lesson)

- [ ] Lesson content read from **Supabase** (`training_chapters`, `language = 'bn'`)
- [ ] Each slug maps to a **real** item/equipment from `item_name`
- [ ] Unrealistic points skipped (text-only, no `image_name`)
- [ ] Slugs planned; **mostly Bangla** captions written
- [ ] Art: realistic equipment + short Bangla labels (or real photo pipeline B)
- [ ] Bangla title + subtitle overlaid in header band (Sharp)
- [ ] WebP built at 768px width to `public/images/loader/`
- [ ] Mirror copied to `public/quizzes/faq_images/`
- [ ] `chapter_X_Y.json` updated with `image_name` + `image_caption`
- [ ] Supabase migration generated and reviewed
- [ ] `npm run build` passes
- [ ] Committed: JSON + webp + sql (not scratch/)
- [ ] Migration executed in Supabase SQL Editor after deploy
