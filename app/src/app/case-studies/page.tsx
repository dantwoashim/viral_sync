import { getCaseStudies } from '@/lib/launch/server';

export default async function CaseStudiesPage() {
  const cases = await getCaseStudies();
  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Case studies</div>
            <h1 className="surface-title">Merchant story with numbers and tx references.</h1>
          </div>
        </div>
        {cases.map((study) => (
          <section className="paper-sheet sheet-pad" key={study.merchant}>
            <div className="ticket-title">{study.merchant}</div>
            <p className="sheet-copy" style={{ marginTop: 10 }}>{study.story}</p>
            <div className="metric-stack">
              {Object.entries(study.numbers).map(([key, value]) => (
                <div className="metric-line" key={key}><div className="metric-label"><strong>{key}</strong><span>Case-study metric.</span></div><div className="metric-value">{value}</div></div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
