import { getPartnerDashboard } from '@/lib/launch/server';

export default async function PartnerDashboardPage({ searchParams }: { searchParams: Promise<{ partner?: string }> }) {
  const params = await searchParams;
  const dashboard = await getPartnerDashboard();
  const rows = params.partner
    ? dashboard.partners.filter((partner) => partner.id === params.partner)
    : dashboard.partners;

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Partner dashboard</div>
            <h1 className="surface-title">Claims, redemptions, rewards, and receipts by partner source.</h1>
            <p className="surface-subtitle">{dashboard.payoutRules.splitLogic}</p>
          </div>
        </div>
        <div className="merchant-grid">
          {rows.map((partner) => (
            <section className="paper-sheet sheet-pad" key={partner.id}>
              <div className="eyebrow">{partner.sourceCode}</div>
              <div className="ticket-title" style={{ marginTop: 10 }}>{partner.name}</div>
              <div className="metric-stack">
                <div className="metric-line"><div className="metric-label"><strong>Claims</strong><span>Total launch claims.</span></div><div className="metric-value">{partner.claims}</div></div>
                <div className="metric-line"><div className="metric-label"><strong>Redemptions</strong><span>Assigned receipt count.</span></div><div className="metric-value">{partner.redemptions}</div></div>
                <div className="metric-line"><div className="metric-label"><strong>Pending</strong><span>Delayed settlement rewards.</span></div><div className="metric-value">{partner.pendingRewardsNpr}</div></div>
                <div className="metric-line"><div className="metric-label"><strong>Settled</strong><span>Ready partner rewards.</span></div><div className="metric-value">{partner.settledRewardsNpr}</div></div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
