-- supabase/migrations/025_dispatcher_wallet.sql
-- Extend wallet system to cover dispatchers.

-- ── Forward ───────────────────────────────────────────────────────────────────

-- 1. Make seller_id nullable and add dispatcher_id
ALTER TABLE withdrawal_requests
  ALTER COLUMN seller_id DROP NOT NULL;

ALTER TABLE withdrawal_requests
  ADD COLUMN IF NOT EXISTS dispatcher_id uuid REFERENCES users(id);

-- Exactly one of seller_id / dispatcher_id must be set
DO $$ BEGIN
  ALTER TABLE withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_one_owner
    CHECK (
      (seller_id IS NOT NULL AND dispatcher_id IS NULL) OR
      (seller_id IS NULL    AND dispatcher_id IS NOT NULL)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS withdrawal_requests_dispatcher_id_idx
  ON withdrawal_requests(dispatcher_id);

-- 2. Write-once sentinel to prevent double-crediting dispatcher wallet
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS dispatcher_credited_at timestamptz;

-- ── Rollback ──────────────────────────────────────────────────────────────────
-- ALTER TABLE orders DROP COLUMN IF EXISTS dispatcher_credited_at;
-- ALTER TABLE withdrawal_requests DROP CONSTRAINT IF EXISTS withdrawal_requests_one_owner;
-- ALTER TABLE withdrawal_requests DROP COLUMN IF EXISTS dispatcher_id;
-- ALTER TABLE withdrawal_requests ALTER COLUMN seller_id SET NOT NULL;
