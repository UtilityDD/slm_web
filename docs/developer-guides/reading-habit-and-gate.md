# Reading habit ledger & 48-hour gate — developer guide

**Purpose:** Document the **habit-only** reading timestamp system and the **48-hour gate** that blocks the hourly quiz until the user completes at least one core lesson (or a graduate review) every two days. This stack is **intentionally separate** from scoring, leaderboards, and existing point RPCs.

---

## What this does *not* touch

| System | Status |
|--------|--------|
| `award_training_points` | Unchanged |
| `submit_quiz_result_v2` | Unchanged |
| `profiles.reading_points` / `quiz_attempts` | Unchanged by habit code |
| Leaderboards / monthly boards | Unchanged |
| Lesson unlock / level calculation | Unchanged |

Habit rows are for **when** someone read, not **how many points** they earned.

---

## File map

| Path | Role |
|------|------|
| `supabase/migrations/create_reading_habit_completions.sql` | Table + RLS (one row per user per lesson) |
| `supabase/migrations/log_reading_habit_rpc.sql` | RPCs for custom-auth clients |
| `scripts/maintenance/backfill_reading_habit_completions.sql` | One-time backfill from `quiz_attempts` + `profiles` gaps |
| `scripts/maintenance/verify_reading_habit.sql` | Row counts / sample checks |
| `src/utils/readingHabitLog.js` | Fire-and-forget habit writes after lesson complete / review |
| `src/utils/readingHabitGate.js` | `checkReadingGate()`, `findNextSequentialLessonId()` |
| `src/utils/readingGateStorage.js` | 48h window, local fallback, gate nav keys |
| `src/utils/readingReviewCycle.js` | Shuffled review cycle for graduates |
| `src/components/ReadingGateModal.jsx` | Block UI when hourly quiz is locked |
| `src/components/safety/Training.jsx` | Gate on hourly CTA; habit log on first completion; review branch |
| `src/components/Competitions.jsx` | Gate in `beginHourlyQuiz()` |
| `src/components/SafetyHub.jsx` | `logReadingHabitCompletion()` on first completion (same pattern as Training) |

---

## Database: `reading_habit_completions`

| Column | Meaning |
|--------|---------|
| `user_id` | `profiles.id` |
| `lesson_id` | Core lesson id, e.g. `1.1` (regex `^\d+\.\d+$`) |
| `completed_at` | **Primary habit timestamp** |
| `source` | `app` \| `backfill_quiz_attempts` \| `backfill_profile` |

**Unique:** `(user_id, lesson_id)` — replays update `completed_at` only when newer (via RPC).

### RLS note (important)

Direct `INSERT`/`SELECT` on the table requires `auth.uid() = user_id`. The app uses **custom login** (`authenticate_user` RPC + `session_token` in localStorage), **not** Supabase Auth JWT. Therefore the app must **not** write habit rows via `.from('reading_habit_completions').insert()` — use the RPCs below.

### Production setup checklist

1. Run `create_reading_habit_completions.sql` (or `create_reading_habit_completions_first_run.sql` on first deploy).
2. Run `backfill_reading_habit_completions.sql` blocks in SQL Editor (historical data).
3. Run `log_reading_habit_rpc.sql` (required for live app logging after deploy).

---

## RPC contract (`log_reading_habit_rpc.sql`)

### `log_reading_habit_completion(p_user_id, p_lesson_id, p_kind)`

- **SECURITY DEFINER** — bypasses RLS; accepts explicit `p_user_id` (same pattern as `submit_quiz_result_v2`).
- `p_kind`: `'app'` or `'review'` (stored as `source = 'app'`; kind is metadata in JSON response only).
- Upserts on `(user_id, lesson_id)`; refreshes `completed_at` when the new time is later.
- Returns `{ success, inserted_or_updated, completed_at, kind }` or `{ success: false, error }`.

### `get_latest_reading_habit_at(p_user_id)`

- Returns `max(completed_at)` for the user (used by the gate).
- **Only** `source IN ('app', 'backfill_quiz_attempts')` — **`backfill_profile` is excluded** so estimated backfill dates do not bypass the 48h lock.

**Client usage:** always pass `p_user_id: user.id` from the restored custom-auth user object.

---

## App: habit logging

### First-time core lesson completion

In `Training.jsx` / `SafetyHub.jsx` `finalizeLessonCompletion`, **after** a successful `award_training_points` RPC:

```js
logReadingHabitCompletion(user.id, lessonId);
```

`readingHabitLog.js`:

