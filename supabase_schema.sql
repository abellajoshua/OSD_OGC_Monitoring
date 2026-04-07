-- ============================================================================
-- OSD OGC MONITORING SYSTEM - DATABASE SCHEMA
-- Complete database schema with migrations, permissions, and security policies
-- ============================================================================

create table if not exists public.minor_offenses (
  id bigserial primary key,
  date_of_complaint date not null,
  name_of_student text not null,
  sr_code text not null,
  year_program text not null,
  sex text not null,
  contact_number text not null,
  complainant text not null,
  written_reply text,
  date_of_hearing date,
  offense text not null,
  sanction text not null,
  date_of_suspension date not null,
  date_of_post_counseling date,
  archived boolean default false,
  academic_year text,
  semester text,
  created_at timestamptz default now()
);

create table if not exists public.major_offenses (
  id bigserial primary key,
  date_of_complaint date not null,
  name_of_student text not null,
  sr_code text not null,
  year_program text not null,
  sex text not null,
  contact_number text not null,
  complainant text not null,
  written_reply text,
  date_of_hearing date,
  offense text not null,
  sanction text not null,
  date_of_suspension date not null,
  date_of_post_counseling date,
  archived boolean default false,
  academic_year text,
  semester text,
  created_at timestamptz default now()
);

create table if not exists public.non_wearing_uniform (
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
  academic_year text,
  semester text,
  created_at timestamptz default now()
);

create table if not exists public.gatepass (
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
  academic_year text,
  semester text,
  created_at timestamptz default now()
);

create table if not exists public.good_moral (
  id bigserial primary key,
  date date not null,
  time_in time not null,
  time_out time not null,
  name text not null,
  sr_code text not null,
  course text not null,
  sex text not null,
  purpose text not null,
  archived boolean default false,
  academic_year text,
  semester text,
  created_at timestamptz default now()
);

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
  academic_year text,
  semester text,
  created_at timestamptz default now()
);

create table if not exists public.leave_of_absence (
  id bigserial primary key,
  date date not null,
  time_in time not null,
  time_out time not null,
  name text not null,
  sr_code text not null,
  course text not null,
  sex text not null,
  semester_period_covered text not null,
  archived boolean default false,
  academic_year text,
  semester text,
  created_at timestamptz default now()
);

create table if not exists public.organizations (
  id bigserial primary key,
  name text unique not null,
  type text not null check (type in ('college', 'campus')),
  created_at timestamptz default now()
);

create table if not exists public.user_accounts (
  id bigserial primary key,
  user_id uuid unique references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  role text default 'coordinator' check (role in ('admin', 'head', 'coordinator')),
  organization_id bigint references public.organizations(id),
  created_at timestamptz default now()
);

-- ============================================================================
-- MIGRATIONS FOR EXISTING DATABASES
-- ============================================================================

