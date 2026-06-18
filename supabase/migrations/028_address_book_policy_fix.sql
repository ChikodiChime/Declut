-- 028_address_book_policy_fix.sql
-- Drop and recreate the RLS policy idempotently.
-- The policy was applied manually during development before migration 027 ran,
-- so 027 fails with "policy already exists". This migration fixes that.

drop policy if exists "user_addresses: service role only" on user_addresses;

create policy "user_addresses: service role only"
  on user_addresses
  for all
  using (false);
