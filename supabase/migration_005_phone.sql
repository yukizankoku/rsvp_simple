-- Run once in Supabase → SQL Editor if your "guests" table was created before the phone number was added.
-- Safe to run more than once.

-- Optional contact number, stored as typed (e.g. "+62 812-3456-7890").
alter table public.guests
  add column if not exists phone text check (phone is null or char_length(phone) <= 30);
