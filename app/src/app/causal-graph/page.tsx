import Link from 'next/link';
import { getCausalGraphData } from '@/lib/launch/server';

export default async function CausalGraphPage() {
  const graph = await getCausalGraphData();

  return (
    <main className="proof-page">
      <section className="proof-hero">
        <span>Causal Graph</span>
        <h1>Verified referral-to-visit edges.</h1>
        <p>Each edge is created only after a merchant-confirmed visit produces receipt metadata.</p>
      </section>

      <section className="graph-stage">
        {graph.edges.length === 0 ? (
          <div className="proof-empty">
            <strong>No receipts yet</strong>
            <p>Run Alice to Bob to merchant confirmation, then this graph will show the causal edge.</p>
          </div>
        ) : graph.edges.map((edge) => {
          const source = graph.nodes.find((node) => node.id === edge.source);
          const target = graph.nodes.find((node) => node.id === edge.target);
          return (
          <Link href={edge.receiptId ? `/receipts/${encodeURIComponent(edge.receiptId)}` : '/causal-graph'} className="graph-edge" key={edge.id}>
            <div><span>{source?.kind ?? 'source'}</span><strong>{source?.label ?? edge.source}</strong></div>
            <i />
            <div><span>{target?.kind ?? 'target'}</span><strong>{target?.label ?? edge.target}</strong></div>
            <small>{edge.label}{source?.privateLabel || target?.privateLabel ? ' / privacy-safe label' : ''}</small>
          </Link>
          );
        })}
      </section>
    </main>
  );
}
