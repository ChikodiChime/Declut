-- order_items: one row per listing within an order (order = one seller's group)
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  listing_id uuid not null references public.listings(id),
  item_price numeric(10,2) not null,
  created_at timestamptz not null default now()
);

create index order_items_order_id_idx on public.order_items(order_id);
create index order_items_listing_id_idx on public.order_items(listing_id);

-- listing_id on orders is now a denormalised "primary listing" pointer, nullable
-- because an order may contain multiple listings tracked in order_items
alter table public.orders alter column listing_id drop not null;

-- rollback:
-- drop table public.order_items;
-- alter table public.orders alter column listing_id set not null;
