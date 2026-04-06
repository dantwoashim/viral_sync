import { NextResponse } from 'next/server';
import { isConsumerSessionConfigured } from '@/lib/launch/consumerAuth';
import { isMerchantSessionConfigured } from '@/lib/launch/merchantAuth';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ALLOW_FILE_LEDGER_IN_PRODUCTION = process.env.VIRAL_SYNC_ALLOW_FILE_LEDGER_IN_PRODUCTION === 'true';

function launchPersistenceError() {
  if (IS_PRODUCTION && !ALLOW_FILE_LEDGER_IN_PRODUCTION && !process.env.VIRAL_SYNC_DATABASE_URL) {
    return 'VIRAL_SYNC_DATABASE_URL is required for production launch environments.';
  }

  return null;
}

export function requireLaunchPersistenceReadiness() {
  const persistenceIssue = launchPersistenceError();
  if (persistenceIssue) {
    return NextResponse.json({ error: persistenceIssue }, { status: 503 });
  }

  return null;
}

export function requireConsumerLaunchReadiness() {
  const persistenceGuard = requireLaunchPersistenceReadiness();
  if (persistenceGuard) {
    return persistenceGuard;
  }

  if (!isConsumerSessionConfigured()) {
    return NextResponse.json(
      { error: 'Consumer session signing is not configured.' },
      { status: 503 },
    );
  }

  return null;
}

export function requireMerchantLaunchReadiness() {
  const persistenceGuard = requireLaunchPersistenceReadiness();
  if (persistenceGuard) {
    return persistenceGuard;
  }

  if (!isMerchantSessionConfigured()) {
    return NextResponse.json(
      { error: 'Merchant operator access is not configured.' },
      { status: 503 },
    );
  }

  return null;
}
