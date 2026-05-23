-- supabase/migrations/013_claims.sql
-- Rollback:
--   drop table if exists public.claims;

create table public.claims (
  id             uuid primary key default gen_random_uuid(),
  listing_id     uuid not null references public.listings(id) on delete cascade,
  buyer_id       uuid not null references public.users(id) on delete cascade,
  status         text not null default 'pending'
                   check (status in ('pending', 'accepted', 'completed', 'cancelled')),
  pickup_address text,
  claimed_at     timestamptz not null default now(),
  accepted_at    timestamptz,
  completed_at   timestamptz,

  unique(listing_id)
);

create index claims_buyer_id_idx  on public.claims(buyer_id);
create index claims_status_idx    on public.claims(status);
