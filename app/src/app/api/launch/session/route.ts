import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  attachConsumerSession,
  createGuestConsumerSession,
  getConsumerSession,
  isConsumerSessionConfigured,
  updateConsumerSession,
} from '@/lib/launch/consumerAuth';
import { badRequest, readJsonBody } from '@/lib/launch/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const sessionUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(28),
  loginMethod: z.enum(['guest', 'email', 'google']).nullable(),
});

export async function GET(request: NextRequest) {
  if (!isConsumerSessionConfigured()) {
    return NextResponse.json({ authenticated: false, reason: 'Consumer session signing is not configured.' }, { status: 503 });
  }

  const existing = getConsumerSession(request) ?? createGuestConsumerSession();
  const response = NextResponse.json(existing);
  attachConsumerSession(response, existing);
  return response;
}

export async function PATCH(request: NextRequest) {
  if (!isConsumerSessionConfigured()) {
    return NextResponse.json({ error: 'Consumer session signing is not configured.' }, { status: 503 });
  }

  const current = getConsumerSession(request) ?? createGuestConsumerSession();
  const body = await readJsonBody(request);
  const parsed = sessionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Invalid session update.');
  }

  const updated = updateConsumerSession(current, parsed.data);
  if (!updated) {
    return badRequest('Unable to update consumer session.');
  }

  const response = NextResponse.json(updated);
  attachConsumerSession(response, updated);
  return response;
}

export async function DELETE() {
  const rotated = createGuestConsumerSession();
  const response = NextResponse.json(rotated);
  attachConsumerSession(response, rotated);
  return response;
}
