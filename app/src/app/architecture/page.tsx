import { getArchitectureDiagram } from '@/lib/launch/server';

export default function ArchitecturePage() {
  const diagram = getArchitectureDiagram();
  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Architecture</div>
            <h1 className="surface-title">Product, backend, Solana, indexer, relayer, graph.</h1>
            <p className="surface-subtitle">Day 163 architecture diagram rendered as inspectable nodes and edges.</p>
          </div>
        </div>
        <section className="paper-sheet sheet-pad">
          <div className="campaign-sequence">
            {diagram.edges.map(([source, target, label]) => (
              <div className="campaign-sequence-step" key={`${source}-${target}`}><span>-&gt;</span><div><strong>{source} to {target}</strong><p>{label}</p></div></div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
