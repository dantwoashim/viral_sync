import { PassbookReferenceUi } from '@/components/ReferenceUi';
import { getConsumerFeedbackRound, getNearbyAvailableCampaigns, getNotificationPreferences, getReferralStreaks, getRewardHistoryUi, getUnifiedPassbookNetwork, getWeeklyPassbookReview } from '@/lib/launch/server';

export default async function PassbookPage() {
  const network = await getUnifiedPassbookNetwork();
  const history = await getRewardHistoryUi();
  const nearby = await getNearbyAvailableCampaigns();
  const notifications = getNotificationPreferences();
  const streak = await getReferralStreaks();
  const feedback = getConsumerFeedbackRound();
  const review = await getWeeklyPassbookReview();

  return (
    <>
      <PassbookReferenceUi />
      <section className="surface">
        <div className="surface-inner">
          <div className="surface-header">
            <div className="surface-title-block">
              <div className="eyebrow">Passbook network</div>
              <h1 className="surface-title">Unified rewards, receipts, claims, and nearby campaigns.</h1>
              <p className="surface-subtitle">{network.privacyReview}</p>
            </div>
          </div>
          <div className="merchant-grid">
            <section className="paper-sheet sheet-pad">
              <div className="ticket-title">Reward history</div>
              <div className="metric-stack">
                <div className="metric-line"><div className="metric-label"><strong>Earned</strong><span>Ready rewards.</span></div><div className="metric-value">{history.earned.length}</div></div>
                <div className="metric-line"><div className="metric-label"><strong>Pending</strong><span>In progress.</span></div><div className="metric-value">{history.pending.length}</div></div>
                <div className="metric-line"><div className="metric-label"><strong>Settled</strong><span>Completed value.</span></div><div className="metric-value">{history.settled.length}</div></div>
                <div className="metric-line"><div className="metric-label"><strong>Expired</strong><span>Blocked or expired.</span></div><div className="metric-value">{history.expired.length}</div></div>
              </div>
            </section>
            <section className="paper-sheet sheet-pad">
              <div className="ticket-title">Nearby campaigns</div>
              <div className="campaign-sequence">
                {nearby.campaigns.map((campaign) => (
                  <div className="campaign-sequence-step" key={campaign.merchant}><span>{campaign.category.slice(0, 3).toUpperCase()}</span><div><strong>{campaign.merchant}</strong><p>{campaign.neighborhood}</p></div></div>
                ))}
              </div>
            </section>
          </div>
          <section className="ticket-sheet sheet-pad" style={{ marginTop: 18 }}>
            <div className="ticket-title">Notification preferences</div>
            <p className="ticket-note" style={{ marginTop: 12 }}>{notifications.optOut}</p>
            <p className="ticket-note" style={{ marginTop: 12 }}>Streak {streak.currentStreak}/{streak.cap}: {streak.reward}.</p>
            <p className="ticket-note" style={{ marginTop: 12 }}>Feedback round: {feedback.completedUsers}/{feedback.targetUsers} users. Weekly adjustment: {review.adjustment}.</p>
          </section>
        </div>
      </section>
    </>
  );
}
