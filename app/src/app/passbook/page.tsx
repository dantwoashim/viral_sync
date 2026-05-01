import Link from 'next/link';
import {
  PremiumButton,
  PremiumDisclosure,
  PremiumMetric,
  PremiumNav,
  PremiumShell,
  PremiumSurface,
} from '@/components/premium/PremiumUi';
import {
  getConsumerFeedbackRound,
  getNearbyAvailableCampaigns,
  getNotificationPreferences,
  getReferralStreaks,
  getRewardHistoryUi,
  getUnifiedPassbookNetwork,
  getWeeklyPassbookReview,
} from '@/lib/launch/server';

export default async function PassbookPage() {
  const [network, history, nearby, notifications, streak, feedback, review] = await Promise.all([
    getUnifiedPassbookNetwork(),
    getRewardHistoryUi(),
    getNearbyAvailableCampaigns(),
    getNotificationPreferences(),
    getReferralStreaks(),
    getConsumerFeedbackRound(),
    getWeeklyPassbookReview(),
  ]);

  const totalLines = history.earned.length + history.pending.length + history.settled.length + history.expired.length;

  return (
    <PremiumShell>
      <PremiumNav />
      <section className="premium-hero">
        <div className="premium-hero-copy">
          <span className="premium-eyebrow">Visitor passbook</span>
          <h1 className="premium-h1">Track rewards that survived the counter.</h1>
          <p className="premium-lede">
            The passbook is a receipt ledger, not a coupon wallet. Visitors see what is pending,
            what settled, what expired, and which nearby campaign can create the next verified visit.
          </p>
          <div className="premium-actions">
            <PremiumButton href="/invite">Create invite</PremiumButton>
            <PremiumButton href="/redeem" variant="secondary">Open counter code</PremiumButton>
          </div>
        </div>

        <PremiumSurface tone="proof" className="premium-ops-card">
          <div className="premium-card-title">
            <span>Current ledger</span>
            <h2>{totalLines > 0 ? `${totalLines} reward lines` : 'No reward lines yet'}</h2>
          </div>
          <div className="premium-workspace-metrics is-proof">
            <PremiumMetric label="Earned" value={String(history.earned.length)} detail="Ready rewards" />
            <PremiumMetric label="Pending" value={String(history.pending.length)} detail="Waiting on visit proof" />
            <PremiumMetric label="Settled" value={String(history.settled.length)} detail="Completed value" />
          </div>
        </PremiumSurface>
      </section>

      <section className="premium-system-grid" style={{ marginTop: 'clamp(38px, 6vw, 72px)' }}>
        <PremiumSurface tone="light" className="premium-system-section">
          <div className="premium-card-title">
            <span>Reward history</span>
            <h2>{totalLines > 0 ? 'Every line has a state.' : 'Start with one verified invite.'}</h2>
          </div>
          {totalLines > 0 ? (
            <div className="premium-state-stack">
              {[...history.earned, ...history.pending, ...history.settled, ...history.expired].slice(0, 6).map((item) => (
                <div className="premium-state" key={`${item.type}-${item.label}`}>
                  <strong>{item.label}</strong>
                  <p>{item.type === 'receipt' ? 'Receipt proof line' : 'Reward progress line'} is currently {item.status}.</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="premium-state">
              <strong>No generated activity</strong>
              <p>Create an invite or claim a friend invite. The first line appears only after a real counter step.</p>
              <div className="premium-actions">
                <Link className="premium-button premium-button-primary" href="/invite">Create invite</Link>
              </div>
            </div>
          )}
        </PremiumSurface>

        <PremiumSurface tone="raised" className="premium-system-section">
          <div className="premium-card-title">
            <span>Nearby campaigns</span>
            <h2>Choose places with funded rewards.</h2>
          </div>
          <div className="premium-state-stack">
            {nearby.campaigns.slice(0, 4).map((campaign) => (
              <div className="premium-state" key={campaign.merchant}>
                <strong>{campaign.merchant}</strong>
                <p>{campaign.category} in {campaign.neighborhood}. Reward visibility depends on merchant funding.</p>
              </div>
            ))}
          </div>
          <PremiumDisclosure title="Privacy and notifications" summary="How the ledger stays quiet">
            <p className="premium-copy">{network.privacyReview}</p>
            <p className="premium-copy">{notifications.optOut}</p>
            <p className="premium-copy">Streak {streak.currentStreak}/{streak.cap}: {streak.reward}. Feedback round {feedback.completedUsers}/{feedback.targetUsers}; weekly adjustment: {review.adjustment}.</p>
          </PremiumDisclosure>
        </PremiumSurface>
      </section>
    </PremiumShell>
  );
}
