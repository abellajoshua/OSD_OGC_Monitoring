-- ============================================================================
-- OSD OGC MONITORING - ONE SHOT FULL SETUP
-- Paste this whole file in Supabase SQL Editor and run once.
-- Includes:
-- 1) Schema + migration-safe ALTERs
-- 2) Cleanup/reset of old public data
-- 3) Organizations + admin seed account
-- 4) Grants + RLS policies (organization-based + role-based)
-- ============================================================================

begin;

create extension if not exists pgcrypto;

-- ============================================================================
-- CORE TABLES (CREATE IF NOT EXISTS)
-- ============================================================================

create table if not exists public.organizations (
  id bigserial primary key,
  name text unique not null,
  type text not null check (type in ('college', 'campus')),
  created_at timestamptz default now()
);

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
  status text default 'active' check (status in ('active', 'dismissed')),
  academic_year text,
  semester text,
  organization_id bigint references public.organizations(id),
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
  organization_id bigint references public.organizations(id),
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
  organization_id bigint references public.organizations(id),
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
  organization_id bigint references public.organizations(id),
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
  organization_id bigint references public.organizations(id),
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
  organization_id bigint references public.organizations(id),
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
  organization_id bigint references public.organizations(id),
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
-- LEGACY MIGRATIONS / ALTERS (SAFE FOR OLD DB)
-- ============================================================================

alter table if exists public.minor_offenses add column if not exists archived boolean default false;
alter table if exists public.major_offenses add column if not exists archived boolean default false;
alter table if exists public.major_offenses add column if not exists status text default 'active';
alter table if exists public.non_wearing_uniform add column if not exists archived boolean default false;
alter table if exists public.gatepass add column if not exists archived boolean default false;
alter table if exists public.good_moral add column if not exists archived boolean default false;
alter table if exists public.id_replacement add column if not exists archived boolean default false;
alter table if exists public.leave_of_absence add column if not exists archived boolean default false;

update public.major_offenses
set status = case when archived then 'dismissed' else coalesce(status, 'active') end
where status is null
   or status not in ('active', 'dismissed');

alter table public.major_offenses drop constraint if exists major_offenses_status_check;
alter table public.major_offenses
  add constraint major_offenses_status_check
  check (status in ('active', 'dismissed'));

alter table if exists public.minor_offenses add column if not exists academic_year text;
alter table if exists public.minor_offenses add column if not exists semester text;
alter table if exists public.major_offenses add column if not exists academic_year text;
alter table if exists public.major_offenses add column if not exists semester text;
alter table if exists public.non_wearing_uniform add column if not exists academic_year text;
alter table if exists public.non_wearing_uniform add column if not exists semester text;
alter table if exists public.gatepass add column if not exists academic_year text;
alter table if exists public.gatepass add column if not exists semester text;
alter table if exists public.good_moral add column if not exists academic_year text;
alter table if exists public.good_moral add column if not exists semester text;
alter table if exists public.id_replacement add column if not exists academic_year text;
alter table if exists public.id_replacement add column if not exists semester text;
alter table if exists public.leave_of_absence add column if not exists academic_year text;
alter table if exists public.leave_of_absence add column if not exists semester text;

alter table if exists public.minor_offenses add column if not exists organization_id bigint references public.organizations(id);
alter table if exists public.major_offenses add column if not exists organization_id bigint references public.organizations(id);
alter table if exists public.non_wearing_uniform add column if not exists organization_id bigint references public.organizations(id);
alter table if exists public.gatepass add column if not exists organization_id bigint references public.organizations(id);
alter table if exists public.good_moral add column if not exists organization_id bigint references public.organizations(id);
alter table if exists public.id_replacement add column if not exists organization_id bigint references public.organizations(id);
alter table if exists public.leave_of_absence add column if not exists organization_id bigint references public.organizations(id);
alter table if exists public.user_accounts add column if not exists organization_id bigint references public.organizations(id);

