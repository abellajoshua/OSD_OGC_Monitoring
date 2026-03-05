-- UPDATE SQL - Latest Changes
-- Run this SQL in Supabase SQL Editor to update existing database

-- Create Major Offenses table (if not exists)
create table if not exists public.major_offenses (
  id bigserial primary key,
  date_of_complaint date not null,
  name_of_student text not null,
  sr_code text not null,
  year_program text not null,
  contact_number text not null,
  reported_by text not null,
  sex text not null,
  offense text not null,
  sanction text not null,
  date_of_sanction date not null,
  archived boolean default false,
  created_at timestamptz default now()
);

-- Add archived column to all existing tables
alter table public.minor_offenses add column if not exists archived boolean default false;
alter table public.major_offenses add column if not exists archived boolean default false;
alter table public.non_wearing_uniform add column if not exists archived boolean default false;
alter table public.gatepass add column if not exists archived boolean default false;
alter table public.good_moral add column if not exists archived boolean default false;

-- Create ID Replacement table (if not exists)
create table if not exists public.id_replacement (
  id bigserial primary key,
  date date not null,
  time_in time not null,
  time_out time not null,
  name text not null,
  sr_code text not null,
  course text not null,
  sex text not null,
  reason text not null,
  archived boolean default false,
  created_at timestamptz default now()
);

-- Create Leave of Absence table (if not exists)
create table if not exists public.leave_of_absence (
  id bigserial primary key,
  date date not null,
  time_in time not null,
  time_out time not null,
  name text not null,
  sr_code text not null,
  course text not null,
  sex text not null,
  reason text not null,
  archived boolean default false,
  created_at timestamptz default now()
);

-- Add archived column to new tables (if they exist without it)
alter table public.id_replacement add column if not exists archived boolean default false;
alter table public.leave_of_absence add column if not exists archived boolean default false;

-- Create indexes for better query performance
create index if not exists id_replacement_sr_code_idx on public.id_replacement (sr_code);
create index if not exists leave_of_absence_sr_code_idx on public.leave_of_absence (sr_code);

-- Create indexes for archived column for faster filtering
create index if not exists minor_offenses_archived_idx on public.minor_offenses (archived);
create index if not exists major_offenses_archived_idx on public.major_offenses (archived);
create index if not exists non_wearing_uniform_archived_idx on public.non_wearing_uniform (archived);
create index if not exists gatepass_archived_idx on public.gatepass (archived);
create index if not exists good_moral_archived_idx on public.good_moral (archived);
create index if not exists id_replacement_archived_idx on public.id_replacement (archived);
create index if not exists leave_of_absence_archived_idx on public.leave_of_absence (archived);

-- Grant permissions to authenticated users
grant select, insert, update, delete on table public.id_replacement to authenticated;
grant select, insert, update, delete on table public.leave_of_absence to authenticated;

grant usage, select on sequence public.id_replacement_id_seq to authenticated;
grant usage, select on sequence public.leave_of_absence_id_seq to authenticated;

-- Enable Row Level Security
alter table public.id_replacement enable row level security;
alter table public.leave_of_absence enable row level security;

-- Create RLS policies
drop policy if exists "authenticated_id_replacement_all" on public.id_replacement;
create policy "authenticated_id_replacement_all"
on public.id_replacement
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated_leave_of_absence_all" on public.leave_of_absence;
create policy "authenticated_leave_of_absence_all"
on public.leave_of_absence
for all
to authenticated
using (true)
with check (true);
