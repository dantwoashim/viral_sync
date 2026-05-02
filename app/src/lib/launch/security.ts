import type { MerchantRole } from '@/lib/launch/types';

export const DEMO_STAFF_PIN = 'DEMO-PIN';
export const DEMO_RELAYER_KEY = 'DEMO-RELAYER-KEY';
export const DEMO_INDEXER_KEY = 'DEMO-INDEXER-KEY';
export const DEMO_INTENT_SECRET = 'viral-sync-demo-intent-secret';
export const DEMO_WEBHOOK_SECRET = 'viral-sync-demo-webhook-secret';
export const DEMO_MERCHANT_ACCESS_TOKEN = 'DEMO-MERCHANT-ACCESS';
export const DEMO_CAUSAL_SECRET = 'viral-sync-frontier-demo-secret';

export const merchantRoleLabels: Record<MerchantRole, string> = {
  owner: 'Owner',
  admin: 'Manager',
  manager: 'Manager',
  staff: 'Staff',
  support: 'Support',
  auditor: 'Auditor',
};

export function isProductionRuntime() {
  return process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build';
}

export function demoAuthAllowed() {
  return !isProductionRuntime() || process.env.LAUNCH_ALLOW_DEMO_AUTH === 'true';
}

export function normalizeMerchantRole(role?: string | null): MerchantRole {
  if (role === 'owner' || role === 'admin' || role === 'manager' || role === 'staff' || role === 'support' || role === 'auditor') {
    return role;
  }

  return 'staff';
}

export function merchantRoleAllowed(role: MerchantRole, allowedRoles: MerchantRole[]) {
  if (allowedRoles.includes(role)) {
    return true;
  }

  const effectiveRole = role === 'admin' ? 'manager' : role;
  const effectiveAllowed = new Set(allowedRoles.map((allowedRole) => allowedRole === 'admin' ? 'manager' : allowedRole));

  if (effectiveAllowed.has('owner')) {
    return effectiveRole === 'owner';
  }

  if (effectiveAllowed.has('manager')) {
    return effectiveRole === 'owner' || effectiveRole === 'manager';
  }

  if (effectiveAllowed.has('staff')) {
    return effectiveRole === 'owner' || effectiveRole === 'manager' || effectiveRole === 'staff';
  }

  if (effectiveAllowed.has('support')) {
    return effectiveRole === 'owner' || effectiveRole === 'manager' || effectiveRole === 'support';
  }

  if (effectiveAllowed.has('auditor')) {
    return effectiveRole === 'owner' || effectiveRole === 'manager' || effectiveRole === 'auditor';
  }

  return false;
}

export function getRequiredSecret(envName: string, demoFallback: string) {
  const value = process.env[envName];

  if (!isProductionRuntime()) {
    return value || demoFallback;
  }

  if (!value || value === demoFallback || value.toLowerCase().includes('demo')) {
    throw new Error(`${envName} must be configured with a non-demo value in production.`);
  }

  return value;
}

export function getStaffPinSecret() {
  return getRequiredSecret('LAUNCH_STAFF_PIN', DEMO_STAFF_PIN);
}

export function getRelayerApiKey() {
  return getRequiredSecret('LAUNCH_RELAYER_API_KEY', DEMO_RELAYER_KEY);
}

export function getIndexerApiKey() {
  return getRequiredSecret('LAUNCH_INDEXER_API_KEY', DEMO_INDEXER_KEY);
}

export function getIntentSecret() {
  return getRequiredSecret('LAUNCH_INTENT_SECRET', DEMO_INTENT_SECRET);
}

export function getWebhookSecret() {
  return getRequiredSecret('LAUNCH_WEBHOOK_SECRET', DEMO_WEBHOOK_SECRET);
}

export function getMerchantAccessToken() {
  return getRequiredSecret('LAUNCH_MERCHANT_ACCESS_TOKEN', DEMO_MERCHANT_ACCESS_TOKEN);
}

export function getCausalInviteSecret() {
  return getRequiredSecret('LAUNCH_CAUSAL_SECRET', DEMO_CAUSAL_SECRET);
}

export function demoPinAccepted(staffPin: string) {
  return demoAuthAllowed() && Boolean(staffPin) && staffPin === getStaffPinSecret();
}

export function getProductionReadinessSnapshot() {
  const required = [
    ['LAUNCH_DATABASE_URL', Boolean(process.env.LAUNCH_DATABASE_URL || process.env.DATABASE_URL)],
    ['LAUNCH_STAFF_PIN', Boolean(process.env.LAUNCH_STAFF_PIN && process.env.LAUNCH_STAFF_PIN !== DEMO_STAFF_PIN)],
    ['LAUNCH_MERCHANT_ACCESS_TOKEN', Boolean(process.env.LAUNCH_MERCHANT_ACCESS_TOKEN && process.env.LAUNCH_MERCHANT_ACCESS_TOKEN !== DEMO_MERCHANT_ACCESS_TOKEN)],
    ['LAUNCH_RELAYER_API_KEY', Boolean(process.env.LAUNCH_RELAYER_API_KEY && process.env.LAUNCH_RELAYER_API_KEY !== DEMO_RELAYER_KEY)],
    ['LAUNCH_INDEXER_API_KEY', Boolean(process.env.LAUNCH_INDEXER_API_KEY && process.env.LAUNCH_INDEXER_API_KEY !== DEMO_INDEXER_KEY)],
    ['LAUNCH_INTENT_SECRET', Boolean(process.env.LAUNCH_INTENT_SECRET && process.env.LAUNCH_INTENT_SECRET !== DEMO_INTENT_SECRET)],
    ['LAUNCH_WEBHOOK_SECRET', Boolean(process.env.LAUNCH_WEBHOOK_SECRET && process.env.LAUNCH_WEBHOOK_SECRET !== DEMO_WEBHOOK_SECRET)],
    ['LAUNCH_CAUSAL_SECRET', Boolean(process.env.LAUNCH_CAUSAL_SECRET && process.env.LAUNCH_CAUSAL_SECRET !== DEMO_CAUSAL_SECRET)],
    ['LAUNCH_ALLOWED_ORIGINS', Boolean(process.env.LAUNCH_ALLOWED_ORIGINS)],
    ['NEXT_PUBLIC_APP_URL', Boolean(process.env.NEXT_PUBLIC_APP_URL || process.env.PUBLIC_BASE_URL)],
  ] as const;
  const missing = required.filter(([, ok]) => !ok).map(([name]) => name);

  return {
    productionRuntime: isProductionRuntime(),
    demoAuthAllowed: demoAuthAllowed(),
    paused: process.env.LAUNCH_PAUSED === 'true',
    required: required.map(([name, ok]) => ({ name, ok })),
    missing,
    launchAllowed: missing.length === 0 && process.env.LAUNCH_PAUSED !== 'true',
  };
}
