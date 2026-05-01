DROP TABLE IF EXISTS production_readiness_reviews;

DROP INDEX IF EXISTS idx_outbox_jobs_due;
DROP INDEX IF EXISTS idx_causal_receipts_status_created;
DROP INDEX IF EXISTS idx_redemptions_merchant_status;
DROP INDEX IF EXISTS idx_audit_events_action_created;
DROP INDEX IF EXISTS idx_audit_events_merchant_created;
DROP INDEX IF EXISTS idx_staff_devices_active;
DROP INDEX IF EXISTS idx_merchant_sessions_active;

ALTER TABLE merchant_sessions
  DROP CONSTRAINT IF EXISTS merchant_sessions_role_check;

ALTER TABLE merchant_sessions
  ADD CONSTRAINT merchant_sessions_role_check
  CHECK (role IN ('owner', 'admin', 'staff'));
