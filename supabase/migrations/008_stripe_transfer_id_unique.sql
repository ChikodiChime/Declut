-- supabase/migrations/008_stripe_transfer_id_unique.sql
-- Rollback: ALTER TABLE public.orders DROP CONSTRAINT orders_stripe_transfer_id_unique;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_stripe_transfer_id_unique UNIQUE (stripe_transfer_id);
