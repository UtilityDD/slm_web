# Identify real score (পরিচিতি) — developer guide

**Purpose:** Timed “real” Identify challenge with a stored score (one row per user), separate from casual practice. **Real play** enters via a Home **reward-window surprise gift**; **practice** stays on পরিচিতি anytime.

**Not the same as:** Hourly visual quiz points, reading ledger, or practice `%` in `localStorage`.

---

## What the user feels (product)

### Everyday lineman / Safety Mitra (same gift rules)

| Moment | What they notice |
|--------|------------------|
| **Most of the day on Home** | No new permanent button. The gift is **not** always there. |
| **Their surprise window** | Sometime between **6 AM–11 PM IST**, a personal **~3 hour** window opens (different start time per person, same day = same window). A **gift** appears at the tile cross on Home. |
| **They open it** | Short zoom → lid → rolling numbers (decorative only) → jumps into **পরিচিতি real** mode. |
| **They dismiss × or miss the window** | Gift gone for the rest of that IST day. Practice on Parichiti is still available. |
| **Rules card** | Short game to recognise PPE / tools; **5–8 seconds** per answer; **up to +100** Home points today; **5 mistakes** ends the run; **one real try per day**. Optional **Practice** first (returns to rules). |
| **During the run** | Endless questions (name / pick photo / clue); clock ticks; **Stop** anytime. |
| **End** | Shows how many they got right. Non-admin: **+N** added to Home score (`N = min(correct, 100)`). That same **+N** also feeds **চলতি মাস** and **লাইনম্যান দিবস** (no separate Identify Rank tab). |
| **Next time same day** | No second gift / no second real award. Come back tomorrow. |
| **Parichiti anytime** | Orange **Practice** pill — no clock, no points to Home, local `%` badge only. Real is **not** started from a header gift here. |

Safety Mitra earns points like a normal user. They do **not** get an always-on Home gift.

### Admin only

| Moment | What they notice |
|--------|------------------|
| Home gift | **Always** available for testing (ignores window / done-today). |
| Submit | Score may save in `identify_scores`; **0** Home points; **no** `quiz_attempts` row → boards unchanged by Identify. |

### Guests / logged out

No Home gift. Practice on Parichiti still works locally.

---

## Plain map (read next)

| Mode | Where score lives | Clock | How it ends | Who can start |
|------|-------------------|-------|-------------|---------------|
| **Practice** | `localStorage` (`slm_identify_practice_v1`) | None | User quits | Anyone browsing Identify |
| **Real** | Supabase `identify_scores` (replaces on submit) | 5s name/grid, 8s clue | 5 mistakes **or** Stop | Logged-in non-guest; **1× per IST day** (admin unlimited preview) |

Real score = **number of correct answers** in that run (not a percent). Practice badge stays local-only and is **not** updated by real mode.

---

## File map

| Path | Role |
|------|------|
| `src/utils/identifyRealScore.js` | Timers (`5` / `8`), max mistakes (`5`), points cap (`100`), status cache, submit/status RPCs |
| `src/utils/identifyGiftSchedule.js` | Personal IST reward window (hash of `userId` + date); active 06:00–23:00; **3h** live window |
| `src/utils/identifyGiftLaunch.js` | UI-only Home→Identify handoff (`sessionStorage`) + Home gift done-for-today (`localStorage`) |
| `src/utils/safetyLibraryPractice.js` | Shared question builder (name / grid / clue); practice persistence |
| `src/components/safety/IdentifyPractice.jsx` | Overlay: practice **or** real (`scoringMode`); rules gate; clock; end screen; submit once |
| `src/components/safety/IdentifyGridPractice.jsx` | 2×2 / MCQ UI; `persistLocalScore={false}` in real; `onAnswered` / `headerExtra` |
| `src/components/safety/SafetyLibrary.jsx` | Practice pill, score sheet, launch consume, quit→rules return |
| `src/components/IdentifyScoreGiftFab.jsx` | Home gift at tile cross: zoom → lid → counter → navigate |
| `src/components/Home.jsx` | Gift when `can_play` **and** in reward window; polls window every 60s; **admin** `alwaysShow` only |
| `src/components/safety/SafetyTabsPage.jsx` | Passes `user` / `userProfile` into `SafetyLibrary` |
| `src/index.css` | `.identify-gift-x*` (Home gift) |
| `supabase/migrations/20260919103000_identify_scores.sql` | Table + RLS + base status/submit RPCs |
| `supabase/migrations/20260920120000_identify_score_award_points.sql` | `points_awarded` + Home `profiles.points` award (cap 100) |
| `supabase/migrations/20260920143000_identify_score_board_feed.sql` | One `quiz_attempts` row/`identify-YYYY-MM-DD` → Monthly + Lineman Day |
| `supabase/migrations/20260920153000_identify_score_p_user_id.sql` | Custom-auth: `p_user_id` on status/submit (app often has no `auth.uid()`) |

