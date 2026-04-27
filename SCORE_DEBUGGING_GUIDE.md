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

- **All-time:** `leaderboard_view` → `points` / `reading_points` (see `leaderboardService.fetchAllTime`).
- **Monthly:** `monthly_leaderboard_view` — **`points` is authoritative net for the month**; do not subtract `total_penalties` again in JS (`leaderboardService.fetchMonthly`).
- **Certificate verify:** `VerificationView` should select `total_penalties` if penalties are shown.

---

## Change log

- **2026-04:** Added trigger-safe repair, net monthly view, consolidated operator checklist into this document, removed duplicate `operator_score_repair_checklist.sql`.
