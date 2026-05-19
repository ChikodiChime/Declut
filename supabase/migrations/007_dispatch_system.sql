-- supabase/migrations/007_dispatch_system.sql
-- Rollback: alter table users drop constraint users_account_type_check;
--           alter table users add constraint users_account_type_check
--             check (account_type in ('individual','business','buyer'));
--           alter table orders drop column dispatcher_id;
--           drop index if exists orders_dispatcher_id_idx;

-- 1. Extend account_type to include dispatcher
alter table public.users
  drop constraint if exists users_account_type_check;

alter table public.users
  add constraint users_account_type_check
    check (account_type in ('individual', 'business', 'buyer', 'dispatcher'));

-- 2. Track which dispatcher claimed a delivery order
alter table public.orders
  add column if not exists dispatcher_id uuid references public.users(id) on delete set null;

create index if not exists orders_dispatcher_id_idx on public.orders (dispatcher_id);
