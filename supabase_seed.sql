-- ============================================================================
-- OSD OGC MONITORING SYSTEM - SEED DATA
-- Safe to re-run: inserts only when matching sample rows do not yet exist.
-- ============================================================================

begin;

create extension if not exists pgcrypto;

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

-- --------------------------------------------------------------------------
-- AUTH USERS + USER ACCOUNTS (sample app users)
-- Default passwords:
--   admin.sample@example.com      -> Admin@123
--   coordinator.osd@example.com  -> OSD@12345
--   coordinator.ogc@example.com  -> OGC@12345
-- --------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from auth.users where email = 'admin.sample@example.com'
  ) then
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
      'admin.sample@example.com',
      crypt('Admin@123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"System Admin","role":"admin"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  end if;
end $$;

update auth.users
set
  encrypted_password = crypt('Admin@123', gen_salt('bf')),
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  updated_at = now()
where email = 'admin.sample@example.com';

insert into public.user_accounts (user_id, email, full_name, role, organization_id)
select u.id, 'admin.sample@example.com', 'System Admin', 'admin', null
from auth.users u
where u.email = 'admin.sample@example.com'
  and not exists (
    select 1 from public.user_accounts where email = 'admin.sample@example.com'
  );

update public.user_accounts
set role = 'admin',
    organization_id = null
where email = 'admin.sample@example.com';

do $$
begin
  if not exists (
    select 1 from auth.users where email = 'coordinator.osd@example.com'
  ) then
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
      'coordinator.osd@example.com',
      crypt('OSD@12345', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"OSD Coordinator","role":"coordinator"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  end if;
end $$;

update auth.users
set
  encrypted_password = crypt('OSD@12345', gen_salt('bf')),
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  updated_at = now()
where email = 'coordinator.osd@example.com';

insert into public.user_accounts (user_id, email, full_name, role, organization_id)
select u.id, 'coordinator.osd@example.com', 'OSD Coordinator', 'coordinator', o.id
from auth.users u
join public.organizations o on o.name = 'CICS'
where u.email = 'coordinator.osd@example.com'
  and not exists (
    select 1 from public.user_accounts where email = 'coordinator.osd@example.com'
  );

do $$
begin
  if not exists (
    select 1 from auth.users where email = 'coordinator.ogc@example.com'
  ) then
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
      'coordinator.ogc@example.com',
      crypt('OGC@12345', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"OGC Coordinator","role":"coordinator"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  end if;
end $$;

update auth.users
set
  encrypted_password = crypt('OGC@12345', gen_salt('bf')),
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  updated_at = now()
where email = 'coordinator.ogc@example.com';

insert into public.user_accounts (user_id, email, full_name, role, organization_id)
select u.id, 'coordinator.ogc@example.com', 'OGC Coordinator', 'coordinator', o.id
from auth.users u
join public.organizations o on o.name = 'COE'
where u.email = 'coordinator.ogc@example.com'
  and not exists (
    select 1 from public.user_accounts where email = 'coordinator.ogc@example.com'
  );

-- --------------------------------------------------------------------------
-- MINOR OFFENSES
-- --------------------------------------------------------------------------
insert into public.minor_offenses (
  date_of_complaint,
  name_of_student,
  sr_code,
  year_program,
  sex,
  contact_number,
  complainant,
  written_reply,
  date_of_hearing,
  offense,
  sanction,
  date_of_suspension,
  date_of_post_counseling,
  archived
)
select
  '2026-02-03',
  'Juan Dela Cruz',
  '21-12345',
  'BSIT 3',
  'Male',
  '09171234567',
  'Mr. Ramos',
  'Student apologized and submitted written explanation.',
  '2026-02-05',
  'Late submission of required OGC form',
  'Written warning',
  '2026-02-06',
  '2026-02-12',
  false
where not exists (
  select 1 from public.minor_offenses
  where sr_code = '21-12345'
    and offense = 'Late submission of required OGC form'
    and date_of_complaint = '2026-02-03'
);

insert into public.minor_offenses (
  date_of_complaint,
  name_of_student,
  sr_code,
  year_program,
  sex,
  contact_number,
  complainant,
  written_reply,
  date_of_hearing,
  offense,
  sanction,
  date_of_suspension,
  date_of_post_counseling,
  archived
)
select
  '2026-01-15',
  'Maria Santos',
  '22-54321',
  'BSA 2',
  'Female',
  '09981234567',
  'Ms. Garcia',
  'Complied with corrective measures.',
  '2026-01-17',
  'Dress code violation (first offense)',
  'Counseling and warning',
  '2026-01-18',
  '2026-01-25',
  true
where not exists (
  select 1 from public.minor_offenses
  where sr_code = '22-54321'
    and offense = 'Dress code violation (first offense)'
    and date_of_complaint = '2026-01-15'
);

-- --------------------------------------------------------------------------
-- MAJOR OFFENSES
-- --------------------------------------------------------------------------
insert into public.major_offenses (
  date_of_complaint,
  name_of_student,
  sr_code,
  year_program,
  sex,
  contact_number,
  complainant,
  written_reply,
  date_of_hearing,
  offense,
  sanction,
  date_of_suspension,
  date_of_post_counseling,
  archived
)
select
  '2026-02-10',
  'Pedro Reyes',
  '20-98765',
  'BSME 4',
  'Male',
  '09175556666',
  'Discipline Committee',
  'Student admitted to misconduct and requested mitigation.',
  '2026-02-12',
  'Physical altercation on campus',
  'Suspension for 3 days',
  '2026-02-15',
  '2026-02-25',
  false
where not exists (
  select 1 from public.major_offenses
  where sr_code = '20-98765'
    and offense = 'Physical altercation on campus'
    and date_of_complaint = '2026-02-10'
);

insert into public.major_offenses (
  date_of_complaint,
  name_of_student,
  sr_code,
  year_program,
  sex,
  contact_number,
  complainant,
  written_reply,
  date_of_hearing,
  offense,
  sanction,
  date_of_suspension,
  date_of_post_counseling,
  archived
)
select
  '2025-12-05',
  'Ana Lopez',
  '19-11223',
  'BSCS 4',
  'Female',
  '09176667777',
  'Campus Security',
  'Submitted a letter of explanation.',
  '2025-12-08',
  'Unauthorized access to restricted laboratory',
  'Final warning and probation',
  '2025-12-10',
  '2025-12-18',
  true
where not exists (
  select 1 from public.major_offenses
  where sr_code = '19-11223'
    and offense = 'Unauthorized access to restricted laboratory'
    and date_of_complaint = '2025-12-05'
);

-- --------------------------------------------------------------------------
-- NON WEARING UNIFORM
-- --------------------------------------------------------------------------
insert into public.non_wearing_uniform (
  date, time_in, time_out, name, sr_code, course, sex, reason, archived
)
select
  '2026-02-18', '08:10', '09:05', 'Liza Mendoza', '23-10001', 'BSN 1', 'Female',
  'Uniform laundry delay', false
where not exists (
  select 1 from public.non_wearing_uniform
  where sr_code = '23-10001' and date = '2026-02-18'
);

insert into public.non_wearing_uniform (
  date, time_in, time_out, name, sr_code, course, sex, reason, archived
)
select
  '2026-01-22', '13:15', '14:00', 'Mark Villanueva', '22-10077', 'BSIT 2', 'Male',
  'PE uniform not available', true
where not exists (
  select 1 from public.non_wearing_uniform
  where sr_code = '22-10077' and date = '2026-01-22'
);

-- --------------------------------------------------------------------------
-- GATEPASS
-- --------------------------------------------------------------------------
insert into public.gatepass (
  date, time_in, time_out, name, sr_code, course, sex, reason, archived
)
select
  '2026-02-20', '10:00', '11:30', 'Chris Alonzo', '21-20011', 'BSED 3', 'Male',
  'Medical checkup at nearby clinic', false
where not exists (
  select 1 from public.gatepass
  where sr_code = '21-20011' and date = '2026-02-20'
);

insert into public.gatepass (
  date, time_in, time_out, name, sr_code, course, sex, reason, archived
)
select
  '2026-01-09', '14:20', '15:40', 'Nicole Ramos', '20-20088', 'BSBA 4', 'Female',
  'Document processing at registrar', true
where not exists (
  select 1 from public.gatepass
  where sr_code = '20-20088' and date = '2026-01-09'
);

-- --------------------------------------------------------------------------
-- GOOD MORAL
-- --------------------------------------------------------------------------
insert into public.good_moral (
  date, time_in, time_out, name, sr_code, course, sex, purpose, archived
)
select
  '2026-02-22', '09:00', '09:30', 'Elaine Cruz', '23-30001', 'BSPsych 1', 'Female',
  'Scholarship requirement', false
where not exists (
  select 1 from public.good_moral
  where sr_code = '23-30001' and date = '2026-02-22'
);

insert into public.good_moral (
  date, time_in, time_out, name, sr_code, course, sex, purpose, archived
)
select
  '2026-01-11', '11:10', '11:45', 'Ronald Bautista', '21-30022', 'BSA 3', 'Male',
  'On-the-job training application', true
where not exists (
  select 1 from public.good_moral
  where sr_code = '21-30022' and date = '2026-01-11'
);

-- --------------------------------------------------------------------------
-- ID REPLACEMENT
-- --------------------------------------------------------------------------
insert into public.id_replacement (
  date, time_in, time_out, name, sr_code, course, sex, reason, archived
)
select
  '2026-02-25', '08:45', '09:20', 'Patricia Lim', '24-40010', 'BSCE 1', 'Female',
  'Lost student ID', false
where not exists (
  select 1 from public.id_replacement
  where sr_code = '24-40010' and date = '2026-02-25'
);

insert into public.id_replacement (
  date, time_in, time_out, name, sr_code, course, sex, reason, archived
)
select
  '2026-01-28', '15:00', '15:35', 'Joshua Tan', '22-40099', 'BSIT 2', 'Male',
  'Damaged ID card', true
where not exists (
  select 1 from public.id_replacement
  where sr_code = '22-40099' and date = '2026-01-28'
);

-- --------------------------------------------------------------------------
-- LEAVE OF ABSENCE
-- --------------------------------------------------------------------------
insert into public.leave_of_absence (
  date, time_in, time_out, name, sr_code, course, sex, semester_period_covered, archived
)
select
  '2026-02-27', '13:00', '13:40', 'Kevin Flores', '20-50007', 'BSIT 4', 'Male',
  '2nd Semester AY 2025-2026', false
where not exists (
  select 1 from public.leave_of_absence
  where sr_code = '20-50007' and date = '2026-02-27'
);

insert into public.leave_of_absence (
  date, time_in, time_out, name, sr_code, course, sex, semester_period_covered, archived
)
select
  '2026-01-14', '10:30', '11:00', 'Angela Uy', '21-50044', 'BSN 3', 'Female',
  '1st Semester AY 2025-2026', true
where not exists (
  select 1 from public.leave_of_absence
  where sr_code = '21-50044' and date = '2026-01-14'
);

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

commit;