alter table if exists public.major_offenses add column if not exists written_reply text;
alter table if exists public.major_offenses add column if not exists date_of_hearing date;
alter table if exists public.major_offenses add column if not exists date_of_post_counseling date;
alter table if exists public.minor_offenses add column if not exists written_reply text;
alter table if exists public.minor_offenses add column if not exists date_of_hearing date;
alter table if exists public.minor_offenses add column if not exists date_of_post_counseling date;

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

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'leave_of_absence' and column_name = 'reason'
  ) then
    alter table public.leave_of_absence rename column reason to semester_period_covered;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'major_offenses' and column_name = 'reported_by'
  ) then
    alter table public.major_offenses rename column reported_by to complainant;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'major_offenses' and column_name = 'date_of_sanction'
  ) then
    alter table public.major_offenses rename column date_of_sanction to date_of_suspension;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'minor_offenses' and column_name = 'reported_by'
  ) then
    alter table public.minor_offenses rename column reported_by to complainant;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'minor_offenses' and column_name = 'date_of_sanction'
  ) then
    alter table public.minor_offenses rename column date_of_sanction to date_of_suspension;
  end if;
end $$;

-- Drop any legacy role check constraints, regardless of their generated names.
do $$
declare
  v_constraint_name text;
begin
  for v_constraint_name in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'user_accounts'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%role%'
  loop
    execute format('alter table public.user_accounts drop constraint if exists %I', v_constraint_name);
  end loop;
end $$;

update public.user_accounts
set role = 'head'
where role = 'admin_head';

alter table public.user_accounts
  add constraint user_accounts_role_check
  check (role in ('admin', 'head', 'coordinator'));

-- Explicitly drop common legacy check names first.
alter table public.organizations drop constraint if exists organizations_type_check;
alter table public.organizations drop constraint if exists organizations_type_check1;
alter table public.organizations drop constraint if exists organizations_type_check2;

-- Drop any legacy type check constraints on organizations table.
do $$
declare
  v_constraint_name text;
begin
  for v_constraint_name in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'organizations'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%type%'
  loop
    execute format('alter table public.organizations drop constraint if exists %I', v_constraint_name);
  end loop;
end $$;

-- Update and normalize organizations type values for older databases.
update public.organizations
set type = 'campus'
where type = 'municipality';

alter table public.organizations
  add constraint organizations_type_check
  check (type in ('college', 'campus'));

drop index if exists public.user_accounts_single_admin_idx;
create unique index user_accounts_single_admin_idx
  on public.user_accounts ((role))
  where role = 'admin';

drop index if exists public.user_accounts_single_head_idx;
create unique index user_accounts_single_head_idx
  on public.user_accounts ((role))
  where role = 'head';

-- ============================================================================
-- REMOVE OLD PUBLIC DATA (RESET)
-- ============================================================================
-- Note: this clears previous app data so you can start fresh.

truncate table
  public.minor_offenses,
  public.major_offenses,
  public.non_wearing_uniform,
  public.gatepass,
  public.good_moral,
  public.id_replacement,
  public.leave_of_absence,
  public.user_accounts,
  public.organizations
restart identity cascade;

-- ============================================================================
-- ORGANIZATION SEED
-- ============================================================================

insert into public.organizations (name, type)
values
  ('CICS', 'college'),
  ('COE', 'college'),
  ('CET', 'college'),
  ('CAFAD', 'college'),
  ('Alangilan', 'campus'),
  ('Mabini', 'campus'),
  ('Balayan', 'campus'),
  ('Lobo', 'campus');

-- Allow the single admin account to exist without organization assignment.
alter table public.user_accounts alter column organization_id drop not null;

-- ============================================================================
-- REQUIRED ACCOUNT SEED (AUTH + USER ACCOUNTS)
-- ============================================================================
-- Default password for all seeded accounts: Pass@12345
-- admin@example.com (admin)
-- cics@example.com, coe@example.com, cet@example.com, cafad@example.com,
-- balayan@example.com, lobo@example.com (coordinator, one per organization)

do $$
declare
  v_email text;
  v_full_name text;
  v_role text;
  v_org_name text;
  v_user_id uuid;
  v_org_id bigint;
