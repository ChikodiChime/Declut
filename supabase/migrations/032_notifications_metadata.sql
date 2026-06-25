-- supabase/migrations/032_notifications_metadata.sql
-- Add a metadata jsonb column to notifications for storing action context
-- (e.g. request_ids for request_fulfilled notifications).

alter table public.notifications
  add column if not exists metadata jsonb;

-- Rollback:
-- alter table public.notifications drop column if exists metadata;
