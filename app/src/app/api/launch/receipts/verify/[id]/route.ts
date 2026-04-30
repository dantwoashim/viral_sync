import { NextResponse } from 'next/server';
import { withSecurityHeaders } from '@/lib/launch/api';
import { getPublicReceiptVerification } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const verification = await getPublicReceiptVerification(decodeURIComponent(id));
  return withSecurityHeaders(NextResponse.json(verification, { status: verification.ok ? 200 : verification.status === 'not_found' ? 404 : 409 }));
}
