import { getWeeklyPackageReview } from '@/lib/launch/server';

export default async function DemoPackagePage() {
  const pack = await getWeeklyPackageReview();

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Demo package</div>
            <h1 className="surface-title">Repo, demo, docs, video, metrics, and known limits.</h1>
            <p className="surface-subtitle">{pack.externalReviewPrompt}</p>
          </div>
        </div>
        <section className="ticket-sheet sheet-pad">
          <div className="ticket-title">{pack.demo.duration}: {pack.demo.hook}</div>
          <div className="campaign-sequence" style={{ marginTop: 16 }}>
            {pack.demo.flow.map((step) => (
              <div className="campaign-sequence-step" key={step.time}><span>{step.time}</span><div><strong>{step.route}</strong><p>{step.shot}</p></div></div>
            ))}
          </div>
        </section>
        <section className="metric-stack" style={{ marginTop: 18 }}>
          {Object.entries(pack.metrics).map(([key, value]) => (
            <div className="metric-line" key={key}><div className="metric-label"><strong>{key}</strong><span>Submission package metric.</span></div><div className="metric-value">{value}</div></div>
          ))}
        </section>
      </div>
    </div>
  );
}
