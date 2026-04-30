import Link from 'next/link';
import { getPilotMetricsDashboard } from '@/lib/launch/server';

export default async function PilotMetricsPage() {
  const dashboard = await getPilotMetricsDashboard();

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Pilot metrics</div>
            <h1 className="surface-title">Live merchants, invites, claims, redemptions, receipts, and failures.</h1>
            <p className="surface-subtitle">
              Day 83 turns the pilot into an operating dashboard across the first three merchant templates.
            </p>
          </div>
        </div>

        <section className="metric-stack">
          {Object.entries(dashboard.totals).map(([label, value]) => (
            <div className="metric-line" key={label}>
              <div className="metric-label">
                <strong>{label.replace(/([A-Z])/g, ' $1')}</strong>
                <span>Current launch ledger total.</span>
              </div>
              <div className="metric-value">{value}</div>
            </div>
          ))}
        </section>

        <section className="paper-sheet sheet-pad" style={{ marginTop: 18 }}>
          <div className="eyebrow">Merchant roster</div>
          <div className="campaign-sequence">
            {dashboard.merchants.map((row, index) => (
              <div className="campaign-sequence-step" key={row.merchant.id}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <strong>{row.merchant.name} - {row.merchant.district}</strong>
                  <p>{row.invites} invites, {row.claims} claims, {row.redemptions} redemptions, {row.receipts} receipts, {row.failures} failures.</p>
                </div>
              </div>
            ))}
          </div>
          <Link className="vs-link-chip" href="/admin/funnel" style={{ marginTop: 18 }}>Open funnel leaks</Link>
        </section>
      </div>
    </div>
  );
}
