# Lesson 6.1 — Field DTR Draft (Preview)

**Status:** Draft for review — JSON updated locally; **no Supabase SQL yet**.

**Local file:** `public/quizzes/chapter_6_1.json`

---

## Goal

Give linemen **simple field knowledge** plus a **visual mental model** of DTR internals, and teach how **external symptoms** map to **likely internal failure** (confirmed later by oil tests / shop forensics — IEEE C57.125, CIGRE TB 735, IEC 60599 / Duval).

**Lineman boundary:** Observe outside → report → arrange tests. **Do not** open tank on pole.

---

## What changed (vs production / old migration)

| Area | Before | After |
|------|--------|-------|
| Mission briefing | General anatomy + health signs | Emphasises **field patrol**, **reporting**, and **symptom → cause** reasoning |
| Section 1, point 2 | Long internal parts list in one slide | **External tour only** (tank, bushings, oil, conservator, breather, fins) |
| Section 1, point 3 | Troubleshooting (generic) | **Field troubleshooting** + `daily_check` on patrol |
| New section 2 | — | **Internal structure + failure recognition** (points 4–8) |
| Pro tips | Tap changer, Buchholz implied for all | **Nameplate photo**, **BDV/DGA**, **megger**; **small pole DTR has no Buchholz** |
| Myth buster | 2 myths | **3 myths** — adds "open tank in field" |
| Advanced | Vector group + Buchholz | Adds **DGA / Duval Triangle** + **forensic workflow** |

---

## Section outline

### Section 1 — শক্তির রূপান্তরকারী: গঠন ও কার্যকারিতা

1. **ট্রান্সফরমারের মূল মন্ত্র** — unchanged role; image `dtr61_basics.webp` (exists)
2. **বাইরের সফর** — external parts only; image `dtr61_parts.webp` (exists)
3. **বাইরের স্বাস্থ্য লক্ষণ** — patrol stethoscope; `daily_check` added; image `dtr61_health.webp` (exists)

### Section 2 — ভেতরের গঠন ও ব্যর্থতা চেনা (Field + Training)

4. **ভেতরের গঠন — ৬০ সেকেন্ডে** — core, HT/LT coils, paper insulation, oil; safety: no tank opening in field
5. **৬-পয়েন্ট DTR স্বাস্থ্য চেক** — field checklist (leak, level, silica, bushings, sound, nameplate photo)
6. **বাইরের লক্ষণ → ভেতরের কারণ** — symptom map (leak, pink gel, bad oil smell, crackling, hot spot)
7. **তাপীয় ক্ষতি (untanking)** — carbonised paper, top-heavy damage, dark oil
8. **আর্ক ও যান্ত্রিক ক্ষতি** — melted copper, interturn burn, deformed coil

---

## Images

### Keep (already in repo)

| Slug | Point |
|------|-------|
| `dtr61_basics.webp` | 1 |
| `dtr61_parts.webp` | 2 |
| `dtr61_health.webp` | 3 |
| `dtr61_myth.webp` | Myth buster |

### New (need generation)

| Slug | Point | Art brief |
|------|-------|-----------|
| `dtr61_cutaway.webp` | 4 (+ section hero) | Cutaway 11 kV DTR tank in oil: labelled **কোর**, **HT কয়েল**, **LT কয়েল**, **কাগজ ইনসুলেশন**, **তেল**. Training poster, cream #f5f0e8, Bangla labels. |
| `dtr61_field_walk.webp` | 5 | Lineman at pole-mounted DTR with 6 callouts: তেল দাগ, তেল লেভেল, সিলিকা জেল, বুশিং, শব্দ, নেমপ্লেট. |
| `dtr61_symptom_map.webp` | 6 | Simple flow: outside signs (leak / pink gel / smell / sound / heat) → likely inside cause → lineman action (report, test). |
| `dtr61_fail_thermal.webp` | 7 | Opened coil: **black/brown carbonised paper**, damage toward top of winding; shop/forensic context. |
| `dtr61_fail_arc.webp` | 8 | Melted/buckled conductor, local arc burn, mechanical deformation; shop context only. |

Follow [training-lesson-images.md](./training-lesson-images.md): 768px WebP, Sharp Bangla header, copy to `faq_images/`.

---

## References (content basis)

- **IEEE C57.125** — transformer failure investigation
- **CIGRE TB 735** — forensic examination
- **IEC 60599 / IEEE C57.104** — DGA; **Duval Triangle** (T1–T3 thermal, D1–D2 electrical)
- **CPRI** — Indian DTR short-circuit / dielectric failure case studies

---

## After your approval

1. Generate 5 new WebP posters
2. Create migration `supabase/migrations/YYYYMMDDHHMMSS_lesson_6_1_field_dtr.sql`
3. `npm run build` → commit JSON + images + SQL
4. Run migration in Supabase SQL Editor (`id = '6.1'`, `language = 'bn'`)

---

## Review questions

1. Is point 6 (symptom map) the right level of detail for linemen?
2. Points 7–8 (internal photos) — keep as "training/forensic awareness" or shorten?
3. Any WB-specific field steps to add to the 6-point checklist?
