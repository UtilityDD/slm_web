# Lineman-Friendly Bangla Style Guide for Training Lessons

This guide defines the linguistic principles, voice, tone, and field vocabulary for authoring and revising training lessons across **SmartLineman**.

---

## 1. Core Philosophy: Why "Field Bangla"?

Linemen working across West Bengal (WBSEDCL, power contractors, rural distribution) do not speak or absorb textbook Sanskritized Bengali while reading on mobile screens between field jobs. 

* **The Goal:** Safety education must connect instantly, hit hard emotionally, and leave no room for ambiguity.
* **The Persona:** A seasoned, caring senior lineman or mentor (**"মাঠের পোড়খাওয়া ওস্তাদ"**) speaking directly to his younger teammates, helpers, and brothers.
* **The Mission:** Move from academic translation to **authentic field culture** that saves lives on the pole.

---

## 2. Voice and Tone Principles

1. **Direct & High-Impact Safety Warnings:**
   * *Avoid:* "পিপিই ব্যবহার না করা অনিরাপদ।" (Passive, weak)
   * *Adopt:* "পিপিই ছাড়া পোলে ওঠা মানে জেনেশুনে আত্মঘাতী হওয়া। হিরো সাজতে গিয়ে জিরো হবেন না!" (Punchy, memorable)

2. **Respectful Yet Brotherly Brotherhood:**
   * Address the reader as a fellow worker (**"লাইনম্যান ভাই"**, **"সাথী"**, **"ওস্তাদ"**).
   * Maintain serious respect for the danger of electricity while keeping the phrasing warm and conversational.

3. **Demystify Technical Jargon with Everyday Metaphors:**
   * Technical terms should be introduced alongside relatable mechanical or daily-life analogies:
     * **Dielectric Strength (ডাই-ইলেকট্রিক ক্ষমতা):** Compare to a *মাটির তৈরি জলের বাঁধ* (when water pressure exceeds the limit, the dam bursts and current floods in).
     * **Shock Absorber Lanyard:** Compare to a *বাইকের শক-অ্যাবজরবার* (dampens the sudden jerk to save the spine).
     * **HRC Fuse Quartz Sand:** Compare to *বালুর বস্তা দিয়ে আগুনের লেলিহান শিখা ভেতরেই চেপে ধরা*.

4. **Preserve Real Field English/Acronyms in Bengali Script:**
   * Field workers say **শাটডাউন, জাম্পার, কন্ডাক্টর, ট্রান্সফরমার, ফিউজ, নাট-বোল্ট, ক্ল্যাম্প, প্লায়ার্স, টেস্টিং, স্পার্ক**. Do not invent awkward pure Bengali substitutes for universally recognized trade terms.

---

## 3. Field Vocabulary & Translation Glossary

| Textbook / Academic Bangla | Recommended Field-Friendly Bangla | Context / Reason |
|:---|:---|:---|
| আপনার যুদ্ধের বর্ম | নিজের সুরক্ষা কবচ / জীবন বাঁচানোর ঢাল | More relatable to power linemen than military armor. |
| বিচ্ছিন্নকরণ / আইসোলেট করা | শাটডাউন নিয়ে লাইন সম্পূর্ণ আলাদা (আইসোলেট) করা | Ground reality: Linemen work on PTW/shutdowns. |
| সাসপেনশন | ভেতরের জালি (Suspension) | Linemen call the internal helmet harness "জালি". |
| চিন স্ট্র্যাপ | থুতনির ফিতে (চিন স্ট্র্যাপ) | Everyday vernacular for field helmets. |
| কোমর বন্ধনী | কোমর-রশা (Waist Belt) | The historical tool is widely known as "কোমর-রশা". |
| সিন্থেটিক বস্ত্র | পলিয়েস্টার বা সিন্থেটিক গেঞ্জি/শার্ট | Linemen often wear cheap polyester jerseys in summer heat. |
| আর্কিং / ফ্ল্যাশ ওভার | আর্কিং ফ্ল্যাশ বা আগুনের তীব্র ঝিলিক | Describes the visual explosion of molten flash. |
| ফল-অ্যারেস্ট | ওপর থেকে পড়ে ঝুলে যাওয়া (Fall Arrest) | Explains the physical event clearly. |
| ইন্ডাকশন ভোল্টেজ | ব্যাকফিডিং বা ইন্ডিউসড কারেন্ট | Explains unexpected dead-line energization hazards. |
| মেগার / রেজিস্ট্যান্স পরিমাপক | আর্থ টেস্টার বা মেগার | The physical instrument used in substations and pits. |

---

## 4. Structure of a Training Lesson

Every lesson JSON (`public/quizzes/chapter_X_Y.json`) and its matching DB entry in `training_chapters` consists of 5 core sections:

