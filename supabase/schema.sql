-- Run once in Supabase → SQL Editor → New query → Run

create table if not exists public.guests (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 1 and 120),
  company       text not null check (char_length(company) between 1 and 120),
  -- Normalized (lowercased, trimmed) copies used to find the guest again
  name_key      text not null,
  company_key   text not null,
  attending     boolean not null,
  token         text not null unique,
  checked_in_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (name_key, company_key)
);

create index if not exists guests_created_at_idx on public.guests (created_at desc);

-- RLS enabled with no policies: the public anon key cannot read or write.
-- The app accesses this table only from the server using the service_role key.
alter table public.guests enable row level security;
