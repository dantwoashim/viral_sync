import { getDemoDataFreeze, getFreshCloneTestSummary, getFullCiGreenSummary, getPerformanceSmokeSummary, getProtocolFinalReview, getSecurityFinalScan, getWeeklyHardeningReview } from '@/lib/launch/server';

export default function HardeningPage() {
  const clone = getFreshCloneTestSummary();
  const ci = getFullCiGreenSummary();
  const protocol = getProtocolFinalReview();
  const security = getSecurityFinalScan();
  const demo = getDemoDataFreeze();
  const smoke = getPerformanceSmokeSummary();
  const review = getWeeklyHardeningReview();

  return (
    <div className="surface"><div className="surface-inner">
      <div className="surface-header"><div className="surface-title-block"><div className="eyebrow">Hardening</div><h1 className="surface-title">Fresh clone, CI, protocol review, security scan, demo data freeze, smoke test, and release candidate.</h1><p className="surface-subtitle">Feature freeze: {review.featureFreeze ? 'active' : 'inactive'}.</p></div></div>
      <div className="merchant-grid">
        <section className="paper-sheet sheet-pad"><div className="ticket-title">CI and clone</div><p className="sheet-copy" style={{ marginTop: 12 }}>{clone.commands.join(' -> ')}</p><p className="sheet-copy" style={{ marginTop: 12 }}>{ci.checks.join(', ')}.</p></section>
        <section className="paper-sheet sheet-pad"><div className="ticket-title">Risks and freeze</div><p className="sheet-copy" style={{ marginTop: 12 }}>Limits: {protocol.limits.join(', ')}.</p><p className="sheet-copy" style={{ marginTop: 12 }}>Security: {security.status}. Demo reset: {demo.resetTested ? 'tested' : 'not tested'}.</p></section>
      </div>
      <section className="ticket-sheet sheet-pad" style={{ marginTop: 18 }}><div className="ticket-title">Smoke</div><p className="ticket-note" style={{ marginTop: 12 }}>{smoke.coreFlow.join(', ')}. {smoke.topIssueFixed}.</p></section>
    </div></div>
  );
}
