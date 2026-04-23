-- ============================================================================
-- ACADEMIC PERIOD INTEGRITY FIX
-- Enforces immutable academic_year + semester and strict filter performance.
-- ============================================================================

begin;

-- Backfill missing academic period fields using record date when needed.
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

-- Repair rows with invalid (non-null but malformed) academic period values.
update public.minor_offenses
set
  academic_year = case
    when extract(month from coalesce(date_of_complaint, created_at::date)) >= 8 then
      to_char(coalesce(date_of_complaint, created_at::date), 'YYYY') || '-' || to_char((coalesce(date_of_complaint, created_at::date) + interval '1 year'), 'YYYY')
    else
      to_char((coalesce(date_of_complaint, created_at::date) - interval '1 year'), 'YYYY') || '-' || to_char(coalesce(date_of_complaint, created_at::date), 'YYYY')
  end,
  semester = case
    when lower(trim(coalesce(semester, ''))) in ('1st semester', 'first semester', 'first', '1st') then 'First Semester'
    when lower(trim(coalesce(semester, ''))) in ('2nd semester', 'second semester', 'second', '2nd') then 'Second Semester'
    when lower(trim(coalesce(semester, ''))) like '%summer%' then 'Summer Class'
    when extract(month from coalesce(date_of_complaint, created_at::date)) between 8 and 12 then 'First Semester'
    when extract(month from coalesce(date_of_complaint, created_at::date)) between 1 and 5 then 'Second Semester'
    else 'Summer Class'
  end
where coalesce(trim(academic_year), '') = ''
   or academic_year !~ '^[0-9]{4}-[0-9]{4}$'
   or lower(trim(coalesce(semester, ''))) not in (
     'first semester',
     'second semester',
     'summer class',
     '1st semester',
     '2nd semester',
     'first',
     'second',
     '1st',
     '2nd'
   );

update public.major_offenses
set
  academic_year = case
    when extract(month from coalesce(date_of_complaint, created_at::date)) >= 8 then
      to_char(coalesce(date_of_complaint, created_at::date), 'YYYY') || '-' || to_char((coalesce(date_of_complaint, created_at::date) + interval '1 year'), 'YYYY')
    else
      to_char((coalesce(date_of_complaint, created_at::date) - interval '1 year'), 'YYYY') || '-' || to_char(coalesce(date_of_complaint, created_at::date), 'YYYY')
  end,
  semester = case
    when lower(trim(coalesce(semester, ''))) in ('1st semester', 'first semester', 'first', '1st') then 'First Semester'
    when lower(trim(coalesce(semester, ''))) in ('2nd semester', 'second semester', 'second', '2nd') then 'Second Semester'
    when lower(trim(coalesce(semester, ''))) like '%summer%' then 'Summer Class'
    when extract(month from coalesce(date_of_complaint, created_at::date)) between 8 and 12 then 'First Semester'
    when extract(month from coalesce(date_of_complaint, created_at::date)) between 1 and 5 then 'Second Semester'
    else 'Summer Class'
  end
where coalesce(trim(academic_year), '') = ''
   or academic_year !~ '^[0-9]{4}-[0-9]{4}$'
   or lower(trim(coalesce(semester, ''))) not in (
     'first semester',
     'second semester',
     'summer class',
     '1st semester',
     '2nd semester',
     'first',
     'second',
     '1st',
     '2nd'
   );

update public.non_wearing_uniform
set
  academic_year = case
    when extract(month from coalesce(date, created_at::date)) >= 8 then
      to_char(coalesce(date, created_at::date), 'YYYY') || '-' || to_char((coalesce(date, created_at::date) + interval '1 year'), 'YYYY')
    else
      to_char((coalesce(date, created_at::date) - interval '1 year'), 'YYYY') || '-' || to_char(coalesce(date, created_at::date), 'YYYY')
  end,
  semester = case
    when lower(trim(coalesce(semester, ''))) in ('1st semester', 'first semester', 'first', '1st') then 'First Semester'
    when lower(trim(coalesce(semester, ''))) in ('2nd semester', 'second semester', 'second', '2nd') then 'Second Semester'
    when lower(trim(coalesce(semester, ''))) like '%summer%' then 'Summer Class'
    when extract(month from coalesce(date, created_at::date)) between 8 and 12 then 'First Semester'
    when extract(month from coalesce(date, created_at::date)) between 1 and 5 then 'Second Semester'
    else 'Summer Class'
  end
where coalesce(trim(academic_year), '') = ''
   or academic_year !~ '^[0-9]{4}-[0-9]{4}$'
   or lower(trim(coalesce(semester, ''))) not in (
     'first semester',
     'second semester',
     'summer class',
     '1st semester',
     '2nd semester',
     'first',
     'second',
     '1st',
     '2nd'
   );

