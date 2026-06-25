-- supabase/migrations/031_notifications_request_type.sql
-- Add request_fulfilled to the notifications type check constraint.

alter table public.notifications
  drop constraint notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('order_update', 'claim_request', 'payout_update', 'request_fulfilled'));

-- Rollback:
-- alter table public.notifications drop constraint notifications_type_check;
-- alter table public.notifications add constraint notifications_type_check
--   check (type in ('order_update', 'claim_request', 'payout_update'));
