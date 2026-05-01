import Link from 'next/link';
import { PremiumMetric, PremiumProofRow, PremiumStatusBadge, PremiumSurface } from '@/components/premium/PremiumUi';
import { PremiumWorkspace } from '@/components/premium/PremiumWorkspace';
import {
  getCausalGraphData,
  getDeveloperDocsSummary,
  getExampleReceiptGraphApp,
  getPublicReceiptVerification,
  getReceiptReconciliation,
  getSdkSurface,
} from '@/lib/launch/server';

export default async function ExampleReceiptGraphPage() {
  const [graph, receipts] = await Promise.all([getCausalGraphData(), getReceiptReconciliation()]);
  const app = getExampleReceiptGraphApp();
  const sdk = getSdkSurface();
  const docs = getDeveloperDocsSummary();
  const sampleReceipt = receipts[0]?.receiptId ?? 'missing-receipt';
  const verification = await getPublicReceiptVerification(sampleReceipt);
  const receiptHref = verification.ok ? `/receipts/${encodeURIComponent(sampleReceipt)}` : '/demo';

  return (
    <PremiumWorkspace audience="developer" active="example" action={<Link className="premium-button premium-button-primary" href="/developer">Back to SDK</Link>}>
      <section className="premium-workspace-hero">
        <div>
          <span className="premium-eyebrow">Example app integration</span>
          <h1 className="premium-h2">Ship a receipt verifier without our dashboard.</h1>
          <p className="premium-lede">
            This route behaves like the smallest external app: it verifies one receipt, fetches the causal graph, and shows the exact SDK calls a builder would copy.
          </p>
        </div>
        <PremiumSurface tone="proof" className="premium-ops-card">
          <div className="premium-card-title">
            <span>External verifier</span>
            <h2>{verification.ok ? 'Receipt verified' : 'Missing receipt handled'}</h2>
          </div>
          <PremiumProofRow label="Route" value={app.route} status="success" />
          <PremiumProofRow label="Receipt" value={sampleReceipt} status={verification.ok ? 'success' : 'warning'} />
          <PremiumProofRow label="Status" value={verification.status} status={verification.ok ? 'success' : 'warning'} />
        </PremiumSurface>
      </section>

      <section className="premium-workspace-metrics">
        <PremiumMetric label="Graph nodes" value={String(graph.nodes.length)} detail="Fetched from causal graph API model" />
        <PremiumMetric label="Graph edges" value={String(graph.edges.length)} detail="Invite, visit, receipt, settlement" />
        <PremiumMetric label="SDK helpers" value={String(sdk.helpers.length)} detail={sdk.packageName} />
      </section>

      <section className="premium-workspace-grid">
        <PremiumSurface tone="light" className="premium-ops-card">
          <div className="premium-card-title">
            <span>Graph consumer</span>
            <h2>Receipt graph nodes</h2>
          </div>
          <div className="premium-table-list">
            {graph.nodes.length === 0 ? (
              <div className="premium-state"><strong>No graph nodes yet</strong><p>The example still renders a missing-receipt state so a fresh clone does not dead-end.</p></div>
            ) : graph.nodes.slice(0, 6).map((node) => (
              <div className="premium-table-row" key={node.id}>
                <div><strong>{node.label}</strong><span>{node.privateLabel ? 'privacy-safe label' : 'public label'}</span></div>
                <code>{node.kind}</code>
                <PremiumStatusBadge tone="success">node</PremiumStatusBadge>
              </div>
            ))}
          </div>
        </PremiumSurface>

        <PremiumSurface tone="light" className="premium-ops-card">
          <div className="premium-card-title">
            <span>30-minute integration path</span>
            <h2>Docs to running verifier</h2>
          </div>
          <ol className="premium-timeline">
            <li><span>01</span><div><strong>Install</strong><p>{docs.install}</p></div></li>
            <li><span>02</span><div><strong>Verify</strong><p>{docs.verifyReceipt}</p></div></li>
            <li><span>03</span><div><strong>Fetch graph</strong><p>Render {docs.examples[1]} and link each receipt node back to its proof page.</p></div></li>
            <li><span>04</span><div><strong>Webhooks</strong><p>{docs.listenWebhook}</p></div></li>
          </ol>
          <div className="premium-actions">
            <Link className="premium-button premium-button-secondary" href={receiptHref}>{verification.ok ? 'Open receipt proof' : 'Open demo fallback'}</Link>
            <Link className="premium-button premium-button-quiet" href="/api/launch/causal-graph">Open graph JSON</Link>
          </div>
        </PremiumSurface>
      </section>
    </PremiumWorkspace>
  );
}
