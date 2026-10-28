-- Add guest name/email/country fields.
-- Does not delete guests or RSVPs.
-- Guest rows are loaded by seed_wedding_list.sql.

-- Column updates
alter table public.guests
  alter column phone drop not null;

alter table public.guests
  add column if not exists email text;

alter table public.guests
  add column if not exists first_name text;

alter table public.guests
  add column if not exists last_name text;

alter table public.guests
  add column if not exists addressee text;

alter table public.rsvps
  add column if not exists guest_first_name text;

alter table public.rsvps
  add column if not exists guest_last_name text;

-- Fill any nulls, then enforce defaults / not-null
update public.guests set first_name = coalesce(first_name, '');
update public.guests set last_name = coalesce(last_name, '');
update public.guests set addressee = coalesce(addressee, '');
update public.rsvps set guest_first_name = coalesce(guest_first_name, '');
update public.rsvps set guest_last_name = coalesce(guest_last_name, '');

alter table public.guests
  alter column first_name set default '',
  alter column first_name set not null;

alter table public.guests
  alter column last_name set default '',
  alter column last_name set not null;

alter table public.guests
  alter column addressee set default '',
  alter column addressee set not null;

alter table public.rsvps
  alter column guest_first_name set default '',
  alter column guest_first_name set not null;

alter table public.rsvps
  alter column guest_last_name set default '',
  alter column guest_last_name set not null;

create unique index if not exists guests_email_unique_idx
  on public.guests (lower(email))
  where email is not null and email <> '';

alter table public.guests
  add column if not exists country_code text;
