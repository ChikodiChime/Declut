ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stripe_transfer_id text;
