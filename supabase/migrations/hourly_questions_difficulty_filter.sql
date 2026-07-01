-- Optional server-side difficulty filter for hourly pool (client also filters).
-- Tags: lowercase easy | medium | hard on hourly_questions.tags and visual sheet.

create or replace function get_random_hourly_questions(
  lang text,
  limit_count int,
  difficulty_tags text[] default null
)
returns setof hourly_questions
language sql
stable
as $$
  select *
  from hourly_questions
  where language = lang
    and (
      difficulty_tags is null
      or cardinality(difficulty_tags) = 0
      or tags && difficulty_tags
      or tags is null
      or cardinality(tags) = 0
    )
  order by random()
  limit limit_count;
$$;
