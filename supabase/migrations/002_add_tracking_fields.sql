-- Migration: Add connection tracking fields to contacts table
-- Run this in your Supabase SQL editor (Project → SQL Editor)

-- Add new status values by recreating the check constraint
alter table public.contacts
  drop constraint if exists contacts_status_check;

alter table public.contacts
  add constraint contacts_status_check
  check (status in ('Pending', 'Connected', 'Messaged', 'Replied', 'Meeting Booked', 'Closed', 'Lost'));

-- Add tracking timestamp columns
alter table public.contacts
  add column if not exists connection_sent_at timestamptz,
  add column if not exists connected_at timestamptz,
  add column if not exists last_messaged_at timestamptz,
  add column if not exists last_replied_at timestamptz,
  add column if not exists viewed_profile_at timestamptz,
  add column if not exists auto_followup_days int default 2;

-- Backfill: existing "Connected" contacts keep their status
-- Existing contacts without connection_sent_at use created_at as fallback
update public.contacts
  set connection_sent_at = created_at
  where connection_sent_at is null and status != 'Pending';