-- Add archived column to existing tables (if they don't have it)
alter table public.minor_offenses add column if not exists archived boolean default false;
alter table public.major_offenses add column if not exists archived boolean default false;
alter table public.non_wearing_uniform add column if not exists archived boolean default false;
alter table public.gatepass add column if not exists archived boolean default false;
alter table public.good_moral add column if not exists archived boolean default false;
alter table public.id_replacement add column if not exists archived boolean default false;
alter table public.leave_of_absence add column if not exists archived boolean default false;

alter table public.minor_offenses add column if not exists academic_year text;
alter table public.minor_offenses add column if not exists semester text;
alter table public.major_offenses add column if not exists academic_year text;
alter table public.major_offenses add column if not exists semester text;
alter table public.non_wearing_uniform add column if not exists academic_year text;
alter table public.non_wearing_uniform add column if not exists semester text;
alter table public.gatepass add column if not exists academic_year text;
alter table public.gatepass add column if not exists semester text;
alter table public.good_moral add column if not exists academic_year text;
alter table public.good_moral add column if not exists semester text;
alter table public.id_replacement add column if not exists academic_year text;
alter table public.id_replacement add column if not exists semester text;
alter table public.leave_of_absence add column if not exists academic_year text;
alter table public.leave_of_absence add column if not exists semester text;

-- Organization seed set for required campuses/municipalities
insert into public.organizations (name, type)
values
  ('CICS', 'college'),
  ('COE', 'college'),
  ('CET', 'college'),
  ('CAFAD', 'college'),
  ('Alangilan', 'campus'),
  ('Mabini', 'campus'),
  ('Balayan', 'campus'),
  ('Lobo', 'campus')
on conflict (name) do nothing;

-- Add organization ownership columns to all operational tables
alter table public.minor_offenses add column if not exists organization_id bigint references public.organizations(id);
alter table public.major_offenses add column if not exists organization_id bigint references public.organizations(id);
alter table public.non_wearing_uniform add column if not exists organization_id bigint references public.organizations(id);
alter table public.gatepass add column if not exists organization_id bigint references public.organizations(id);
alter table public.good_moral add column if not exists organization_id bigint references public.organizations(id);
alter table public.id_replacement add column if not exists organization_id bigint references public.organizations(id);
alter table public.leave_of_absence add column if not exists organization_id bigint references public.organizations(id);
alter table public.user_accounts add column if not exists organization_id bigint references public.organizations(id);

-- Normalize older role values to new role model
update public.user_accounts
set role = 'head'
where role = 'admin_head';

alter table public.user_accounts drop constraint if exists user_accounts_role_check;
alter table public.user_accounts
  add constraint user_accounts_role_check
  check (role in ('admin', 'head', 'coordinator'));

drop index if exists public.user_accounts_single_admin_idx;
create unique index user_accounts_single_admin_idx
  on public.user_accounts ((role))
  where role = 'admin';

drop index if exists public.user_accounts_single_head_idx;
create unique index user_accounts_single_head_idx
  on public.user_accounts ((role))
  where role = 'head';

-- Backfill missing organization_id to CICS for existing records
update public.user_accounts
set organization_id = (select id from public.organizations where name = 'CICS' limit 1)
where organization_id is null
  and role <> 'admin';

update public.minor_offenses
set organization_id = (select id from public.organizations where name = 'CICS' limit 1)
where organization_id is null;

update public.major_offenses
set organization_id = (select id from public.organizations where name = 'CICS' limit 1)
where organization_id is null;

update public.non_wearing_uniform
set organization_id = (select id from public.organizations where name = 'CICS' limit 1)
where organization_id is null;

update public.gatepass
set organization_id = (select id from public.organizations where name = 'CICS' limit 1)
where organization_id is null;

update public.good_moral
set organization_id = (select id from public.organizations where name = 'CICS' limit 1)
where organization_id is null;

update public.id_replacement
set organization_id = (select id from public.organizations where name = 'CICS' limit 1)
where organization_id is null;

update public.leave_of_absence
set organization_id = (select id from public.organizations where name = 'CICS' limit 1)
where organization_id is null;

alter table public.user_accounts alter column organization_id drop not null;

alter table public.user_accounts drop constraint if exists user_accounts_org_required_non_admin_check;
alter table public.user_accounts
  add constraint user_accounts_org_required_non_admin_check
  check (role = 'admin' or organization_id is not null);

-- Rename 'reason' to 'semester_period_covered' for existing databases
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_name = 'leave_of_absence' 
    and column_name = 'reason'
  ) then
    alter table public.leave_of_absence 
    rename column reason to semester_period_covered;
  end if;
end $$;

-- Add new columns for major and minor offenses modules (written_reply, date_of_hearing, date_of_post_counseling)
alter table public.major_offenses add column if not exists written_reply text;
alter table public.major_offenses add column if not exists date_of_hearing date;
alter table public.major_offenses add column if not exists date_of_post_counseling date;

alter table public.minor_offenses add column if not exists written_reply text;
alter table public.minor_offenses add column if not exists date_of_hearing date;
alter table public.minor_offenses add column if not exists date_of_post_counseling date;

update public.minor_offenses
set
  academic_year = case
    when extract(month from coalesce(date_of_complaint, created_at::date)) >= 8 then
      to_char(coalesce(date_of_complaint, created_at::date), 'YYYY') || '-' || to_char((coalesce(date_of_complaint, created_at::date) + interval '1 year'), 'YYYY')
    else
      to_char((coalesce(date_of_complaint, created_at::date) - interval '1 year'), 'YYYY') || '-' || to_char(coalesce(date_of_complaint, created_at::date), 'YYYY')
  end,
  semester = case
    when extract(month from coalesce(date_of_complaint, created_at::date)) between 8 and 12 then 'First Semester'
    when extract(month from coalesce(date_of_complaint, created_at::date)) between 1 and 5 then 'Second Semester'
    else 'Summer Class'
  end
where academic_year is null or semester is null;

