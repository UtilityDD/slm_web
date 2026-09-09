# Chapter 2 — হাতিয়ারের ওস্তাদ (Field Upgrade & Preview Guide)

**Status:** Completed & Ready for Review.
**Local JSONs:** `public/quizzes/chapter_2_1.json` through `chapter_2_10.json`.
**Supabase Migration:** `supabase/migrations/20260905140000_lesson_2_1_to_2_10_field_bangla_and_modern_tools.sql`.
**Preview Harness:** `http://localhost:5173/lesson-preview.html`.

---

## 1. Executive Summary of Improvements

All 10 lessons of Chapter 2 (**হাতিয়ারের ওস্তাদ - Master of Tools**) have undergone a comprehensive overhaul:

1. **Linguistic Authenticity ("মাঠের পোড়খাওয়া ওস্তাদ"):**
   - Eliminated textbook Sanskritized translations and dry English bullet points.
   - Adopted a warm, respectful brotherhood tone (**"লাইনম্যান ভাই"**, **"সাথী"**, **"ওস্তাদ"**).
   - Demystified technical principles with visceral everyday metaphors (e.g. *Ghost Voltage* as "ইন্ডাকশনের মায়ার ফাঁদ", *Cold Welding* as "চাপের মুখে ধাতু গলে এক হয়ে যাওয়া", *Airtight Crimping* as "অক্সাইড মরচে ও আগুনের টাইম বোমা নিষ্ক্রিয় করা").
   - 100% clean Unicode Bengali — zero foreign character leaks (fixed the Korean `추적` bug in 2.10).
   - Embedded interactive explanation chips `((chip_text|modal_title))` across all briefings, daily checks, and importance sections.

2. **Modern Practical Tools Integration:**
   - **2.1**: Non-Contact Voltage Detector (NCVD / AC সেন্সর পেন) & Ratchet Cable Cutters alongside VDE 1000V Pliers, Strippers, Screwdrivers, Spanners.
   - **2.2**: Digital Clamp Meter (টং টেস্টার) as the primary non-invasive field current measurement tool, LoZ ghost voltage suppression, CAT IV safety.
   - **2.3**: Bi-metallic (Al-Cu) lugs to prevent galvanic corrosion between ACSR and copper terminals, Anti-Oxidant Paste (Penetrox), full-cycle ratcheting crimpers.
   - **2.4**: Non-conductive synthetic webbing/strap pullers (spark-free near live lines), Chicago parallel jaw grips for ACSR/AAAC vs Haven's grips, dynamometer sag-tension.
   - **2.5**: Telescopic triangular fiberglass hot sticks (twist-free button locks), Shotgun clamp sticks for hotline clamps, universal heads for DO fuse & tree pruning.
   - **2.6**: Rotary/ratchet cable strippers, AB cable strippers, guided-shoe safety knife, pencil sharpening technique.
   - **2.7**: Auto-discharge digital meggers (500V–2500V), Clamp-on Earth Resistance Testers (measuring earth pit resistance without disconnecting the earth spike), PI/DAR timers.
   - **2.8**: Non-contact magnetic phase detector clipped over cable insulation, Motor rotation direction checker, R-Y-B phase swap rule.
   - **2.9**: 18V Cordless Li-Ion battery powered hydraulic crimpers & cutters (one-hand operation on pole), Pascal's law, split-head pump, automatic pressure release valve.
   - **2.10**: Tool tethering lanyards (pole-top fall prevention), dual-color VDE insulation check (red exterior over yellow core), dry silicone spray.

3. **Mobile-View Ergonomics & Poster Overhaul:**
   - Eliminated all **768×1024 tall portrait** cards (which swallowed 70%+ of mobile screens).
   - Replaced all primitive geometric SVG box drawings in 2.8, 2.9, and 2.10 with high-fidelity realistic equipment posters.
   - Standardized all 47 images to **768 px width × 433–546 px height** (aspect ratio 1.41 to 1.85).
   - Composited crisp Bengali header bands (`Nirmala UI, Segoe UI, Hind Siliguri`, 26px bold title + 15px subtitle + cream gap).
   - Dual-deployed to `public/images/loader/` and `public/quizzes/faq_images/`.

---

## 2. Lesson-by-Lesson Matrix

