import { getCreatorCampaignSpec, getCreatorLinkAnalytics, getCreatorOnboarding, getCreatorPayoutSettlement, getFraudAwareCreatorLeaderboard, getMicroCreatorTest, getWeeklyCreatorReview, getWeeklyDeveloperReview } from '@/lib/launch/server';

export default async function CreatorsPage() {
  const review = getWeeklyDeveloperReview();
  const spec = getCreatorCampaignSpec();
  const onboarding = getCreatorOnboarding();
  const analytics = await getCreatorLinkAnalytics();
  const payouts = await getCreatorPayoutSettlement();
  const leaderboard = await getFraudAwareCreatorLeaderboard();
  const test = getMicroCreatorTest();
  const weekly = await getWeeklyCreatorReview();

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Creators</div>
            <h1 className="surface-title">Creator campaign spec, onboarding, and link analytics.</h1>
            <p className="surface-subtitle">{review.credibilitySignal} Creator review: {weekly.payoutAdjustment}.</p>
          </div>
        </div>
        <section className="ticket-sheet sheet-pad">
          <div className="ticket-title">{spec.payout}</div>
          <p className="ticket-note" style={{ marginTop: 12 }}>{spec.riskReview}</p>
          <p className="ticket-note" style={{ marginTop: 12 }}>Wallet: {onboarding.payoutWallet.network}, {onboarding.payoutWallet.status}.</p>
        </section>
        <section className="metric-stack" style={{ marginTop: 18 }}>
          {analytics.map((row) => (
            <div className="metric-line" key={row.sourceCode}><div className="metric-label"><strong>{row.creator}</strong><span>{row.claims} claims, {row.verifiedVisits} verified visits.</span></div><div className="metric-value">{row.earningsNpr}</div></div>
          ))}
        </section>
        <div className="merchant-grid" style={{ marginTop: 18 }}>
          <section className="paper-sheet sheet-pad">
            <div className="ticket-title">Payout settlement</div>
            <div className="campaign-sequence">
              {payouts.map((row) => (
                <div className="campaign-sequence-step" key={row.sourceCode}><span>{row.status}</span><div><strong>{row.creator}</strong><p>Settled {row.settledNpr}, held {row.heldNpr}, receipts {row.receipts}.</p></div></div>
              ))}
            </div>
          </section>
          <section className="paper-sheet sheet-pad">
            <div className="ticket-title">Fraud-aware leaderboard</div>
            <div className="campaign-sequence">
              {leaderboard.map((row) => (
                <div className="campaign-sequence-step" key={row.sourceCode}><span>{row.rankScore}</span><div><strong>{row.creator}</strong><p>{row.verifiedVisits} verified visits, quality {row.qualityScore}.</p></div></div>
              ))}
            </div>
          </section>
        </div>
        <section className="ticket-sheet sheet-pad" style={{ marginTop: 18 }}>
          <div className="ticket-title">Micro-creator test</div>
          <p className="ticket-note" style={{ marginTop: 12 }}>{test.creators.join(', ')}</p>
        </section>
      </div>
    </div>
  );
}
