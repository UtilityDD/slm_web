# Reading points ledger + safe DB cleanup

Operator steps (Supabase SQL editor → scripts). Non-destructive for live scores.

## 1) Reading ledger (do first)

1. Run in SQL editor: [`supabase/migrations/20260904120000_reading_points_ledger.sql`](../../supabase/migrations/20260904120000_reading_points_ledger.sql)
2. Backfill:

```powershell
node scripts/maintenance/backfill_reading_points_ledger.mjs
```

3. Spot-check Rank RDG vs a few heavy readers (should already match overlay).
4. After confidence: ship a PWA build that drops `overlayCumulativeReading` (view already returns `COALESCE(ledger, reading_points)`).

## 2) Safe table cleanup (after CSV/JSON export)

Exports already supported:

```powershell
node scripts/maintenance/export_cleanup_candidates.mjs
```

Then run: [`supabase/migrations/20260904121000_safe_table_cleanup.sql`](../../supabase/migrations/20260904121000_safe_table_cleanup.sql)

Drops admin backup snapshots (`backup_quiz_attempts`, `backup_profiles_progress`) and empty leftovers. Does **not** touch `profiles` / `quiz_attempts` / feature tables.