| Lesson | Title | Modern Equipment Featured | Image Poster Dimensions |
| :--- | :--- | :--- | :--- |
| **2.1** | লাইনম্যানের টুলবক্স ও ভোল্টেজ টেস্টার | VDE Pliers, Wire Stripper, Insulated Screwdrivers, Spanners, **NCVD AC Sensor Pen** | 768×546 WebP (Landscape) |
| **2.2** | ডিজিটাল ক্ল্যাম্প মিটার ও মাল্টিমিটার | **Digital Clamp Meter (Tong Tester)**, True-RMS, **LoZ Ghost Voltage Mode**, CAT IV | 768×546 WebP (Landscape) |
| **2.3** | ল্যাগস ক্রিম্পিং ও বাই-মেটালিক প্রযুক্তি | **Bi-Metallic (Al-Cu) Lugs**, **Anti-Oxidant Paste (Penetrox)**, Ratcheting Hex Crimper | 768×546 WebP (Landscape) |
| **2.4** | কাম-অ্যালং ও তার টানার কৌশল | **Chicago Parallel Jaw Grip**, **Synthetic Webbing Puller**, Dynamometer Sag-Tension | 768×546 WebP (Landscape) |
| **2.5** | অপারেটিং রড (হট স্টিক) ও লাইভ লাইন টুল | **Telescopic Triangular Stick**, **Shotgun Clamp Stick**, DO Fuse Prong Hook | 768×546 WebP (Landscape) |
| **2.6** | কেবল স্কিনিং ও নির্ভুল স্ট্রিপিং | **Rotary Cable Stripper**, **Guide-Shoe Safety Knife**, **AB Cable Stripping Pliers** | 768×546 WebP (Landscape) |
| **2.7** | ডিজিটাল মেগার ও আর্থ টেস্টার | **Digital Auto-Discharge Megger**, **Clamp-on Earth Resistance Tester**, PI/DAR | 768×546 WebP (Landscape) |
| **2.8** | ফেজ সিকোয়েন্স ও ঘূর্ণন নির্দেশক | **Non-Contact Magnetic Phase Detector**, Motor Rotation Checker, R-Y-B Swap | 768×433–509 WebP (Landscape) |
| **2.9** | কর্ডলেস ব্যাটারি ও হাইড্রোলিক ক্রিম্পার | **18V Cordless Li-Ion Crimper & Cutter**, Split-Head Remote Pump, Hex Dies | 768×472–508 WebP (Landscape) |
| **2.10** | হাতিয়ারের যত্ন ও টেথারিং সুরক্ষা | **Tool Tethering Lanyards (Fall Protection)**, Dual-Color VDE Check, Silicone Spray | 768×416–520 WebP (Landscape) |

---

## 3. How to Use the Interactive Preview Option

### Method A: Standalone Mobile Preview Harness (Recommended)
Open your browser to:
```
http://localhost:5173/lesson-preview.html
```
Features:
- **Lesson Selector:** Instantly jump to any lesson (2.1 to 2.10) with one click.
- **Mobile Device Frame Simulator:**
  - `iPhone SE (375px)`
  - `Standard Mobile (390px)`
  - `Android Flagship (412px)`
  - `Tablet (768px)`
  - `Fluid (100%)`
- **Interactive Verification:**
  - Tap any `((chip))` to test interactive explanation popups.
  - Tap any poster image to test the full-screen zoom modal.
  - Test slide progression, guided point navigation, and myth buster checks without any gate locks.
- **Image Audit Tab:** View all 47 posters in a responsive grid with direct links and captions.
- **Raw JSON Tab:** Review and copy the underlying JSON payload directly.

---

## 4. Verification & Production Deployment

### Local Automated Verification
```bash
# 1. Verify JSON syntax & image asset existence
node scratch/verify_chapter_2_integrity.mjs

# 2. Verify zero foreign characters
node -e "for(let i=1;i<=10;i++){const r=fs.readFileSync('public/quizzes/chapter_2_'+i+'.json','utf8');const m=r.match(/[\uAC00-\uD7A3\u0B80-\u0BFF\u0400-\u04FF]|[\u0900-\u0963\u0966-\u097F]/g);if(m)console.log('Foreign:',m);else console.log('2.'+i+': 100% clean');}"

# 3. Production build test
npm run build
```

### Deploy to Production (Supabase)
Run the generated migration script in the **Supabase SQL Editor**:
```
supabase/migrations/20260905140000_lesson_2_1_to_2_10_field_bangla_and_modern_tools.sql
```
This updates all 10 records in `training_chapters` for `language = 'bn'`, increments `version`, and takes immediate effect for all active PWA users.
