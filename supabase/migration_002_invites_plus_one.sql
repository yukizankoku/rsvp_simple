-- Run once in Supabase → SQL Editor if your "guests" table was created before this change.
-- Safe to run more than once.

-- attending = null means the admin added the guest but the guest has not answered yet.
alter table public.guests alter column attending drop not null;

-- A companion (+1) is its own guest row with its own QR, linked to the guest who brought them.
-- Deleting the guest also deletes the companion.
alter table public.guests
  add column if not exists plus_one_of uuid references public.guests (id) on delete cascade;

-- At most one companion per guest.
create unique index if not exists guests_plus_one_of_key
  on public.guests (plus_one_of) where plus_one_of is not null;
