-- ============================================================================
-- OSD OGC MONITORING - RBAC MIGRATION (idempotent, safe to re-run)
-- Paste this whole file in Supabase SQL Editor and run once against an
-- existing database that was set up with supabase_full_setup.sql.
--
-- Unlike supabase_full_setup.sql, this file does NOT truncate any table and
-- does NOT reseed organizations or accounts. It only:
-- 1) Re-asserts the role/organization integrity constraints on user_accounts
-- 2) Recreates the RLS helper functions and policies with the corrected
--    access matrix (head = read-only across ALL organizations, coordinator
--    = read/write own organization only, admin = management-only)
-- 3) Tightens the user_accounts SELECT policy so a coordinator/head can only
--    read their own account row (previously any account in the same
--    organization could read every other account in that organization)
-- ============================================================================

begin;

-- ============================================================================
-- 1) INTEGRITY CONSTRAINTS (re-assert, guarded by drop-if-exists)
-- ============================================================================

alter table public.user_accounts
  drop constraint if exists user_accounts_role_check;

alter table public.user_accounts
  add constraint user_accounts_role_check
  check (role in ('admin', 'head', 'coordinator'));

alter table public.user_accounts
  drop constraint if exists user_accounts_org_required_non_admin_check;

alter table public.user_accounts
  add constraint user_accounts_org_required_non_admin_check
  check (role = 'admin' or organization_id is not null);

-- Exactly one admin and one head account, system-wide.
drop index if exists public.user_accounts_single_admin_idx;
create unique index user_accounts_single_admin_idx
  on public.user_accounts ((role))
  where role = 'admin';

drop index if exists public.user_accounts_single_head_idx;
create unique index user_accounts_single_head_idx
  on public.user_accounts ((role))
  where role = 'head';

-- ============================================================================
-- 2) RLS HELPER FUNCTIONS
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

-- Head is the only role that can read across every organization, and only
-- when assigned to the Alangilan campus (the single head seat is always
-- created against Alangilan by api/admin/create-user.js).
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

-- ============================================================================
-- 3) ENABLE RLS (no-op if already enabled)
-- ============================================================================

alter table public.organizations enable row level security;
alter table public.user_accounts enable row level security;
alter table public.minor_offenses enable row level security;
alter table public.major_offenses enable row level security;
alter table public.non_wearing_uniform enable row level security;
alter table public.gatepass enable row level security;
alter table public.good_moral enable row level security;
alter table public.id_replacement enable row level security;
alter table public.leave_of_absence enable row level security;

-- ============================================================================
-- 4) DROP OLD POLICIES (all known past and current names)
-- ============================================================================

drop policy if exists organizations_read_all on public.organizations;

drop policy if exists user_accounts_read_same_org on public.user_accounts;
drop policy if exists user_accounts_insert_admin_head_only on public.user_accounts;
drop policy if exists user_accounts_update_admin_head_only on public.user_accounts;
drop policy if exists user_accounts_delete_admin_head_only on public.user_accounts;
drop policy if exists user_accounts_admin_manage on public.user_accounts;
drop policy if exists user_accounts_read_admin_or_same_org on public.user_accounts;
drop policy if exists user_accounts_read_own_or_admin on public.user_accounts;
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

-- ============================================================================
-- 5) POLICIES
-- ============================================================================

create policy organizations_read_all
on public.organizations
for select
to authenticated
using (true);

-- Tightened: a coordinator/head may only read their own account row.
-- Previously (user_accounts_read_admin_or_same_org) any account could read
-- every other account row in the same organization.
create policy user_accounts_read_own_or_admin
on public.user_accounts
for select
to authenticated
using (
  public.current_user_role() = 'admin'
  or user_id = auth.uid()
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
-- QUICK CHECKS (optional, run separately):
-- select * from public.organizations order by id;
-- select email, role, organization_id from public.user_accounts order by email;
-- select proname from pg_proc where pronamespace = 'public'::regnamespace
--   and proname like 'current_user_%' or proname = 'can_access_all_organizations';
-- select tablename, policyname from pg_policies where schemaname = 'public' order by 1, 2;
-- ============================================================================
