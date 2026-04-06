import { NextRequest, NextResponse } from 'next/server';
import { requireMerchantLaunchReadiness } from '@/lib/launch/guard';
import { updatePilotOffer } from '@/lib/launch/server';
import { badRequest, readJsonBody, unauthorized } from '@/lib/launch/http';
import { getMerchantSession } from '@/lib/launch/merchantAuth';
import { merchantOfferUpdateSchema } from '@/lib/launch/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const launchGuard = requireMerchantLaunchReadiness();
  if (launchGuard) {
    return launchGuard;
  }

  const session = getMerchantSession(request);
  if (!session.authenticated) {
    return unauthorized();
  }

  const body = await readJsonBody(request);
  const parsed = merchantOfferUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Invalid offer update payload.');
  }

  const result = await updatePilotOffer({
    title: parsed.data.title,
    description: parsed.data.description,
    reward: parsed.data.reward,
    referralGoal: parsed.data.referralGoal,
    redemptionWindowHours: parsed.data.redemptionWindowHours,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
