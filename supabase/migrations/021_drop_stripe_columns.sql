-- supabase/migrations/021_drop_stripe_columns.sql
-- Run after confirming Paystack integration is working in production.
-- Old Stripe columns are no longer used by the application.

alter table public.users
  drop column if exists stripe_account_id,
  drop column if exists stripe_onboarding_complete;

alter table public.orders
  drop column if exists stripe_payment_intent_id,
  drop column if exists stripe_transfer_id;

-- Down (cannot restore data, only re-add columns):
-- alter table public.users
--   add column if not exists stripe_account_id text,
--   add column if not exists stripe_onboarding_complete boolean not null default false;
-- alter table public.orders
--   add column if not exists stripe_payment_intent_id text,
--   add column if not exists stripe_transfer_id text;
