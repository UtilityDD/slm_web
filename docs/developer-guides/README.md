# Developer guides

This folder holds **maintainer-focused** documentation: architecture notes, integration points, and conventions so humans (and AI coding agents) can change behavior **without rediscovering the codebase**.

## How to use

- **Before editing** a feature listed below, read its guide once for props, side effects, and known pitfalls.
- **When adding** a substantial new surface (modal, flow, integration), add a short guide here and link it from this README.

## Guides

| Guide | Scope |
|--------|--------|
| [Chapter Quiz Modal](./chapter-quiz-modal.md) | `ChapterQuizModal.jsx`, read-aloud script, quiz UX (mobile, TTS, animations) |
| [Admin Broadcast Notifications](./admin-broadcast-notifications.md) | `Admin.jsx`, `SmartLinemanUI.jsx`, Supabase RPCs for create/list/toggle/delete, startup modal behavior |
| [Hourly Visual Quiz](./hourly-visual-quiz.md) | Live sheet CSV, image migration, answer-leak sanitization, admin `VisualQuizPreview`, catalog scripts (`vq-120+`) |
| [Monthly encouragement boards](./monthly-encouragement-boards.md) | Four monthly tabs (champion / new / improved / learner), Hall of Fame v8, prizes, `monthlyEncouragementBoards.js` |
| [Safety Library](./safety-library.md) | `SafetyLibrary.jsx`, grid, detail modal, Drive image helper |
| [Training lesson reader](./training-lesson-reader.md) | `Training.jsx` journal slides, guided section cards, advance lock, alert/chime, scroll + text scale |
| [Life Skill / supplementary modules](./life-skills-supplementary.md) | `supplementary_modules.json`, `lesson_10_*.json`, GitHub or `/audio/` listen URLs, `LS` codes, `supplementaryProgressStorage.js` |
| [Life Skills Quiz Generation](./life-skills-quiz-generation.md) | Standardized guide on authoring/maintaining Life Skills quiz files with anti-cheat/balancing rules |
| [Audio Script Generation](./audio-script-generation.md) | "Smart Lineman Radio" standards, Google AI Studio optimization, JSON to script workflow |
| [Broadcast notifications](./notifications-broadcasts.md) | `Admin.jsx`, `SmartLinemanUI.jsx`, notification RPCs, startup modal + admin controls |

## Conventions for new guides

1. **Title + one-line purpose** at the top.
2. **File map** — primary paths under `src/` (and any `utils/` / hooks).
3. **Public contract** — props, callbacks, external APIs (Supabase, Capacitor, etc.).
4. **State & lifecycle** — when effects run, what to cancel on unmount.
5. **Extension points** — safe places to add UI vs logic.
6. **Gotchas** — ordering bugs, platform differences, duplicate hooks.
7. **Related code** — parents, shared hooks, CSS class names.

Keep guides factual and path-specific; avoid duplicating generic React docs.
