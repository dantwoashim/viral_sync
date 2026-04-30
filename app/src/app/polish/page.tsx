import { getAccessibilityPassSummary, getCopyPolishSummary, getDashboardPolishSummary, getMobilePolishSummary, getReceiptExplorerPolishSummary, getUxAuditSummary, getWeeklyPolishReview } from '@/lib/launch/server';

export default function PolishPage() {
  const ux = getUxAuditSummary();
  const mobile = getMobilePolishSummary();
  const copy = getCopyPolishSummary();
  const dashboard = getDashboardPolishSummary();
  const receipt = getReceiptExplorerPolishSummary();
  const accessibility = getAccessibilityPassSummary();
  const review = getWeeklyPolishReview();

  return (
    <div className="surface"><div className="surface-inner">
      <div className="surface-header"><div className="surface-title-block"><div className="eyebrow">Polish</div><h1 className="surface-title">UX, mobile, copy, dashboards, receipt proof, accessibility, and before/after review.</h1><p className="surface-subtitle">{copy.readThrough}</p></div></div>
      <section className="metric-stack">
        <div className="metric-line"><div className="metric-label"><strong>UX fixes</strong><span>{ux.topFixes.join(', ')}</span></div><div className="metric-value">{ux.topFixes.length}</div></div>
        <div className="metric-line"><div className="metric-label"><strong>Device tests</strong><span>{mobile.deviceTests.join(', ')}</span></div><div className="metric-value">{mobile.flows.length}</div></div>
        <div className="metric-line"><div className="metric-label"><strong>A11y blockers</strong><span>{accessibility.status}</span></div><div className="metric-value">{accessibility.blockers.length}</div></div>
      </section>
      <section className="ticket-sheet sheet-pad" style={{ marginTop: 18 }}><div className="ticket-title">Proof polish</div><p className="ticket-note" style={{ marginTop: 12 }}>{receipt.proofAsset}</p><p className="ticket-note" style={{ marginTop: 12 }}>Dashboard: {dashboard.hierarchy.join(', ')}. Screenshots: {review.beforeAfterScreenshots.join(', ')}.</p></section>
    </div></div>
  );
}
