import { getTractionDashboard } from '@/lib/launch/server';

export default async function TractionPage() {
  const traction = await getTractionDashboard();
  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Traction</div>
            <h1 className="surface-title">Merchants, claims, redemptions, receipts, and paid commitments.</h1>
            <p className="surface-subtitle">Pipeline: {traction.pipelineLeads} leads and {traction.bookedDemos} demos booked.</p>
          </div>
        </div>
        <section className="metric-stack">
          {Object.entries(traction).map(([key, value]) => (
            <div className="metric-line" key={key}><div className="metric-label"><strong>{key}</strong><span>Current traction dashboard value.</span></div><div className="metric-value">{value}</div></div>
          ))}
        </section>
      </div>
    </div>
  );
}
