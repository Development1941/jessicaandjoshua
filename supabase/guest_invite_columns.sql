-- Show which function each family is invited to.
-- Supabase: SQL Editor → New query → paste → Run.
-- Does not change guest rows or RSVPs.
-- brunch = morning function. bar = night function.
-- tier both sets both flags. brunch sets brunch only. night sets bar only.

alter table public.guests
  add column if not exists invited_brunch boolean
  generated always as (tier in ('brunch', 'both')) stored;

alter table public.guests
  add column if not exists invited_bar boolean
  generated always as (tier in ('night', 'both')) stored;

alter table public.guests
  add column if not exists invite_label text
  generated always as (
    case tier
      when 'both' then 'Every event'
      when 'brunch' then 'Brunch only'
      when 'night' then 'Bar only'
      else tier
    end
  ) stored;

create or replace view public.family_invites
with (security_invoker = true) as
select
  id,
  addressee as family,
  name as guest,
  phone,
  email,
  invited_brunch as brunch,
  invited_bar as bar,
  invite_label as invite
from public.guests;

revoke all on table public.family_invites from anon, authenticated;

-- Check: Table Editor → family_invites
--   brunch = true and bar = false → brunch only
--   brunch = false and bar = true → bar only
--   brunch = true and bar = true → every event
