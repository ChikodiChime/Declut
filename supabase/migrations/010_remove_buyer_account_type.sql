-- supabase/migrations/010_remove_buyer_account_type.sql
-- Rollback: recreate otp_codes table; restore buyer rows; add 'buyer' back to constraint

-- 1. Migrate existing buyer accounts to 'individual'
update public.users set account_type = 'individual' where account_type = 'buyer';

-- 2. Remove 'buyer' from account_type constraint
alter table public.users
  drop constraint users_account_type_check;

alter table public.users
  add constraint users_account_type_check
    check (account_type in ('individual', 'business', 'dispatcher'));

-- 3. Drop buyer OTP table — no longer used
drop table if exists public.otp_codes;
