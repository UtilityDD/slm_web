# Chapter 6 Quiz Cleanup Log

Date: 2026-07-25

## Critical

- **6.4 AB Switch / Isolator:** `questions_6_4.json` was identical to `questions_6_3.json` (HRC fuse) for Q1–20, plus 2 weather extras.
- **Action:** Fully rebuilt 20 questions from `chapter_6_4.json` (off-load rule, operate order, gang/tilting, interlocking, arcing horn).

## Weather → `questions_1_9.json`

- **6.1:** rain bushing touch; wet hand-tools (dup)
- **6.5:** rain drum drag; insulator rain/dust pollution; lightning step potential (dup)
- **6.6:** instinct stop-work (dup)
- **6.9:** lightning vs rubber gloves (dup)
- **6.11:** storm gantry/earth wire; outdoor stop in rain; weather worsens mid-repair (dups)

## Kept (task-related)

- **6.1:** standing on transformer top cover
- **6.5:** rain moisture kills UG joint
- **6.6:** storm abrasion on AB PVC
- **6.9:** rain in open LT pillar
- **6.11:** rain lowering earth-pit resistance

## Run log

- REBUILT questions_6_4.json → 20 (was fuse-copy of 6.3 + weather extras)
- MOVED → 1_9 (now 82): বৃষ্টির সময় খোলা জায়গায় থাকা কোনো ট্রান্সফরমারের বুশিং স্পর্
- SKIP dup → 1_9: বৃষ্টির সময় হ্যান্ড-টুলস (যেমন প্লায়ার্স বা স্ক্রু-ড্রাইভার)
- UPDATED questions_6_1.json → 21 (was 23)
- MOVED → 1_9 (now 83): বৃষ্টির সময় কেবিল ড্রাম বা কন্ডাক্টর তার মাটিতে টেনে নিয়ে যা
- SKIP dup → 1_9: বৃষ্টির জল এবং বাতাসে থাকা ধূলিকণা একসাথে মিশে ইনসুলেটরের ওপ
- SKIP dup → 1_9: বজ্রপাত কাছাকাছি মাটিতে আঘাত হানলে যে 'স্টেপ পটেনশিয়াল' (Ste
- UPDATED questions_6_5.json → 22 (was 25)
- SKIP dup → 1_9: যদি আপনার মনের ভেতর থেকে প্রবৃত্তি (Instinct) বলে যে পরিস্থি
- UPDATED questions_6_6.json → 21 (was 22)
- SKIP dup → 1_9: বজ্রপাতের সময় সাধারণ লাইনম্যানের ব্যবহৃত রাবারের গ্লাভস বা জ
- UPDATED questions_6_9.json → 21 (was 22)
- MOVED → 1_9 (now 84): ঝড়ের সময় প্রবল বাতাসে কোনো সাব-স্টেশনের লাইটিং গ্যান্ট্রি বা
- SKIP dup → 1_9: বৃষ্টি শুরু হওয়ার সাথে সাথে আউটডোর সাব-স্টেশনে কোন ধরনের কাজ
- SKIP dup → 1_9: কোনো জরুরি ফল্ট মেরামতের সময় যদি আবহাওয়া হঠাৎ আরও খারাপ হয়, 
- UPDATED questions_6_11.json → 21 (was 24)

## Final counts

- 6.1: 21 — FIXED
- 6.2: 20 — ON-TOPIC
- 6.3: 20 — ON-TOPIC
- 6.4: 20 — REBUILT
- 6.5: 22 — FIXED
- 6.6: 21 — FIXED
- 6.7: 21 — ON-TOPIC
- 6.8: 20 — ON-TOPIC
- 6.9: 21 — FIXED
- 6.10: 20 — ON-TOPIC
- 6.11: 21 — FIXED
