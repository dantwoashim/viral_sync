import { getApiLoadTestSummary, getDashboardPerformanceSummary, getDatabaseIndexReview, getLoadTestPlan, getMobilePerformanceSummary, getRelayerIndexerStressSummary, getWeeklyPerformanceReview } from '@/lib/launch/server';

export default async function PerformancePage() {
  const plan = getLoadTestPlan();
  const api = getApiLoadTestSummary();
  const db = getDatabaseIndexReview();
  const dashboard = await getDashboardPerformanceSummary();
  const relayer = await getRelayerIndexerStressSummary();
  const mobile = getMobilePerformanceSummary();
  const review = getWeeklyPerformanceReview();

  return (
    <div className="surface"><div className="surface-inner">
      <div className="surface-header"><div className="surface-title-block"><div className="eyebrow">Performance</div><h1 className="surface-title">Load targets, API bottlenecks, database indexes, dashboard cache, relayer stress, and mobile speed.</h1><p className="surface-subtitle">{review.capacity}</p></div></div>
      <section className="metric-stack">
        <div className="metric-line"><div className="metric-label"><strong>Claim p95</strong><span>{api.fix}</span></div><div className="metric-value">{api.p95Ms.claim}</div></div>
        <div className="metric-line"><div className="metric-label"><strong>Dashboard p95</strong><span>{dashboard.materializedViews.join(', ')}</span></div><div className="metric-value">{dashboard.p95Ms}</div></div>
        <div className="metric-line"><div className="metric-label"><strong>Relayer backlog</strong><span>{relayer.retryBehavior}</span></div><div className="metric-value">{relayer.backlog}</div></div>
      </section>
      <section className="ticket-sheet sheet-pad" style={{ marginTop: 18 }}><div className="ticket-title">Targets and indexes</div><p className="ticket-note" style={{ marginTop: 12 }}>{plan.scenarios.join(', ')}.</p><p className="ticket-note" style={{ marginTop: 12 }}>{db.recommendedIndexes.join(', ')}.</p><p className="ticket-note" style={{ marginTop: 12 }}>Mobile: {mobile.status}.</p></section>
    </div></div>
  );
}
