# Audio Script Generation Guide — Smart Lineman Radio

**Purpose:** This guide outlines the standard process for creating professional, radio-style audio scripts for the **Smart Lineman** life skills modules and generating high-quality audio using **Google AI Studio**.

---

## 1. Content Source & Preparation
- **Source File:** Use the corresponding JSON manuscript found in `public/quizzes/lesson_10_*.json`.
- **Key Extraction:**
    - `level_title`: The topic of the discussion.
    - `sections`: Extract the main points, specifications, and importance.
    - `pro_tip` / `myth_buster`: Used for the "Tips" or conclusion section.
    - `mission_briefing`: Used for the introduction.

---

## 2. Script Writing Standards (Bengali)
To maintain the "Smart Lineman Radio" brand, follow these linguistic and structural rules:

### Core Branding
- **Series Name:** "স্মার্ট লাইনম্যান অডিও সিরিজ" (Smart Lineman Audio Series).
- **Tone:** Professional, warm, authoritative, and empathetic.
- **Host Role:** Act as a guide/friend to the linemen.

### Terminology Rules
- **DO NOT** use the word "মিশন" (Mission).
- **INSTEAD** use: **"আজকের আলোচনা"** (Today's Discussion).
- **Example:** "আজকের আলোচনা— ডিজিটাল নিরাপত্তা" instead of "আজকের মিশন— ডিজিটাল নিরাপত্তা".

### Script Structure
1.  **Intro:** Welcome message + Series Branding + Today's Topic.
2.  **The Hook:** Mention why this topic is important for a lineman's life or safety.
3.  **Body Points:** Break down the JSON `sections` into natural dialogue points.
4.  **Pro-Tips/Tips:** Practical advice or "Myth Buster" facts.
5.  **Conclusion:** Motivational closing + "Stay Safe" + Signature "Jai Hind".

---

## 3. Google AI Studio Optimization (TTS)
When generating audio in Google AI Studio, use these settings for the best result:

### System Instruction
Copy and paste this into the **System Instructions** box:
> "You are a professional radio broadcaster for 'Smart Lineman Radio'. Your voice is warm and engaging. You are speaking to electrical linemen. Use a clear Bengali accent. Pace yourself naturally with appropriate pauses at commas and periods. Ignore [SFX] tags but maintain professional energy."

### Prompt Formatting
- **Language:** Select **Bengali (India)**.
- **Numbers:** Write numbers in words for clarity (e.g., "১০২" -> "একশো দুই", "১৯৩০" -> "উনিশশো ত্রিশ").
- **Pauses:** Use dashes (`—`) or ellipses (`...`) to force the AI to take a professional breath or pause.
- **English Terms:** Keep common technical terms like "OTP", "Scam", "Smart Lineman" in English as they are widely understood.

---

## 4. Integration Workflow
1.  **Draft:** Create the script using the latest JSON content.
2.  **Review:** Ensure "মিশন" is replaced with "আজকের আলোচনা".
3.  **Generate:** Use Google AI Studio to output the MP3.
4.  **Storage:** Save the file in `public/audio/life_skills/` (create folder if needed).
5.  **Update Catalogue:** Add the path to `audio_url_bn` in `public/data/supplementary_modules.json`.

---

## 5. Maintenance
When a new JSON chapter is added, a corresponding audio script should be generated within 24 hours to keep the "Listen" feature updated.
