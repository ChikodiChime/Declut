-- supabase/migrations/023_wallet_system.sql
-- Replace direct Paystack transfers with a seller wallet + admin-processed
-- withdrawal flow. On delivery, the seller's net earnings are credited to
-- wallet_balance. Sellers request withdrawals; admins process them manually.

-- ── Forward ───────────────────────────────────────────────────────────────────

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS wallet_balance integer NOT NULL DEFAULT 0
  CHECK (wallet_balance >= 0);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id     uuid        NOT NULL REFERENCES users(id),
  amount        integer     NOT NULL CHECK (amount > 0),
  status        text        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'processed', 'rejected')),
  bank_snapshot jsonb       NOT NULL,
  admin_note    text,
  requested_at  timestamptz NOT NULL DEFAULT now(),
  processed_at  timestamptz
);

CREATE INDEX IF NOT EXISTS withdrawal_requests_seller_id_idx ON withdrawal_requests(seller_id);
CREATE INDEX IF NOT EXISTS withdrawal_requests_status_idx    ON withdrawal_requests(status);

-- Atomic credit — safe to call concurrently per-order because the payout
-- sentinel (paystack_transfer_id) serialises access at the order level.
CREATE OR REPLACE FUNCTION credit_wallet(p_user_id uuid, p_amount integer)
RETURNS void LANGUAGE sql AS $$
  UPDATE users SET wallet_balance = wallet_balance + p_amount WHERE id = p_user_id;
$$;

-- Atomic debit — returns false if balance is insufficient so the caller can
-- surface a proper error without a separate read-then-write race.
CREATE OR REPLACE FUNCTION debit_wallet(p_user_id uuid, p_amount integer)
RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  UPDATE users
  SET wallet_balance = wallet_balance - p_amount
  WHERE id = p_user_id AND wallet_balance >= p_amount;
  RETURN FOUND;
END;
$$;

-- RLS: service role only (same pattern as every other private table)
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'withdrawal_requests'
      AND policyname  = 'withdrawal_requests: service role only'
  ) THEN
    CREATE POLICY "withdrawal_requests: service role only"
    ON withdrawal_requests FOR ALL USING (false);
  END IF;
END $$;

-- ── Backfill: credit wallet for delivered orders that were never paid out ─────
-- Covers orders where the Paystack transfer failed (paystack_transfer_id IS NULL)
-- or got stuck on the 'pending' sentinel. Skips any order already marked
-- 'credited' or with a real transfer code (TRF_xxx).

WITH unpaid AS (
  SELECT id, seller_id, ROUND(item_price * 0.9)::integer AS net
  FROM orders
  WHERE status = 'delivered'
    AND (paystack_transfer_id IS NULL OR paystack_transfer_id = 'pending')
)
UPDATE users u
SET wallet_balance = wallet_balance + sub.total
FROM (
  SELECT seller_id, SUM(net) AS total
  FROM unpaid
  GROUP BY seller_id
) sub
WHERE u.id = sub.seller_id;

UPDATE orders
SET paystack_transfer_id = 'credited'
WHERE status = 'delivered'
  AND (paystack_transfer_id IS NULL OR paystack_transfer_id = 'pending');

-- ── Rollback ──────────────────────────────────────────────────────────────────
-- DROP FUNCTION IF EXISTS credit_wallet(uuid, integer);
-- DROP FUNCTION IF EXISTS debit_wallet(uuid, integer);
-- DROP TABLE  IF EXISTS withdrawal_requests;
-- ALTER TABLE users DROP COLUMN IF EXISTS wallet_balance;
