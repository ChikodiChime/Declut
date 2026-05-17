-- Add 'confirmed' to the orders status check constraint
-- Rollback: drop constraint, re-add without 'confirmed'

alter table public.orders
  drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check
    check (status in ('pending', 'paid', 'confirmed', 'shipped', 'delivered', 'completed', 'cancelled'));
