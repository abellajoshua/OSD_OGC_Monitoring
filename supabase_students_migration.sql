-- ============================================================================
-- OSD OGC MONITORING - STUDENT DETAILS MODULE (idempotent, safe to re-run)
-- Run this in the Supabase SQL Editor to add the student details table,
-- grants, RLS policies, and indexes used by the admin portal upload module
-- and the coordinator read-only Student Records page.
--
-- Table: public.students
--   sr_code, name, program, year_level, academic_year, semester
--   organization_id = owning campus (one record set per campus coordinator)
--   unique (organization_id, academic_year, semester, sr_code)
-- ============================================================================

begin;

-- ============================================================================
-- 1) TABLE
-- ============================================================================

create table if not exists public.students (
  id bigserial primary key,
  sr_code text not null,
  name text not null,
  program text not null,
  year_level text not null,
  academic_year text not null check (academic_year ~ '^[0-9]{4}-[0-9]{4}$'),
  semester text not null check (semester in ('First Semester', 'Second Semester', 'Summer Class')),
  organization_id bigint not null references public.organizations(id),
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table public.students
  add constraint students_org_period_sr_code_key
  unique (organization_id, academic_year, semester, sr_code);

-- ============================================================================
-- 2) INDEXES
-- ============================================================================

create index if not exists students_org_period_idx
  on public.students (organization_id, academic_year, semester);

create index if not exists students_sr_code_idx on public.students (sr_code);
create index if not exists students_org_idx on public.students (organization_id);
create index if not exists students_name_idx on public.students (name);

-- ============================================================================
-- 3) GRANTS
-- ============================================================================

grant select, insert, update, delete on table public.students to authenticated;
grant usage, select on sequence public.students_id_seq to authenticated;

-- ============================================================================
-- 4) RLS
-- ============================================================================

alter table public.students enable row level security;

drop policy if exists students_select_scoped on public.students;
drop policy if exists students_modify_admin_only on public.students;

-- Admin sees everything (admin portal management). Head with global access
-- sees all campuses; every other account sees its own campus only.
create policy students_select_scoped
on public.students
for select
to authenticated
using (
  public.current_user_role() = 'admin'
  or public.can_access_all_organizations()
  or organization_id = public.current_user_organization_id()
);

-- Data entry is an admin-portal module: only admin can insert/update/delete.
-- Coordinators are read-only for their own campus.
create policy students_modify_admin_only
on public.students
for all
to authenticated
using (
  public.current_user_role() = 'admin'
)
with check (
  public.current_user_role() = 'admin'
);

commit;

-- ============================================================================
-- QUICK CHECKS (optional, run separately):
-- select * from public.students order by organization_id, academic_year, semester, sr_code limit 20;
-- select tablename, policyname from pg_policies where schemaname = 'public' and tablename = 'students';
-- ============================================================================
