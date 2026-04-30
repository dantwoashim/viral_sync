import { getTechnicalDeepDiveScript } from '@/lib/launch/server';

export default function TechnicalDeepDivePage() {
  const script = getTechnicalDeepDiveScript();
  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Technical deep dive</div>
            <h1 className="surface-title">{script.duration} walkthrough script.</h1>
            <p className="surface-subtitle">Program, relayer, indexer, and tests.</p>
          </div>
        </div>
        <section className="paper-sheet sheet-pad">
          <div className="campaign-sequence">
            {script.sections.map((section, index) => (
              <div className="campaign-sequence-step" key={section}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>Section</strong><p>{section}</p></div></div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
