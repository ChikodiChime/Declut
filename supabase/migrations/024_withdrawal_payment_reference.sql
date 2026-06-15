ALTER TABLE withdrawal_requests
  ADD COLUMN IF NOT EXISTS payment_reference text;
