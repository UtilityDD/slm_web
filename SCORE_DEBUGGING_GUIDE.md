# Score, penalty & leaderboard — developer guide

Canonical reference for developers and AI agents working on Smart Lineman scoring, penalties, leaderboards, and safe database repair.

---

## Canonical scripts (do not remove)

| Script | Purpose |
|--------|---------|
| `scripts/maintenance/debug_scores_leaderboard.sql` | Read-only: penalty drift (Q1), points vs attempts (Q2), monthly vs all-time (Q3), recent hourly penalties (Q4). |
| `scripts/maintenance/score_repair_with_rollback.sql` | **Write:** snapshots `profiles` + `quiz_attempts`, recomputes profile score columns from attempts, post-checks. Disables `trg_sync_profile_points` during `UPDATE`. |
| `scripts/maintenance/rollback_score_repair.sql` | **Write:** restores `profiles` score columns from `score_repair_backup_profiles` for a given `backup_id`. Disables trigger during restore. |
| `scripts/maintenance/fix_monthly_leaderboard_view_v2_net.sql` | **Write:** replaces `monthly_leaderboard_view` so monthly `points` = net per month (`SUM(score)−SUM(penalty)`), no gross + profile-reading lump-in. |
| `scripts/maintenance/verify_post_repair_play.sql` | Read-only: split attempt sums before/after last repair timestamp (detect post-repair play vs trigger drift). |
| `scripts/maintenance/debug_notifications.sql` | Read-only: notifications visibility, RLS, realtime publication. |
| `scripts/maintenance/check_score_inconsistencies.sql` | Read-only: broader legacy audit (many sections). |

Older one-off scripts (e.g. `fix_samiran_reading_consistency.sql`) stay for historical incidents — do not run unless you understand that incident.

---

## Source of truth

| Layer | Role |
|-------|------|
| `quiz_attempts` | Ledger: `score`, `penalty`, `quiz_id`, `created_at`. |
| `profiles` | Cache: `points`, `reading_points`, `quiz_points`, `total_penalties`. |
| `leaderboard_view` | All-time display (from `profiles`). |
| `monthly_leaderboard_view` | Per calendar month aggregates from `quiz_attempts`. |

If `profiles` disagrees with sums derived from `quiz_attempts`, **trust attempts** and repair `profiles` (or fix the RPC/trigger).

---

## Intended formulas

- Per attempt: store **raw** `score` and `penalty`; net effect = `score − penalty`.
- Profile targets (after repair):
  - `total_penalties` = `SUM(quiz_attempts.penalty)` for user
  - `reading_points` = `SUM(score)` where `quiz_id LIKE 'lesson_bonus%'`
  - `points` = `SUM(score) − SUM(penalty)` (lifetime)
  - `quiz_points` = `points − reading_points` (non-reading net bucket)

Hourly quiz (app): sends `p_score` (raw) and `p_penalty` to `submit_quiz_result_v2`; RPC must keep attempts and profile columns consistent.

---

## Critical: `trg_sync_profile_points`

Database trigger (example name): **`trg_sync_profile_points`** — **BEFORE INSERT OR UPDATE OF `completed_lessons`, `quiz_points`** on `public.profiles`, function **`sync_profile_points_trigger()`**.

It can **overwrite `points`** whenever `quiz_points` is updated — including during bulk repair. **`score_repair_with_rollback.sql` and `rollback_score_repair.sql` disable this trigger** around their `UPDATE`s. If you add new maintenance SQL that updates `quiz_points`, do the same or `points` will drift again.

It can also reset **`reading_points`** to unique `completed_lessons` × 20. All-time RDG in the app therefore overlays extras from `quiz_attempts` (re-reads + Life Skill) and never writes that overlay back.

To inspect the function (run in SQL Editor):

```sql
select pg_get_functiondef(p.oid)
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'sync_profile_points_trigger';
```

---

## Monthly reading (legacy)

Old reading completions may lack trustworthy timestamps. Policy used in **`fix_monthly_leaderboard_view_v2_net.sql`**:

- **All-time** includes all reading (via `profiles` / full attempt history).
- **Monthly** reading in the view = **`lesson_bonus%` rows dated in that month only** — do not push undated legacy reading into arbitrary past months.

---

## Time zones: DB “month” vs app “This month”

- **`monthly_leaderboard_view`** groups rows with `EXTRACT(MONTH FROM qa.created_at)` and `EXTRACT(YEAR FROM qa.created_at)` on `timestamptz`. In PostgreSQL that follows the **database session time zone** (hosted Supabase is often **UTC**).
- **`leaderboardService.fetchMonthly`** (and the Competitions UI) filter with **`new Date().getMonth()` / `getFullYear()`** — the user’s **device-local** calendar month.

So the label **“This month”** can **diverge slightly** from what users expect on their wall calendar near month boundaries or when travelling. **Points are not deleted**; attempts remain in `quiz_attempts` and feed all-time totals — grouping in the monthly **view** can differ from a naive local-calendar sum.

User-facing reassurance lives in **`Competitions.jsx`** as `t.leaderboardTimeInfo` (EN/BN). Keep support answers consistent with that (no promise that the monthly table equals every user’s local calendar month pixel-perfect).

