import { NextResponse } from 'next/server';
import { requireLaunchPersistenceReadiness } from '@/lib/launch/guard';
import { listMerchantAccessOptions } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const launchGuard = requireLaunchPersistenceReadiness();
  if (launchGuard) {
    return launchGuard;
  }

  const options = await listMerchantAccessOptions();
  return NextResponse.json(options);
}
