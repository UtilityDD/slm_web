-- Admin broadcast helpers: bypass RLS for callers verified as admin in public.profiles.
-- Run via Supabase migrations or paste into SQL Editor if the table already exists.
-- Requires: public.notifications, public.profiles with column role (text or compatible).

create or replace function public.get_notifications_admin(p_caller_id uuid)
returns setof public.notifications
language sql
stable
security definer
set search_path = public
as $$
  select n.*
  from public.notifications n
  where exists (
    select 1
    from public.profiles p
    where p.id = p_caller_id
      and trim(lower(p.role::text)) = 'admin'
  )
  order by n.created_at desc
  limit 100;
$$;

create or replace function public.get_active_notifications_public()
returns setof public.notifications
language sql
stable
security definer
set search_path = public
as $$
  select n.*
  from public.notifications n
  where n.is_active = true
  order by n.created_at desc
  limit 40;
$$;

create or replace function public.admin_set_notification_active(
  p_caller_id uuid,
  p_notification_id uuid,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = p_caller_id and trim(lower(p.role::text)) = 'admin'
  ) then
    raise exception 'not authorized';
  end if;
  update public.notifications
  set is_active = p_is_active
  where id = p_notification_id;
end;
$$;

create or replace function public.admin_create_notification(
  p_caller_id uuid,
  p_title text,
  p_message text,
  p_type text default 'info'
)
returns public.notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.notifications;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = p_caller_id and trim(lower(p.role::text)) = 'admin'
  ) then
    raise exception 'not authorized';
  end if;

  insert into public.notifications (title, message, type, is_active, admin_id)
  values (
    trim(p_title),
    trim(p_message),
    coalesce(nullif(trim(lower(p_type)), ''), 'info'),
    true,
    p_caller_id
  )
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.admin_delete_notification(
  p_caller_id uuid,
  p_notification_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = p_caller_id and trim(lower(p.role::text)) = 'admin'
  ) then
    raise exception 'not authorized';
  end if;
  delete from public.notifications where id = p_notification_id;
end;
$$;

revoke all on function public.get_notifications_admin(uuid) from public;
revoke all on function public.get_active_notifications_public() from public;
revoke all on function public.admin_create_notification(uuid, text, text, text) from public;
revoke all on function public.admin_set_notification_active(uuid, uuid, boolean) from public;
revoke all on function public.admin_delete_notification(uuid, uuid) from public;

grant execute on function public.get_notifications_admin(uuid) to anon;
grant execute on function public.get_notifications_admin(uuid) to authenticated;
grant execute on function public.get_active_notifications_public() to anon;
grant execute on function public.get_active_notifications_public() to authenticated;
grant execute on function public.admin_create_notification(uuid, text, text, text) to anon;
grant execute on function public.admin_create_notification(uuid, text, text, text) to authenticated;
grant execute on function public.admin_set_notification_active(uuid, uuid, boolean) to anon;
grant execute on function public.admin_set_notification_active(uuid, uuid, boolean) to authenticated;
grant execute on function public.admin_delete_notification(uuid, uuid) to anon;
grant execute on function public.admin_delete_notification(uuid, uuid) to authenticated;
