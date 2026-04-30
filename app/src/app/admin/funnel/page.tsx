import { getFunnelLeakReport } from '@/lib/launch/server';

export default async function FunnelLeakPage() {
  const funnel = await getFunnelLeakReport();

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Funnel leaks</div>
            <h1 className="surface-title">Invite to claim to visit to confirm to receipt.</h1>
            <p className="surface-subtitle">
              Day 85 makes every leak visible, with the next product fix attached to the stage where users drop.
            </p>
          </div>
        </div>

        <section className="paper-sheet sheet-pad">
          <div className="campaign-sequence">
            {funnel.map((stage, index) => (
              <div className="campaign-sequence-step" key={stage.stage}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <strong>{stage.stage} - {stage.rate}%</strong>
                  <p>{stage.from} entered, {stage.to} advanced, {stage.leak} leaked. Fix: {stage.fix}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
