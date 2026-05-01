# Chapter Quiz Modal — developer guide

**Purpose:** End-of-chapter quiz UI (question flow, pass/fail, review, report, Google search shortcut), with **mobile-first** layout, **read-aloud** (TTS), and light **question-transition** animation.

**Primary file:** `src/components/ChapterQuizModal.jsx`

**Related files:**

| Path | Role |
|------|------|
| `src/utils/chapterQuizReadAloud.js` | Builds the full TTS script string (question index, stem, `Option A` / `B` / …). |
| `src/hooks/useTextToSpeech.js` | TTS: web `speechSynthesis`, native Capacitor plugin, optional premium Edge proxy. |
| `src/index.css` | Quiz motion: `.animate-quiz-question-in`, `.animate-quiz-result-in`, `.quiz-result-confetti-piece` (pass-only confetti; respects reduced motion). |

**Header Google search:** Shown only during the **live question** phase (`!showResult && !isReviewMode`). Hidden on the **score result** screen and in **review** mode (each question card has its own Google action).

**Mounted from:**

- `src/components/safety/Training.jsx`
- `src/components/SafetyHub.jsx`

Search for `<ChapterQuizModal` in those files for exact props passed (`questions`, `lessonId`, `language`, `onComplete`, etc.).

---

## Props (public contract)

| Prop | Notes |
|------|--------|
| `isOpen` | When false, the component returns `null` early **after** all hooks run. Do not place hooks below that `return`. |
| `onClose` | Dismiss without completing. |
| `onComplete(score)` | Called when user passes and continues. |
| `onReadAgain` | Optional; shown on fail path (“read again”). |
| `questions` | Array of `{ questionText, options[], correctAnswerIndex, image? }`. Shuffled per open inside the modal. |
| `language` | `'en'` \| `'bn'` (drives copy object `t`, TTS language, and read-aloud intro language). |
| `isPractice` | Affects result footer (e.g. try again + close grid). |
| `lessonId` | Shown in header; included in TTS `speak` id suffix for dedupe / debugging. |

---

## Modes (mental model)

1. **Loading** — short delay while questions shuffle; no interaction.
2. **Active quiz** — `!showResult && !isReviewMode`: one question, options, Next/Submit footer.
3. **Result** — `showResult`: single-column summary card (score %, correct count, progress bar, 90% marker on fail), gentle emoji (✨ pass / 💪 retry), optional light confetti when passed. Actions: **Review** (secondary), then outcome-specific primary (`Continue`, `Try again`, or practice **Close** / grid).
4. **Review** — `isReviewMode`: scrollable list of all questions with correctness.

Fullscreen styling uses `isFullscreenScreen = showResult || isReviewMode`.

### Result screen — copy & audio

- **Strings:** `t.resultBadgePass`, `t.resultBadgeRetry`, `t.resultPassHint`, `t.resultReviewHint` (EN/BN). Score line is built inline for correct grammar.
- **SFX:** `playUiSfx('pass' | 'fail')` when the result view mounts; **`passSoft`** ~340ms after pass (short high chime—keep subtle). Extend `playUiSfx` in the modal if you add more cues.
- **Focus:** `resultPrimaryRef` focuses the main CTA when the result view opens (keyboard / TalkBack).

---

## Read aloud (TTS)

- **Hook:** `useTextToSpeech(ttsLang)` where `ttsLang` is `'bn'` or `'en'` from `language`.
- **Script builder:** `buildChapterQuizSpeechScript({ language, questionIndex, totalQuestions, question })` in `chapterQuizReadAloud.js`.
- **Product rule:** Option lines always use **English** labels (`Option A`, `Option B`, …) even for Bangla UI—**do not** use bookish Bengali labels like “বিকল্প” for those. Bangla is used for intro / image hints where noted in that util.
- **Mute:** `readAloudMuted` + `localStorage` key **`chapterQuizReadAloudMuted`** (`'1'` = muted). Header control toggles mute; muting calls `stop()`.
- **When speech runs:** `useEffect` depends on question index, open state, loading, result/review flags, mute, and `isSupported`. It calls `stop()` on cleanup and when entering disallowed states (so changing question or closing does not leave overlapping audio).
- **SFX vs TTS:** `playUiSfx` uses Web Audio beeps; TTS is separate. Pass/fail still plays result SFX when the result screen appears.

**Agent note:** If you change `speak()` / premium audio behavior in `useTextToSpeech.js`, re-test quiz auto-read on **web and native**; premium path may not await playback end the same way as chunked native speech.

---

## Motion & mobile scroll

- **Question enter:** Active-question block uses `key={currentQuestionIndex}` and class **`animate-quiz-question-in`** (see `index.css`). Respects **`prefers-reduced-motion`** (animation disabled there).
- **Scroll reset:** `quizScrollRef` on the main scroll container; on `currentQuestionIndex` change (active quiz only), `scrollTop` / `scrollLeft` set to `0` so the next prompt is visible on small screens.
- **Touch:** `overscroll-y-contain` and `touch-pan-y` on that scroller to reduce stray browser overscroll during quiz.

---

## Safe extension points

- **Copy:** Extend the `t.en` / `t.bn` objects in `ChapterQuizModal.jsx` (keep keys mirrored).
- **Read-aloud wording only:** Prefer editing **`chapterQuizReadAloud.js`** so the modal stays thinner.
- **New header actions:** Add buttons inside the header `flex` next to existing controls; preserve **touch targets** (~44px) and `shrink-0` where needed.
- **New question fields:** Extend shuffle `useEffect` carefully so `correctAnswerIndex` stays aligned with shuffled `options`.

---

## Gotchas (for agents & humans)

1. **Hooks order:** All `useState` / `useEffect` / `useCallback` / custom hooks must appear **above** `if (!isOpen) return null;`. Violating this breaks the Rules of Hooks.
2. **Portal:** UI is rendered with `createPortal(..., document.body)` — z-index stack (`z-[200]`, nested modals `z-[300]`) matters for overlays (report, Google confirm).
3. **Question identity:** `currentQuestion` comes from `shuffledQuestions[currentQuestionIndex]`; any TTS or animation effect should not depend on `userAnswers` unless you intentionally want re-read after each tap.
4. **Shuffle:** On first open and on **Try again**, `buildShuffledQuiz` uses `'random'` question order and Fisher–Yates shuffled options (unbiased). Loading copy uses `t.loadingRetry` only while reshuffling after Try again.
5. **Images in options:** URLs are detected in both UI and read-aloud util; spoken fallback is short (“Picture” / “ছবি”) so URLs are not read aloud.
6. **Review list markers:** Use the `ReviewOptionMarker` SVG helper in `ChapterQuizModal.jsx`—do not paste raw ✓/○ characters in ASCII source files (they can become mojibake like `âœ“` if encoding drifts). WhatsApp report bodies use ASCII markers `(correct)` / `(wrong)` and `-` dividers for the same reason.

---

## Quick checklist before merging changes

- [ ] Open quiz from **Training** and **SafetyHub** (if both wired).
- [ ] Next / Submit / Review / Close — no TTS leak after close or on result screen.
- [ ] Toggle read-aloud mute; reload page — preference persists.
- [ ] Bangla + English `language` — labels and TTS script match product rules in `chapterQuizReadAloud.js`.
- [ ] Mobile viewport: new question scrolls to top; animation does not clip footer.

---

## Suggested commit message style

> Chapter quiz: &lt;what changed&gt; (see docs/developer-guides/chapter-quiz-modal.md)

This keeps history grep-friendly for the next maintainer.