begin
  for v_email, v_full_name, v_role, v_org_name in
    select * from (values
      ('admin@example.com', 'System Admin', 'admin', null),
      ('cics@example.com', 'CICS Coordinator', 'coordinator', 'CICS'),
      ('coe@example.com', 'COE Coordinator', 'coordinator', 'COE'),
      ('cet@example.com', 'CET Coordinator', 'coordinator', 'CET'),
      ('cafad@example.com', 'CAFAD Coordinator', 'coordinator', 'CAFAD'),
      ('balayan@example.com', 'Balayan Coordinator', 'coordinator', 'Balayan'),
      ('lobo@example.com', 'Lobo Coordinator', 'coordinator', 'Lobo')
    ) as t(email, full_name, role, org_name)
  loop
    v_org_id := null;
    if v_org_name is not null then
      select id into v_org_id from public.organizations where name = v_org_name limit 1;
    end if;

    select id into v_user_id from auth.users where email = v_email limit 1;

    if v_user_id is null then
      insert into auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
      )
      values (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        v_email,
        crypt('Pass@12345', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', v_full_name, 'role', v_role),
        now(),
        now(),
        '',
        '',
        '',
        ''
      )
      returning id into v_user_id;
    else
      update auth.users
      set
        encrypted_password = crypt('Pass@12345', gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        raw_user_meta_data = jsonb_build_object('full_name', v_full_name, 'role', v_role),
        updated_at = now()
      where id = v_user_id;
    end if;

    insert into public.user_accounts (user_id, email, full_name, role, organization_id)
    values (v_user_id, v_email, v_full_name, v_role, v_org_id)
    on conflict (email) do update
      set user_id = excluded.user_id,
          full_name = excluded.full_name,
          role = excluded.role,
          organization_id = excluded.organization_id;
  end loop;
end $$;

alter table public.user_accounts alter column organization_id drop not null;

alter table public.user_accounts
  drop constraint if exists user_accounts_org_required_non_admin_check;

alter table public.user_accounts
  add constraint user_accounts_org_required_non_admin_check
  check (role = 'admin' or organization_id is not null);

-- ============================================================================
-- ACADEMIC PERIOD INTEGRITY
-- ============================================================================

update public.minor_offenses
set
  academic_year = case
    when extract(month from coalesce(date_of_complaint, created_at::date, current_date)) >= 8 then
      to_char(coalesce(date_of_complaint, created_at::date, current_date), 'YYYY') || '-' || to_char((coalesce(date_of_complaint, created_at::date, current_date) + interval '1 year'), 'YYYY')
    else
      to_char((coalesce(date_of_complaint, created_at::date, current_date) - interval '1 year'), 'YYYY') || '-' || to_char(coalesce(date_of_complaint, created_at::date, current_date), 'YYYY')
  end,
  semester = case
    when lower(trim(coalesce(semester, ''))) in ('1st semester', 'first semester', 'first', '1st') then 'First Semester'
    when lower(trim(coalesce(semester, ''))) in ('2nd semester', 'second semester', 'second', '2nd') then 'Second Semester'
    when lower(trim(coalesce(semester, ''))) like '%summer%' then 'Summer Class'
    when extract(month from coalesce(date_of_complaint, created_at::date, current_date)) between 8 and 12 then 'First Semester'
    when extract(month from coalesce(date_of_complaint, created_at::date, current_date)) between 1 and 5 then 'Second Semester'
    else 'Summer Class'
  end
where academic_year is null or semester is null
   or academic_year !~ '^[0-9]{4}-[0-9]{4}$'
   or semester not in ('First Semester', 'Second Semester', 'Summer Class');

update public.major_offenses
set
  academic_year = case
    when extract(month from coalesce(date_of_complaint, created_at::date, current_date)) >= 8 then
      to_char(coalesce(date_of_complaint, created_at::date, current_date), 'YYYY') || '-' || to_char((coalesce(date_of_complaint, created_at::date, current_date) + interval '1 year'), 'YYYY')
    else
      to_char((coalesce(date_of_complaint, created_at::date, current_date) - interval '1 year'), 'YYYY') || '-' || to_char(coalesce(date_of_complaint, created_at::date, current_date), 'YYYY')
  end,
  semester = case
    when lower(trim(coalesce(semester, ''))) in ('1st semester', 'first semester', 'first', '1st') then 'First Semester'
    when lower(trim(coalesce(semester, ''))) in ('2nd semester', 'second semester', 'second', '2nd') then 'Second Semester'
    when lower(trim(coalesce(semester, ''))) like '%summer%' then 'Summer Class'
    when extract(month from coalesce(date_of_complaint, created_at::date, current_date)) between 8 and 12 then 'First Semester'
    when extract(month from coalesce(date_of_complaint, created_at::date, current_date)) between 1 and 5 then 'Second Semester'
    else 'Summer Class'
  end
where academic_year is null or semester is null
   or academic_year !~ '^[0-9]{4}-[0-9]{4}$'
   or semester not in ('First Semester', 'Second Semester', 'Summer Class');

update public.non_wearing_uniform
set
  academic_year = case
    when extract(month from coalesce(date, created_at::date, current_date)) >= 8 then
      to_char(coalesce(date, created_at::date, current_date), 'YYYY') || '-' || to_char((coalesce(date, created_at::date, current_date) + interval '1 year'), 'YYYY')
    else
      to_char((coalesce(date, created_at::date, current_date) - interval '1 year'), 'YYYY') || '-' || to_char(coalesce(date, created_at::date, current_date), 'YYYY')
  end,
  semester = case
    when lower(trim(coalesce(semester, ''))) in ('1st semester', 'first semester', 'first', '1st') then 'First Semester'
    when lower(trim(coalesce(semester, ''))) in ('2nd semester', 'second semester', 'second', '2nd') then 'Second Semester'
    when lower(trim(coalesce(semester, ''))) like '%summer%' then 'Summer Class'
    when extract(month from coalesce(date, created_at::date, current_date)) between 8 and 12 then 'First Semester'
    when extract(month from coalesce(date, created_at::date, current_date)) between 1 and 5 then 'Second Semester'
    else 'Summer Class'
  end
where academic_year is null or semester is null
   or academic_year !~ '^[0-9]{4}-[0-9]{4}$'
   or semester not in ('First Semester', 'Second Semester', 'Summer Class');

update public.gatepass
set
  academic_year = case
    when extract(month from coalesce(date, created_at::date, current_date)) >= 8 then
      to_char(coalesce(date, created_at::date, current_date), 'YYYY') || '-' || to_char((coalesce(date, created_at::date, current_date) + interval '1 year'), 'YYYY')
    else
      to_char((coalesce(date, created_at::date, current_date) - interval '1 year'), 'YYYY') || '-' || to_char(coalesce(date, created_at::date, current_date), 'YYYY')
  end,
  semester = case
    when lower(trim(coalesce(semester, ''))) in ('1st semester', 'first semester', 'first', '1st') then 'First Semester'
    when lower(trim(coalesce(semester, ''))) in ('2nd semester', 'second semester', 'second', '2nd') then 'Second Semester'
    when lower(trim(coalesce(semester, ''))) like '%summer%' then 'Summer Class'
    when extract(month from coalesce(date, created_at::date, current_date)) between 8 and 12 then 'First Semester'
    when extract(month from coalesce(date, created_at::date, current_date)) between 1 and 5 then 'Second Semester'
    else 'Summer Class'
  end
where academic_year is null or semester is null
   or academic_year !~ '^[0-9]{4}-[0-9]{4}$'
   or semester not in ('First Semester', 'Second Semester', 'Summer Class');

update public.good_moral
set
  academic_year = case
    when extract(month from coalesce(date, created_at::date, current_date)) >= 8 then
      to_char(coalesce(date, created_at::date, current_date), 'YYYY') || '-' || to_char((coalesce(date, created_at::date, current_date) + interval '1 year'), 'YYYY')
    else
      to_char((coalesce(date, created_at::date, current_date) - interval '1 year'), 'YYYY') || '-' || to_char(coalesce(date, created_at::date, current_date), 'YYYY')
  end,
  semester = case
    when lower(trim(coalesce(semester, ''))) in ('1st semester', 'first semester', 'first', '1st') then 'First Semester'
    when lower(trim(coalesce(semester, ''))) in ('2nd semester', 'second semester', 'second', '2nd') then 'Second Semester'
    when lower(trim(coalesce(semester, ''))) like '%summer%' then 'Summer Class'
    when extract(month from coalesce(date, created_at::date, current_date)) between 8 and 12 then 'First Semester'
    when extract(month from coalesce(date, created_at::date, current_date)) between 1 and 5 then 'Second Semester'
    else 'Summer Class'
  end
where academic_year is null or semester is null
   or academic_year !~ '^[0-9]{4}-[0-9]{4}$'
   or semester not in ('First Semester', 'Second Semester', 'Summer Class');

update public.id_replacement
set
  academic_year = case
    when extract(month from coalesce(date, created_at::date, current_date)) >= 8 then
      to_char(coalesce(date, created_at::date, current_date), 'YYYY') || '-' || to_char((coalesce(date, created_at::date, current_date) + interval '1 year'), 'YYYY')
    else
      to_char((coalesce(date, created_at::date, current_date) - interval '1 year'), 'YYYY') || '-' || to_char(coalesce(date, created_at::date, current_date), 'YYYY')
  end,
  semester = case
    when lower(trim(coalesce(semester, ''))) in ('1st semester', 'first semester', 'first', '1st') then 'First Semester'
    when lower(trim(coalesce(semester, ''))) in ('2nd semester', 'second semester', 'second', '2nd') then 'Second Semester'
    when lower(trim(coalesce(semester, ''))) like '%summer%' then 'Summer Class'
    when extract(month from coalesce(date, created_at::date, current_date)) between 8 and 12 then 'First Semester'
    when extract(month from coalesce(date, created_at::date, current_date)) between 1 and 5 then 'Second Semester'
    else 'Summer Class'
  end
where academic_year is null or semester is null
   or academic_year !~ '^[0-9]{4}-[0-9]{4}$'
   or semester not in ('First Semester', 'Second Semester', 'Summer Class');

update public.leave_of_absence
set
  academic_year = case
    when extract(month from coalesce(date, created_at::date, current_date)) >= 8 then
      to_char(coalesce(date, created_at::date, current_date), 'YYYY') || '-' || to_char((coalesce(date, created_at::date, current_date) + interval '1 year'), 'YYYY')
    else
      to_char((coalesce(date, created_at::date, current_date) - interval '1 year'), 'YYYY') || '-' || to_char(coalesce(date, created_at::date, current_date), 'YYYY')
  end,
  semester = case
    when lower(trim(coalesce(semester, ''))) in ('1st semester', 'first semester', 'first', '1st') then 'First Semester'
    when lower(trim(coalesce(semester, ''))) in ('2nd semester', 'second semester', 'second', '2nd') then 'Second Semester'
    when lower(trim(coalesce(semester, ''))) like '%summer%' then 'Summer Class'
    when extract(month from coalesce(date, created_at::date, current_date)) between 8 and 12 then 'First Semester'
    when extract(month from coalesce(date, created_at::date, current_date)) between 1 and 5 then 'Second Semester'
    else 'Summer Class'
  end
where academic_year is null or semester is null
   or academic_year !~ '^[0-9]{4}-[0-9]{4}$'
   or semester not in ('First Semester', 'Second Semester', 'Summer Class');

alter table public.minor_offenses alter column academic_year set not null;
alter table public.minor_offenses alter column semester set not null;
alter table public.major_offenses alter column academic_year set not null;
alter table public.major_offenses alter column semester set not null;
alter table public.non_wearing_uniform alter column academic_year set not null;
alter table public.non_wearing_uniform alter column semester set not null;
alter table public.gatepass alter column academic_year set not null;
alter table public.gatepass alter column semester set not null;
alter table public.good_moral alter column academic_year set not null;
alter table public.good_moral alter column semester set not null;
alter table public.id_replacement alter column academic_year set not null;
alter table public.id_replacement alter column semester set not null;
alter table public.leave_of_absence alter column academic_year set not null;
alter table public.leave_of_absence alter column semester set not null;

alter table public.minor_offenses drop constraint if exists minor_offenses_academic_year_format_check;
alter table public.minor_offenses add constraint minor_offenses_academic_year_format_check check (academic_year ~ '^[0-9]{4}-[0-9]{4}$');
alter table public.major_offenses drop constraint if exists major_offenses_academic_year_format_check;
alter table public.major_offenses add constraint major_offenses_academic_year_format_check check (academic_year ~ '^[0-9]{4}-[0-9]{4}$');
alter table public.non_wearing_uniform drop constraint if exists non_wearing_uniform_academic_year_format_check;
alter table public.non_wearing_uniform add constraint non_wearing_uniform_academic_year_format_check check (academic_year ~ '^[0-9]{4}-[0-9]{4}$');
alter table public.gatepass drop constraint if exists gatepass_academic_year_format_check;
alter table public.gatepass add constraint gatepass_academic_year_format_check check (academic_year ~ '^[0-9]{4}-[0-9]{4}$');
alter table public.good_moral drop constraint if exists good_moral_academic_year_format_check;
alter table public.good_moral add constraint good_moral_academic_year_format_check check (academic_year ~ '^[0-9]{4}-[0-9]{4}$');
alter table public.id_replacement drop constraint if exists id_replacement_academic_year_format_check;
alter table public.id_replacement add constraint id_replacement_academic_year_format_check check (academic_year ~ '^[0-9]{4}-[0-9]{4}$');
alter table public.leave_of_absence drop constraint if exists leave_of_absence_academic_year_format_check;
alter table public.leave_of_absence add constraint leave_of_absence_academic_year_format_check check (academic_year ~ '^[0-9]{4}-[0-9]{4}$');

alter table public.minor_offenses drop constraint if exists minor_offenses_semester_check;
alter table public.minor_offenses add constraint minor_offenses_semester_check check (semester in ('First Semester', 'Second Semester', 'Summer Class'));
alter table public.major_offenses drop constraint if exists major_offenses_semester_check;
alter table public.major_offenses add constraint major_offenses_semester_check check (semester in ('First Semester', 'Second Semester', 'Summer Class'));
alter table public.non_wearing_uniform drop constraint if exists non_wearing_uniform_semester_check;
alter table public.non_wearing_uniform add constraint non_wearing_uniform_semester_check check (semester in ('First Semester', 'Second Semester', 'Summer Class'));
alter table public.gatepass drop constraint if exists gatepass_semester_check;
alter table public.gatepass add constraint gatepass_semester_check check (semester in ('First Semester', 'Second Semester', 'Summer Class'));
alter table public.good_moral drop constraint if exists good_moral_semester_check;
alter table public.good_moral add constraint good_moral_semester_check check (semester in ('First Semester', 'Second Semester', 'Summer Class'));
alter table public.id_replacement drop constraint if exists id_replacement_semester_check;
alter table public.id_replacement add constraint id_replacement_semester_check check (semester in ('First Semester', 'Second Semester', 'Summer Class'));
alter table public.leave_of_absence drop constraint if exists leave_of_absence_semester_check;
alter table public.leave_of_absence add constraint leave_of_absence_semester_check check (semester in ('First Semester', 'Second Semester', 'Summer Class'));

create or replace function public.prevent_academic_period_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    if new.academic_year is distinct from old.academic_year
       or new.semester is distinct from old.semester then
      raise exception 'academic_year and semester are immutable and cannot be changed after record creation.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_minor_offenses_immutable_period on public.minor_offenses;
create trigger trg_minor_offenses_immutable_period
before update on public.minor_offenses
for each row execute function public.prevent_academic_period_change();

drop trigger if exists trg_major_offenses_immutable_period on public.major_offenses;
create trigger trg_major_offenses_immutable_period
before update on public.major_offenses
for each row execute function public.prevent_academic_period_change();

drop trigger if exists trg_non_wearing_uniform_immutable_period on public.non_wearing_uniform;
create trigger trg_non_wearing_uniform_immutable_period
before update on public.non_wearing_uniform
for each row execute function public.prevent_academic_period_change();

drop trigger if exists trg_gatepass_immutable_period on public.gatepass;
create trigger trg_gatepass_immutable_period
before update on public.gatepass
for each row execute function public.prevent_academic_period_change();

drop trigger if exists trg_good_moral_immutable_period on public.good_moral;
create trigger trg_good_moral_immutable_period
before update on public.good_moral
for each row execute function public.prevent_academic_period_change();

drop trigger if exists trg_id_replacement_immutable_period on public.id_replacement;
create trigger trg_id_replacement_immutable_period
before update on public.id_replacement
for each row execute function public.prevent_academic_period_change();

drop trigger if exists trg_leave_of_absence_immutable_period on public.leave_of_absence;
create trigger trg_leave_of_absence_immutable_period
before update on public.leave_of_absence
for each row execute function public.prevent_academic_period_change();

create index if not exists idx_minor_offenses_archive_period_org on public.minor_offenses (organization_id, archived, academic_year, semester);
create index if not exists idx_major_offenses_archive_period_org on public.major_offenses (organization_id, archived, status, academic_year, semester);
create index if not exists idx_non_wearing_uniform_archive_period_org on public.non_wearing_uniform (organization_id, archived, academic_year, semester);
create index if not exists idx_gatepass_archive_period_org on public.gatepass (organization_id, archived, academic_year, semester);
create index if not exists idx_good_moral_archive_period_org on public.good_moral (organization_id, archived, academic_year, semester);
create index if not exists idx_id_replacement_archive_period_org on public.id_replacement (organization_id, archived, academic_year, semester);
create index if not exists idx_leave_of_absence_archive_period_org on public.leave_of_absence (organization_id, archived, academic_year, semester);

-- ============================================================================
-- INDEXES
-- ============================================================================

create index if not exists minor_offenses_sr_code_idx on public.minor_offenses (sr_code);
create index if not exists major_offenses_sr_code_idx on public.major_offenses (sr_code);
create index if not exists non_wearing_uniform_sr_code_idx on public.non_wearing_uniform (sr_code);
create index if not exists gatepass_sr_code_idx on public.gatepass (sr_code);
create index if not exists good_moral_sr_code_idx on public.good_moral (sr_code);
create index if not exists id_replacement_sr_code_idx on public.id_replacement (sr_code);
create index if not exists leave_of_absence_sr_code_idx on public.leave_of_absence (sr_code);

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

create index if not exists user_accounts_email_idx on public.user_accounts (email);
create index if not exists user_accounts_user_id_idx on public.user_accounts (user_id);
create index if not exists user_accounts_org_idx on public.user_accounts (organization_id);

-- ============================================================================
-- GRANTS
-- ============================================================================

grant usage on schema public to authenticated;

grant select on table public.organizations to authenticated;
grant select, insert, update, delete on table public.minor_offenses to authenticated;
grant select, insert, update, delete on table public.major_offenses to authenticated;
grant select, insert, update, delete on table public.non_wearing_uniform to authenticated;
grant select, insert, update, delete on table public.gatepass to authenticated;
grant select, insert, update, delete on table public.good_moral to authenticated;
grant select, insert, update, delete on table public.id_replacement to authenticated;
grant select, insert, update, delete on table public.leave_of_absence to authenticated;
grant select, insert, update, delete on table public.user_accounts to authenticated;

grant usage, select on sequence public.organizations_id_seq to authenticated;
grant usage, select on sequence public.minor_offenses_id_seq to authenticated;
grant usage, select on sequence public.major_offenses_id_seq to authenticated;
grant usage, select on sequence public.non_wearing_uniform_id_seq to authenticated;
grant usage, select on sequence public.gatepass_id_seq to authenticated;
grant usage, select on sequence public.good_moral_id_seq to authenticated;
grant usage, select on sequence public.id_replacement_id_seq to authenticated;
grant usage, select on sequence public.leave_of_absence_id_seq to authenticated;
grant usage, select on sequence public.user_accounts_id_seq to authenticated;

-- ============================================================================
-- RLS HELPERS + POLICIES
-- ============================================================================

create or replace function public.current_user_organization_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.user_accounts
  where user_id = auth.uid()
  limit 1;
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.user_accounts
  where user_id = auth.uid()
  limit 1;
$$;

create or replace function public.current_user_organization_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select o.name
  from public.user_accounts ua
  left join public.organizations o on o.id = ua.organization_id
  where ua.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.can_access_all_organizations()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_user_role() = 'head'
    and lower(coalesce(public.current_user_organization_name(), '')) = 'alangilan';
$$;

grant execute on function public.current_user_organization_id() to authenticated;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_user_organization_name() to authenticated;
grant execute on function public.can_access_all_organizations() to authenticated;

alter table public.organizations enable row level security;
alter table public.user_accounts enable row level security;
alter table public.minor_offenses enable row level security;
alter table public.major_offenses enable row level security;
alter table public.non_wearing_uniform enable row level security;
alter table public.gatepass enable row level security;
alter table public.good_moral enable row level security;
alter table public.id_replacement enable row level security;
alter table public.leave_of_absence enable row level security;

-- drop old policies if any
drop policy if exists organizations_read_all on public.organizations;
drop policy if exists user_accounts_read_same_org on public.user_accounts;
drop policy if exists user_accounts_insert_admin_head_only on public.user_accounts;
drop policy if exists user_accounts_update_admin_head_only on public.user_accounts;
drop policy if exists user_accounts_delete_admin_head_only on public.user_accounts;
drop policy if exists user_accounts_admin_manage on public.user_accounts;
drop policy if exists user_accounts_read_admin_or_same_org on public.user_accounts;
drop policy if exists user_accounts_insert_admin_only on public.user_accounts;
drop policy if exists user_accounts_update_admin_only on public.user_accounts;
drop policy if exists user_accounts_delete_admin_only on public.user_accounts;

drop policy if exists minor_offenses_select_same_org on public.minor_offenses;
drop policy if exists minor_offenses_modify_coordinator_only on public.minor_offenses;
drop policy if exists major_offenses_select_same_org on public.major_offenses;
drop policy if exists major_offenses_modify_coordinator_only on public.major_offenses;
drop policy if exists non_wearing_uniform_select_same_org on public.non_wearing_uniform;
drop policy if exists non_wearing_uniform_modify_coordinator_only on public.non_wearing_uniform;
drop policy if exists gatepass_select_same_org on public.gatepass;
drop policy if exists gatepass_modify_coordinator_only on public.gatepass;
drop policy if exists good_moral_select_same_org on public.good_moral;
drop policy if exists good_moral_modify_coordinator_only on public.good_moral;
drop policy if exists id_replacement_select_same_org on public.id_replacement;
drop policy if exists id_replacement_modify_coordinator_only on public.id_replacement;
drop policy if exists leave_of_absence_select_same_org on public.leave_of_absence;
drop policy if exists leave_of_absence_modify_coordinator_only on public.leave_of_absence;

create policy organizations_read_all
on public.organizations
for select
to authenticated
using (true);

create policy user_accounts_read_admin_or_same_org
on public.user_accounts
for select
to authenticated
using (
  public.current_user_role() = 'admin'
  or organization_id = public.current_user_organization_id()
);

create policy user_accounts_insert_admin_only
on public.user_accounts
for insert
to authenticated
with check (
  public.current_user_role() = 'admin'
  and role in ('admin', 'head', 'coordinator')
  and (role = 'admin' or organization_id is not null)
);

create policy user_accounts_update_admin_only
on public.user_accounts
for update
to authenticated
using (
  public.current_user_role() = 'admin'
)
with check (
  public.current_user_role() = 'admin'
  and role in ('admin', 'head', 'coordinator')
  and (role = 'admin' or organization_id is not null)
);

create policy user_accounts_delete_admin_only
on public.user_accounts
for delete
to authenticated
using (
  public.current_user_role() = 'admin'
);

create policy minor_offenses_select_same_org
on public.minor_offenses
for select
to authenticated
using (
  public.can_access_all_organizations()
  or organization_id = public.current_user_organization_id()
);

create policy minor_offenses_modify_coordinator_only
on public.minor_offenses
for all
to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() = 'coordinator'
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() = 'coordinator'
);

create policy major_offenses_select_same_org
on public.major_offenses
for select
to authenticated
using (
  public.can_access_all_organizations()
  or organization_id = public.current_user_organization_id()
);

create policy major_offenses_modify_coordinator_only
on public.major_offenses
for all
to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() = 'coordinator'
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() = 'coordinator'
);

