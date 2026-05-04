export const PUBLIC_DEMO_ROUTES = new Set([
  '/',
  '/merchant/today',
  '/merchant/scan',
  '/proof',
]);

const PUBLIC_DEMO_PREFIXES = [
  '/campaign/',
  '/claim/',
  '/receipt/',
];

export function labsEnabled() {
  return process.env.NEXT_PUBLIC_LABS_MODE === 'true';
}

export function isPublicDemoRoute(pathname: string) {
  if (PUBLIC_DEMO_ROUTES.has(pathname)) return true;
  return PUBLIC_DEMO_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
