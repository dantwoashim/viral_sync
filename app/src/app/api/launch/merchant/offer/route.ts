import { NextRequest, NextResponse } from 'next/server';
import { updatePilotOffer } from '@/lib/launch/server';
import { badRequest, readJsonBody, readString, unauthorized } from '@/lib/launch/http';
import { getMerchantSession } from '@/lib/launch/merchantAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = getMerchantSession(request);
  if (!session.authenticated) {
    return unauthorized();
  }

  const body = await readJsonBody(request);
  const title = readString(body.title);
  const description = readString(body.description);
  const reward = readString(body.reward);
  const referralGoal = Number(body.referralGoal);
  const redemptionWindowHours = Number(body.redemptionWindowHours);

  if (!title || !description || !reward) {
    return badRequest('title, description, and reward are required.');
  }

  const result = await updatePilotOffer({
    title,
    description,
    reward,
    referralGoal,
    redemptionWindowHours,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
