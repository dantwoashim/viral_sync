import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit, jsonError, readJsonBody, requestId, requireJsonRequest, requireSameOrigin, withSecurityHeaders } from '@/lib/launch/api';
import { publishCampaignDraft } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function readString(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === 'string' ? value : '';
}

function readInteger(body: Record<string, unknown>, key: string) {
  const value = body[key];
  if (typeof value === 'number') {
    return Math.trunc(value);
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }
  return Number.NaN;
}

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, 'campaign-publish', 20);
  if (limited) {
    return limited;
  }

  const invalidContentType = requireJsonRequest(request);
  if (invalidContentType) {
    return invalidContentType;
  }

  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) {
    return invalidOrigin;
  }

  const body = await readJsonBody(request) as Record<string, unknown> | null;
  if (!body) {
    return jsonError('Campaign payload is required.', 400, 'invalid_request', requestId(request));
  }

  const result = await publishCampaignDraft({
    title: readString(body, 'title'),
    reward: readString(body, 'reward'),
    description: readString(body, 'description'),
    referralGoal: readInteger(body, 'referralGoal'),
    redemptionWindowHours: readInteger(body, 'redemptionWindowHours'),
    requestId: requestId(request),
  });

  return withSecurityHeaders(NextResponse.json(result, { status: result.ok ? 200 : 400 }));
}
