# Reading points ledger + safe DB cleanup

Operator steps (Supabase SQL editor → scripts). Non-destructive for live scores.

## 1) Reading ledger (do first)

1. Run in SQL editor: [`supabase/migrations/20260904120000_reading_points_ledger.sql`](../../supabase/migrations/20260904120000_reading_points_ledger.sql)
2. Backfill:

```powershell
node scripts/maintenance/backfill_reading_points_ledger.mjs
```

3. Spot-check Rank RDG vs a few heavy readers.
4. **Done in app (v1.3.152+):** All-time Rank trusts `leaderboard_view` (`COALESCE(reading_points_ledger, reading_points)`); client overlay removed.

5. After cleanup of fat backups, run [`20260904130000_restore_admin_backup_tables.sql`](../../supabase/migrations/20260904130000_restore_admin_backup_tables.sql) so Admin score reset has empty backup tables again (self-healing CREATE IF NOT EXISTS).

## 2) Safe table cleanup (after CSV/JSON export)

Exports already supported:

```powershell
node scripts/maintenance/export_cleanup_candidates.mjs
```

Then run: [`supabase/migrations/20260904121000_safe_table_cleanup.sql`](../../supabase/migrations/20260904121000_safe_table_cleanup.sql)

Drops admin backup snapshots (`backup_quiz_attempts`, `backup_profiles_progress`) and empty leftovers. Does **not** touch `profiles` / `quiz_attempts` / feature tables.
