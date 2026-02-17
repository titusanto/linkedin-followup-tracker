-- LinkedIn Follow-up Tracker - Supabase Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Contacts table
create table if not exists public.contacts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,

  -- Profile info (auto-captured from LinkedIn)
  name text not null,
  linkedin_url text not null,
  company text,
  role text,
  location text,
  profile_image text,
  email text,
  phone text,

  -- Connection tracking
  status text not null default 'Pending' check (
    status in ('Pending', 'Connected', 'Messaged', 'Replied', 'Meeting Booked', 'Closed', 'Lost')
  ),
  connection_sent_at timestamptz,       -- When you clicked Connect
  connected_at timestamptz,             -- When they accepted (manual update)
  last_messaged_at timestamptz,         -- When you last sent a message
  last_replied_at timestamptz,          -- When they last replied
  viewed_profile_at timestamptz,        -- When they viewed your profile

  -- Follow-up
  notes text,
  next_followup date,                   -- Next follow-up date
  auto_followup_days int default 2,     -- Days after connecting to auto-suggest followup

  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  -- Unique constraint: one linkedin_url per user
  unique (user_id, linkedin_url)
);

-- Auto-update updated_at on row change
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger contacts_updated_at
  before update on public.contacts
  for each row execute procedure public.handle_updated_at();

-- Row Level Security: users can only access their own contacts
alter table public.contacts enable row level security;

create policy "Users can view their own contacts"
  on public.contacts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own contacts"
  on public.contacts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own contacts"
  on public.contacts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own contacts"
  on public.contacts for delete
  using (auth.uid() = user_id);

-- Index for faster lookups
create index if not exists contacts_user_id_idx on public.contacts(user_id);
create index if not exists contacts_next_followup_idx on public.contacts(next_followup);
create index if not exists contacts_status_idx on public.contacts(status);
create index if not exists contacts_linkedin_url_idx on public.contacts(user_id, linkedin_url);
