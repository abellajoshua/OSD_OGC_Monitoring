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
alter table public.minor_offenses enable row level security;
alter table public.major_offenses enable row level security;
alter table public.non_wearing_uniform enable row level security;
alter table public.gatepass enable row level security;
alter table public.good_moral enable row level security;
alter table public.id_replacement enable row level security;
alter table public.leave_of_absence enable row level security;
alter table public.user_accounts enable row level security;

drop policy if exists organizations_read_all on public.organizations;
create policy organizations_read_all
on public.organizations
for select
to authenticated
using (true);

drop policy if exists user_accounts_read_same_org on public.user_accounts;
drop policy if exists user_accounts_read_admin_or_same_org on public.user_accounts;
create policy user_accounts_read_admin_or_same_org
on public.user_accounts
for select
to authenticated
using (
  public.current_user_role() = 'admin'
  or organization_id = public.current_user_organization_id()
);

drop policy if exists user_accounts_insert_admin_head_only on public.user_accounts;
drop policy if exists user_accounts_insert_admin_only on public.user_accounts;
create policy user_accounts_insert_admin_only
on public.user_accounts
for insert
to authenticated
with check (
	public.current_user_role() = 'admin'
	and role in ('admin', 'head', 'coordinator')
	and (role = 'admin' or organization_id is not null)
);

drop policy if exists user_accounts_update_admin_head_only on public.user_accounts;
drop policy if exists user_accounts_update_admin_only on public.user_accounts;
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

drop policy if exists user_accounts_delete_admin_head_only on public.user_accounts;
drop policy if exists user_accounts_delete_admin_only on public.user_accounts;
create policy user_accounts_delete_admin_only
on public.user_accounts
for delete
to authenticated
using (
	public.current_user_role() = 'admin'
);

drop policy if exists minor_offenses_select_same_org on public.minor_offenses;
create policy minor_offenses_select_same_org
on public.minor_offenses
for select
to authenticated
using (
	public.can_access_all_organizations()
	or organization_id = public.current_user_organization_id()
);

drop policy if exists minor_offenses_modify_coordinator_only on public.minor_offenses;
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

drop policy if exists major_offenses_select_same_org on public.major_offenses;
create policy major_offenses_select_same_org
on public.major_offenses
for select
to authenticated
using (
	public.can_access_all_organizations()
	or organization_id = public.current_user_organization_id()
);

drop policy if exists major_offenses_modify_coordinator_only on public.major_offenses;
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

drop policy if exists non_wearing_uniform_select_same_org on public.non_wearing_uniform;
create policy non_wearing_uniform_select_same_org
on public.non_wearing_uniform
for select
to authenticated
using (
	public.can_access_all_organizations()
	or organization_id = public.current_user_organization_id()
);

drop policy if exists non_wearing_uniform_modify_coordinator_only on public.non_wearing_uniform;
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

drop policy if exists gatepass_select_same_org on public.gatepass;
create policy gatepass_select_same_org
on public.gatepass
for select
to authenticated
using (
	public.can_access_all_organizations()
	or organization_id = public.current_user_organization_id()
);

drop policy if exists gatepass_modify_coordinator_only on public.gatepass;
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

drop policy if exists good_moral_select_same_org on public.good_moral;
create policy good_moral_select_same_org
on public.good_moral
for select
to authenticated
using (
	public.can_access_all_organizations()
	or organization_id = public.current_user_organization_id()
);

drop policy if exists good_moral_modify_coordinator_only on public.good_moral;
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

drop policy if exists id_replacement_select_same_org on public.id_replacement;
create policy id_replacement_select_same_org
on public.id_replacement
for select
to authenticated
using (
	public.can_access_all_organizations()
	or organization_id = public.current_user_organization_id()
);

drop policy if exists id_replacement_modify_coordinator_only on public.id_replacement;
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

drop policy if exists leave_of_absence_select_same_org on public.leave_of_absence;
create policy leave_of_absence_select_same_org
on public.leave_of_absence
for select
to authenticated
using (
	public.can_access_all_organizations()
	or organization_id = public.current_user_organization_id()
);

drop policy if exists leave_of_absence_modify_coordinator_only on public.leave_of_absence;
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
