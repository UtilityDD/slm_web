# Public landing page — developer guide

**Purpose:** Document the unauthenticated **marketing landing** (`Landing.jsx`): routing, static community proof, Redis visit counter, and scroll behavior inside the app shell.

Landing **must not** call Supabase (PostgREST, Storage, Realtime, or RPCs). Public visitors must not consume the Free-plan database or egress quota.

---

## File map

| Path | Role |
|------|------|
| `src/components/Landing.jsx` | Hero, vision/mission, static 500+ / 20+, toppers login link, prize carousel |
| `src/components/LandingPrizeCarousel.jsx` | Prize photos from bundled catalog + `/prizes/` (no winner names) |
| `src/utils/landingVisitService.js` | Visit count via `/api/landing-visits` (**Redis**, not Supabase) |
| `src/SmartLinemanUI.jsx` | Default view `landing` for guests; `publicViews` list; authenticated users redirected to `training` |
| `src/index.css` | `.landing-life-skills-scroll`, `.landing-join-cta__dot`, landing layout |

`/api/landing-stats` and `/api/landing-boards` still exist but **must not** be called from the public landing.

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
scroller.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
```

The hero **Explore Life Skills** button uses this (not an anchor).

---

## What is live vs static

| Surface | Source | Notes |
|--------|--------|--------|
| Members **500+** | `LANDING_MEMBERS_DISPLAY` in `Landing.jsx` | Marketing floor; bump by hand when you ship |
| Safety Mitra **20+** | `LANDING_SAFETY_MITRA_DISPLAY` | Same |
| Visit counter | Redis `/api/landing-visits` | Only live number; not Postgres |
| Join button | Pulsing green dot | Attention only; no server |
| This month’s toppers | Text link → login | No public podium or faces |
| Prize carousel | `hallOfFamePrizes.json` + `public/prizes/` | Photos only, no winner faces |
| Advertise chip | Contact form `openWithTopic('advertise')` | Quiet CTA; no full-screen ad |

Do **not** show live leaderboard photos or `profiles` counts on this page.

`SponsorAdOverlay` must stay **blocked** on `landing` (and for guests). Logged-in users see a **minimal bottom sponsor strip** (not a full-screen interstitial). The Advertise chip is the public CTA.

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
| Hero copy, stat labels, language toggle | Calling Supabase or `/api/landing-boards` from landing |
| Additional preview modules (slice count) | Live winner names/faces on the public podium |
| New scroll targets (use `main-scroll-container` pattern) | Hash-based anchor links |
| Bumping `LANDING_MEMBERS_DISPLAY` | Fetching `get_registered_linemen_count` |

---

## See also

- [Free-plan / egress optimization](./free-plan-optimization.md) — landing is the first Free-plan cut; do not wire `/api/landing-boards` back
- [Avatars, sponsor images, Free Storage](./avatars-sponsor-storage.md)
- [Life Skill / supplementary modules](./life-skills-supplementary.md)
- [Reading habit & 48-hour gate](./reading-habit-and-gate.md)
- [Broadcast notifications](./notifications-broadcasts.md) — alerts only shown for logged-in users, not on landing
