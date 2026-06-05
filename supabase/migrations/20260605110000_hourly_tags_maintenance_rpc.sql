-- Bulk tag updates for hourly_questions (maintenance script / service role only).

create or replace function maintenance_set_hourly_question_tags(p_payload jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rec jsonb;
  n integer := 0;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'array' then
    raise exception 'p_payload must be a JSON array of {id, difficulty}';
  end if;

  for rec in select value from jsonb_array_elements(p_payload) as t(value)
  loop
    update hourly_questions
    set tags = array[lower(trim(rec->>'difficulty'))]::text[]
    where id = (rec->>'id')::uuid
      and lower(trim(rec->>'difficulty')) in ('easy', 'medium', 'hard');
    n := n + 1;
  end loop;

  return n;
end;
$$;

revoke all on function maintenance_set_hourly_question_tags(jsonb) from public;
grant execute on function maintenance_set_hourly_question_tags(jsonb) to service_role;
