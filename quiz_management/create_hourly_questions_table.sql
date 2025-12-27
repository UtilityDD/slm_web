-- Create the table for hourly quiz questions
create table public.hourly_questions (
  id uuid not null default gen_random_uuid (),
  question_text text not null,
  options jsonb not null, -- Stores the array of options ["A", "B", "C", "D"]
  correct_answer_index integer not null,
  category text null,
  tags text[] null,
  language text not null check (language in ('en', 'bn')), -- 'en' for English, 'bn' for Bengali
  created_at timestamp with time zone not null default now(),
  constraint hourly_questions_pkey primary key (id)
);

-- Enable Row Level Security (RLS)
alter table public.hourly_questions enable row level security;

-- Create a policy that allows anyone to read the questions (public access)
create policy "Enable read access for all users" on public.hourly_questions
  for select
  using (true);

-- Create a policy that allows only authenticated users (or service role) to insert/update/delete
-- For now, we'll allow service role (used by migration script) to bypass RLS, 
-- but explicit policies are good practice.
create policy "Enable insert for authenticated users only" on public.hourly_questions
  for insert
  with check (auth.role() = 'authenticated' or auth.role() = 'service_role');

-- Create a function to get random questions efficiently
-- This avoids fetching all rows to the client
create or replace function get_random_hourly_questions(lang text, limit_count int)
returns setof hourly_questions
language sql
as $$
  select *
  from hourly_questions
  where language = lang
  order by random()
  limit limit_count;
$$;
