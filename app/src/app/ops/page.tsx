import { getAlertTuning, getBackupRestoreDrill, getOperationalSlos, getOutboxReliabilityMetrics, getStatusPageHealth, getSupportWorkflow, getWeeklyOpsReview } from '@/lib/launch/server';

export default async function OpsPage() {
  const slos = getOperationalSlos();
  const alerts = getAlertTuning();
  const backup = getBackupRestoreDrill();
  const outbox = await getOutboxReliabilityMetrics();
  const support = getSupportWorkflow();
  const status = await getStatusPageHealth();
  const review = await getWeeklyOpsReview();

  return (
    <div className="surface"><div className="surface-inner">
      <div className="surface-header"><div className="surface-title-block"><div className="eyebrow">Ops</div><h1 className="surface-title">SLOs, alerts, backup, outbox, support, and status.</h1><p className="surface-subtitle">Weekly top issue: {review.topIssueFix}.</p></div></div>
      <section className="metric-stack">
        <div className="metric-line"><div className="metric-label"><strong>API uptime</strong><span>Target {slos.apiUptime.targetPercent}%.</span></div><div className="metric-value">{slos.apiUptime.baselinePercent}</div></div>
        <div className="metric-line"><div className="metric-label"><strong>Latency p95</strong><span>Target {slos.redemptionLatency.targetMsP95}ms.</span></div><div className="metric-value">{slos.redemptionLatency.baselineMsP95}</div></div>
        <div className="metric-line"><div className="metric-label"><strong>Outbox failed</strong><span>{outbox.retryPolicy}</span></div><div className="metric-value">{outbox.failed}</div></div>
      </section>
      <section className="ticket-sheet sheet-pad" style={{ marginTop: 18 }}><div className="ticket-title">Runbooks</div><p className="ticket-note" style={{ marginTop: 12 }}>{backup.target}. Verified: {backup.verified ? 'yes' : 'no'}.</p><p className="ticket-note" style={{ marginTop: 12 }}>{support.merchantComms}</p><p className="ticket-note" style={{ marginTop: 12 }}>Status: {status.public.api}; alerts {alerts.alerts.length}.</p></section>
    </div></div>
  );
}
