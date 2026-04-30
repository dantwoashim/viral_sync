import Link from 'next/link';
import { getCrossMerchantCampaign, getPartnerAccounts, getPartnerFraudControls, getPartnerPayoutRules, getWeeklyPartnerReview } from '@/lib/launch/server';

export default async function PartnersPage() {
  const partners = getPartnerAccounts();
  const rules = getPartnerPayoutRules();
  const crossMerchant = getCrossMerchantCampaign();
  const fraud = getPartnerFraudControls();
  const review = await getWeeklyPartnerReview();

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Partner accounts</div>
            <h1 className="surface-title">Creator, hostel, guide, and merchant-as-partner attribution.</h1>
            <p className="surface-subtitle">Days 120-122 define partner models, source links, payout rules, and dashboard access.</p>
          </div>
        </div>
        <div className="merchant-grid">
          {partners.map((partner) => (
            <section className="paper-sheet sheet-pad" key={partner.id}>
              <div className="eyebrow">{partner.type}</div>
              <div className="ticket-title" style={{ marginTop: 10 }}>{partner.name}</div>
              <p className="sheet-copy" style={{ marginTop: 10 }}>Source: {partner.sourceCode}. Quality score: {partner.qualityScore}. Status: {partner.status}.</p>
              <Link className="vs-link-chip" href={`/partners/dashboard?partner=${encodeURIComponent(partner.id)}`}>Open dashboard</Link>
            </section>
          ))}
        </div>
        <section className="ticket-sheet sheet-pad" style={{ marginTop: 18 }}>
          <div className="eyebrow">Payout and cross-merchant rules</div>
          <div className="ticket-title" style={{ marginTop: 10 }}>{rules.splitLogic}</div>
          <p className="ticket-note" style={{ marginTop: 14 }}>{crossMerchant.title}: {crossMerchant.split}</p>
        </section>

        <section className="paper-sheet sheet-pad" style={{ marginTop: 18 }}>
          <div className="eyebrow">Partner fraud controls</div>
          <div className="campaign-sequence">
            <div className="campaign-sequence-step"><span>V</span><div><strong>Velocity</strong><p>{fraud.velocity.maxClaimsPerHour} claims/hour, {fraud.velocity.maxRedemptionsPerDay} redemptions/day.</p></div></div>
            <div className="campaign-sequence-step"><span>Q</span><div><strong>Quality score</strong><p>Review below {fraud.qualityScore.reviewBelow}; hold below {fraud.qualityScore.holdBelow}.</p></div></div>
            <div className="campaign-sequence-step"><span>5</span><div><strong>Weekly review</strong><p>Talked to {review.contacted.length} potential partners: {review.contacted.join(', ')}.</p></div></div>
          </div>
        </section>
      </div>
    </div>
  );
}
