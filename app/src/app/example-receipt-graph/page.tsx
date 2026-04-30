import { getCausalGraphData, getDeveloperDocsSummary, getExampleReceiptGraphApp, getSdkSurface } from '@/lib/launch/server';

export default async function ExampleReceiptGraphPage() {
  const graph = await getCausalGraphData();
  const app = getExampleReceiptGraphApp();
  const sdk = getSdkSurface();
  const docs = getDeveloperDocsSummary();

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Example app</div>
            <h1 className="surface-title">Minimal receipt graph consumer.</h1>
            <p className="surface-subtitle">{app.route}: {sdk.packageName} with {sdk.helpers.join(', ')}.</p>
          </div>
        </div>
        <section className="metric-stack">
          <div className="metric-line"><div className="metric-label"><strong>Nodes</strong><span>Fetched from graph API.</span></div><div className="metric-value">{graph.nodes.length}</div></div>
          <div className="metric-line"><div className="metric-label"><strong>Edges</strong><span>Causal links available to render.</span></div><div className="metric-value">{graph.edges.length}</div></div>
        </section>
        <section className="ticket-sheet sheet-pad" style={{ marginTop: 18 }}>
          <div className="ticket-title">Developer docs</div>
          <p className="ticket-note" style={{ marginTop: 12 }}>{docs.install}</p>
          <p className="ticket-note" style={{ marginTop: 12 }}>{docs.verifyReceipt}</p>
          <p className="ticket-note" style={{ marginTop: 12 }}>{docs.listenWebhook}</p>
        </section>
      </div>
    </div>
  );
}