update public.gatepass
set
  academic_year = case
    when extract(month from coalesce(date, created_at::date)) >= 8 then
      to_char(coalesce(date, created_at::date), 'YYYY') || '-' || to_char((coalesce(date, created_at::date) + interval '1 year'), 'YYYY')
    else
      to_char((coalesce(date, created_at::date) - interval '1 year'), 'YYYY') || '-' || to_char(coalesce(date, created_at::date), 'YYYY')
  end,
  semester = case
    when lower(trim(coalesce(semester, ''))) in ('1st semester', 'first semester', 'first', '1st') then 'First Semester'
    when lower(trim(coalesce(semester, ''))) in ('2nd semester', 'second semester', 'second', '2nd') then 'Second Semester'
    when lower(trim(coalesce(semester, ''))) like '%summer%' then 'Summer Class'
    when extract(month from coalesce(date, created_at::date)) between 8 and 12 then 'First Semester'
    when extract(month from coalesce(date, created_at::date)) between 1 and 5 then 'Second Semester'
    else 'Summer Class'
  end
where coalesce(trim(academic_year), '') = ''
   or academic_year !~ '^[0-9]{4}-[0-9]{4}$'
   or lower(trim(coalesce(semester, ''))) not in (
     'first semester',
     'second semester',
     'summer class',
     '1st semester',
     '2nd semester',
     'first',
     'second',
     '1st',
     '2nd'
   );

update public.good_moral
set
  academic_year = case
    when extract(month from coalesce(date, created_at::date)) >= 8 then
      to_char(coalesce(date, created_at::date), 'YYYY') || '-' || to_char((coalesce(date, created_at::date) + interval '1 year'), 'YYYY')
    else
      to_char((coalesce(date, created_at::date) - interval '1 year'), 'YYYY') || '-' || to_char(coalesce(date, created_at::date), 'YYYY')
  end,
  semester = case
    when lower(trim(coalesce(semester, ''))) in ('1st semester', 'first semester', 'first', '1st') then 'First Semester'
    when lower(trim(coalesce(semester, ''))) in ('2nd semester', 'second semester', 'second', '2nd') then 'Second Semester'
    when lower(trim(coalesce(semester, ''))) like '%summer%' then 'Summer Class'
    when extract(month from coalesce(date, created_at::date)) between 8 and 12 then 'First Semester'
    when extract(month from coalesce(date, created_at::date)) between 1 and 5 then 'Second Semester'
    else 'Summer Class'
  end
where coalesce(trim(academic_year), '') = ''
   or academic_year !~ '^[0-9]{4}-[0-9]{4}$'
   or lower(trim(coalesce(semester, ''))) not in (
     'first semester',
     'second semester',
     'summer class',
     '1st semester',
     '2nd semester',
     'first',
     'second',
     '1st',
     '2nd'
   );

update public.id_replacement
set
  academic_year = case
    when extract(month from coalesce(date, created_at::date)) >= 8 then
      to_char(coalesce(date, created_at::date), 'YYYY') || '-' || to_char((coalesce(date, created_at::date) + interval '1 year'), 'YYYY')
    else
      to_char((coalesce(date, created_at::date) - interval '1 year'), 'YYYY') || '-' || to_char(coalesce(date, created_at::date), 'YYYY')
  end,
  semester = case
    when lower(trim(coalesce(semester, ''))) in ('1st semester', 'first semester', 'first', '1st') then 'First Semester'
    when lower(trim(coalesce(semester, ''))) in ('2nd semester', 'second semester', 'second', '2nd') then 'Second Semester'
    when lower(trim(coalesce(semester, ''))) like '%summer%' then 'Summer Class'
    when extract(month from coalesce(date, created_at::date)) between 8 and 12 then 'First Semester'
    when extract(month from coalesce(date, created_at::date)) between 1 and 5 then 'Second Semester'
    else 'Summer Class'
  end
where coalesce(trim(academic_year), '') = ''
   or academic_year !~ '^[0-9]{4}-[0-9]{4}$'
   or lower(trim(coalesce(semester, ''))) not in (
     'first semester',
     'second semester',
     'summer class',
     '1st semester',
     '2nd semester',
     'first',
     'second',
     '1st',
     '2nd'
   );

update public.leave_of_absence
set
  academic_year = case
    when extract(month from coalesce(date, created_at::date)) >= 8 then
      to_char(coalesce(date, created_at::date), 'YYYY') || '-' || to_char((coalesce(date, created_at::date) + interval '1 year'), 'YYYY')
    else
      to_char((coalesce(date, created_at::date) - interval '1 year'), 'YYYY') || '-' || to_char(coalesce(date, created_at::date), 'YYYY')
  end,
  semester = case
    when lower(trim(coalesce(semester, ''))) in ('1st semester', 'first semester', 'first', '1st') then 'First Semester'
    when lower(trim(coalesce(semester, ''))) in ('2nd semester', 'second semester', 'second', '2nd') then 'Second Semester'
    when lower(trim(coalesce(semester, ''))) like '%summer%' then 'Summer Class'
    when extract(month from coalesce(date, created_at::date)) between 8 and 12 then 'First Semester'
    when extract(month from coalesce(date, created_at::date)) between 1 and 5 then 'Second Semester'
    else 'Summer Class'
  end
