import { NextResponse } from 'next/server';

type HeaderMap = Record<string, string>;
type CorsOptions = {
  methods: string;
  headers: string;
  publicRead?: boolean;
  extraHeaders?: HeaderMap;
};

function configuredOrigins() {
  return [process.env.NEXT_PUBLIC_APP_URL, process.env.LAUNCH_ALLOWED_ORIGINS]
    .filter(Boolean)
    .flatMap((value) => String(value).split(','))
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

function requestOrigin(request: Request) {
  return request.headers.get('origin')?.replace(/\/$/, '') ?? '';
}

export function appBaseUrl(request: Request) {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return new URL(request.url).origin || 'http://localhost:3000';
}

export function corsOrigin(request: Request, publicRead = false) {
  if (publicRead && request.method === 'GET') return '*';
  const origin = requestOrigin(request);
  if (!origin) return appBaseUrl(request);
  const allowed = configuredOrigins();
  if (process.env.NODE_ENV !== 'production' && allowed.length === 0) return origin;
  return allowed.includes(origin) ? origin : 'null';
}

export function withCorsHeaders(response: NextResponse, request: Request, options: CorsOptions) {
  response.headers.set('Access-Control-Allow-Origin', corsOrigin(request, options.publicRead === true));
  response.headers.set('Access-Control-Allow-Methods', options.methods);
  response.headers.set('Access-Control-Allow-Headers', options.headers);
  response.headers.set('Vary', 'Origin');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  for (const [key, value] of Object.entries(options.extraHeaders ?? {})) {
    response.headers.set(key, value);
  }
  return response;
}

export function withPublicReadHeaders(response: NextResponse, methods = 'GET,OPTIONS', headers = 'Content-Type, Authorization, Accept-Encoding') {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', methods);
  response.headers.set('Access-Control-Allow-Headers', headers);
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}
