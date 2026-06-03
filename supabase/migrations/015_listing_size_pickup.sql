alter table public.listings
  add column size_category text
    check (size_category in ('small', 'medium', 'large', 'extra_large')),
  add column pickup_address text;
