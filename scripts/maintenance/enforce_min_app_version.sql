-- Enforce minimum supported app version from app_versions table.
--
-- What this gives you:
-- 1) A single source of truth from app_versions (force_update=true rows).
-- 2) A reusable guard function to block old clients.
-- 3) A login wrapper RPC (authenticate_user_v2) that blocks old APK versions.
--
-- IMPORTANT:
-- - Your current client calls authenticate_user(phone, password).
-- - To hard-enforce version at login, switch client to authenticate_user_v2
--   and pass p_app_version_code from the app build.

begin;

-- -----------------------------------------------------
-- 0) Ensure version_code uniqueness and fast lookups
-- -----------------------------------------------------
create unique index if not exists app_versions_version_code_uq
  on public.app_versions(version_code);

create index if not exists app_versions_force_update_code_idx
  on public.app_versions(force_update, version_code desc);


-- -----------------------------------------------------
-- 1) Resolve required version from table
-- Rule: highest version_code where force_update=true.
-- If none are force_update=true, no hard block is applied.
-- -----------------------------------------------------
create or replace function public.get_required_app_version()
returns table (
  required_version_code int,
  required_version_name text,
  required_update_url text
)
language sql
stable
as $$
  select
    av.version_code,
    av.version_name,
    av.update_url
  from public.app_versions av
  where coalesce(av.force_update, false) = true
  order by av.version_code desc
  limit 1
$$;


-- -----------------------------------------------------
-- 2) Guard: raises UPDATE_REQUIRED when client is too old
-- -----------------------------------------------------
create or replace function public.assert_supported_app_version(p_app_version_code int)
returns void
language plpgsql
stable
as $$
declare
  req record;
begin
  select * into req from public.get_required_app_version();

  -- No forced minimum configured => allow.
  if req is null then
    return;
  end if;

  if p_app_version_code is null then
    raise exception
      using
        errcode = 'P0001',
        message = format(
          'UPDATE_REQUIRED|missing_version|required_code=%s|required_name=%s|update_url=%s',
          req.required_version_code,
          coalesce(req.required_version_name, ''),
          coalesce(req.required_update_url, '')
        );
  end if;

  if p_app_version_code < req.required_version_code then
    raise exception
      using
        errcode = 'P0001',
        message = format(
          'UPDATE_REQUIRED|client_code=%s|required_code=%s|required_name=%s|update_url=%s',
          p_app_version_code,
          req.required_version_code,
          coalesce(req.required_version_name, ''),
          coalesce(req.required_update_url, '')
        );
  end if;
end;
$$;


-- -----------------------------------------------------
-- 3) Version-gated login wrapper
-- NOTE: This depends on your existing authenticate_user(p_phone, p_password)
-- returning at least these columns.
-- -----------------------------------------------------
create or replace function public.authenticate_user_v2(
  p_phone text,
  p_password text,
  p_app_version_code int
)
returns table (
  user_id uuid,
  phone_number text,
  full_name text,
  role text,
  slm_id text,
  must_change_password boolean,
  session_token text
)
language plpgsql
security definer
as $$
begin
  perform public.assert_supported_app_version(p_app_version_code);

  return query
  select
    au.user_id,
    au.phone_number,
    au.full_name,
    au.role,
    au.slm_id,
    au.must_change_password,
    au.session_token
  from public.authenticate_user(p_phone, p_password) au;
end;
$$;

grant execute on function public.authenticate_user_v2(text, text, int)
  to anon, authenticated, service_role;


-- -----------------------------------------------------
-- 4) Optional: hard-cut old clients entirely after app update rollout
-- Uncomment ONLY after client has switched to authenticate_user_v2.
-- -----------------------------------------------------
-- revoke execute on function public.authenticate_user(text, text)
--   from anon, authenticated;

commit;
