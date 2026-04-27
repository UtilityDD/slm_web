-- Rollback Score Repair
-- Usage:
-- 1) Replace the backup id below with the value returned by score_repair_with_rollback.sql.
-- 2) Run in a transaction.

begin;

-- REQUIRED: set this to an existing backup id
create temporary table _rollback_ctx as
select 'REPLACE_WITH_BACKUP_ID'::text as backup_id;

-- Guard: ensure backup exists
do $$
declare
  v_count int;
begin
  select count(*) into v_count
  from score_repair_backup_profiles b
  join _rollback_ctx c on c.backup_id = b.backup_id;

  if v_count = 0 then
    raise exception 'No rows found in score_repair_backup_profiles for backup_id=%', (select backup_id from _rollback_ctx);
  end if;
end $$;

-- Avoid sync_profile_points_trigger rewriting `points` during restore
do $$
begin
  if exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'profiles'
      and t.tgname = 'trg_sync_profile_points'
      and not t.tgisinternal
  ) then
    execute 'alter table public.profiles disable trigger trg_sync_profile_points';
  end if;
end $$;

-- Restore profile score columns exactly
update profiles p
set
  points = b.points,
  reading_points = b.reading_points,
  quiz_points = b.quiz_points,
  total_penalties = b.total_penalties,
  updated_at = now()
from score_repair_backup_profiles b
join _rollback_ctx c on c.backup_id = b.backup_id
where p.id = b.user_id;

do $$
begin
  if exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'profiles'
      and t.tgname = 'trg_sync_profile_points'
      and not t.tgisinternal
  ) then
    execute 'alter table public.profiles enable trigger trg_sync_profile_points';
  end if;
end $$;

-- Optional verification output
select
  (select backup_id from _rollback_ctx) as restored_backup_id,
  count(*) as restored_profiles
from score_repair_backup_profiles b
join _rollback_ctx c on c.backup_id = b.backup_id;

commit;
