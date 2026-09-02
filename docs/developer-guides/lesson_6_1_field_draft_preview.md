# Lesson 6.1 — Field DTR (Shipped)

**Status:** Shipped in **v1.3.145** (PWA). Supabase migration **`20260902120000_lesson_6_1_field_dtr.sql`** applied by author.

**Local JSON:** `public/quizzes/chapter_6_1.json`

---

## Goal

Give linemen **simple field knowledge** plus a **visual mental model** of DTR internals, and teach how **external symptoms** map to **likely internal failure** (confirmed later by oil tests / shop forensics — IEEE C57.125, CIGRE TB 735, IEC 60599 / Duval).

**Lineman boundary:** Observe outside → report → arrange tests. **Do not** open tank on pole.

---

## Structure (matches standard lesson JSON contract)

| Field | Lesson 6.1 usage |
|--------|------------------|
| `mission_briefing` | Colloquial Bengali; field patrol + reporting focus |
| `sections[].points[]` | 8 guided steps across 2 sections |
| `image_name` / `image_caption` | On each point + myth buster; section 2 also has section hero |
| `importance` / `daily_check` / `safety_tip` | Same pattern as other chapter 6 lessons |
| `((detail\|label))` chips | Long explanations in click-to-open hints (see [training-lesson-reader.md](./training-lesson-reader.md)) |
| `pro_tip` / `myth_buster` / `advanced_section` | Unchanged top-level keys |

No changes to `Training.jsx`, quiz logic, Supabase RPCs, or calculation code.

---

## Section outline

### Section 1 — শক্তির রূপান্তরকারী: গঠন ও কার্যকারিতা (3 points)

1. DTR basics — `dtr61_basics.webp`
2. External tour — `dtr61_parts.webp`
3. Field health signs — `dtr61_health.webp`

### Section 2 — ভেতরের গঠন ও ব্যর্থতা চেনা (5 points + section hero)

4. Internal structure (60 sec) — `dtr61_cutaway.webp` — **3-limb core-type DTR**, LT coil inside HT coil
5. 6-point field checklist — `dtr61_field_walk.webp`
6. Symptom → cause map — `dtr61_symptom_map.webp`
7. Thermal failure (shop) — `dtr61_fail_thermal.webp`
8. Arc / mechanical failure (shop) — `dtr61_fail_arc.webp`

Myth buster — `dtr61_myth.webp` (unchanged)

---

## Images shipped

| Slug | Poster size (after trim) | Notes |
|------|--------------------------|-------|
| `dtr61_cutaway.webp` | 768×650 | 3-limb concentric winding cutaway |
| `dtr61_field_walk.webp` | 768×674 | 6 patrol callouts |
| `dtr61_symptom_map.webp` | 768×552 | Outside → inside flow |
| `dtr61_fail_thermal.webp` | 768×549 | Carbonised paper |
| `dtr61_fail_arc.webp` | 768×674 | Melted copper / deformed coil |

Build script: `scratch/build_chapter_6_1_posters.mjs` — trims AI cream padding before Sharp header composite (fixes mobile blank space below art).

---

## Deploy checklist (done)

- [x] JSON updated (`public/quizzes/chapter_6_1.json`)
- [x] 5 new WebP posters → `public/images/loader/` + `public/quizzes/faq_images/`
- [x] Migration `supabase/migrations/20260902120000_lesson_6_1_field_dtr.sql`
- [x] Supabase SQL run by author
- [x] PWA bump `1.3.145` — **no** `android-latest.json` / APK changes
- [x] `npm run build` → Vercel prod

---

## References

- **IEEE C57.125** — transformer failure investigation
- **CIGRE TB 735** — forensic examination
- **IEC 60599 / IEEE C57.104** — DGA; Duval Triangle
- **CPRI** — Indian DTR failure case studies
