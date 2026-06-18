-- supabase/migrations/029_community_requests.sql

-- 1. item_requests table
create table if not exists item_requests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  title        text not null check (char_length(title) between 3 and 100),
  description  text check (char_length(description) <= 500),
  category     text,
  listing_type text check (listing_type in ('for_sale', 'free', 'donate')),
  area         text,
  max_price    numeric(12, 2),
  status       text not null default 'open' check (status in ('open', 'closed')),
  created_at   timestamptz not null default now()
);

-- 2. request_follows table (creator auto-follows on request insert; others may follow too)
create table if not exists request_follows (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  request_id  uuid not null references item_requests(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique(user_id, request_id)
);

-- 3. Link listings to a single community request
alter table listings
  add column if not exists request_id uuid references item_requests(id) on delete set null;

-- 4. RLS
alter table item_requests enable row level security;
alter table request_follows enable row level security;

-- Public can read open requests (browse page works without auth)
create policy "item_requests: public read"
  on item_requests
  for select
  using (true);

create policy "item_requests: service role write"
  on item_requests
  for all
  using (false);

create policy "request_follows: service role only"
  on request_follows
  for all
  using (false);
