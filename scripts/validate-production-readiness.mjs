const strict = process.argv.includes('--strict') || process.env.STRICT_PRODUCTION_READY === 'true';

const demoValues = new Map([
  ['LAUNCH_STAFF_PIN', 'DEMO-PIN'],
  ['LAUNCH_MERCHANT_ACCESS_TOKEN', 'DEMO-MERCHANT-ACCESS'],
  ['LAUNCH_RELAYER_API_KEY', 'DEMO-RELAYER-KEY'],
  ['LAUNCH_INDEXER_API_KEY', 'DEMO-INDEXER-KEY'],
  ['LAUNCH_INTENT_SECRET', 'viral-sync-demo-intent-secret'],
  ['LAUNCH_WEBHOOK_SECRET', 'viral-sync-demo-webhook-secret'],
]);

const checks = [
  {
    name: 'database',
    ok: Boolean(process.env.LAUNCH_DATABASE_URL || process.env.DATABASE_URL),
    severity: 'blocker',
    fix: 'Set LAUNCH_DATABASE_URL to a managed Postgres database. Local JSON is development-only.',
  },
  {
    name: 'merchant access token',
    ok: hasNonDemo('LAUNCH_MERCHANT_ACCESS_TOKEN'),
    severity: 'blocker',
    fix: 'Set LAUNCH_MERCHANT_ACCESS_TOKEN to a long random secret and rotate it through the secrets manager.',
  },
  {
    name: 'staff device fallback secret',
    ok: hasNonDemo('LAUNCH_STAFF_PIN'),
    severity: 'blocker',
    fix: 'Set LAUNCH_STAFF_PIN to a non-demo fallback secret even if enrolled devices are the normal path.',
  },
  {
    name: 'relayer service auth',
    ok: hasNonDemo('LAUNCH_RELAYER_API_KEY'),
    severity: 'blocker',
    fix: 'Set LAUNCH_RELAYER_API_KEY to a non-demo service key and keep it server-only.',
  },
  {
    name: 'indexer service auth',
    ok: hasNonDemo('LAUNCH_INDEXER_API_KEY'),
    severity: 'blocker',
    fix: 'Set LAUNCH_INDEXER_API_KEY to a non-demo service key.',
  },
  {
    name: 'intent signing secret',
    ok: hasNonDemo('LAUNCH_INTENT_SECRET'),
    severity: 'blocker',
    fix: 'Set LAUNCH_INTENT_SECRET so sponsored intents cannot be forged with demo material.',
  },
  {
    name: 'webhook signing secret',
    ok: hasNonDemo('LAUNCH_WEBHOOK_SECRET'),
    severity: 'blocker',
    fix: 'Set LAUNCH_WEBHOOK_SECRET before exposing webhook helpers.',
  },
  {
    name: 'allowed origins',
    ok: Boolean(process.env.LAUNCH_ALLOWED_ORIGINS),
    severity: 'blocker',
    fix: 'Set LAUNCH_ALLOWED_ORIGINS to the exact production/staging origins allowed to mutate state.',
  },
  {
    name: 'public base URL',
    ok: Boolean(process.env.NEXT_PUBLIC_APP_URL || process.env.PUBLIC_BASE_URL),
    severity: 'warning',
    fix: 'Set NEXT_PUBLIC_APP_URL or PUBLIC_BASE_URL so Actions, receipts, and links resolve correctly.',
  },
  {
    name: 'launch pause reviewed',
    ok: process.env.LAUNCH_PAUSED !== 'true',
    severity: 'warning',
    fix: 'Unset LAUNCH_PAUSED only after the incident window is closed and smoke checks pass.',
  },
];

function hasNonDemo(name) {
  const value = process.env[name];
  return Boolean(value && value !== demoValues.get(name) && !value.toLowerCase().includes('demo'));
}

const blockers = checks.filter((check) => check.severity === 'blocker' && !check.ok);
const warnings = checks.filter((check) => check.severity === 'warning' && !check.ok);
const payload = {
  ok: blockers.length === 0,
  strict,
  checkedAt: new Date().toISOString(),
  blockers,
  warnings,
  checks,
};

console.log(JSON.stringify(payload, null, 2));

if (strict && blockers.length > 0) {
  process.exitCode = 1;
}
