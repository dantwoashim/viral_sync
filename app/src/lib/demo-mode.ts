export const PUBLIC_DEMO_ROUTES = new Set([
  '/',
  '/ledger',
  '/for-sponsors',
  '/how-it-works',
  '/merchant/today',
  '/merchant/scan',
  '/proof',
  '/demo',
  '/for-merchants',
  '/icon.png',
  '/favicon.ico',
]);

const PUBLIC_DEMO_PREFIXES = [
  '/market/',
  '/participate/',
  '/verify/',
  '/api/civic/',
  '/campaign/',
  '/claim/',
  '/receipt/',
  '/proofs/',
  '/.well-known/',
];

export function labsEnabled() {
  return process.env.NEXT_PUBLIC_LABS_MODE === 'true';
}

export function isPublicDemoRoute(pathname: string) {
  if (PUBLIC_DEMO_ROUTES.has(pathname)) return true;
  return PUBLIC_DEMO_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
