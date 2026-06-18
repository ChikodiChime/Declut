-- supabase/migrations/030_listing_multiple_requests.sql
-- Replace the single listings.request_id FK with a many-to-many junction table.

-- 1. Junction table
create table if not exists listing_requests (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references listings(id) on delete cascade,
  request_id  uuid not null references item_requests(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique(listing_id, request_id)
);

-- 2. Migrate existing single links
insert into listing_requests (listing_id, request_id)
select id, request_id
from listings
where request_id is not null
on conflict do nothing;

-- 3. RLS (service role only, same pattern as request_follows)
alter table listing_requests enable row level security;

create policy "listing_requests: service role only"
  on listing_requests
  for all
  using (false);

-- Rollback:
-- drop table if exists listing_requests;