---

## Frontend: leaderboard cache & stale UI

Leaderboard fetches go through **`requestManager`** + **`cacheHelper`**: TTL values are **minutes**; SWR can return cached rows and only background-refresh when cache is older than ~30 seconds unless `forceRefresh` is true.

**Single helper — keep keys in sync:** `src/utils/leaderboardCacheKeys.js` exports **`invalidateLeaderboardCaches(userId)`**, which clears:

- `leaderboard_top_10_all_time` / `leaderboard_top_10_all_time_rdg`
- `leaderboard_full_all_time` / `leaderboard_full_all_time_rdg`
- `hall_of_fame_gallery_v3` … `hall_of_fame_gallery_v10` and **`hall_of_fame_gallery_v11`** (`HOF_GALLERY_CACHE_KEY` in `hallOfFameSnapshots.js`) — Competitions skip-reload uses the same `HOF_GALLERY_BOARDS_VERSION`
- `user_rank_all_time_<userId>` / `user_rank_all_time_rdg_<userId>`
- `leaderboard_monthly_<year>_<month>` plus `leaderboard_monthly_ist_*` / `leaderboard_monthly_ist_badge_*` for the **current** local month
- `leaderboard_encouragement_*` / `leaderboard_encouragement_ist_*` / `leaderboard_encouragement_ist_badge_*` (`_bn` and `_en`; data is the same, keys differ by language slot)

Do **not** clear obsolete keys like `leaderboard_top_10_v3` / `leaderboard_full_v3` / `user_rank_<id>` — they are unused and were a source of “refresh did nothing” bugs.

**Where invalidation / forced refetch happens:**

| Location | Behaviour |
|----------|-----------|
| **`Competitions.jsx`** — hourly quiz success & retry | `fetchLeaderboard(true)` plus **`fetchFullLeaderboard(true)`** and **`fetchMonthlyLeaderboard(true)`** so top-10, full list, monthly tab, and **encouragement sub-boards** all update (`fetchMonthly` + `fetchEncouragementBoards` in parallel). |
| **`Training.jsx`** / **`SafetyHub.jsx`** — lesson bonus | Call **`invalidateLeaderboardCaches(user.id)`** after a successful points RPC. Training’s rank preview cache key is **`user_rank_all_time_<id>`** (same family as Competitions). |
| **`SmartLinemanUI.jsx`** — pull-to-refresh | Profile + notifications only. **`invalidateLeaderboardCaches(user.id)`** so Rank/Prizes refetch when those screens open. Do **not** call `fetchAllTime` / `fetchMonthly` from pull-to-refresh. |

If you add a new leaderboard cache key in **`leaderboardService.js`** or **`Competitions.jsx`**, add it to **`invalidateLeaderboardCaches`** in the same PR.

**Egress:** do not call `fetchAllTime` / `fetchMonthly` from login, Home, or pull-to-refresh. Rank loads when Rank/Prizes opens. All-time RDG uses **`leaderboard_view.reading_points`** (= `COALESCE(reading_points_ledger, reading_points)`). Do not reintroduce `overlayCumulativeReading`. See **[`docs/developer-guides/free-plan-optimization.md`](docs/developer-guides/free-plan-optimization.md)**.

---

## Hourly quiz ID (client clock)

- **Competitions:** `getSyncedTime()` = `Date.now()` corrected by **`get_server_time`** (or UTC fallback). The hourly id `hourly-challenge-YYYY-MM-DD-HH` still uses **`getFullYear()` / `getMonth()` / `getDate()` / `getHours()`** — i.e. **local** calendar fields for that instant after skew correction.
- **Training** (`checkHourlyEligibility`): builds the same id pattern from **plain `new Date()`** — if device clock is wrong and sync never ran in Competitions, Training and Competitions can disagree.

Server RPCs generally **trust `p_quiz_id` from the client**; duplicate `(user_id, quiz_id)` handling depends on the deployed **`submit_quiz_result_v2`** (e.g. `ON CONFLICT DO NOTHING` avoids double-awarding the same id). Do not assume clock manipulation is fully blocked without server-side validation of the hourly id against `now()` in a fixed zone.

---

## Do **not** run blindly

- **`supabase/migrations/sync_scores.sql`** (and similar): sets `profiles.points` from **`SUM(score)` without the same penalty model** as live RPCs — can **worsen** drift. Only use after reading it end-to-end and matching your active RPC contract.

---

## Recommended maintenance order

1. **Backup** (Pro scheduled backup, or export `profiles` + `quiz_attempts` CSV on Free tier).
2. **Diagnostics:** run `debug_scores_leaderboard.sql` (all four sections) and note counts.
3. **Monthly view:** if Q3 > 0, run `fix_monthly_leaderboard_view_v2_net.sql` once (expect “Success. No rows returned”).
4. **Profile repair:** run `score_repair_with_rollback.sql`; save **`backup_id`** from first result row; confirm **`penalty_mismatch_users`** = 0 and **`monthly_gt_all_time_users`** acceptable.
5. **Re-run** `debug_scores_leaderboard.sql` — Q1–Q3 should return **no rows**.
6. **If regression:** `rollback_score_repair.sql` — set `REPLACE_WITH_BACKUP_ID` to saved `backup_id`, then run.

