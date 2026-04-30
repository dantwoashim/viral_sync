-- Viral Sync launch schema draft for Day 36.

CREATE TABLE IF NOT EXISTS merchant_orgs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS merchants (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES merchant_orgs(id),
  name TEXT NOT NULL,
  district TEXT NOT NULL,
  city TEXT NOT NULL,
  location_label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS merchant_sessions (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL REFERENCES merchants(id),
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'staff')),
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS staff_devices (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL REFERENCES merchants(id),
  location_label TEXT NOT NULL,
  label TEXT NOT NULL,
  public_key TEXT NOT NULL UNIQUE,
  enrolled_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL REFERENCES merchants(id),
  title TEXT NOT NULL,
  reward TEXT NOT NULL,
  referral_goal INTEGER NOT NULL CHECK (referral_goal > 0),
  redemption_window_hours INTEGER NOT NULL CHECK (redemption_window_hours > 0),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS causal_invites (
  token TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  referrer_session_id TEXT NOT NULL,
  referrer_commitment TEXT NOT NULL,
  invite_nonce TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  signature TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS claims (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  invite_token TEXT NOT NULL REFERENCES causal_invites(token),
  campaign_nullifier_hash TEXT NOT NULL,
  status TEXT NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL,
  redeemed_at TIMESTAMPTZ,
  UNIQUE (campaign_id, campaign_nullifier_hash)
);

CREATE TABLE IF NOT EXISTS redemptions (
  id TEXT PRIMARY KEY,
  claim_id TEXT NOT NULL REFERENCES claims(id),
  merchant_id TEXT NOT NULL REFERENCES merchants(id),
  code TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  redeemed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS causal_receipts (
  id TEXT PRIMARY KEY,
  claim_id TEXT NOT NULL REFERENCES claims(id),
  receipt_id_hash TEXT NOT NULL UNIQUE,
  invite_hash TEXT NOT NULL,
  campaign_nullifier_hash TEXT NOT NULL,
  visit_attestation_hash TEXT NOT NULL,
  receipt_pda TEXT NOT NULL,
  tx_signature TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  merchant_id TEXT,
  target_type TEXT NOT NULL,
  target_id TEXT,
  action TEXT NOT NULL,
  result TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS reward_ledger_entries (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL REFERENCES merchants(id),
  receipt_id TEXT,
  actor_session_id TEXT,
  entry_type TEXT NOT NULL,
  amount BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS idempotency_records (
  scope TEXT NOT NULL,
  key TEXT NOT NULL,
  result_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (scope, key)
);

CREATE TABLE IF NOT EXISTS outbox_jobs (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_run_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  last_error TEXT
);
