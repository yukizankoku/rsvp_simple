-- Run once in Supabase → SQL Editor if your "guests" table was created before email and short links were added.
-- Safe to run more than once.

-- Random 7-character code for the short invitation link (/i/<code>).
-- Similar-looking characters (0/O, 1/l/I) are left out so the link can be typed from paper.
create or replace function public.gen_short_code() returns text
language sql volatile as $$
  select string_agg(
    substr('ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789', 1 + floor(random() * 57)::int, 1), '')
  from generate_series(1, 7)
$$;

-- Where the invitation and the QR code are sent. Optional when the admin adds a guest.
alter table public.guests
  add column if not exists email text check (email is null or char_length(email) <= 254);

-- A volatile default is evaluated per row, so existing guests each get their own code.
alter table public.guests
  add column if not exists short_code text not null unique default public.gen_short_code();

-- When the invitation email was last sent (null = never).
alter table public.guests
  add column if not exists invited_at timestamptz;
