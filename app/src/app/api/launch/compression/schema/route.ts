import { NextResponse } from 'next/server';
import { withSecurityHeaders } from '@/lib/launch/api';
import { getCompressionCostModel, getCompressionDesign, getCompressionFallbackPlan, getCompressionTreeDemo, getCompressionWeeklyReview, getMerkleLeafSchema } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return withSecurityHeaders(NextResponse.json({
    ok: true,
    design: getCompressionDesign(),
    schema: getMerkleLeafSchema(),
    tree: await getCompressionTreeDemo(),
    costModel: getCompressionCostModel(),
    fallback: getCompressionFallbackPlan(),
    weeklyReview: getCompressionWeeklyReview(),
  }));
}
