# Hourly Visual Quiz — Image Generation Guide

**Purpose:** Rules for **authoring** new hourly image quizzes (illustrations + Bengali options), especially **spot-the-mistake** packs. Runtime sheet merge, scoring, and migration live in [Hourly Visual Quiz](./hourly-visual-quiz.md).

---

## Product goal

Build lineman **everyday confidence**: wrong / missing PPE, wrong tool, damaged gear, unsafe practice. Images may be imperfect; **clarity** matters more than polish. Light humour and stick-man style are OK when they make the mistake obvious in 1–2 seconds.

---

## Image style

| Rule | Detail |
|------|--------|
| Clarity first | One primary mistake (or one clear question) per image |
| Style | Flat colors, thick outlines, stick-man / simple cartoon OK |
| Text on art | Prefer **no** letters, A/B labels, or written answers in the drawing |
| Background | Calm, uncluttered (pale cream / simple sky) |
| Aspect | Prefer **1:1** (mobile-friendly option grids and stems) |
| File size | Target **≤ 80 KB**, ideally **20–40 KB** WebP |
| Format | Save under `public/images/quizzes/` as `.webp` (or `.jpg` if needed) |
| Naming | Descriptive local names, e.g. `mistake_no_harness.webp`, `mistake_metal_ladder.webp` |

### Good subjects

- Height work without full-body harness
- Conductive / metal ladder near lines
- Damaged helmet, cut glove, frayed rope
- Missing earthing / shorting before work
- Wrong tester or tool for the job

### Avoid in the artwork

- Answer text drawn into the scene
- Multiple competing mistakes (hard to score fairly)
- Tiny details that disappear on a phone screen
- Huge photo-real files (compress / redraw simple)

### Optimize before commit

```bash
# Example: resize + WebP with sharp (if available in the project)
# Aim: max edge ~720px, quality ~70–75
```

---

## Question types (CSV)

Use only image types (same sheet contract as production):

| `question_type` | When to use |
|-----------------|-------------|
| `image_to_text` | One scene image; four **text** options (best for spot-the-mistake) |
| `text_to_image` | Text stem; four **image** options (pick the wrong / right scene) |

