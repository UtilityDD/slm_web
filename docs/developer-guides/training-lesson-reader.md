# Training lesson reader — developer guide

**Purpose:** Document the **journal-style lesson reader** in Training: slide model, **guided section cards** (one topic at a time), **first-pass advance lock**, scroll alignment, **compact alert + chime** when advance is blocked, text scaling, and related CSS.

**Primary file:** `src/components/safety/Training.jsx`

**Related:**

| Path | Role |
|------|------|
| `src/index.css` | `.training-lesson-field`, `.training-lesson-scroll`, `.training-lesson-field-max`, `.lesson-mission-brief`, `.training-advance-block-alert` + `@keyframes training-advance-block-shake` |
| `src/hooks/useTextToSpeech.js` | Read-aloud for lesson content (separate from advance alert). |

---

## Slide model

- **`getSlides(trainingContent)`** builds an ordered array: `hero` → one slide per **`content.sections[]`** (`type: 'section'`) → optional `pro_tip`, `myth_buster`, `advanced` → `completion`.
- **`activeSectionIndex`** is the current slide index; **`slides`** is derived from `trainingContent` (not memoized; effects that must not loop should call `getSlides(trainingContent)` inside the effect or depend on `trainingContent` appropriately).

Journal UI: fixed chrome + **`lessonScrollRef`** on the scrollable column (`overflow-y-auto`) for the page body.

---

## Section slides: guided vs overview

Section slides expose **`points[]`** (topic cards). Two modes:

| Mode | State | UX |
|------|--------|-----|
| **Guided** | `sectionReaderMode === 'guided'` | One full card open at a time; prior topics show as compact “done” rows; future topics show locked placeholders. |
| **Overview** | `sectionReaderMode === 'overview'` | All `SectionPointFullCard` instances open (after user chose “all on one page”). |

**`sectionGuidedStepDone`** — count of completed guided steps in `0 .. points.length`. When it equals **`points.length`**, guided reading for that pass is finished; the green “read every topic” block appears with optional CTA to switch to overview.

**`SectionPointFullCard`** — shared body for a topic; `showDoneButton` + **`onStepDone`** in guided mode increments `sectionGuidedStepDone` (capped at `points.length`).

---

## First-pass completion & advance lock

- **`completedSectionSlideIndices`** — `Set` of slide indices where the user has finished guided reading at least once **in this lesson session** (cleared when **`trainingContent?.level_id`** changes).
- When **`sectionGuidedStepDone >= points.length`**, an effect adds **`activeSectionIndex`** to that set.
- On **`activeSectionIndex` / `trainingContent`** change, another effect resets **`sectionReaderMode`** to `'guided'` and sets **`sectionGuidedStepDone`** to **`points.length`** if that index is in the completed set (so revisiting shows the “all done” summary, not step 0), else **`0`**.

**Advance lock:** **`isLessonSectionAdvanceBlocked()`** is true when the current slide is a **section** with **`points.length > 0`** and **`sectionGuidedStepDone < points.length`**. **`nextSlide`** (and swipe-next, which calls it) returns early and sets **`sectionAdvanceBlockedToast`** to show the alert.

**Do not** add `activeSectionIndex` to the **guided scroll-into-view** effect’s dependency array without re-checking ordering against the reset effect (stale `sectionGuidedStepDone` across slides caused wrong scroll in the past).

---

## Scroll: lesson pane vs active card

- **`nextSlide` / `prevSlide`** set **`lessonScrollRef.current.scrollTo({ top: 0, behavior: 'instant' })`** when changing slides.
- A **dedicated effect** scrolls the **lesson container** so **`#section-guided-active-anchor`** aligns near the top (using **`scrollMarginTop`** on the anchor), **only when**:
  - `sectionReaderMode === 'guided'`, and
  - **`sectionGuidedStepDone >= 1`** (step 0 keeps the user at the top so **section headers / intro** stay visible after hero → section).

Dependencies are **`[sectionGuidedStepDone, sectionReaderMode]`** only — not **`activeSectionIndex`** — to avoid scrolling with a stale step right after a slide change.

---

## Blocked-advance alert + sound

- **UI:** Fixed **top** strip, compact, **`role="alert"`**, **`aria-live="assertive"`**, amber styling, warning icon, class **`training-advance-block-alert`** for shake (see `index.css`; **no animation** under **`prefers-reduced-motion: reduce`**).
- **Sound:** **`playLessonAdvanceBlockedChime()`** (module-level in `Training.jsx`) uses **Web Audio** for a short two-tone beep; runs when the toast turns on (user gesture already occurred). Slightly lower gain when **`prefers-reduced-motion: reduce`**.
- Toast auto-dismiss timer (~**3.2s**) lives in the same `useEffect` as the chime.

---

## Text scale (accessibility)

- **Storage key:** **`slm_training_text_scale`** (`'0' | '1' | '2'`) — see **`TEXT_SCALE_STORAGE_KEY`**; legacy migration from **`slm_training_field_mode`**.
- **`textScale`** toggles body classes on the reader column (e.g. **`training-lesson-field`**, **`training-lesson-field-max`**) and persists on change.

---

## Extension points

- **Copy / i18n:** Search `language === 'bn'` near section UI and near **`sectionAdvanceBlockedToast`**.
- **Stricter persistence:** To remember “section completed” across sessions, persist `completedSectionSlideIndices` (e.g. keyed by `level_id`) instead of only in-memory `Set` state.
- **New slide types:** Extend **`getSlides`** and the main render branch; reuse **`lessonScrollRef`** for any new “must read before next” rules if needed.

---

## Gotchas

1. **Effect order:** “Mark section complete” vs “reset step on index change” — reset uses **`completedSectionSlidesRef.current`** so it does not need the Set in its dependency array (avoids re-running reset when the Set updates on the same slide and resetting overview mode).
2. **Section with zero points:** No guided lock; advance is not blocked.
3. **AudioContext:** First chime may fail silently in very strict environments; the handler is wrapped in **`try/catch`**.
4. **Scratch scripts:** One-off patch scripts under `scratch/` are not part of the runtime app; do not assume they stay in repo.
