-- Sponsor full-screen ad: config table + admin/public RPCs.
-- Fully additive & isolated: new table + new functions only. Does NOT touch
-- existing tables, functions, auth, notifications, or storage buckets.
-- Run via Supabase migrations or paste into the SQL Editor.
-- Requires: public.profiles with column role (text or compatible).

create table if not exists public.sponsor_ads (
  id uuid primary key default gen_random_uuid(),
  headline text not null default '',
  subtext text not null default '',
  sponsor_name text not null default '',
  image_url text,
  logo_url text,
  contact_phone text,
  contact_email text,
  contact_url text,
  cta_label text,
  theme text not null default 'dark',           -- 'dark' | 'light'
  display_seconds int not null default 5,        -- auto-dismiss after N seconds
  allow_skip boolean not null default true,      -- show a Skip/Close control
  starts_at timestamptz,                         -- null = open start
  ends_at timestamptz,                           -- null = open end
  is_active boolean not null default true,       -- master on/off
  admin_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sponsor_ads enable row level security;

-- Additive columns (safe to re-run): rotating headlines + Safety Mitra cue.
alter table public.sponsor_ads add column if not exists headlines text[];
alter table public.sponsor_ads add column if not exists contact_safety_mitra boolean not null default false;

-- Public: only the single currently-live, in-date-range ad (latest wins).
create or replace function public.get_active_sponsor_ad()
returns setof public.sponsor_ads
language sql
stable
security definer
set search_path = public
as $$
  select s.*
  from public.sponsor_ads s
  where s.is_active = true
    and (s.starts_at is null or s.starts_at <= now())
    and (s.ends_at is null or s.ends_at >= now())
  order by s.created_at desc
  limit 1;
$$;

-- Admin: list all sponsor ads for management.
create or replace function public.get_sponsor_ads_admin(p_caller_id uuid)
returns setof public.sponsor_ads
language sql
stable
security definer
set search_path = public
as $$
  select s.*
  from public.sponsor_ads s
  where exists (
    select 1 from public.profiles p
    where p.id = p_caller_id
      and trim(lower(p.role::text)) = 'admin'
  )
  order by s.created_at desc
  limit 100;
$$;

-- Admin: create or update a sponsor ad. Pass p_id to update, null to insert.
-- Drop the older signature (without rotating headlines / mitra) if it exists.
drop function if exists public.admin_upsert_sponsor_ad(
  uuid, text, text, text, text, text, text, text, text, text, text, int, boolean, timestamptz, timestamptz, boolean, uuid
);

create or replace function public.admin_upsert_sponsor_ad(
  p_caller_id uuid,
  p_headline text,
  p_subtext text,
  p_sponsor_name text,
  p_image_url text,
  p_logo_url text,
  p_contact_phone text,
  p_contact_email text,
  p_contact_url text,
  p_cta_label text,
  p_theme text,
  p_display_seconds int,
  p_allow_skip boolean,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_is_active boolean,
  p_headlines text[] default null,
  p_contact_safety_mitra boolean default false,
  p_id uuid default null
)
returns public.sponsor_ads
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.sponsor_ads;
  v_theme text := case when lower(coalesce(p_theme, 'dark')) = 'light' then 'light' else 'dark' end;
  v_seconds int := greatest(2, least(30, coalesce(p_display_seconds, 5)));
  v_headlines text[] := case
    when p_headlines is null or array_length(p_headlines, 1) is null then null
    else p_headlines
  end;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = p_caller_id and trim(lower(p.role::text)) = 'admin'
  ) then
    raise exception 'not authorized';
  end if;

  if p_id is null then
    insert into public.sponsor_ads (
      headline, subtext, sponsor_name, image_url, logo_url,
      contact_phone, contact_email, contact_url, cta_label,
      theme, display_seconds, allow_skip, starts_at, ends_at, is_active,
      headlines, contact_safety_mitra, admin_id
    )
    values (
      trim(coalesce(p_headline, '')), trim(coalesce(p_subtext, '')), trim(coalesce(p_sponsor_name, '')),
      nullif(trim(coalesce(p_image_url, '')), ''), nullif(trim(coalesce(p_logo_url, '')), ''),
      nullif(trim(coalesce(p_contact_phone, '')), ''), nullif(trim(coalesce(p_contact_email, '')), ''),
      nullif(trim(coalesce(p_contact_url, '')), ''), nullif(trim(coalesce(p_cta_label, '')), ''),
      v_theme, v_seconds, coalesce(p_allow_skip, true), p_starts_at, p_ends_at,
      coalesce(p_is_active, true),
      v_headlines, coalesce(p_contact_safety_mitra, false), p_caller_id
    )
    returning * into v_row;
  else
    update public.sponsor_ads set
      headline = trim(coalesce(p_headline, '')),
      subtext = trim(coalesce(p_subtext, '')),
      sponsor_name = trim(coalesce(p_sponsor_name, '')),
      image_url = nullif(trim(coalesce(p_image_url, '')), ''),
      logo_url = nullif(trim(coalesce(p_logo_url, '')), ''),
      contact_phone = nullif(trim(coalesce(p_contact_phone, '')), ''),
      contact_email = nullif(trim(coalesce(p_contact_email, '')), ''),
      contact_url = nullif(trim(coalesce(p_contact_url, '')), ''),
      cta_label = nullif(trim(coalesce(p_cta_label, '')), ''),
      theme = v_theme,
      display_seconds = v_seconds,
      allow_skip = coalesce(p_allow_skip, true),
      starts_at = p_starts_at,
      ends_at = p_ends_at,
      is_active = coalesce(p_is_active, true),
      headlines = v_headlines,
      contact_safety_mitra = coalesce(p_contact_safety_mitra, false),
      updated_at = now()
    where id = p_id
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

