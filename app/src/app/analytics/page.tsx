import { getCanonicalMetricDictionary, getCohortDashboard, getDataQualityChecks, getEventPipelineCleanup, getRoiDashboardV2, getSubmissionMetricsExport, getWeeklyAnalyticsReview } from '@/lib/launch/server';

export default async function AnalyticsPage() {
  const metrics = getCanonicalMetricDictionary();
  const pipeline = await getEventPipelineCleanup();
  const cohorts = await getCohortDashboard();
  const roi = await getRoiDashboardV2();
  const quality = await getDataQualityChecks();
  const pack = await getSubmissionMetricsExport();
  const review = await getWeeklyAnalyticsReview();

  return (
    <div className="surface"><div className="surface-inner">
      <div className="surface-header"><div className="surface-title-block"><div className="eyebrow">Analytics</div><h1 className="surface-title">Canonical metrics, cohorts, ROI, quality, and export pack.</h1><p className="surface-subtitle">{pipeline.reconciliation}</p></div></div>
      <div className="merchant-grid">
        <section className="paper-sheet sheet-pad"><div className="ticket-title">Metric dictionary</div><div className="campaign-sequence">{metrics.map((row) => <div className="campaign-sequence-step" key={row.metric}><span>MET</span><div><strong>{row.metric}</strong><p>{row.definition}</p></div></div>)}</div></section>
        <section className="paper-sheet sheet-pad"><div className="ticket-title">ROI v2</div><div className="metric-stack"><div className="metric-line"><div className="metric-label"><strong>Spend</strong><span>Attributed.</span></div><div className="metric-value">{roi.attributedSpendNpr}</div></div><div className="metric-line"><div className="metric-label"><strong>Fraud adj.</strong><span>Avoided loss.</span></div><div className="metric-value">{roi.fraudAdjustmentNpr}</div></div><div className="metric-line"><div className="metric-label"><strong>Anomalies</strong><span>{review.fixInstrumentation}</span></div><div className="metric-value">{review.anomalies.length}</div></div></div></section>
      </div>
      <section className="ticket-sheet sheet-pad" style={{ marginTop: 18 }}><div className="ticket-title">Export and quality</div><p className="ticket-note" style={{ marginTop: 12 }}>Duplicates {quality.duplicateEvents}; missing receipt events {quality.missingReceiptEvents}; screenshots {pack.screenshots.join(', ')}.</p><p className="ticket-note" style={{ marginTop: 12 }}>Cohorts: {cohorts.merchantRetention.length} merchants.</p></section>
    </div></div>
  );
}
