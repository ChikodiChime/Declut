-- supabase/migrations/026_backfill_dispatcher_wallet.sql
-- Credit dispatcher wallets for deliveries that completed before the
-- dispatcher_credited_at sentinel was introduced (migration 025).

-- ── Forward ───────────────────────────────────────────────────────────────────

WITH unearned AS (
  SELECT dispatcher_id, SUM(delivery_fee)::integer AS total
  FROM orders
  WHERE status = 'delivered'
    AND dispatcher_id IS NOT NULL
    AND dispatcher_credited_at IS NULL
    AND delivery_fee > 0
  GROUP BY dispatcher_id
)
UPDATE users u
SET wallet_balance = wallet_balance + sub.total
FROM unearned sub
WHERE u.id = sub.dispatcher_id;

UPDATE orders
SET dispatcher_credited_at = now()
WHERE status = 'delivered'
  AND dispatcher_id IS NOT NULL
  AND dispatcher_credited_at IS NULL
  AND delivery_fee > 0;

-- ── Rollback ──────────────────────────────────────────────────────────────────
-- No safe rollback — wallet_balance changes cannot be reversed without knowing
-- the per-dispatcher totals at rollback time. Run manually if needed.
