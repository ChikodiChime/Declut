-- supabase/migrations/002_email_verification.sql
alter table public.users
  -- bcrypt hash of the 6-digit OTP code; never store the plaintext code
  add column email_verified    boolean      not null default false,
  -- bcrypt hash of 6-digit code (always 60 chars when set)
  add column otp_code          text         check (otp_code is null or char_length(otp_code) = 60),
  -- server-side expiry guard; not exposed to client
  add column otp_expires_at    timestamptz,
  -- resend cooldown timestamp; exposed to client for countdown UI
  add column otp_resend_after  timestamptz;

-- Index for middleware email_verified checks on every authenticated request
create index users_email_verified_idx on public.users (email_verified);
