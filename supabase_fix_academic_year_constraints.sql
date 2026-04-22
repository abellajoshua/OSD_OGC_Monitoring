-- ============================================================================
-- HOTFIX: academic_year check constraint regex
-- Reason: previous pattern used \d which does not validate as expected in Postgres
-- Safe to run on existing database before seeding.
-- ============================================================================

begin;

alter table public.minor_offenses drop constraint if exists minor_offenses_academic_year_check;
alter table public.minor_offenses
  add constraint minor_offenses_academic_year_check
  check (academic_year ~ '^[0-9]{4}-[0-9]{4}$');

alter table public.major_offenses drop constraint if exists major_offenses_academic_year_check;
alter table public.major_offenses
  add constraint major_offenses_academic_year_check
  check (academic_year ~ '^[0-9]{4}-[0-9]{4}$');

alter table public.non_wearing_uniform drop constraint if exists non_wearing_uniform_academic_year_check;
alter table public.non_wearing_uniform
  add constraint non_wearing_uniform_academic_year_check
  check (academic_year ~ '^[0-9]{4}-[0-9]{4}$');

alter table public.gatepass drop constraint if exists gatepass_academic_year_check;
alter table public.gatepass
  add constraint gatepass_academic_year_check
  check (academic_year ~ '^[0-9]{4}-[0-9]{4}$');

alter table public.good_moral drop constraint if exists good_moral_academic_year_check;
alter table public.good_moral
  add constraint good_moral_academic_year_check
  check (academic_year ~ '^[0-9]{4}-[0-9]{4}$');

alter table public.id_replacement drop constraint if exists id_replacement_academic_year_check;
alter table public.id_replacement
  add constraint id_replacement_academic_year_check
  check (academic_year ~ '^[0-9]{4}-[0-9]{4}$');

alter table public.leave_of_absence drop constraint if exists leave_of_absence_academic_year_check;
alter table public.leave_of_absence
  add constraint leave_of_absence_academic_year_check
  check (academic_year ~ '^[0-9]{4}-[0-9]{4}$');

commit;
