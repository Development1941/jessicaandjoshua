-- Jessika & Joshua wedding — run this in the Supabase SQL editor.
-- Dashboard: Project → SQL → New query → paste → Run.

create extension if not exists pgcrypto;

create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  phone text unique,
  email text,
  first_name text not null default '',
  last_name text not null default '',
  addressee text not null default '',
  name text not null default 'Guest',
  tier text not null default 'both' check (tier in ('both', 'brunch', 'night')),
  country_code text,
  invited_brunch boolean generated always as (tier in ('brunch', 'both')) stored,
  invited_bar boolean generated always as (tier in ('night', 'both')) stored,
  invite_label text generated always as (
    case tier
      when 'both' then 'Every event'
      when 'brunch' then 'Brunch only'
      when 'night' then 'Bar only'
      else tier
    end
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references public.guests(id) on delete set null,
  guest_phone text not null,
  guest_first_name text not null default '',
  guest_last_name text not null default '',
  guest_names text not null default '',
  brunch_attending text,
  brunch_kids text default '0',
  bar_attending text,
  dietary text default 'None',
  jukebox_track text default '',
  jukebox_artist text default '',
  spotify_url text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (guest_phone)
);

create index if not exists guests_phone_idx on public.guests (phone);
create unique index if not exists guests_email_unique_idx
  on public.guests (lower(email))
  where email is not null and email <> '';
create index if not exists rsvps_guest_id_idx on public.rsvps (guest_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists guests_touch_updated_at on public.guests;
create trigger guests_touch_updated_at
before update on public.guests
for each row execute procedure public.touch_updated_at();

drop trigger if exists rsvps_touch_updated_at on public.rsvps;
create trigger rsvps_touch_updated_at
before update on public.rsvps
for each row execute procedure public.touch_updated_at();

alter table public.guests enable row level security;
alter table public.rsvps enable row level security;

-- Public clients cannot read/write tables directly.
-- Next.js API routes use the service role key (bypasses RLS).
-- Guest rows live in seed_wedding_list.sql. Run that after this file.

-- Existing databases: create table above does not add new columns.
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
