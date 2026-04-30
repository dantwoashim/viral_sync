import { getFraudCaseStudy, getRiskSimulationSuite, getWeeklyFraudReview } from '@/lib/launch/server';

export default async function RiskPage() {
  const suite = getRiskSimulationSuite();
  const caseStudy = getFraudCaseStudy();
  const review = await getWeeklyFraudReview();

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Risk simulation</div>
            <h1 className="surface-title">Script farms, staff abuse, partner collusion, and weekly tuning.</h1>
            <p className="surface-subtitle">Avoided loss NPR {review.revenueImpact.avoidedLossNpr}; delayed revenue NPR {review.revenueImpact.delayedRevenueNpr}.</p>
          </div>
        </div>
        <section className="paper-sheet sheet-pad">
          <div className="campaign-sequence">
            {suite.map((attack) => (
              <div className="campaign-sequence-step" key={attack.attack}><span>SIM</span><div><strong>{attack.attack}</strong><p>{attack.control}: {attack.expected}</p></div></div>
            ))}
          </div>
        </section>
        <section className="ticket-sheet sheet-pad" style={{ marginTop: 18 }}>
          <div className="ticket-title">{caseStudy.title}</div>
          <p className="ticket-note" style={{ marginTop: 12 }}>{caseStudy.setup}</p>
          <p className="ticket-note" style={{ marginTop: 12 }}>{caseStudy.result}</p>
        </section>
      </div>
    </div>
  );
}
