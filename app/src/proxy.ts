import { NextResponse, type NextRequest } from 'next/server';
import { isPublicDemoRoute, labsEnabled } from './lib/demo-mode';

function applySecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Permissions-Policy', 'camera=(self), geolocation=(), microphone=()');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    !labsEnabled() &&
    request.method === 'GET' &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/_next') &&
    !pathname.startsWith('/public') &&
    !pathname.startsWith('/manifest.webmanifest') &&
    !pathname.startsWith('/favicon') &&
    pathname !== '/_not-found' &&
    !isPublicDemoRoute(pathname)
  ) {
    return applySecurityHeaders(NextResponse.rewrite(new URL('/_not-found', request.url)));
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