---

## Database design (simple)

```text
One real finish / IST day (non-admin)
  ├─ identify_scores     → 1 row/user (last run; replace)
  ├─ profiles.points     → lifetime +N (N = min(correct, 100))
  └─ quiz_attempts       → identify-YYYY-MM-DD (+N)
         └─ trigger → daily_user_activity (that day)
                ├─ চলতি মাস     = SUM(days in calendar month)
                └─ লাইনম্যান দিবস = SUM(days in Mar 7 cycle)
```

**Resets:** date filters only — 1st of month drops prior month from Monthly; new `ANNUAL_CYCLE` dates drop prior cycle from Lineman Day. Rows are not wiped.

**Admin:** `identify_scores` may update; **0** points; **no** `quiz_attempts` row.

### Table `public.identify_scores`

- **PK:** `user_id` → `profiles.id` (one row per user).
- **Columns:** `score`, `asked`, `mistakes`, `played_on`, `points_awarded` (0–100), `updated_at`.
- **Writes:** Only via `submit_identify_score`.

### RPCs

**`get_identify_score_status(p_user_id uuid DEFAULT NULL)`** — read-only gate + saved score. Prefer `p_user_id` from client.

**`submit_identify_score(p_score, p_asked, p_mistakes, p_user_id uuid DEFAULT NULL)`**

1. Resolve user: `COALESCE(auth.uid(), p_user_id)` (custom login → client always sends `user.id`).
2. Reject guest / already played today (non-admin).
3. Upsert `identify_scores`.
4. Non-admin: `awarded = LEAST(p_score, 100)` → `profiles.points` + `quiz_points`.
5. Non-admin: insert `quiz_attempts (identify-YYYY-MM-DD, score=awarded)` if missing (soft-fail if attempts insert errors).
6. Return `points_awarded`, `new_total_points`, `board_attempt`, `preview`.

### Apply migrations (order, non-destructive)

1. `20260919103000_identify_scores.sql`  
2. `20260920120000_identify_score_award_points.sql`  
3. `20260920143000_identify_score_board_feed.sql`  
4. `20260920153000_identify_score_p_user_id.sql`  

All are additive / `CREATE OR REPLACE` — no drops of live tables. Prefer `npx supabase db query --linked -f …` per file; do **not** blind `db push` the whole migrations folder.

### Client call budget

- Status session cache for the IST day.
- Custom auth: pass `p_user_id` (this app often has no `auth.uid()`). Client always sends `user.id`.

---

## Client gate

`canStartIdentifyReal({ user, userProfile, status })`:

1. No `user.id` → `login`
2. Guest → `guest`
3. Admin (profile or status) → `{ ok: true, preview: true }`
4. `status.can_play === false` or `played_today` → `played`
5. Else `{ ok: true }` (including missing/failed status — do not hard-block open; submit remains authoritative)

---

## Home reward window (`identifyGiftSchedule.js`)

Personal **surprise drop** — not a permanent Home control.

| Constant | Value |
|----------|--------|
| Active day | IST **06:00–23:00** (hidden in sleep hours 23:00–06:00, same idea as `hourlyNightWindow`) |
| Window length | **3 hours** |
| Latest start | **20:00** (so window ends by 23:00) |
| Start pick | Deterministic hash of `userId + IST date` → minute in `[06:00, 20:00]` |

**Show Home gift when all are true:**

1. Logged-in, not guest  
2. `canStartIdentifyReal` → `ok`  
3. Now inside that user’s window (`isIdentifyGiftInRewardWindow`) — **admin only** always shows (`alwaysShow` / `forceAdmin`; ignores done-today). **Safety Mitra = normal user** for this gate.  
4. Not already opened/dismissed today (`slm_identify_gift_home_done`) — **skipped for admin**

Home polls the window every **60s** so the gift can appear mid-session when the window opens.

**Hide for the rest of the IST day when:** user taps **×**, opens the gift, window ends, or `can_play` becomes false after submit.

Missed the window → no gift until next IST day.

Open animation: idle → zoom → lid → rolling fake counter → `requestIdentifyRealLaunch()` + navigate to Identify.

---

## Entry points

### 1. Home surprise gift (`IdentifyScoreGiftFab`)

Only entry for **normal users** (and Safety Mitra) into real mode — via reward window above.

### 2. Parichiti (`SafetyLibrary`)

