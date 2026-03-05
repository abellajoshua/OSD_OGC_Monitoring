create table if not exists public.minor_offenses (
  id bigserial primary key,
  date_of_complaint date not null,
  name_of_student text not null,
  sr_code text not null,
  year_program text not null,
  contact_number text not null,
  reported_by text not null,
  sex text not null,
  offense text not null,
  sanction text not null,
  date_of_sanction date not null,
  archived boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.major_offenses (
  id bigserial primary key,
  date_of_complaint date not null,
  name_of_student text not null,
  sr_code text not null,
  year_program text not null,
  contact_number text not null,
  reported_by text not null,
  sex text not null,
  offense text not null,
  sanction text not null,
  date_of_sanction date not null,
  archived boolean default false,
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
  reason text not null,
  archived boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.user_accounts (
  id bigserial primary key,
  user_id uuid unique references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  role text default 'coordinator' check (role in ('coordinator', 'head')),
  created_at timestamptz default now()
);

create index if not exists minor_offenses_sr_code_idx on public.minor_offenses (sr_code);
create index if not exists major_offenses_sr_code_idx on public.major_offenses (sr_code);
create index if not exists non_wearing_uniform_sr_code_idx on public.non_wearing_uniform (sr_code);
create index if not exists gatepass_sr_code_idx on public.gatepass (sr_code);
create index if not exists good_moral_sr_code_idx on public.good_moral (sr_code);
create index if not exists id_replacement_sr_code_idx on public.id_replacement (sr_code);
create index if not exists leave_of_absence_sr_code_idx on public.leave_of_absence (sr_code);
create index if not exists user_accounts_email_idx on public.user_accounts (email);
create index if not exists user_accounts_user_id_idx on public.user_accounts (user_id);
