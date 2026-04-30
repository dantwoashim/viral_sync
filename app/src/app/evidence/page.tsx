import Link from 'next/link';
import { getAttributedSpendMetrics, getEvidenceModel, getPosIntegrationResearch, getSolanaPayPrototype, getWeeklyEvidenceReview } from '@/lib/launch/server';

export default async function EvidencePage() {
  const model = getEvidenceModel();
  const spend = await getAttributedSpendMetrics();
  const solanaPay = getSolanaPayPrototype();
  const pos = getPosIntegrationResearch();
  const review = getWeeklyEvidenceReview();

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Evidence model</div>
            <h1 className="surface-title">Staff-only, receipt ID, CSV, Solana Pay, and POS webhook confidence.</h1>
            <p className="surface-subtitle">{review.currentRecommendation}</p>
          </div>
        </div>

        <div className="merchant-grid">
          <section className="paper-sheet sheet-pad">
            <div className="eyebrow">Confidence levels</div>
            <div className="campaign-sequence">
              {model.map((level) => (
                <div className="campaign-sequence-step" key={level.level}>
                  <span>{level.confidence}</span>
                  <div><strong>{level.level}</strong><p>{level.description}</p></div>
                </div>
              ))}
            </div>
          </section>

          <section className="ticket-sheet sheet-pad">
            <div className="eyebrow">Attributed spend</div>
            <div className="metric-stack">
              <div className="metric-line"><div className="metric-label"><strong>AOV</strong><span>Average order value.</span></div><div className="metric-value">{spend.aovNpr}</div></div>
              <div className="metric-line"><div className="metric-label"><strong>Revenue</strong><span>Attributed to receipts.</span></div><div className="metric-value">{spend.attributedRevenueNpr}</div></div>
              <div className="metric-line"><div className="metric-label"><strong>ROI</strong><span>Revenue / reward cost.</span></div><div className="metric-value">{spend.roiEstimate}</div></div>
            </div>
            <Link className="vs-link-chip" href="/evidence/import" style={{ marginTop: 18 }}>Import CSV</Link>
          </section>
        </div>

        <section className="paper-sheet sheet-pad" style={{ marginTop: 18 }}>
          <div className="eyebrow">Solana Pay / POS path</div>
          <div className="campaign-sequence">
            <div className="campaign-sequence-step"><span>SP</span><div><strong>{solanaPay.label}</strong><p>{solanaPay.reference}</p></div></div>
            {pos.tools.map((tool) => (
              <div className="campaign-sequence-step" key={tool.name}><span>POS</span><div><strong>{tool.name} - {tool.fit}</strong><p>{tool.reason}</p></div></div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
