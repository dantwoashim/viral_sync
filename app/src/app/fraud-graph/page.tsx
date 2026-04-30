import { getFraudGraphEntities, getMerchantFraudEducation, getPartnerQualityScores, getSettlementHoldTuning, getWeeklyFraudReview } from '@/lib/launch/server';

export default async function FraudGraphPage() {
  const graph = await getFraudGraphEntities();
  const quality = await getPartnerQualityScores();
  const education = getMerchantFraudEducation();
  const holds = getSettlementHoldTuning();
  const review = await getWeeklyFraudReview();

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Fraud graph</div>
            <h1 className="surface-title">Consumers, devices, staff, merchants, and campaigns.</h1>
            <p className="surface-subtitle">{graph.privacyReview}</p>
          </div>
        </div>
        <div className="merchant-grid">
          <section className="paper-sheet sheet-pad">
            <div className="ticket-title">Graph entities</div>
            <div className="metric-stack">
              <div className="metric-line"><div className="metric-label"><strong>Nodes</strong><span>Privacy-reviewed graph nodes.</span></div><div className="metric-value">{graph.nodes.length}</div></div>
              <div className="metric-line"><div className="metric-label"><strong>Edges</strong><span>Risk and attribution links.</span></div><div className="metric-value">{graph.edges.length}</div></div>
              <div className="metric-line"><div className="metric-label"><strong>Held partners</strong><span>Current fraud review queue.</span></div><div className="metric-value">{review.metrics.heldPartners}</div></div>
            </div>
          </section>
          <section className="paper-sheet sheet-pad">
            <div className="ticket-title">Partner quality</div>
            <div className="campaign-sequence">
              {quality.map((partner) => (
                <div className="campaign-sequence-step" key={partner.sourceCode}><span>{partner.score}</span><div><strong>{partner.partner}</strong><p>{partner.payoutAdjustment}</p></div></div>
              ))}
            </div>
          </section>
        </div>
        <section className="ticket-sheet sheet-pad" style={{ marginTop: 18 }}>
          <div className="ticket-title">{education.title}</div>
          <p className="ticket-note" style={{ marginTop: 12 }}>{education.merchantMessage}</p>
          <p className="ticket-note" style={{ marginTop: 12 }}>{holds.policy}</p>
        </section>
      </div>
    </div>
  );
}