---

## Appendix A — Pre-check SQL (read-only)

Run in one batch; ends with `rollback` so nothing persists.

```sql
begin;
set transaction read only;

with penalty_check as (
  select
    p.id,
    coalesce(p.total_penalties, 0) as profile_penalties,
    coalesce(sum(coalesce(qa.penalty, 0)), 0) as history_penalties
  from profiles p
  left join quiz_attempts qa on qa.user_id = p.id
  group by p.id, p.total_penalties
)
select count(*) filter (where profile_penalties <> history_penalties) as penalty_mismatch_users
from penalty_check;

with now_ctx as (
  select extract(month from now())::int as m, extract(year from now())::int as y
)
select count(*) as monthly_gt_all_time_users
from monthly_leaderboard_view mv
join leaderboard_view lv on lv.user_id = mv.user_id
cross join now_ctx n
where mv.month_num = n.m and mv.year_num = n.y
  and coalesce(mv.points, 0) > coalesce(lv.score, 0);

rollback;
```

---

## Appendix B — Post-check SQL (read-only)

Same pattern as Appendix A; compare counts to pre-check. Optional sample: top 20 by `profiles.points` joined to current month row in `monthly_leaderboard_view` — see former `operator_score_repair_checklist.sql` section C3 in git history if needed.

---

## Appendix C — Frontend expectations

- **All-time:** `leaderboard_view` → `points` / `reading_points` (see `leaderboardService.fetchAllTime`). Trust the view (`reading_points_ledger` when set). Do **not** re-page `quiz_attempts` for RDG.
- **Monthly:** `monthly_leaderboard_view` — **`points` is authoritative net for the month**; do not subtract `total_penalties` again in JS (`leaderboardService.fetchMonthly`).
- **Home / My Progress lesson count:** both use profile **`completed_lessons`** only (`filterCoreCompletedLessonIds`). Neither loads the attempt ledger. My Progress penalties use **`profiles.total_penalties`**.
- **Rank tap:** own row → My Progress. Anyone else (non-admin) → public pride card from the list row + HoF prizes — **no** per-user `quiz_attempts` fetch. Admin tapping someone else may load identity + PPE + tools.
- **Certificate verify:** `VerificationView` should select `total_penalties` if penalties are shown.
- **Cache:** use **`invalidateLeaderboardCaches`** whenever the user earns points outside the Competitions hourly flow (e.g. training lesson bonus) so the next leaderboard read is not served from stale `slm_cache_*` entries.
- **Monthly display (new users this calendar month):** the view buckets attempts by DB time on `created_at`; `lesson_bonus` rows can sit in an adjacent month vs the client’s local month filter, so **`fetchMonthly`** adds **`max(0, profiles.reading_points − view.reading_points)`** to the row’s **`points`** only when **`profiles.created_at` ≥ start of local month** — so totals match expectation (e.g. Kabir-style 170 vs 110) without double-counting when the view already includes monthly reading.
- **Encouragement boards (four monthly sub-tabs):** logic, eligibility, Hall of Fame archive, and UI are documented in **[`docs/developer-guides/monthly-encouragement-boards.md`](docs/developer-guides/monthly-encouragement-boards.md)**. Board assembly lives in **`src/utils/monthlyEncouragementBoards.js`**; **`fetchEncouragementBoards`** / **`fetchHallOfFame`** in **`leaderboardService.js`**.
- **Free-plan / egress:** landing, avatars, Rank tap card, pull-to-refresh, and Home ledger rules live in **[`docs/developer-guides/free-plan-optimization.md`](docs/developer-guides/free-plan-optimization.md)**. Do **not** snapshot the **live** monthly list (Online badge).

---

## Change log

- **2026-09:** Pull-to-refresh no longer prefetches Rank. HoF **v11** + closed-month snapshots. `reading_points_ledger` backfilled; All-time Rank overlay removed (v1.3.152+). See **`free-plan-optimization.md`**.
- **2026-06:** Encouragement boards: four monthly sub-tabs, top-3 prizes per board with **one prize per person** (`resolvePrizeWinners`), Hall of Fame display rows (`buildBoardDisplayList`); cache keys `leaderboard_encouragement_*` and `hall_of_fame_gallery_v*`; see **`monthly-encouragement-boards.md`**.
- **2026-05:** `fetchMonthly`: for users who **joined this local calendar month**, monthly **`points`** shown in the app now include **`max(0, profile.reading_points − view.reading_points)`** so reading is not dropped when DB month buckets disagree with the client (see “Time zones” above).
- **2026-04 (late):** Documented frontend leaderboard cache keys, `invalidateLeaderboardCaches`, post-score refetch paths, timezone vs “This month”, hourly id client behaviour; Training vs Competitions clock note.
- **2026-04:** Added trigger-safe repair, net monthly view, consolidated operator checklist into this document, removed duplicate `operator_score_repair_checklist.sql`.
