-- supabase/migrations/008_code_attempts.sql
-- Rollback: alter table orders drop column code_attempts;

alter table public.orders
  add column if not exists code_attempts integer not null default 0;
