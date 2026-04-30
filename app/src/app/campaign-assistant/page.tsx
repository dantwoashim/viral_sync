import { getAssistantAnalytics, getCampaignAssistantSpec, getCampaignCopyGenerator, getFraudSafeAssistantRecommendations, getLiabilitySimulator, getMainnetBetaAssistantSpec, getMainnetBetaLiabilitySimulator, getMainnetBetaRuleAssistant, getRuleBasedCampaignAssistant, getWeeklyAssistantReview } from '@/lib/launch/server';

export default function CampaignAssistantPage() {
  const spec = getCampaignAssistantSpec();
  const assistant = getRuleBasedCampaignAssistant();
  const liability = getLiabilitySimulator();
  const copy = getCampaignCopyGenerator();
  const risk = getFraudSafeAssistantRecommendations();
  const analytics = getAssistantAnalytics();
  const review = getWeeklyAssistantReview();
  const betaSpec = getMainnetBetaAssistantSpec();
  const betaAssistant = getMainnetBetaRuleAssistant();
  const betaLiability = getMainnetBetaLiabilitySimulator();

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Campaign assistant</div>
            <h1 className="surface-title">Rule-based reward, cap, copy, liability, and fraud warnings.</h1>
            <p className="surface-subtitle">{spec.promiseBoundary}</p>
          </div>
        </div>
        <section className="ticket-sheet sheet-pad">
          <div className="ticket-title">{assistant.reward} / {assistant.cap}</div>
          <p className="ticket-note" style={{ marginTop: 12 }}>{assistant.copy}</p>
          <p className="ticket-note" style={{ marginTop: 12 }}>{risk.recommendation}</p>
        </section>
        <section className="metric-stack" style={{ marginTop: 18 }}>
          <div className="metric-line"><div className="metric-label"><strong>Max cost</strong><span>Budget liability.</span></div><div className="metric-value">{liability.maxCostNpr}</div></div>
          <div className="metric-line"><div className="metric-label"><strong>Expected conversions</strong><span>Claim-to-visit model.</span></div><div className="metric-value">{liability.expectedConversions}</div></div>
          <div className="metric-line"><div className="metric-label"><strong>Accepted</strong><span>Suggestions accepted.</span></div><div className="metric-value">{analytics.acceptedSuggestions}</div></div>
        </section>
        <section className="paper-sheet sheet-pad" style={{ marginTop: 18 }}>
          <div className="ticket-title">Copy</div>
          <p className="sheet-copy" style={{ marginTop: 12 }}>{copy.offerCopy}</p>
          <p className="sheet-copy" style={{ marginTop: 12 }}>{copy.whatsapp}</p>
          <p className="sheet-copy" style={{ marginTop: 12 }}>{copy.instagram}</p>
          <p className="ticket-note" style={{ marginTop: 12 }}>Review decision: {review.decision}.</p>
        </section>
        <section className="ticket-sheet sheet-pad" style={{ marginTop: 18 }}>
          <div className="ticket-title">Mainnet beta strict caps</div>
          <p className="ticket-note" style={{ marginTop: 12 }}>{betaSpec.strictCaps.join(', ')}</p>
          <p className="ticket-note" style={{ marginTop: 12 }}>{betaAssistant.betaCap}</p>
          <p className="ticket-note" style={{ marginTop: 12 }}>Max cost NPR {betaLiability.maxCostNpr}; expected conversions {betaLiability.expectedConversions}; break-even {betaLiability.breakEvenVisits}.</p>
        </section>
      </div>
    </div>
  );
}
