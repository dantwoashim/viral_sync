import Link from 'next/link';
import {
  PremiumButton,
  PremiumMetric,
  PremiumNav,
  PremiumProofRow,
  PremiumShell,
  PremiumSurface,
  PremiumTransactionPanel,
} from '@/components/premium/PremiumUi';
import { getCausalGraphData, getMultiHopDemo } from '@/lib/launch/server';

function nodeLabel(graph: Awaited<ReturnType<typeof getCausalGraphData>>, id: string) {
  const node = graph.nodes.find((item) => item.id === id);
  return {
    kind: node?.kind ?? 'node',
    label: node?.label ?? id,
    privateLabel: node?.privateLabel ?? false,
  };
}

export default async function CausalGraphPage() {
  const graph = await getCausalGraphData();
  const sample = getMultiHopDemo();
  const activeGraph = graph.edges.length > 0 ? graph : sample;
  const isSample = graph.edges.length === 0;

  return (
    <PremiumShell>
      <PremiumNav />
      <section className="premium-hero">
        <div className="premium-hero-copy">
          <span className="premium-eyebrow">Causal graph</span>
          <h1 className="premium-h1">Inspect why a reward settled.</h1>
          <p className="premium-lede">
            The graph shows how an invite becomes a visitor, how the visitor reaches a merchant,
            and where the receipt and settlement attach. Empty ledgers show a sample graph instead
            of a dead panel.
          </p>
          <div className="premium-actions">
            <PremiumButton href="/demo">Run demo</PremiumButton>
            <PremiumButton href="/evidence" variant="secondary">View evidence</PremiumButton>
          </div>
          <div className="premium-metrics">
            <PremiumMetric label="Nodes" value={`${activeGraph.nodes.length}`} detail={isSample ? 'Sample graph shown' : 'Live ledger graph'} />
            <PremiumMetric label="Edges" value={`${activeGraph.edges.length}`} detail="Every live edge links to receipt proof." />
            <PremiumMetric label="Privacy" value="Safe" detail="People render as commitments, not raw PII." />
          </div>
        </div>

        <PremiumTransactionPanel eyebrow={isSample ? 'Sample graph' : 'Live graph'} title="Graph proof summary">
          <PremiumProofRow label="Invite" value={activeGraph.nodes.find((node) => node.kind === 'invite')?.label ?? 'pending'} meta="Referrer commitment" status="muted" />
          <PremiumProofRow label="Visitor" value={activeGraph.nodes.find((node) => node.kind === 'visitor')?.label ?? 'pending'} meta="Nullifier commitment" status="muted" />
          <PremiumProofRow label="Merchant" value={activeGraph.nodes.find((node) => node.kind === 'merchant')?.label ?? 'pending'} meta="Visit destination" status="success" />
          <PremiumProofRow label="Receipt" value={activeGraph.nodes.find((node) => node.kind === 'receipt')?.label ?? 'pending'} meta="Receipt object" status={activeGraph.nodes.some((node) => node.kind === 'receipt') ? 'success' : 'warning'} />
        </PremiumTransactionPanel>
      </section>

      <section className="premium-system-grid" style={{ marginTop: 'clamp(48px, 7vw, 84px)' }}>
        <PremiumSurface tone="light" className="premium-system-section">
          <div className="premium-card-title">
            <span>{isSample ? 'Empty state with sample' : 'Live graph edges'}</span>
            <h2>{isSample ? sample.title : 'Receipt-backed edges'}</h2>
          </div>
          <div className="premium-graph-stage">
            {activeGraph.edges.map((edge) => {
              const source = nodeLabel(activeGraph, edge.source);
              const target = nodeLabel(activeGraph, edge.target);
              const receiptId = 'receiptId' in edge ? edge.receiptId : undefined;
              const href = receiptId ? `/receipts/${encodeURIComponent(receiptId)}` : '/demo';
              return (
                <Link href={href} className="premium-graph-edge" key={edge.id}>
                  <div><span>{source.kind}</span><strong>{source.label}</strong></div>
                  <i aria-hidden="true" />
                  <div><span>{edge.label}</span><strong>{source.privateLabel || target.privateLabel ? 'privacy-safe edge' : 'public edge'}</strong></div>
                  <i aria-hidden="true" />
                  <div><span>{target.kind}</span><strong>{target.label}</strong></div>
                </Link>
              );
            })}
          </div>
        </PremiumSurface>

        <PremiumSurface tone="raised" className="premium-system-section">
          <div className="premium-card-title">
            <span>Why this matters</span>
            <h2>It is not an analytics chart.</h2>
          </div>
          <p className="premium-copy">
            Generic dashboards show visits as numbers. This graph shows the proof chain that caused a reward
            to settle and keeps private users represented by deterministic commitments.
          </p>
        </PremiumSurface>
      </section>
    </PremiumShell>
  );
}
