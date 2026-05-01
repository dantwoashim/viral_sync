import { NextRequest, NextResponse } from 'next/server';
import {
  enforceRateLimit,
  jsonError,
  readJsonBody,
  requestId,
  requireJsonRequest,
  requireLaunchOpen,
  requireMerchantRequestRole,
  requireSameOrigin,
  withSecurityHeaders,
} from '@/lib/launch/api';
import { createCausalCommerceSponsoredIntent, getRelayerPolicy } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const policy = getRelayerPolicy();
  return withSecurityHeaders(NextResponse.json({
    ok: true,
    programId: policy.allowedPrograms[0],
    allowedInstructions: policy.allowedInstructions,
    allowedAccounts: policy.allowedAccounts,
    endpoint: '/api/launch/relayer/causal-commerce',
  }));
}

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, 'causal-commerce-intent', 60);
  if (limited) {
    return limited;
  }
  const paused = requireLaunchOpen(request);
  if (paused) {
    return paused;
  }

  const invalidContentType = requireJsonRequest(request);
  if (invalidContentType) {
    return invalidContentType;
  }

  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) {
    return invalidOrigin;
  }
  const merchantAuth = await requireMerchantRequestRole(request, ['manager']);
  if (!merchantAuth.ok) {
    return merchantAuth.response;
  }

  const body = await readJsonBody(request) as Record<string, unknown> | null;
  if (!body) {
    return jsonError('Causal Commerce relayer payload is required.', 400, 'invalid_request', requestId(request));
  }

  const result = await createCausalCommerceSponsoredIntent({
    action: typeof body.action === 'string' ? body.action : '',
    account: typeof body.account === 'string' ? body.account : '',
    accounts: body.accounts && typeof body.accounts === 'object'
      ? body.accounts as Record<string, unknown>
      : undefined,
    receiptId: typeof body.receiptId === 'string' ? body.receiptId : undefined,
    campaignId: typeof body.campaignId === 'string' ? body.campaignId : undefined,
  });

  return withSecurityHeaders(NextResponse.json(result, { status: result.ok ? 200 : 400 }));
}
