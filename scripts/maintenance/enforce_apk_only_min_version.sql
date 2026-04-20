-- Minimal strict approach: restrict APK users only, do not affect PWA/web.
--
-- Strategy:
-- 1) Keep existing authenticate_user(p_phone, p_password) unchanged for PWA/web.
-- 2) Add APK-only RPC authenticate_user_mobile(..., p_app_version_code).
-- 3) APK app calls authenticate_user_mobile; old APKs get blocked by version.
--
-- NOTE:
-- This does NOT block users who still call old authenticate_user.
-- To fully enforce for APK, deploy APK update that uses authenticate_user_mobile.

begin;

-- Resolve required version from app_versions table.
-- Uses highest version_code where force_update = true.
create or replace function public.get_required_mobile_version()
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


-- APK-only version gate.
create or replace function public.assert_supported_mobile_version(p_app_version_code int)
returns void
language plpgsql
stable
as $$
declare
  req record;
begin
  select * into req from public.get_required_mobile_version();

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


-- APK-only login wrapper (same output shape as current login RPC usage).
create or replace function public.authenticate_user_mobile(
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
  perform public.assert_supported_mobile_version(p_app_version_code);

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

grant execute on function public.authenticate_user_mobile(text, text, int)
  to anon, authenticated, service_role;

commit;
