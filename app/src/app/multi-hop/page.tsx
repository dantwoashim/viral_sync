import Link from 'next/link';
import { getMultiHopDemo } from '@/lib/launch/server';

export default function MultiHopDemoPage() {
  const demo = getMultiHopDemo();

  return (
    <main className="proof-page">
      <section className="proof-hero">
        <span>Multi-hop demo</span>
        <h1>{demo.title} with parent receipt context.</h1>
        <p>Day 110 demonstrates a privacy-safe path where labels are commitments unless the user consented.</p>
        <div className="proof-actions">
          <Link href="/causal-graph">Open causal graph</Link>
          <Link href="/api/launch/causal-graph">Graph API</Link>
        </div>
      </section>

      <section className="graph-stage">
        {demo.edges.map((edge) => {
          const source = demo.nodes.find((node) => node.id === edge.source);
          const target = demo.nodes.find((node) => node.id === edge.target);
          return (
            <div className="graph-edge" key={edge.id}>
              <div><span>{source?.kind}</span><strong>{source?.label}</strong></div>
              <i />
              <div><span>{target?.kind}</span><strong>{target?.label}</strong></div>
              <small>{edge.label}</small>
            </div>
          );
        })}
      </section>
    </main>
  );
}