1. `writeLocalGateActivity(userId, lessonId, 'app')` — synchronous localStorage (gate fallback).
2. `supabase.rpc('log_reading_habit_completion', { p_user_id, p_lesson_id, p_kind: 'app' })` — async, non-blocking.

Failures log `[reading_habit] rpc failed:` in the console; they do **not** block lesson completion or points.

### Graduate review (gate only)

When the user re-completes a lesson assigned by the gate (`consumeGateReviewTarget`):

```js
logReadingHabitReview(user.id, lessonId);
```

- Updates local 48h window + advances review cycle.
- Calls the same RPC (no `award_training_points`, no extra points).

---

## 48-hour reading gate

### Window

- `READING_GATE_MS = 48 * 60 * 60 * 1000` in `readingGateStorage.js`.
- Last activity = `max(DB latest completed_at, local lastActivityAt)`.

### When the gate runs

Only when the user tries to start the **hourly quiz**:

| Entry | File | Function |
|-------|------|----------|
| Training hourly CTA | `Training.jsx` | `handleHourlyChallengeClick` (before penalty modal) |
| Competitions quiz start | `Competitions.jsx` | `beginHourlyQuiz` |

There is **no** proactive daily reminder elsewhere in the app.

### `checkReadingGate()` outcomes

| Result | Meaning |
|--------|---------|
| `{ allowed: true }` | Within 48h of last activity |
| `{ allowed: true, usedLocalFallback: true }` | DB read failed; local storage within 48h |
| `{ allowed: true, failOpen: true }` | DB + local both empty/unavailable — quiz allowed |
| `{ allowed: false, mode: 'next', lessonId }` | In-progress user → next sequential core lesson |
| `{ allowed: false, mode: 'review', lessonId, reviewIndex, reviewTotal }` | All core lessons done → rotating review |

### Blocked UX (`ReadingGateModal.jsx`)

- **Continue** → `setGateNavigation` + optional `setGateReviewTarget` in localStorage → `setCurrentView('training')`.
- Training `useEffect` consumes nav and calls `handleChapterClick(chapter, lessonNum)`.
- **Not now** → dismiss modal only.

### Review cycle (`readingReviewCycle.js`)

- Local key: `slm_reading_review_cycle_v1_<userId>`.
- Shuffled order of all completed core lesson ids; cursor advances per review; reshuffles after full cycle.
- No repeat until every completed lesson has been reviewed once in the current cycle.

### Local storage keys

| Key | Purpose |
|-----|---------|
| `slm_reading_gate_v1_<userId>` | `lastActivityAt`, `lastLessonId`, `lastKind` |
| `slm_reading_gate_nav_v1` | One-shot chapter/lesson nav from modal (30 min TTL) |
| `slm_gate_review_target_<userId>` | Expected review lesson id for `logReadingHabitReview` |
| `slm_reading_review_cycle_v1_<userId>` | Review shuffle state |

---

## Extension points

| Safe to change | Avoid without review |
|----------------|----------------------|
| Copy / styling in `ReadingGateModal.jsx` | `award_training_points`, `submit_quiz_result_v2` |
| `READING_GATE_MS` duration | Scoring triggers on `quiz_attempts` |
| Review shuffle seed logic | `profiles.completed_lessons` unlock rules |
| Adding a proactive Training banner (new UI) | Merging habit table into leaderboard queries |

---

## Gotchas

1. **Custom auth + RLS:** Direct table access from the anon client fails with `new row violates row-level security policy`. Use RPCs.
2. **`award_training_points` still uses `auth.uid()`** and does not receive `p_user_id`; custom-auth users may get `{ success: false }` at the JSON level while the app only checks `rpcError`. Habit logging is fixed separately; lesson bonus ledger gaps are a known unrelated issue.
3. **Anon API row count 0** on `reading_habit_completions` is expected (RLS). Use SQL Editor / service role for audits.
4. **Gate is fail-open** when no habit data exists — new users with no DB/local activity are not blocked until they have at least one stale timestamp.
5. **Do not use `href="#section"`** on Landing for in-app scroll — conflicts with `SmartLinemanUI` hash routing (see [Public landing](./public-landing.md)).

---

## See also

- [Training lesson reader](./training-lesson-reader.md) — lesson completion flow, daily brief strip
- [Life Skill / supplementary modules](./life-skills-supplementary.md) — supplementary ids are excluded from habit gate
- [Hourly Visual Quiz](./hourly-visual-quiz.md) — quiz entry after gate passes
