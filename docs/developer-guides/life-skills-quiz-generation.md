# Life Skills Quiz Generation Guide

**Purpose:** Document the rules, structural schema, anti-cheating guidelines, and linguistic balance requirements for authoring and maintaining the **Life Skills (Supplementary) Quiz** JSON files.

---

## File Naming and Mapping Conventions

Each Life Skill supplementary module has an ID of the form `supp_10_N` (where `N` is the index, e.g., `supp_10_1` to `supp_10_13`).
The corresponding quiz file **must** be stored in the following path:
- **Path:** `public/quizzes/questions_supp_10_N.json`
- **Example mapping:** Module `supp_10_1` loads the quiz file `/quizzes/questions_supp_10_1.json`.

---

## Structural JSON Schema

Each quiz file is a JSON array containing exactly **5 multiple-choice questions**. The structure must follow this strict format:

```json
[
  {
    "questionText": "Bengali question text goes here?",
    "options": [
      "Incorrect option 1",
      "Correct option 2",
      "Incorrect option 3",
      "Incorrect option 4"
    ],
    "correctAnswerIndex": 1
  }
]
```

### Key Fields:
- `questionText`: The actual question written in clear, concise Bengali (focusing on field scenarios and practical situations).
- `options`: An array of exactly 4 choices.
- `correctAnswerIndex`: The 0-indexed position of the correct answer inside the `options` array (0, 1, 2, or 3).

---

## Anti-Cheating and Styling Guardrails (Linguistic Balance)

To prevent visual patterns from giving away the correct answer, follow these anti-cheating guardrails during question generation:

### 1. English Terms and Brackets Balance Rule (CRITICAL)
- **Problem:** If only the correct answer contains English terms or parenthesized translations (e.g., `টার্ম ইন্স্যুরেন্স (Term Life Insurance)`), the user can easily guess it without reading.
- **Solution:** 
  - **Option A:** Remove parenthesized English completely from the options if they can be written cleanly in Bengali (e.g., `নমিনেশন বা নমিনি`).
  - **Option B (Recommended for educational purposes):** If an English term or translation is helpful, **apply parenthesized English to ALL 4 options** to maintain styling symmetry.
  
  **Bad Example (Correct answer stands out):**
  ```json
  "options": [
    "টাকা ফেরত দেওয়ার সাধারণ প্ল্যান",
    "টার্ম ইন্স্যুরেন্স (Term Life Insurance)",
    "মিউচুয়াল ফান্ড বিনিয়োগ",
    "সোনার ওপর ঋণ যোজনা"
  ]
  ```

  **Good Example (Symmetrical and educational):**
  ```json
  "options": [
    "টাকা ফেরত দেওয়ার মানি-ব্যাক পলিসি (Money-Back Policy)",
    "টার্ম ইন্স্যুরেন্স (Term Life Insurance)",
    "শেয়ার মার্কেটে যুক্ত ইউলিপ প্ল্যান (ULIP Plan)",
    "সোনার ওপর ঋণ যোজনা (Gold Loan)"
  ]
  ```

### 2. Length Uniformity
- Make sure incorrect distractors are of a similar length to the correct answer. Do not write extremely long correct answers and short distractors.

### 3. Grammatical Cohesion
- Ensure all 4 options flow grammatically from the question's premise.

---

## Content Guidelines

Since Life Skills are focused on the safety and well-being of linemen beyond technical job functions, questions should emphasize:
- **Practical Field Safety:** E.g., silencing mobile phones before climbing poles or performing live line work to avoid sudden distractions.
- **Financial Survival:** Identifying predatory online loan apps, keeping bank nominations updated, and utilizing low-cost government insurances (PMJJBY, PMSBY).
- **Physical & Mental Health:** Understanding decompression rituals after work shift ends, identifying heatstroke and dehydration, and utilizing safe de-addiction resources.
- **Professional Ethics:** Rejecting illegal bribes or "tea-water" (বকশিস / চা-পানি) tips, and building additional income through legitimate, ethical side-gigs.

---

## Database and State Safety

- **No Supabase writes:** Since supplementary completion is stored locally on the client's `localStorage` via `supplementaryProgressStorage.js`, passing a supplementary quiz **must not** attempt to write points or progress to the remote database tables (`quiz_attempts` or `profiles`).
- **Callback handling:** Upon successful completion, the component must invoke `handleMarkSupplementaryRead(lessonId, { silent: false })` which issues a success notification to the user and stores the completion state locally.
- **Randomization:** The quiz engine automatically shuffles both the question order and the options within each question. Ensure the correct option maps precisely to the hardcoded `correctAnswerIndex` in the static JSON file.
