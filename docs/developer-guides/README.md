# Developer guides

This folder holds **maintainer-focused** documentation: architecture notes, integration points, and conventions so humans (and AI coding agents) can change behavior **without rediscovering the codebase**.

## How to use

- **Before editing** a feature listed below, read its guide once for props, side effects, and known pitfalls.
- **When adding** a substantial new surface (modal, flow, integration), add a short guide here and link it from this README.

## Guides

| Guide | Scope |
|--------|--------|
| [Chapter Quiz Modal](./chapter-quiz-modal.md) | `ChapterQuizModal.jsx`, read-aloud script, quiz UX (mobile, TTS, animations) |

## Conventions for new guides

1. **Title + one-line purpose** at the top.
2. **File map** — primary paths under `src/` (and any `utils/` / hooks).
3. **Public contract** — props, callbacks, external APIs (Supabase, Capacitor, etc.).
4. **State & lifecycle** — when effects run, what to cancel on unmount.
5. **Extension points** — safe places to add UI vs logic.
6. **Gotchas** — ordering bugs, platform differences, duplicate hooks.
7. **Related code** — parents, shared hooks, CSS class names.

Keep guides factual and path-specific; avoid duplicating generic React docs.
