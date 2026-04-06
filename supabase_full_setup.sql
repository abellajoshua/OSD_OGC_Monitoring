-- ============================================================================
-- OSD OGC MONITORING - ONE SHOT FULL SETUP
-- Paste this whole file in Supabase SQL Editor and run once.
-- Includes:
-- 1) Schema + migration-safe ALTERs
-- 2) Cleanup/reset of old public data
-- 3) Organizations + required user accounts + sample records
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
alter table if exists public.non_wearing_uniform add column if not exists archived boolean default false;
alter table if exists public.gatepass add column if not exists archived boolean default false;
alter table if exists public.good_moral add column if not exists archived boolean default false;
alter table if exists public.id_replacement add column if not exists archived boolean default false;
alter table if exists public.leave_of_absence add column if not exists archived boolean default false;

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
-- Default Password for all below: Pass@12345

-- Single Admin account (account management page)
-- admin@example.com
-- Head account (single, view-only, Alangilan only)
-- alangilan.head@example.com
-- Coordinator accounts (one per org, can edit records):
-- cics.coordinator@example.com
-- coe.coordinator@example.com
-- cet.coordinator@example.com
-- cafad.coordinator@example.com
-- mabini.coordinator@example.com
-- balayan.coordinator@example.com
-- lobo.coordinator@example.com

-- Upsert helper pattern per email

do $$
declare
  v_email text;
  v_full_name text;
  v_role text;
  v_org_name text;
  v_org_id bigint;
  v_user_id uuid;
begin
  for v_email, v_full_name, v_role, v_org_name in
    select * from (values
      ('admin@example.com', 'System Admin', 'admin', null),
      ('alangilan.head@example.com', 'Alangilan Head', 'head', 'Alangilan'),
      ('cics.coordinator@example.com', 'CICS Coordinator', 'coordinator', 'CICS'),
      ('coe.coordinator@example.com', 'COE Coordinator', 'coordinator', 'COE'),
      ('cet.coordinator@example.com', 'CET Coordinator', 'coordinator', 'CET'),
      ('cafad.coordinator@example.com', 'CAFAD Coordinator', 'coordinator', 'CAFAD'),
      ('mabini.coordinator@example.com', 'Mabini Coordinator', 'coordinator', 'Mabini'),
      ('balayan.coordinator@example.com', 'Balayan Coordinator', 'coordinator', 'Balayan'),
      ('lobo.coordinator@example.com', 'Lobo Coordinator', 'coordinator', 'Lobo')
    ) as t(email, full_name, role, org_name)
  loop
    select id into v_org_id from public.organizations where name = v_org_name limit 1;

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
        jsonb_build_object('full_name', v_full_name, 'role', v_role, 'organization', v_org_name),
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
        raw_user_meta_data = jsonb_build_object('full_name', v_full_name, 'role', v_role, 'organization', v_org_name),
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

-- Backfill org id if any null (safety)
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

alter table public.user_accounts
  drop constraint if exists user_accounts_org_required_non_admin_check;

alter table public.user_accounts
  add constraint user_accounts_org_required_non_admin_check
  check (role = 'admin' or organization_id is not null);

-- ============================================================================
-- SAMPLE RECORDS (KAUNTING INFOS)
-- ============================================================================

insert into public.minor_offenses (
  date_of_complaint, name_of_student, sr_code, year_program, sex, contact_number,
  complainant, written_reply, date_of_hearing, offense, sanction,
  date_of_suspension, date_of_post_counseling, archived, organization_id
)
select
  '2026-03-01', 'Juan Dela Cruz', '21-10001', 'BSIT 3', 'Male', '09171234567',
  'Prof. Ramos', 'Acknowledged warning.', '2026-03-03', 'Late submission', 'Written warning',
  '2026-03-04', '2026-03-10', false,
  (select id from public.organizations where name = 'CICS' limit 1);

insert into public.major_offenses (
  date_of_complaint, name_of_student, sr_code, year_program, sex, contact_number,
  complainant, written_reply, date_of_hearing, offense, sanction,
  date_of_suspension, date_of_post_counseling, archived, organization_id
)
select
  '2026-03-02', 'Maria Santos', '21-20002', 'BSEE 2', 'Female', '09179876543',
  'Discipline Committee', 'Submitted written explanation.', '2026-03-05', 'Serious misconduct', '3-day suspension',
  '2026-03-06', '2026-03-12', false,
  (select id from public.organizations where name = 'COE' limit 1);

insert into public.non_wearing_uniform (
  date, time_in, time_out, name, sr_code, course, sex, reason, archived, organization_id
)
select
  '2026-03-03', '08:00', '11:00', 'Pedro Reyes', '21-30003', 'BSCE', 'Male', 'No available uniform', false,
  (select id from public.organizations where name = 'CET' limit 1);

insert into public.gatepass (
  date, time_in, time_out, name, sr_code, course, sex, reason, archived, organization_id
)
select
  '2026-03-04', '09:00', '12:00', 'Ana Lim', '21-40004', 'BFA', 'Female', 'Medical checkup', false,
  (select id from public.organizations where name = 'CAFAD' limit 1);

insert into public.good_moral (
  date, time_in, time_out, name, sr_code, course, sex, purpose, archived, organization_id
)
select
  '2026-03-05', '10:00', '10:30', 'Lito Cruz', '21-50005', 'BSBA', 'Male', 'Scholarship requirement', false,
  (select id from public.organizations where name = 'Mabini' limit 1);

insert into public.id_replacement (
  date, time_in, time_out, name, sr_code, course, sex, reason, archived, organization_id
)
select
  '2026-03-06', '13:00', '13:20', 'Cathy Sy', '21-60006', 'BSIT', 'Female', 'Lost ID', false,
  (select id from public.organizations where name = 'Balayan' limit 1);

insert into public.leave_of_absence (
  date, time_in, time_out, name, sr_code, course, sex, semester_period_covered, archived, organization_id
)
select
  '2026-03-07', '14:00', '14:30', 'Mark Tan', '21-70007', 'BSTM', 'Male', '2nd Semester AY 2025-2026', false,
  (select id from public.organizations where name = 'Lobo' limit 1);

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
