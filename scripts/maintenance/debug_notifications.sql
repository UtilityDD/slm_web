-- =============================================================================
-- NOTIFICATIONS: DATABASE DEBUG (read-only sections)
-- Run in Supabase SQL Editor. Interpret each section before changing data.
-- =============================================================================
--
-- APP EXPECTATION (from SmartLinemanUI.jsx):
--   SELECT * FROM notifications WHERE is_active = true ORDER BY created_at DESC LIMIT 20
--
-- If rows exist here but users see nothing, suspect: RLS, is_active, cache, or network.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) RECENT ROWS (what the database actually has)
-- -----------------------------------------------------------------------------
select
  id,
  title,
  left(message, 120) as message_preview,
  type,
  is_active,
  admin_id,
  created_at
from public.notifications
order by created_at desc
limit 25;

-- -----------------------------------------------------------------------------
-- 2) FILTER MATCHES EXACTLY WHAT THE APP USES
-- -----------------------------------------------------------------------------
select
  id,
  title,
  type,
  is_active,
  created_at
from public.notifications
where coalesce(is_active, false) = true
order by created_at desc
limit 25;

-- If section (1) shows rows but section (2) is empty: is_active is false or NULL.

-- -----------------------------------------------------------------------------
-- 3) COLUMN DEFINITIONS (defaults, nullability)
-- -----------------------------------------------------------------------------
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'notifications'
order by ordinal_position;

-- -----------------------------------------------------------------------------
-- 4) RLS: IS IT ENABLED? WHAT POLICIES EXIST?
-- -----------------------------------------------------------------------------
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'notifications';

select
  policyname as policy_name,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
from pg_policies
where schemaname = 'public'
  and tablename = 'notifications'
order by policyname;

-- -----------------------------------------------------------------------------
-- 5) REALTIME: IS notifications IN THE supabase_realtime PUBLICATION?
-- (If missing, INSERT events will not push to clients.)
-- -----------------------------------------------------------------------------
select
  pubname,
  schemaname,
  tablename
from pg_publication_tables
where tablename = 'notifications';

-- -----------------------------------------------------------------------------
-- 6) OPTIONAL: ROWS THAT FAIL THE APP FILTER
-- -----------------------------------------------------------------------------
select
  count(*) filter (where coalesce(is_active, false) = true) as active_rows,
  count(*) filter (where coalesce(is_active, false) = false) as inactive_rows,
  count(*) filter (where is_active is null) as null_is_active_rows,
  count(*) as total_rows
from public.notifications;

-- =============================================================================
-- REMEDIATION (EDIT BEFORE RUN) — only after you understand sections 1–6
-- =============================================================================
--
-- A) Activate latest maintenance row by title (example):
-- update public.notifications
-- set is_active = true
-- where title = 'সাময়িক বিরতি (২ ঘণ্টা)';
--
-- B) If admin_id is NOT NULL and inserts failed from app, set admin_id on insert:
-- insert into public.notifications (title, message, type, is_active, admin_id)
-- values (
--   'সাময়িক বিরতি (২ ঘণ্টা)',
--   '...message...',
--   'warning',
--   true,
--   'PASTE_ADMIN_PROFILE_UUID'::uuid
-- );
--
-- C) Enable Realtime for this table (Supabase Dashboard path):
--    Database → Replication → enable for public.notifications
--    (Or use SQL equivalent if your project uses publication management.)
-- =============================================================================
