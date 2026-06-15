-- supabase/migrations/027_address_book.sql

-- 1. Create user_addresses table
create table if not exists user_addresses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  label        text not null check (char_length(label) between 1 and 30),
  address      text not null check (char_length(address) between 1 and 300),
  address_state text,
  is_default   boolean not null default false,
  created_at   timestamptz not null default now()
);

-- 2. RLS
alter table user_addresses enable row level security;

create policy "user_addresses: service role only"
  on user_addresses
  for all
  using (false);

-- 3. Migrate existing profile addresses
insert into user_addresses (user_id, label, address, address_state, is_default)
select id, 'Home', address, address_state, true
from users
where address is not null and address != '';

-- 4. Drop old columns from users
alter table users drop column if exists address;
alter table users drop column if exists address_state;
