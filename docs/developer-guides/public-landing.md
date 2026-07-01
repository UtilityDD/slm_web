# Public landing page — developer guide

**Purpose:** Document the unauthenticated **marketing landing** (`Landing.jsx`): routing, live stats, Life Skills preview, and scroll behavior inside the app shell.

---

## File map

| Path | Role |
|------|------|
| `src/components/Landing.jsx` | Hero, vision/mission, live counters, Life Skills preview grid, public LS01–LS03 modal |
| `src/SmartLinemanUI.jsx` | Default view `landing` for guests; `publicViews` list; authenticated users redirected to `training` |
| `src/index.css` | `.landing-life-skills-scroll`, landing-specific layout |

---

## Routing & visibility

- **Default guest view:** `getInitialView()` returns `'landing'` when hash is empty (`SmartLinemanUI.jsx`).
- **Public views** (no login required): `landing`, `login`, `verify`, `accident-stories`, `video-guide`, `aro-janun`, `sops`, etc.
- **Logged-in users:** `useEffect` redirects `landing` → `training` automatically.
- **Logout:** `confirmLogout` sets `currentView` to `'landing'`.

### Hash routing interaction

`SmartLinemanUI` syncs `currentView` with `window.location.hash` (`#/training`, etc.). On view change to `landing` or `home`, it calls `history.replaceState` to clear the hash.

**Do not** use `<a href="#section-id">` for in-page scroll on Landing — the first click changes the hash, triggers `hashchange`, and the shell scrolls to top / rewrites the URL. Users need two clicks.

**Correct pattern:** `scrollToLifeSkillsSection()` scrolls `#life-skills` inside `#main-scroll-container`:

```js
const scroller = document.getElementById('main-scroll-container');
const section = document.getElementById('life-skills');
// offset via getBoundingClientRect + scroller.scrollTop - headerOffset (80px)
scroller.scrollTo({ top, behavior: 'smooth' });
```

The hero **Explore Life Skills** button uses this (not an anchor).

---

## Live stats (read-only)

Loaded on mount via `requestManager` / `leaderboardService` — **no writes**:

| Stat | Source |
|------|--------|
| Registered users | `profiles` count |
| New player top 3 | Monthly encouragement / leaderboard paths |
| All-time top 3 | Leaderboard service |
| Prizes | Hall of Fame / encouragement board prize metadata |

Failures degrade gracefully (zeros / empty lists); page still renders.

---

## Life Skills preview section

- **Data:** first 3 entries from `/data/supplementary_modules.json`.
- **Cards:** `openLifeSkillPreview(module)` opens a full-screen modal.
- **Public readable manuscripts:** `LS01`, `LS02`, `LS03` only (`manuscript_url` fetch). Others show login CTA.
- **CTA buttons** (`openLifeSkills`): `setCurrentView(user ? 'training' : 'login')` — opens Training Life Skills tab path after login, not an in-page anchor.

### Theme

Landing forces **light theme** on mount (`document.documentElement.classList.remove('dark')`); restores saved theme on unmount.

### Language

Props: `language`, `onLanguageChange` — toggles EN/BN in header; copy objects at top of `Landing.jsx`.

---

## Props contract

```jsx
<Landing
  language={language}
  onLanguageChange={handleLanguageSelect}
  setCurrentView={setCurrentView}
  user={user}
/>
```

| Prop | Role |
|------|------|
| `setCurrentView` | Navigate to `login`, `training`, etc. |
| `user` | When set, CTAs prefer authenticated destinations |

---

## Extension points

| Safe | Caution |
|------|---------|
| Hero copy, stat labels, card layout | Changing stats queries (keep read-only) |
| Additional preview modules (slice count) | Writing to Supabase from landing |
| New scroll targets (use `main-scroll-container` pattern) | Hash-based anchor links |

---

## See also

- [Life Skill / supplementary modules](./life-skills-supplementary.md)
- [Reading habit & 48-hour gate](./reading-habit-and-gate.md)
- [Broadcast notifications](./notifications-broadcasts.md) — alerts only shown for logged-in users, not on landing