```
┌─────────────────────────────────────────────────────────┐
│ 1. mission_briefing   (The High-Stakes Field Hook)       │
├─────────────────────────────────────────────────────────┤
│ 2. pro_tip            (4–5 Memorable Field Aphorisms)   │
├─────────────────────────────────────────────────────────┤
│ 3. sections[].points  (Actionable Equipment/Method Breakdown)│
│    ├─ importance      (Why it matters to your body)     │
│    ├─ daily_check     (10-second touch/visual test)     │
│    └─ specifications  (IS/CEA standards + practical rule)│
├─────────────────────────────────────────────────────────┤
│ 4. myth_buster        (Debunking Real CCC/Field Excuses)│
├─────────────────────────────────────────────────────────┤
│ 5. advanced_section   (Simplified Engineering Science)  │
└─────────────────────────────────────────────────────────┘
```

### Writing Rules by Section

#### A. `mission_briefing`
* Must open with a high-voltage truth: *"বিদ্যুৎ কাউকে চেনে না—না নতুন হেল্পারকে, না ৩০ বছরের পোড়খাওয়া ওস্তাদকে!"*
* Frame the lesson as an essential skill that separates a careless technician from an elite **"প্রো লাইনম্যান"**.
* Embed interactive explanation chips using `((chip_text|modal_title))` for deeper facts.

#### B. `pro_tip`
* Use punchy, proverb-like titles:
  * `১. আগে জান (জীবন), তারপর কাজ`
  * `২. মনে খটকা মানেই বাতিল`
  * `৩. নিজের সুরক্ষা নিজের হাতে`
  * `৪. তেল-কালি মুক্ত রাখুন`
  * `৫. মেয়াদ ও স্ট্যাম্প দেখুন`

#### C. `sections[].points`
1. **`importance`**: Describe direct physical consequences (e.g. synthetic melting into skin, waist belt rupturing internal organs, pinhole in rubber glove acting like a bullet).
2. **`daily_check`**: Give an immediate physical action the lineman can do with hands/eyes (e.g., blowing air into gloves for leak test, inspecting boot soles for embedded nails/wires).
3. **`specifications`**: State the Indian Standard (IS) code or CEA rule, followed by the plain visual identification rule (e.g., non-vented vs vented helmets, 100% cotton full-sleeve).

#### D. `myth_buster`
* Focus on real field excuses:
  * *"বাপ-দাদারা তো কোমর রশা দিয়েই জীবন কাটিয়ে দিল..."*
  * *"লাইন তো শাটডাউন করাই আছে, গ্লাভস আর কী কাজে লাগবে..."*
  * *"ফিউজ বারবার কাটছে, তারটা একটু মোটা করে বেঁধে দিই..."*
* Give crisp, unarguable field logic in the `reality` field.

#### E. `advanced_section`
* Demystify electrical and mechanical engineering topics:
  * Use everyday physical analogs (water piping, bicycle suspensions, pressure relief valves).
  * Avoid dry formulas unless followed by an intuitive takeaway.

---

## 5. Dual-Sync Update Workflow

Whenever lesson text is revised or added, both the local PWA static bundle and the Supabase database must be kept in sync:

1. **Update Local JSON:**
   Modify `public/quizzes/chapter_<chapter>_<section>.json`.
   Ensure valid JSON formatting and test that local asset paths (`/images/loader/...`) remain intact.

2. **Generate Database Migration SQL:**
   Create a migration in `supabase/migrations/<YYYYMMDDHHMMSS>_lesson_<chapter>_<section>_<slug>.sql`.
   Use PostgreSQL dollar-quoting (`$json$...$json$::jsonb`) to prevent quote-escaping syntax errors:

   ```sql
   -- Lesson X.Y Update: Lineman-friendly field Bangla tone
   UPDATE training_chapters
   SET
     content = $json${
       "pro_tip": { ... },
       "level_id": "X.Y",
       "sections": [ ... ],
       "badge_name": "...",
       "level_title": "...",
       "myth_buster": { ... },
       "advanced_section": { ... },
       "mission_briefing": "..."
     }$json$::jsonb,
     version = COALESCE(version, 0) + 1
   WHERE id = 'X.Y' AND language = 'bn';
   ```

3. **Verify Build & Integrity:**
   * Run `npm run build` to ensure no bundling or asset resolution warnings.
   * Run `git status` to verify modified files.

---

## 6. Checklist for Reviewing Future Lessons

Before approving updates to any lesson, run through this quick checklist:

- [ ] Is the language free of unnatural literal translations (e.g., "যুদ্ধের বর্ম")?
- [ ] Are common field tools and components called by their real trade names (জাম্পার, কন্ডাক্টর, শাটডাউন, ফিউজ)?
- [ ] Are safety consequences described in terms of real human impact (পঙ্গুত্ব, বার্ন, শক, আর্কিং)?
- [ ] Are actionable daily tests explained step-by-step (যেমন: এয়ার টেস্ট, বুট সোলের পেরেক চেক)?
- [ ] Does `public/quizzes/chapter_X_Y.json` match the Supabase SQL migration byte-for-byte?
- [ ] Does the JSON compile without trailing commas or broken quote marks?
