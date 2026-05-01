-- Viral Sync production hardening schema extension.

ALTER TABLE merchant_sessions
  DROP CONSTRAINT IF EXISTS merchant_sessions_role_check;

ALTER TABLE merchant_sessions
  ADD CONSTRAINT merchant_sessions_role_check
  CHECK (role IN ('owner', 'admin', 'manager', 'staff', 'support', 'auditor'));

CREATE INDEX IF NOT EXISTS idx_merchant_sessions_active
  ON merchant_sessions (merchant_id, role, expires_at)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_staff_devices_active
  ON staff_devices (merchant_id, public_key)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_audit_events_merchant_created
  ON audit_events (merchant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_action_created
  ON audit_events (action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_redemptions_merchant_status
  ON redemptions (merchant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_causal_receipts_status_created
  ON causal_receipts (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_outbox_jobs_due
  ON outbox_jobs (status, next_run_at, attempts);

CREATE TABLE IF NOT EXISTS production_readiness_reviews (
  id TEXT PRIMARY KEY,
  release_sha TEXT NOT NULL,
  reviewer TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('blocked', 'capped-beta-approved', 'mainnet-approved')),
  notes TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
