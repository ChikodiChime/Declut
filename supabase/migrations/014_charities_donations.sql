-- supabase/migrations/014_charities_donations.sql
-- Rollback:
--   drop table if exists public.donations;
--   drop table if exists public.charities;

create table public.charities (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  logo_url    text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.donations (
  id                  uuid primary key default gen_random_uuid(),
  listing_id          uuid not null unique references public.listings(id) on delete cascade,
  seller_id           uuid not null references public.users(id) on delete cascade,
  charity_id          uuid references public.charities(id),           -- null = "any"
  assigned_charity_id uuid references public.charities(id),           -- set by platform

  handoff_status  text not null default 'pending'
                    check (handoff_status in ('pending', 'received')),
  received_at     timestamptz,

  delivery_status text not null default 'pending'
                    check (delivery_status in ('pending', 'delivered')),
  delivered_at    timestamptz,

  created_at      timestamptz not null default now()
);

create index donations_seller_id_idx  on public.donations(seller_id);
create index donations_charity_id_idx on public.donations(charity_id);
