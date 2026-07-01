-- Online PTW permits: realtime sync between lineman and operator (Phase 1).
-- Writes go through security-definer RPCs; open SELECT for realtime delivery.

create table if not exists public.ptw_permits (
  id uuid primary key default gen_random_uuid(),
  permit_no text not null unique,
  status text not null default 'submitted'
    check (status in (
      'submitted', 'accepted', 'shutdown_confirmed', 'work_started',
      'work_complete', 'clearing', 'charged', 'cancelled'
    )),
  feeder text,
  location text,
  work text,
  comment text,
  crew jsonb not null default '[]'::jsonb,
  operator_name text,
  operator_phone text not null,
  lineman_phone text,
  confirm_code text,
  release_code text,
  lineman_user_id uuid,
  submitted_at timestamptz not null default now(),
  accepted_at timestamptz,
  shutdown_at timestamptz,
  work_started_at timestamptz,
  work_completed_at timestamptz,
  charged_at timestamptz,
  log jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ptw_permits_operator_status_idx
  on public.ptw_permits (operator_phone, status, submitted_at desc);

create index if not exists ptw_permits_permit_no_idx
  on public.ptw_permits (permit_no);

alter table public.ptw_permits enable row level security;

drop policy if exists ptw_read_public on public.ptw_permits;
create policy ptw_read_public on public.ptw_permits
  for select using (true);

drop policy if exists ptw_no_direct_insert on public.ptw_permits;
create policy ptw_no_direct_insert on public.ptw_permits
  for insert with check (false);

drop policy if exists ptw_no_direct_update on public.ptw_permits;
create policy ptw_no_direct_update on public.ptw_permits
  for update using (false);

drop policy if exists ptw_no_direct_delete on public.ptw_permits;
create policy ptw_no_direct_delete on public.ptw_permits
  for delete using (false);

-- Realtime (safe to ignore if already in publication)
do $$
begin
  alter publication supabase_realtime add table public.ptw_permits;
exception
  when duplicate_object then null;
  when others then null;
end $$;

create or replace function public.ptw_normalize_phone(p text)
returns text
language sql
immutable
as $$
  select right(regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g'), 10);
$$;

create or replace function public.ptw_append_log(p_log jsonb, p_action text, p_detail jsonb default '{}'::jsonb)
returns jsonb
language sql
immutable
as $$
  select coalesce(p_log, '[]'::jsonb) || jsonb_build_array(
    jsonb_build_object(
      'ts', to_jsonb(now() at time zone 'utc'),
      'action', p_action
    ) || coalesce(p_detail, '{}'::jsonb)
  );
$$;

create or replace function public.ptw_submit_request(
  p_permit_no text,
  p_feeder text,
  p_location text,
  p_work text,
  p_operator_name text,
  p_operator_phone text,
  p_lineman_phone text default null,
  p_comment text default null,
  p_crew jsonb default '[]'::jsonb
)
returns public.ptw_permits
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.ptw_permits;
  v_op_phone text := ptw_normalize_phone(p_operator_phone);
begin
  if coalesce(trim(p_permit_no), '') = '' then
    raise exception 'permit_no required';
  end if;
  if v_op_phone = '' then
    raise exception 'operator_phone required';
  end if;

  insert into public.ptw_permits (
    permit_no, status, feeder, location, work, comment, crew,
    operator_name, operator_phone, lineman_phone, log
  ) values (
    trim(p_permit_no),
    'submitted',
    nullif(trim(p_feeder), ''),
    nullif(trim(p_location), ''),
    nullif(trim(p_work), ''),
    nullif(trim(p_comment), ''),
    coalesce(p_crew, '[]'::jsonb),
    nullif(trim(p_operator_name), ''),
    v_op_phone,
    nullif(ptw_normalize_phone(p_lineman_phone), ''),
    ptw_append_log('[]'::jsonb, 'submitted', jsonb_build_object('via', 'online'))
  )
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.ptw_get_by_permit_no(p_permit_no text)
returns public.ptw_permits
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.ptw_permits
  where permit_no = trim(p_permit_no)
  limit 1;
$$;

create or replace function public.ptw_list_for_operator(p_operator_phone text)
returns setof public.ptw_permits
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.ptw_permits
  where operator_phone = ptw_normalize_phone(p_operator_phone)
    and status not in ('charged', 'cancelled')
  order by submitted_at desc
  limit 30;
$$;

create or replace function public.ptw_operator_accept(
  p_permit_no text,
  p_operator_phone text
)
returns public.ptw_permits
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.ptw_permits;
  v_phone text := ptw_normalize_phone(p_operator_phone);
begin
  update public.ptw_permits
  set
    status = 'accepted',
    accepted_at = now(),
    updated_at = now(),
    log = ptw_append_log(log, 'accepted', jsonb_build_object('via', 'online'))
  where permit_no = trim(p_permit_no)
    and operator_phone = v_phone
    and status = 'submitted'
  returning * into v_row;

  if v_row.id is null then
    raise exception 'not found or already handled';
  end if;
  return v_row;
end;
$$;

create or replace function public.ptw_operator_shutdown_confirm(
  p_permit_no text,
  p_operator_phone text,
  p_feeder_confirm text
)
returns public.ptw_permits
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.ptw_permits;
  v_phone text := ptw_normalize_phone(p_operator_phone);
  v_code text;
begin
  select * into v_row
  from public.ptw_permits
  where permit_no = trim(p_permit_no)
    and operator_phone = v_phone
    and status in ('submitted', 'accepted');

  if v_row.id is null then
    raise exception 'not found or invalid status';
  end if;

  if lower(trim(coalesce(v_row.feeder, ''))) <> lower(trim(coalesce(p_feeder_confirm, ''))) then
    raise exception 'feeder mismatch';
  end if;

  v_code := lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');

  update public.ptw_permits
  set
    status = 'shutdown_confirmed',
    shutdown_at = now(),
    confirm_code = v_code,
    updated_at = now(),
    log = ptw_append_log(log, 'shutdown_confirmed', jsonb_build_object('via', 'online', 'code', v_code))
  where id = v_row.id
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.ptw_lineman_start_work(
  p_permit_no text,
  p_lineman_phone text default null
)
returns public.ptw_permits
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.ptw_permits;
  v_lm text := nullif(ptw_normalize_phone(p_lineman_phone), '');
begin
  update public.ptw_permits
  set
    status = 'work_started',
    work_started_at = now(),
    updated_at = now(),
    log = ptw_append_log(log, 'work_started', jsonb_build_object('via', 'online'))
  where permit_no = trim(p_permit_no)
    and status = 'shutdown_confirmed'
    and (v_lm is null or lineman_phone is null or lineman_phone = '' or lineman_phone = v_lm)
  returning * into v_row;

  if v_row.id is null then
    raise exception 'not found or invalid status';
  end if;
  return v_row;
end;
$$;

grant execute on function public.ptw_submit_request(text, text, text, text, text, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.ptw_get_by_permit_no(text) to anon, authenticated;
grant execute on function public.ptw_list_for_operator(text) to anon, authenticated;
grant execute on function public.ptw_operator_accept(text, text) to anon, authenticated;
grant execute on function public.ptw_operator_shutdown_confirm(text, text, text) to anon, authenticated;
grant execute on function public.ptw_lineman_start_work(text, text) to anon, authenticated;
