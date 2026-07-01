-- Optional server-side filter for tagged hourly questions.
-- Untagged rows are treated as easy when difficulty_tags is null/empty.
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
      or (tags is not null and cardinality(tags) > 0 and tags && difficulty_tags)
    )
  order by random()
  limit limit_count;
$$;
