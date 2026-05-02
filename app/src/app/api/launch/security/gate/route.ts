import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireMerchantRequestRole, withSecurityHeaders } from '@/lib/launch/api';
import { getAuditPrepChecklist, getDisclosureUpdateDocs, getExternalReviewRound, getFormalAuditPrepChecklist, getFormalCoverageExpansion, getFormalDisclosureUpdate, getFormalExternalReviewRound, getFormalHighSeverityFixes, getFormalInvariantDocumentation, getHighSeverityFixesDay243, getInvariantDocumentation, getSecurityGate, getTestCoverageExpansion, getThreatModelV2, getWeeklySecurityReview } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const merchantAuth = await requireMerchantRequestRole(request, ['owner', 'auditor']);
  if (!merchantAuth.ok) {
    return merchantAuth.response;
  }

  return withSecurityHeaders(NextResponse.json({
    ok: true,
    gate: getSecurityGate(),
    threatModel: getThreatModelV2(),
    auditPrep: getAuditPrepChecklist(),
    invariants: getInvariantDocumentation(),
    coverage: getTestCoverageExpansion(),
    externalReview: getExternalReviewRound(),
    highSeverityFixes: getHighSeverityFixesDay243(),
    disclosure: getDisclosureUpdateDocs(),
    weeklySecurityReview: getWeeklySecurityReview(),
    formalAuditPrep: getFormalAuditPrepChecklist(),
    formalInvariants: getFormalInvariantDocumentation(),
    formalCoverage: getFormalCoverageExpansion(),
    formalExternalReview: getFormalExternalReviewRound(),
    formalHighSeverityFixes: getFormalHighSeverityFixes(),
    formalDisclosure: getFormalDisclosureUpdate(),
  }));
}
