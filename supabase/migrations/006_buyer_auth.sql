-- supabase/migrations/006_buyer_auth.sql
-- Rollback: drop otp_codes table (drops indexes too); restore account_type constraint to ('individual','business')

-- 1. Extend users.account_type to include 'buyer'
alter table public.users
  drop constraint if exists users_account_type_check;

alter table public.users
  add constraint users_account_type_check
    check (account_type in ('individual', 'business', 'buyer'));

-- 2. Buyer OTP codes — separate from users so OTP works before user row exists
create table public.otp_codes (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  code_hash   text not null,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index otp_codes_email_idx on public.otp_codes (email);

create unique index otp_codes_one_active_per_email_idx
  on public.otp_codes (email)
  where (used_at is null);
