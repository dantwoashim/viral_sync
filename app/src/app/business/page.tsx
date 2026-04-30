import Link from 'next/link';
import { getBillingEvents, getCostPerVerifiedVisit, getRewardLiabilityDashboard, getWeeklyBusinessReview } from '@/lib/launch/server';

export default async function BusinessDashboardPage() {
  const liability = await getRewardLiabilityDashboard();
  const cost = await getCostPerVerifiedVisit();
  const billing = await getBillingEvents();
  const review = await getWeeklyBusinessReview();

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Business ops</div>
            <h1 className="surface-title">Reward liability, billing events, and cost per verified visit.</h1>
            <p className="surface-subtitle">Days 113-119 turn pilot proof into a paid-pilot operating view.</p>
          </div>
        </div>

        <div className="merchant-grid">
          <section className="paper-sheet sheet-pad">
            <div className="eyebrow">Reward liability</div>
            <div className="metric-stack">
              {(['reserved', 'earned', 'settled', 'voided', 'remaining'] as const).map((key) => (
                <div className="metric-line" key={key}>
                  <div className="metric-label"><strong>{key}</strong><span>NPR liability view.</span></div>
                  <div className="metric-value">{liability[key]}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="paper-sheet sheet-pad">
            <div className="eyebrow">Verified visit economics</div>
            <div className="ticket-title" style={{ marginTop: 10 }}>NPR {cost.costPerVerifiedVisitNpr}</div>
            <p className="sheet-copy" style={{ marginTop: 10 }}>
              {cost.receipts} receipts, NPR {cost.rewardCostNpr} rewards, NPR {cost.platformFeeNpr} platform fees.
            </p>
            <Link className="vs-link-chip" href="/business/invoices" style={{ marginTop: 18 }}>Export invoices</Link>
          </section>
        </div>

        <section className="ticket-sheet sheet-pad" style={{ marginTop: 18 }}>
          <div className="eyebrow">Weekly business review</div>
          <div className="ticket-title" style={{ marginTop: 10 }}>{billing.length} billing events / {review.issuedInvoices} issued invoices</div>
          <div className="campaign-sequence">
            {review.paidPipeline.map((row, index) => (
              <div className="campaign-sequence-step" key={row.merchant}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div><strong>{row.merchant} - {row.stage}</strong><p>{row.objection}</p></div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
