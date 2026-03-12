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
  created_at timestamptz default now()
);

create index if not exists minor_offenses_sr_code_idx on public.minor_offenses (sr_code);
create index if not exists major_offenses_sr_code_idx on public.major_offenses (sr_code);
create index if not exists non_wearing_uniform_sr_code_idx on public.non_wearing_uniform (sr_code);
create index if not exists gatepass_sr_code_idx on public.gatepass (sr_code);
create index if not exists good_moral_sr_code_idx on public.good_moral (sr_code);
