-- Rollback: alter table orders drop column delivered_at;

alter table public.orders
  add column if not exists delivered_at timestamptz;
