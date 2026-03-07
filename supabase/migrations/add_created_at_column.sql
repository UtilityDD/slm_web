-- Run this script to fix the "column created_at does not exist" error

alter table quiz_attempts
add column if not exists created_at timestamp with time zone default timezone('utc'::text, now()) not null;
