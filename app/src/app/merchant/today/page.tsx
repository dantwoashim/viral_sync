import Link from 'next/link';
import { PremiumMetric, PremiumStatusBadge, PremiumSurface } from '@/components/premium/PremiumUi';
import { PremiumWorkspace } from '@/components/premium/PremiumWorkspace';
import { getMerchantSummary, getReceiptReconciliation } from '@/lib/launch/server';

export default async function MerchantTodayPage() {
  const [summary, receipts] = await Promise.all([getMerchantSummary(), getReceiptReconciliation()]);
  const activeCodes = summary.queue.filter((row) => row.value !== 'Idle');
  const settledReceipts = receipts.filter((receipt) => receipt.status === 'confirmed' || receipt.status === 'indexed').length;
  const failedReceipts = receipts.filter((receipt) => receipt.status === 'failed').length;
  const nextAction = activeCodes.length > 0 ? 'Confirm waiting code' : receipts.length > 0 ? 'Review settlement ledger' : 'Create funded bounty';

  return (
    <PremiumWorkspace audience="merchant" active="today">
      <section className="premium-taskbar" aria-label="Merchant next action">
        <div>
          <span>Next action</span>
          <strong>{nextAction}</strong>
        </div>
        <Link className="premium-button premium-button-primary" href={activeCodes.length > 0 ? '/merchant/scan' : receipts.length > 0 ? '/merchant/ledger' : '/merchant/campaigns'}>
          {activeCodes.length > 0 ? 'Confirm now' : receipts.length > 0 ? 'Audit ledger' : 'Create bounty'}
        </Link>
      </section>

      <section className="premium-workspace-hero">
        <div>
          <span className="premium-eyebrow">Merchant today</span>
          <h1 className="premium-h2">Confirm visits, watch spend, settle only proof.</h1>
          <p className="premium-lede">
            {summary.merchant.name} sees exactly what matters: funded reward posture, live counter work, receipt settlement, and blocked risk before spending more.
          </p>
        </div>
        <PremiumSurface tone="proof" className="premium-ops-card">
          <div className="premium-card-title">
            <span>Vault posture</span>
            <h2>{summary.offer.reward}</h2>
          </div>
          <div className="premium-proof-stack">
            <div className="premium-proof-row">
              <div><span>Merchant</span><small>{summary.merchant.district}</small></div>
              <code>{summary.merchant.id}</code>
              <PremiumStatusBadge tone="success">Campaign live</PremiumStatusBadge>
            </div>
            <div className="premium-proof-row">
              <div><span>Offer cap</span><small>Reward trigger and window are bounded.</small></div>
              <code>{summary.offer.referralGoal} visits / {summary.offer.redemptionWindowHours}h</code>
              <PremiumStatusBadge tone="success">Cap set</PremiumStatusBadge>
            </div>
          </div>
        </PremiumSurface>
      </section>

      <section className="premium-workspace-metrics" aria-label="Merchant metrics">
        {summary.metrics.map((metric) => (
          <PremiumMetric key={metric.label} label={metric.label} value={metric.value} detail={metric.note} />
        ))}
      </section>

      <section className="premium-workspace-grid">
        <PremiumSurface tone="light" className="premium-ops-card">
          <div className="premium-card-title">
            <span>Visit desk</span>
            <h2>Live confirmations</h2>
          </div>
          <div className="premium-table-list">
            {summary.queue.map((row) => (
              <div className="premium-table-row" key={`${row.title}-${row.value}`}>
                <div>
                  <strong>{row.title}</strong>
                  <span>{row.subtitle}</span>
                </div>
                <code>{row.value}</code>
                <small>{row.meta}</small>
              </div>
            ))}
          </div>
        </PremiumSurface>

        <PremiumSurface tone="light" className="premium-ops-card">
          <div className="premium-card-title">
            <span>Risk and settlement</span>
            <h2>Pay only after receipt truth</h2>
          </div>
          <div className="premium-state-stack">
            <div className="premium-state">
              <strong>{settledReceipts} settled or indexed receipts</strong>
              <p>Settlements move from staff confirmation into a public receipt object before the merchant trusts the cost.</p>
            </div>
            <div className="premium-state">
              <strong>{failedReceipts} relayer failures</strong>
              <p>Failed receipt jobs stay visible instead of disappearing into a background queue.</p>
            </div>
            {summary.alerts.map((alert) => (
              <div className="premium-state" key={alert}>
                <strong>Risk note</strong>
                <p>{alert}</p>
              </div>
            ))}
          </div>
        </PremiumSurface>
      </section>
    </PremiumWorkspace>
  );
}