where coalesce(trim(academic_year), '') = ''
   or academic_year !~ '^[0-9]{4}-[0-9]{4}$'
   or lower(trim(coalesce(semester, ''))) not in (
     'first semester',
     'second semester',
     'summer class',
     '1st semester',
     '2nd semester',
     'first',
     'second',
     '1st',
     '2nd'
   );

-- Normalize semester labels to one canonical set.
update public.minor_offenses
set semester = case
  when lower(semester) in ('1st semester', 'first semester', 'first', '1st') then 'First Semester'
  when lower(semester) in ('2nd semester', 'second semester', 'second', '2nd') then 'Second Semester'
  when lower(semester) like '%summer%' then 'Summer Class'
  else semester
end
where semester is not null;

update public.major_offenses
set semester = case
  when lower(semester) in ('1st semester', 'first semester', 'first', '1st') then 'First Semester'
  when lower(semester) in ('2nd semester', 'second semester', 'second', '2nd') then 'Second Semester'
  when lower(semester) like '%summer%' then 'Summer Class'
  else semester
end
where semester is not null;

update public.non_wearing_uniform
set semester = case
  when lower(semester) in ('1st semester', 'first semester', 'first', '1st') then 'First Semester'
  when lower(semester) in ('2nd semester', 'second semester', 'second', '2nd') then 'Second Semester'
  when lower(semester) like '%summer%' then 'Summer Class'
  else semester
end
where semester is not null;

update public.gatepass
set semester = case
  when lower(semester) in ('1st semester', 'first semester', 'first', '1st') then 'First Semester'
  when lower(semester) in ('2nd semester', 'second semester', 'second', '2nd') then 'Second Semester'
  when lower(semester) like '%summer%' then 'Summer Class'
  else semester
end
where semester is not null;

update public.good_moral
set semester = case
  when lower(semester) in ('1st semester', 'first semester', 'first', '1st') then 'First Semester'
  when lower(semester) in ('2nd semester', 'second semester', 'second', '2nd') then 'Second Semester'
  when lower(semester) like '%summer%' then 'Summer Class'
  else semester
end
where semester is not null;

update public.id_replacement
set semester = case
  when lower(semester) in ('1st semester', 'first semester', 'first', '1st') then 'First Semester'
  when lower(semester) in ('2nd semester', 'second semester', 'second', '2nd') then 'Second Semester'
  when lower(semester) like '%summer%' then 'Summer Class'
  else semester
end
where semester is not null;

update public.leave_of_absence
set semester = case
  when lower(semester) in ('1st semester', 'first semester', 'first', '1st') then 'First Semester'
  when lower(semester) in ('2nd semester', 'second semester', 'second', '2nd') then 'Second Semester'
  when lower(semester) like '%summer%' then 'Summer Class'
  else semester
end
where semester is not null;

-- Require academic_year and semester for all operational tables.
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

-- Final safety sweep: guarantee every row matches required academic period format
-- before adding CHECK constraints.
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
where academic_year !~ '^[0-9]{4}-[0-9]{4}$'
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
where academic_year !~ '^[0-9]{4}-[0-9]{4}$'
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
where academic_year !~ '^[0-9]{4}-[0-9]{4}$'
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
where academic_year !~ '^[0-9]{4}-[0-9]{4}$'
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
where academic_year !~ '^[0-9]{4}-[0-9]{4}$'
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
where academic_year !~ '^[0-9]{4}-[0-9]{4}$'
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
where academic_year !~ '^[0-9]{4}-[0-9]{4}$'
   or semester not in ('First Semester', 'Second Semester', 'Summer Class');

-- Format checks.
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

-- Immutable academic period trigger.
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

-- Composite indexes for strict filtering endpoints.
create index if not exists idx_minor_offenses_archive_period_org on public.minor_offenses (organization_id, archived, academic_year, semester);
create index if not exists idx_major_offenses_archive_period_org on public.major_offenses (organization_id, archived, status, academic_year, semester);
create index if not exists idx_non_wearing_uniform_archive_period_org on public.non_wearing_uniform (organization_id, archived, academic_year, semester);
create index if not exists idx_gatepass_archive_period_org on public.gatepass (organization_id, archived, academic_year, semester);
create index if not exists idx_good_moral_archive_period_org on public.good_moral (organization_id, archived, academic_year, semester);
create index if not exists idx_id_replacement_archive_period_org on public.id_replacement (organization_id, archived, academic_year, semester);
create index if not exists idx_leave_of_absence_archive_period_org on public.leave_of_absence (organization_id, archived, academic_year, semester);

commit;
