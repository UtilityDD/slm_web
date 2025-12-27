-- Create app_versions table
create table if not exists public.app_versions (
  id uuid default gen_random_uuid() primary key,
  version_code int not null,
  version_name text not null,
  force_update boolean default false,
  update_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.app_versions enable row level security;

-- Create policy to allow public read access
create policy "Allow public read access"
  on public.app_versions
  for select
  to public
  using (true);

-- Insert initial version (Version 1)
insert into public.app_versions (version_code, version_name, force_update, update_url)
values (1, '1.0.0', false, 'https://play.google.com/store/apps/details?id=com.smartlineman.app');