update public.major_offenses
set
  academic_year = case
    when extract(month from coalesce(date_of_complaint, created_at::date)) >= 8 then
      to_char(coalesce(date_of_complaint, created_at::date), 'YYYY') || '-' || to_char((coalesce(date_of_complaint, created_at::date) + interval '1 year'), 'YYYY')
    else
      to_char((coalesce(date_of_complaint, created_at::date) - interval '1 year'), 'YYYY') || '-' || to_char(coalesce(date_of_complaint, created_at::date), 'YYYY')
  end,
  semester = case
    when extract(month from coalesce(date_of_complaint, created_at::date)) between 8 and 12 then 'First Semester'
    when extract(month from coalesce(date_of_complaint, created_at::date)) between 1 and 5 then 'Second Semester'
    else 'Summer Class'
  end
where academic_year is null or semester is null;

update public.non_wearing_uniform
set
  academic_year = case
    when extract(month from coalesce(date, created_at::date)) >= 8 then
      to_char(coalesce(date, created_at::date), 'YYYY') || '-' || to_char((coalesce(date, created_at::date) + interval '1 year'), 'YYYY')
    else
      to_char((coalesce(date, created_at::date) - interval '1 year'), 'YYYY') || '-' || to_char(coalesce(date, created_at::date), 'YYYY')
  end,
  semester = case
    when extract(month from coalesce(date, created_at::date)) between 8 and 12 then 'First Semester'
    when extract(month from coalesce(date, created_at::date)) between 1 and 5 then 'Second Semester'
    else 'Summer Class'
  end
where academic_year is null or semester is null;

update public.gatepass
set
  academic_year = case
    when extract(month from coalesce(date, created_at::date)) >= 8 then
      to_char(coalesce(date, created_at::date), 'YYYY') || '-' || to_char((coalesce(date, created_at::date) + interval '1 year'), 'YYYY')
    else
      to_char((coalesce(date, created_at::date) - interval '1 year'), 'YYYY') || '-' || to_char(coalesce(date, created_at::date), 'YYYY')
  end,
  semester = case
    when extract(month from coalesce(date, created_at::date)) between 8 and 12 then 'First Semester'
    when extract(month from coalesce(date, created_at::date)) between 1 and 5 then 'Second Semester'
    else 'Summer Class'
  end
where academic_year is null or semester is null;

update public.good_moral
set
  academic_year = case
    when extract(month from coalesce(date, created_at::date)) >= 8 then
      to_char(coalesce(date, created_at::date), 'YYYY') || '-' || to_char((coalesce(date, created_at::date) + interval '1 year'), 'YYYY')
    else
      to_char((coalesce(date, created_at::date) - interval '1 year'), 'YYYY') || '-' || to_char(coalesce(date, created_at::date), 'YYYY')
  end,
  semester = case
    when extract(month from coalesce(date, created_at::date)) between 8 and 12 then 'First Semester'
    when extract(month from coalesce(date, created_at::date)) between 1 and 5 then 'Second Semester'
    else 'Summer Class'
  end
where academic_year is null or semester is null;

update public.id_replacement
set
  academic_year = case
    when extract(month from coalesce(date, created_at::date)) >= 8 then
      to_char(coalesce(date, created_at::date), 'YYYY') || '-' || to_char((coalesce(date, created_at::date) + interval '1 year'), 'YYYY')
    else
      to_char((coalesce(date, created_at::date) - interval '1 year'), 'YYYY') || '-' || to_char(coalesce(date, created_at::date), 'YYYY')
  end,
  semester = case
    when extract(month from coalesce(date, created_at::date)) between 8 and 12 then 'First Semester'
    when extract(month from coalesce(date, created_at::date)) between 1 and 5 then 'Second Semester'
    else 'Summer Class'
  end
where academic_year is null or semester is null;

update public.leave_of_absence
set
  academic_year = case
    when extract(month from coalesce(date, created_at::date)) >= 8 then
      to_char(coalesce(date, created_at::date), 'YYYY') || '-' || to_char((coalesce(date, created_at::date) + interval '1 year'), 'YYYY')
    else
      to_char((coalesce(date, created_at::date) - interval '1 year'), 'YYYY') || '-' || to_char(coalesce(date, created_at::date), 'YYYY')
  end,
  semester = case
    when extract(month from coalesce(date, created_at::date)) between 8 and 12 then 'First Semester'
    when extract(month from coalesce(date, created_at::date)) between 1 and 5 then 'Second Semester'
    else 'Summer Class'
  end
where academic_year is null or semester is null;

