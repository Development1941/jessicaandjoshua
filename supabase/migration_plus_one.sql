-- Add a dedicated +1 guest name column on RSVPs.
-- Safe to re-run. Does not delete existing RSVP rows.

alter table public.rsvps
  add column if not exists plus_one_name text;

update public.rsvps
set plus_one_name = coalesce(plus_one_name, '');

alter table public.rsvps
  alter column plus_one_name set default '',
  alter column plus_one_name set not null;

-- Backfill from older "Guest Name + Plus One" guest_names values when possible.
update public.rsvps
set
  plus_one_name = trim(both from split_part(guest_names, ' + ', 2)),
  guest_names = trim(both from split_part(guest_names, ' + ', 1))
where coalesce(plus_one_name, '') = ''
  and position(' + ' in guest_names) > 0;
