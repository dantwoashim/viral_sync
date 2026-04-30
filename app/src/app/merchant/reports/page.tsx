import { getWeeklyMerchantReport } from '@/lib/launch/server';

export default async function WeeklyMerchantReportPage() {
  const report = await getWeeklyMerchantReport();

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Weekly merchant report</div>
            <h1 className="surface-title">Funnel, verified visits, reward cost, and suspicious activity.</h1>
            <p className="surface-subtitle">
              Day 89 packages the pilot into a report a merchant can actually read after the shift.
            </p>
          </div>
        </div>

        <section className="ticket-sheet sheet-pad">
          <div className="eyebrow">{report.weekLabel}</div>
          <div className="ticket-title" style={{ marginTop: 10 }}>{report.summary}</div>
          <div className="metric-stack">
            {report.merchants.map((merchant) => (
              <div className="metric-line" key={merchant.name}>
                <div className="metric-label">
                  <strong>{merchant.name}</strong>
                  <span>{merchant.verifiedVisits} verified visits, {merchant.receipts} receipts, {merchant.suspiciousActivity} suspicious signals.</span>
                </div>
                <div className="metric-value">NPR {merchant.rewardCostNpr}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