create or replace function public.admin_set_sponsor_ad_active(
  p_caller_id uuid,
  p_id uuid,
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
  update public.sponsor_ads
  set is_active = p_is_active, updated_at = now()
  where id = p_id;
end;
$$;

create or replace function public.admin_delete_sponsor_ad(
  p_caller_id uuid,
  p_id uuid
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
  delete from public.sponsor_ads where id = p_id;
end;
$$;

revoke all on function public.get_active_sponsor_ad() from public;
revoke all on function public.get_sponsor_ads_admin(uuid) from public;
revoke all on function public.admin_upsert_sponsor_ad(uuid, text, text, text, text, text, text, text, text, text, text, int, boolean, timestamptz, timestamptz, boolean, text[], boolean, uuid) from public;
revoke all on function public.admin_set_sponsor_ad_active(uuid, uuid, boolean) from public;
revoke all on function public.admin_delete_sponsor_ad(uuid, uuid) from public;

grant execute on function public.get_active_sponsor_ad() to anon;
grant execute on function public.get_active_sponsor_ad() to authenticated;
grant execute on function public.get_sponsor_ads_admin(uuid) to anon;
grant execute on function public.get_sponsor_ads_admin(uuid) to authenticated;
grant execute on function public.admin_upsert_sponsor_ad(uuid, text, text, text, text, text, text, text, text, text, text, int, boolean, timestamptz, timestamptz, boolean, text[], boolean, uuid) to anon;
grant execute on function public.admin_upsert_sponsor_ad(uuid, text, text, text, text, text, text, text, text, text, text, int, boolean, timestamptz, timestamptz, boolean, text[], boolean, uuid) to authenticated;
grant execute on function public.admin_set_sponsor_ad_active(uuid, uuid, boolean) to anon;
grant execute on function public.admin_set_sponsor_ad_active(uuid, uuid, boolean) to authenticated;
grant execute on function public.admin_delete_sponsor_ad(uuid, uuid) to anon;
grant execute on function public.admin_delete_sponsor_ad(uuid, uuid) to authenticated;