-- Rename columns for major and minor offenses (reported_by to complainant, date_of_sanction to date_of_suspension)
do $$
begin
  -- Major Offenses: Rename reported_by to complainant
  if exists (
    select 1 from information_schema.columns 
    where table_name = 'major_offenses' 
    and column_name = 'reported_by'
  ) then
    alter table public.major_offenses 
    rename column reported_by to complainant;
  end if;

  -- Major Offenses: Rename date_of_sanction to date_of_suspension
  if exists (
    select 1 from information_schema.columns 
    where table_name = 'major_offenses' 
    and column_name = 'date_of_sanction'
  ) then
    alter table public.major_offenses 
    rename column date_of_sanction to date_of_suspension;
  end if;

  -- Minor Offenses: Rename reported_by to complainant
  if exists (
    select 1 from information_schema.columns 
    where table_name = 'minor_offenses' 
    and column_name = 'reported_by'
  ) then
    alter table public.minor_offenses 
    rename column reported_by to complainant;
  end if;

  -- Minor Offenses: Rename date_of_sanction to date_of_suspension
  if exists (
    select 1 from information_schema.columns 
    where table_name = 'minor_offenses' 
    and column_name = 'date_of_sanction'
  ) then
    alter table public.minor_offenses 
    rename column date_of_sanction to date_of_suspension;
  end if;
end $$;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Indexes on sr_code for better query performance
create index if not exists minor_offenses_sr_code_idx on public.minor_offenses (sr_code);
create index if not exists major_offenses_sr_code_idx on public.major_offenses (sr_code);
create index if not exists non_wearing_uniform_sr_code_idx on public.non_wearing_uniform (sr_code);
create index if not exists gatepass_sr_code_idx on public.gatepass (sr_code);
create index if not exists good_moral_sr_code_idx on public.good_moral (sr_code);
create index if not exists id_replacement_sr_code_idx on public.id_replacement (sr_code);
create index if not exists leave_of_absence_sr_code_idx on public.leave_of_absence (sr_code);

-- Indexes on archived column for faster filtering
create index if not exists minor_offenses_archived_idx on public.minor_offenses (archived);
create index if not exists major_offenses_archived_idx on public.major_offenses (archived);
create index if not exists non_wearing_uniform_archived_idx on public.non_wearing_uniform (archived);
create index if not exists gatepass_archived_idx on public.gatepass (archived);
create index if not exists good_moral_archived_idx on public.good_moral (archived);
create index if not exists id_replacement_archived_idx on public.id_replacement (archived);
create index if not exists leave_of_absence_archived_idx on public.leave_of_absence (archived);
create index if not exists minor_offenses_org_idx on public.minor_offenses (organization_id);
create index if not exists major_offenses_org_idx on public.major_offenses (organization_id);
create index if not exists non_wearing_uniform_org_idx on public.non_wearing_uniform (organization_id);
create index if not exists gatepass_org_idx on public.gatepass (organization_id);
create index if not exists good_moral_org_idx on public.good_moral (organization_id);
create index if not exists id_replacement_org_idx on public.id_replacement (organization_id);
create index if not exists leave_of_absence_org_idx on public.leave_of_absence (organization_id);
create index if not exists user_accounts_org_idx on public.user_accounts (organization_id);

-- Indexes on user_accounts
create index if not exists user_accounts_email_idx on public.user_accounts (email);
create index if not exists user_accounts_user_id_idx on public.user_accounts (user_id);

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

grant usage on schema public to authenticated;

-- Grant permissions to authenticated users
grant select, insert, update, delete on table public.minor_offenses to authenticated;
grant select, insert, update, delete on table public.major_offenses to authenticated;
grant select, insert, update, delete on table public.non_wearing_uniform to authenticated;
grant select, insert, update, delete on table public.gatepass to authenticated;
grant select, insert, update, delete on table public.good_moral to authenticated;
grant select, insert, update, delete on table public.id_replacement to authenticated;
grant select, insert, update, delete on table public.leave_of_absence to authenticated;
grant select on table public.organizations to authenticated;
grant select, insert, update, delete on table public.user_accounts to authenticated;

-- Grant sequence permissions
grant usage, select on sequence public.minor_offenses_id_seq to authenticated;
grant usage, select on sequence public.major_offenses_id_seq to authenticated;
grant usage, select on sequence public.non_wearing_uniform_id_seq to authenticated;
grant usage, select on sequence public.gatepass_id_seq to authenticated;
grant usage, select on sequence public.good_moral_id_seq to authenticated;
grant usage, select on sequence public.id_replacement_id_seq to authenticated;
grant usage, select on sequence public.leave_of_absence_id_seq to authenticated;
grant usage, select on sequence public.organizations_id_seq to authenticated;
grant usage, select on sequence public.user_accounts_id_seq to authenticated;
