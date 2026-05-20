-- Rollback: alter table orders drop column confirmed_at;
--           alter table orders drop column shipped_at;

alter table public.orders
  add column if not exists confirmed_at timestamptz;

alter table public.orders
  add column if not exists shipped_at timestamptz;
