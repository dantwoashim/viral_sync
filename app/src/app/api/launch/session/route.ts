import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit, requireSameOrigin, withSecurityHeaders } from '@/lib/launch/api';
import { createOrResumeGuestSession } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, 'guest-session', 30);
  if (limited) {
    return limited;
  }
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) {
    return invalidOrigin;
  }

  const existing = request.cookies.get('vs_guest_session')?.value ?? null;
  const session = createOrResumeGuestSession(existing);
  const response = withSecurityHeaders(NextResponse.json(session));

  response.cookies.set('vs_guest_session', session.sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
