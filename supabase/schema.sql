-- Run once in Supabase → SQL Editor → New query → Run

-- Random 7-character code for the short invitation link (/i/<code>).
-- Similar-looking characters (0/O, 1/l/I) are left out so the link can be typed from paper.
create or replace function public.gen_short_code() returns text
language sql volatile as $$
  select string_agg(
    substr('ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789', 1 + floor(random() * 57)::int, 1), '')
  from generate_series(1, 7)
$$;

create table if not exists public.guests (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 1 and 120),
  company       text not null check (char_length(company) between 1 and 120),
  -- Normalized (lowercased, trimmed) copies used to find the guest again
  name_key      text not null,
  company_key   text not null,
  -- Where the invitation and the QR code are sent. Optional when the admin adds a guest.
  email         text check (email is null or char_length(email) <= 254),
  -- null = added by the admin, not answered yet
  attending     boolean,
  token         text not null unique,
  -- Short invitation link: /i/<short_code>
  short_code    text not null unique default public.gen_short_code(),
  -- When the invitation email was last sent (null = never)
  invited_at    timestamptz,
  checked_in_at timestamptz,
  -- Set on a companion (+1) row: the guest who brought them. Deleting the guest deletes the companion.
  plus_one_of   uuid references public.guests (id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (name_key, company_key)
);

create index if not exists guests_created_at_idx on public.guests (created_at desc);

-- At most one companion per guest.
create unique index if not exists guests_plus_one_of_key
  on public.guests (plus_one_of) where plus_one_of is not null;

-- RLS enabled with no policies: the public anon key cannot read or write.
-- The app accesses this table only from the server using the service_role key.
alter table public.guests enable row level security;