| Control | When |
|---------|------|
| **Practice** pill | **Always** — local practice, no daily limit |
| **Gift** | **Removed** — real is Home-only |

Admin can still open real from the mode-gate sheet (if shown) or via Home gift (`forceAdmin`).

While practice/real overlay is open, practice pill is replaced by quit **X**.

### 3. Consume launch on Identify mount

```js
if (consumeIdentifyRealLaunch()) {
  // open real mode
}
```

One-shot: read + clear session key so refresh does not reopen.

---

## Real session lifecycle (`IdentifyPractice`, `scoringMode === 'real'`)

```
open real
  → rulesReady=false (info card: time, endless, 5 mistakes)
  → optional “practice first” → practiceFromRules; quit practice returns to rules (not library)
  → Start → rulesReady=true
  → endless rounds (name / grid / clue; no 3× same type in a row — shared builder)
  → per question clock: identifyRealSecondsFor(mode) → 5 or 8; timeout = miss
  → wrong or timeout increments mistakes; at 5 → realDone reason=mistakes
  → Stop → realDone reason=stop
  → end screen shows correct count; submitIdentifyScore once (submitOnceRef)
  → onIdentifySubmitResult refreshes identifyStatus in SafetyLibrary
```

Constants (change in one place):

```js
IDENTIFY_REAL_SECONDS_SHORT = 5  // name + grid
IDENTIFY_REAL_SECONDS_LONG  = 8  // clue / বর্ণনা
IDENTIFY_REAL_MAX_MISTAKES   = 5
IDENTIFY_REAL_POINTS_CAP     = 100
```

Practice mode: no clock, no submit RPC, updates `slm_identify_practice_v1` via `recordIdentifyPracticeAnswer`.

---

## Score sheet (header `%` badge)

- Tap orange `%` / saved practice badge → sheet with:
  - **Practice:** local life % + counts
  - **Real:** DB `score` (and related fields when present)
- Practice badge UI still reflects local practice only; real submit must not rewrite practice storage.

---

## CSS

| Classes | Surface |
|---------|---------|
| `.identify-gift-x`, `__box`, `__lid`, `__counter`, `.identify-gift-stage*` | Home FAB + zoom stage |

---

## What this is not (yet)

- **No separate Identify Rank tab** — points ride Monthly + লাইনম্যান দিবস via `quiz_attempts` / `daily_user_activity`.
- **No merge** with reading habit ledger.
- **No push** when the reward window opens.
- **PWA-only** product change: do not bump `android-latest.json` / APK for this feature alone. GitHub push ≠ live; publish with Vercel when shipping (see `deployment.md`).

---

## Extension points

- **Timers / lives:** only `identifyRealScore.js` (+ copy in `IdentifyPractice` / `SafetyLibrary` `t`).
- **Window length / hours:** `identifyGiftSchedule.js` constants only.
- **Leaderboard:** no new Identify Rank — reuse existing Monthly / Lineman Day; optional admin query of `identify_scores` only.
- **Gift placement:** Home only for normal users; do not re-add a Parichiti gift as a permanent real entry.
- **Mode gate sheet:** admin real preview; regular users enter real via Home gift.

---

## Gotchas

- **Replace, not best-of:** every successful submit overwrites the user’s score (even a worse run).
- **Admin preview burns the stored score** on each submit — expected for testing.
- **Soft client gate vs hard server gate:** UI may allow start if status RPC fails; submit can still fail.
- **Quit from practice-from-rules** must return to rules, not close the whole overlay.
- **Guest / no login:** no Home gift.
- **Safety Mitra ≠ admin gift:** Mitra uses personal window + earns points; only admin always sees gift / 0 award.
- **Do not** write real results into `slm_identify_practice_v1`.
- **Do not** treat Home gift animation counter as the real score — decorative only.
- **Deterministic window:** same user + same IST day → same start; do not re-roll on refresh.
- **Custom auth:** always pass `p_user_id`; never rely on `auth.uid()` alone.

---

## Quick check

- [ ] Migrations applied in order (table → award → board feed → `p_user_id`).
- [ ] Non-admin submit: identify_scores + profiles.points += min(score,100) + quiz_attempts identify-YYYY-MM-DD.
- [ ] daily_user_activity for that IST day shows the +N (via trigger).
- [ ] Monthly Rank and Lineman Day reflect the award after cache refresh.
- [ ] Admin submit: board may update score row; 0 Home points; no attempts row.
- [ ] Second non-admin submit same IST day rejected; no double award.
- [ ] Home gift: reward window + can_play; **admin always**; Safety Mitra like normal.
- [ ] Parichiti: practice always; no header gift.
- [ ] End screen shows +N; rules mention +100 cap.
