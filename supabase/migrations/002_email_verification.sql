-- supabase/migrations/002_email_verification.sql
alter table public.users
  add column email_verified    boolean      not null default false,
  add column otp_code          text,
  add column otp_expires_at    timestamptz,
  add column otp_resend_after  timestamptz;