create policy non_wearing_uniform_select_same_org
on public.non_wearing_uniform
for select
to authenticated
using (
  public.can_access_all_organizations()
  or organization_id = public.current_user_organization_id()
);

create policy non_wearing_uniform_modify_coordinator_only
on public.non_wearing_uniform
for all
to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() = 'coordinator'
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() = 'coordinator'
);

create policy gatepass_select_same_org
on public.gatepass
for select
to authenticated
using (
  public.can_access_all_organizations()
  or organization_id = public.current_user_organization_id()
);

create policy gatepass_modify_coordinator_only
on public.gatepass
for all
to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() = 'coordinator'
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() = 'coordinator'
);

create policy good_moral_select_same_org
on public.good_moral
for select
to authenticated
using (
  public.can_access_all_organizations()
  or organization_id = public.current_user_organization_id()
);

create policy good_moral_modify_coordinator_only
on public.good_moral
for all
to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() = 'coordinator'
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() = 'coordinator'
);

create policy id_replacement_select_same_org
on public.id_replacement
for select
to authenticated
using (
  public.can_access_all_organizations()
  or organization_id = public.current_user_organization_id()
);

create policy id_replacement_modify_coordinator_only
on public.id_replacement
for all
to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() = 'coordinator'
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() = 'coordinator'
);

create policy leave_of_absence_select_same_org
on public.leave_of_absence
for select
to authenticated
using (
  public.can_access_all_organizations()
  or organization_id = public.current_user_organization_id()
);

create policy leave_of_absence_modify_coordinator_only
on public.leave_of_absence
for all
to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() = 'coordinator'
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() = 'coordinator'
);

commit;

-- ============================================================================
-- QUICK CHECKS (optional):
-- select * from public.organizations order by id;
-- select email, role, organization_id from public.user_accounts order by email;
-- ============================================================================