Required columns: see [Hourly Visual Quiz — Public contract](./hourly-visual-quiz.md#public-contract).

- `language` = `bn`
- `correct_index` = **0-based** (`0`…`3`)
- `enabled` = `TRUE` only when ready for the live sheet
- Draft IDs: use a clear prefix until finalized (e.g. `vq-mistake-01`), then renumber into the live `vq-###` sequence before paste

---

## Anti-cheat: options (CRITICAL)

Same spirit as Life Skills quizzes: **do not** let UI patterns reveal the answer.

### 1. Length balance

- All four options must be **similar length** (same sentence shape).
- Never make the correct option the only long, detailed explanation.

**Bad:** `হারনেস পরছেন না` vs three short “হ্যাঁ/না” style lines that are obviously filler.  
**Worse:** Correct option is a full sentence while others are two words.

**Good:** Four parallel phrases, e.g.  
`পজিশনিং বেল্ট নেই` / `ফুল-বডি হারনেস নেই` / `ডাবল ল্যানিয়ার্ড নেই` / `শক অ্যাবজরবার নেই`

### 2. Near-correct distractors

- Wrong options should be **plausible field mistakes** close to the truth, not cartoonishly wrong.
- Prefer the same category (all fall-protection gaps, all ladder hazards, all PPE items).
- Player must **match the image** (or apply a precise rule), not eliminate silly answers.

**Example — height / harness scene**

| Option | Role |
|--------|------|
| পজিশনিং বেল্ট নেই | Near miss |
| ফুল-বডি হারনেস নেই | Correct |
| ডাবল ল্যানিয়ার্ড নেই | Near miss (implies harness exists) |
| শক অ্যাবজরবার নেই | Near miss |

**Example — metal ladder near lines**

| Option | Role |
|--------|------|
| মইয়ের উচ্চতা বেশি | Near miss |
| পরিবাহী মই ব্যবহার | Correct |
| মইয়ের কোণ ভুল | Near miss |
| মইয়ের ধাপ ভাঙা | Near miss |

### 3. No stem / option answer leaks

- Do not put the correct wording in parentheses in the stem.
- Do not label diagram parts `A (হারনেস)` in options.
- After drafting, run `node scripts/maintenance/audit_visual_quiz_answer_leaks.mjs <your.csv>`.

### 4. Hints

- Teach the rule in `hint` without repeating the option letter or unique correct phrase only.
- Hints are for Admin preview / learning; keep stems fair without the hint.

### 5. Difficulty tags

- Spot-the-mistake and procedure packs often fit `medium` or `hard` in `tags`.
- Untagged visual rows behave as **easy** in hourly mixing — tag intentionally.

### 6. Bangla voice (West Bengal field)

- Prefer **spoken field Bangla**, not textbook phrasing.
- Keep common site words: শাট ডাউন, ক্লিয়ারেন্স, আর্থ-শর্ট, পারমিট, হারনেস, কোন, ফিডার, খুঁটি, লাইন চালু.
- Prefer natural verbs: চেক করা, বলে নেওয়া, বেঁধে রাখা, খুলে ফেলা — avoid stiff forms like “যাচাই করুন / বাধ্যতামূলক / ক্রমভঙ্গ” when a field phrase works.
- For dead-line checks use **লাইন ডেড আছে** (not “লাইন মরা আছে”).
- Keep all four options the same casual register (don’t make only the correct one formal).

---

## Draft files (before live sheet)

| Path | Role |
|------|------|
| `quiz_management/visual_quiz_batch_mistake_preview.csv` | Draft CSV for spot-the-mistake samples |
| `quiz_management/visual_quiz_mistake_preview.html` | Static HTML review (correct option highlighted) |
| `quiz_management/visual_quiz_batch_material_preview.csv` | Draft CSV for **material identification** samples |
| `quiz_management/visual_quiz_material_preview.html` | Static HTML review for material ID draft |
| `public/quiz_management/…` | Same files served for `npm run dev` / Admin preview |
| `public/images/quizzes/mistake_*.webp` | Spot-the-mistake illustration assets |
| `quiz_management/visual_quiz_batch_procedure_preview.csv` | Draft CSV for **procedure / workflow** field steps |
| `quiz_management/visual_quiz_procedure_preview.html` | Static HTML review for procedure draft |
| `public/images/quizzes/proc_*.webp` | Procedure-flow illustration assets |
| `quiz_management/visual_quiz_batch_ptr_parts_preview.csv` | Draft CSV for **PTR parts identification** (stickman points) |
| `quiz_management/visual_quiz_ptr_parts_preview.html` | Static HTML review for PTR parts draft |
| `public/images/quizzes/ptr_part_*.webp` | PTR part-pointing illustration assets |

Regenerate HTML after CSV edits (or edit HTML by hand for tiny drafts). With dev server:

`http://localhost:5173/quiz_management/visual_quiz_mistake_preview.html`

Admin → **Quiz Preview** → **Draft: Spot-the-mistake preview**, **Draft: Material identification**, **Draft: Procedure / workflow**, or **Draft: PTR parts identification**.

---

## Authoring workflow

1. Write a one-line scenario: mistake + safety lesson.
2. Create a simple illustration; export small WebP to `public/images/quizzes/`.
3. Draft CSV row(s) with balanced, near-correct options.
4. Review in HTML page **and/or** Admin Quiz Preview (correct answer is marked for reviewers only).
5. Run answer-leak audit on the draft CSV.
6. When approved: assign final `vq-###` ids, merge via finalize / paste into live sheet **quiz** tab (`gid=160776708`) — not the Safety Library **FileList** tab.
7. Validate local image paths after paste (`validate_visual_quiz_sheet.mjs`).

Do **not** paste draft rows into the live sheet until length, distractors, and image clarity pass review.

---

## Sheet reminder

The Google workbook has multiple tabs:

- **FileList** — Safety Library assets (not quiz rows)
- **quiz** — Hourly visual quiz CSV format (production)

Published quiz CSV: see `VISUAL_QUIZ_LIVE_CSV_URL` in `src/utils/visualQuizCsv.js`.

---

## Checklist before live paste

- [ ] Image clear on a phone; one main mistake
- [ ] WebP small enough (roughly ≤ 80 KB)
- [ ] Four options similar length and parallel structure
- [ ] Distractors near-correct (same topic family)
- [ ] Stem does not give away the answer
- [ ] Leak audit clean for new ids
- [ ] `correct_index` matches the intended option (0-based)
- [ ] Final `vq-###` id does not collide with sheet / Supabase

---

## Related guides

- [Hourly Visual Quiz](./hourly-visual-quiz.md) — runtime, sheet contract, migration, finalize
- [Life Skills Quiz Generation](./life-skills-quiz-generation.md) — anti-cheat patterns for text quizzes
- [Training lesson images](./training-lesson-images.md) — lesson posters (different pipeline)
