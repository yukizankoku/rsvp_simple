-- Run once in Supabase → SQL Editor if your "guests" table was created before email became the guest's identity.
-- Safe to run more than once.

-- Two different people may share a name and company, so name + company is no longer unique.
-- Kept nullable for now so the previous version of the app keeps working until the new one is deployed.
alter table public.guests drop constraint if exists guests_name_key_company_key_key;
alter table public.guests alter column name_key drop not null;
alter table public.guests alter column company_key drop not null;

-- The public form and the /tiket page find a guest by email. The app stores emails lowercased.
update public.guests set email = lower(trim(email)) where email is not null and email <> lower(trim(email));

-- If this fails with "could not create unique index", some guests share an email. Find them with:
--   select email, count(*) from public.guests where email is not null group by email having count(*) > 1;
-- give each one a different email (or clear it) in the admin page, then run this file again.
create unique index if not exists guests_email_key on public.guests (email) where email is not null;

-- After the new version of the app is deployed, the old columns can be removed:
--   alter table public.guests drop column if exists name_key, drop column if exists company_key;
