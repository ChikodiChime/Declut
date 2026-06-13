-- supabase/migrations/020_paystack_fields.sql

-- Add Paystack payout fields to users
alter table public.users
  add column if not exists paystack_recipient_code text,
  add column if not exists paystack_bank_code text,
  add column if not exists paystack_bank_name text,
  add column if not exists paystack_account_number text,
  add column if not exists paystack_account_name text,
  add column if not exists paystack_onboarding_complete boolean not null default false;

-- Add Paystack reference fields to orders
alter table public.orders
  add column if not exists paystack_reference text,
  add column if not exists paystack_transfer_id text;

-- Down:
-- alter table public.users
--   drop column if exists paystack_recipient_code,
--   drop column if exists paystack_bank_code,
--   drop column if exists paystack_bank_name,
--   drop column if exists paystack_account_number,
--   drop column if exists paystack_account_name,
--   drop column if exists paystack_onboarding_complete;
-- alter table public.orders
--   drop column if exists paystack_reference,
--   drop column if exists paystack_transfer_id;
