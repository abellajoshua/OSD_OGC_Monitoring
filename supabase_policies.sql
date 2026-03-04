-- Run this in Supabase SQL Editor if you host the frontend on GitHub Pages.
-- It allows authenticated users (logged in users) to read/write records.

grant usage on schema public to authenticated;

grant select, insert, update, delete on table public.minor_offenses to authenticated;
grant select, insert, update, delete on table public.non_wearing_uniform to authenticated;
grant select, insert, update, delete on table public.gatepass to authenticated;
grant select, insert, update, delete on table public.good_moral to authenticated;

grant usage, select on sequence public.minor_offenses_id_seq to authenticated;
grant usage, select on sequence public.non_wearing_uniform_id_seq to authenticated;
grant usage, select on sequence public.gatepass_id_seq to authenticated;
grant usage, select on sequence public.good_moral_id_seq to authenticated;

alter table public.minor_offenses enable row level security;
alter table public.non_wearing_uniform enable row level security;
alter table public.gatepass enable row level security;
alter table public.good_moral enable row level security;

drop policy if exists "authenticated_minor_offenses_all" on public.minor_offenses;
create policy "authenticated_minor_offenses_all"
on public.minor_offenses
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated_non_wearing_uniform_all" on public.non_wearing_uniform;
create policy "authenticated_non_wearing_uniform_all"
on public.non_wearing_uniform
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated_gatepass_all" on public.gatepass;
create policy "authenticated_gatepass_all"
on public.gatepass
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated_good_moral_all" on public.good_moral;
create policy "authenticated_good_moral_all"
on public.good_moral
for all
to authenticated
using (true)
with check (true);
