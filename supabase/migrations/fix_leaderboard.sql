-- Run this script in your Supabase SQL Editor to fix the Leaderboard

-- 1. Ensure the table exists
create table if not exists quiz_attempts (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users not null,
  quiz_id text not null,
  score integer not null
);

-- 2. CRITICAL: Add the Foreign Key to profiles for the JOIN to work
-- This allows: supabase.from('quiz_attempts').select('..., profiles(...)')
alter table quiz_attempts 
drop constraint if exists quiz_attempts_user_id_fkey;

alter table quiz_attempts
add constraint quiz_attempts_user_id_fkey 
foreign key (user_id) 
references profiles(id)
on delete cascade;

-- 3. Enable RLS (Row Level Security)
alter table quiz_attempts enable row level security;

-- 4. Allow ANYONE to read leaderboard data (public read access)
create policy "Public can view quiz attempts"
on quiz_attempts for select
using (true);

-- 5. Allow users to insert their *own* attempts (via the RPC we made earlier, but good to have)
create policy "Users can insert own attempts"
on quiz_attempts for insert
with check (auth.uid() = user_id);
