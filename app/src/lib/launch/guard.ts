import { NextResponse } from 'next/server';
import { getLaunchEnvErrors, isProductionRuntime, isSmokeTestMode } from '@/lib/launch/config';
import { isConsumerSessionConfigured } from '@/lib/launch/consumerAuth';
import { isMerchantSessionConfigured } from '@/lib/launch/merchantAuth';

function launchPersistenceError() {
  if (isProductionRuntime() && !isSmokeTestMode() && !process.env.VIRAL_SYNC_DATABASE_URL) {
    return 'VIRAL_SYNC_DATABASE_URL is required for production launch environments.';
  }

  return null;
}

export function requireLaunchPersistenceReadiness() {
  const envErrors = getLaunchEnvErrors();
  if (envErrors.length > 0) {
    return NextResponse.json({ error: envErrors[0]?.message ?? 'Launch environment is not configured correctly.' }, { status: 503 });
  }

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
