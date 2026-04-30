import { getCrossPromotionSetup, getMarketplaceControls, getMerchantDiscoveryView, getNeighborhoodCampaignDesign, getNeighborhoodTestLaunch, getRoutePassRedemption, getWeeklyMarketplaceReview } from '@/lib/launch/server';

export default async function MarketplacePage() {
  const design = getNeighborhoodCampaignDesign();
  const discovery = await getMerchantDiscoveryView();
  const crossPromo = getCrossPromotionSetup();
  const pass = getRoutePassRedemption();
  const controls = getMarketplaceControls();
  const launch = await getNeighborhoodTestLaunch();
  const review = await getWeeklyMarketplaceReview();

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Marketplace</div>
            <h1 className="surface-title">{design.title}</h1>
            <p className="surface-subtitle">{design.sharedReward} Decision: {review.decision}.</p>
          </div>
        </div>
        <div className="merchant-grid">
          <section className="paper-sheet sheet-pad">
            <div className="ticket-title">Discovery</div>
            <div className="campaign-sequence">
              {discovery.campaigns.map((campaign) => (
                <div className="campaign-sequence-step" key={campaign.merchantId}><span>{campaign.redemptions}</span><div><strong>{campaign.merchant}</strong><p>{campaign.neighborhood} / {campaign.category}</p></div></div>
              ))}
            </div>
          </section>
          <section className="paper-sheet sheet-pad">
            <div className="ticket-title">Route pass</div>
            <div className="metric-stack">
              <div className="metric-line"><div className="metric-label"><strong>Required visits</strong><span>Unlock rule.</span></div><div className="metric-value">{pass.rule.requiredVisits}</div></div>
              <div className="metric-line"><div className="metric-label"><strong>Confirmed</strong><span>Route visits.</span></div><div className="metric-value">{pass.visits.length}</div></div>
              <div className="metric-line"><div className="metric-label"><strong>Unlocked</strong><span>Reward state.</span></div><div className="metric-value">{pass.unlocked ? 1 : 0}</div></div>
            </div>
          </section>
        </div>
        <section className="ticket-sheet sheet-pad" style={{ marginTop: 18 }}>
          <div className="ticket-title">Controls and cross-promotion</div>
          <p className="ticket-note" style={{ marginTop: 12 }}>{crossPromo.recommendation} Split: {crossPromo.splitPayout.sourcePercent}/{crossPromo.splitPayout.targetPercent}.</p>
          <p className="ticket-note" style={{ marginTop: 12 }}>{controls.partnerApproval}</p>
          <p className="ticket-note" style={{ marginTop: 12 }}>Small test: {launch.metrics.listedMerchants} merchants, {launch.metrics.routeVisits} route visits, {launch.metrics.unlockedRewards} unlocks.</p>
        </section>
      </div>
    </div>
  );
}
