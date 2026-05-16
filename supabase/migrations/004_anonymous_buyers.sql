-- Allow anonymous buyers by making buyer_id nullable and adding contact fields
alter table public.orders
  alter column buyer_id drop not null;

-- Add buyer contact information for anonymous orders
alter table public.orders
  add column buyer_name text,
  add column buyer_email text,
  add column buyer_phone text,
  add column buyer_address text;

-- Add constraint: either buyer_id must be set OR all contact fields must be set
alter table public.orders
  add constraint buyer_info_check check (
    buyer_id is not null or (
      buyer_name is not null and
      buyer_email is not null and
      buyer_phone is not null and
      buyer_address is not null
    )
  );
