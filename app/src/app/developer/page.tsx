import Link from 'next/link';
import { CopyValueButton } from '@/components/premium/CopyValueButton';
import { PremiumMetric, PremiumProofRow, PremiumStatusBadge, PremiumSurface } from '@/components/premium/PremiumUi';
import { PremiumWorkspace } from '@/components/premium/PremiumWorkspace';
import {
  getDeveloperDocsV2,
  getDeveloperSdkPackageV2,
  getDeveloperSdkSurfaceV2,
  getExampleReceiptGraphAppV2,
  getReceiptReconciliation,
  getVerificationApiV2,
  getWebhookSigningV2,
  getWeeklyDeveloperReviewV2,
} from '@/lib/launch/server';

export default async function DeveloperPage() {
  const [verification, receipts] = await Promise.all([getVerificationApiV2(), getReceiptReconciliation()]);
  const surface = getDeveloperSdkSurfaceV2();
  const sdk = getDeveloperSdkPackageV2();
  const example = getExampleReceiptGraphAppV2();
  const docs = getDeveloperDocsV2();
  const webhook = getWebhookSigningV2();
  const review = getWeeklyDeveloperReviewV2();
  const sampleReceipt = receipts[0]?.receiptId ?? 'receipt-992ac178';
  const codeSample = [
    "import { verifyReceipt, fetchGraph } from 'viral-sync-sdk';",
    '',
    `const receipt = await fetch('/api/launch/receipts/verify/${sampleReceipt}').then((res) => res.json());`,
    'const verified = verifyReceipt(receipt);',
    "const graph = await fetchGraph('/api/launch/causal-graph');",
    '',
    'console.log({ verified, nodes: graph.nodes.length });',
  ].join('\n');

  return (
    <PremiumWorkspace audience="developer" active="developer" action={<Link className="premium-button premium-button-primary" href="/example-receipt-graph">Open example app</Link>}>
      <section className="premium-workspace-hero">
        <div>
          <span className="premium-eyebrow">Developer verification</span>
          <h1 className="premium-h2">Verify visit receipts inside your own product.</h1>
          <p className="premium-lede">
            The SDK/docs surface is built around the primitive: verify one receipt, fetch the graph, then subscribe to signed proof events.
          </p>
        </div>
        <PremiumSurface tone="proof" className="premium-ops-card">
          <div className="premium-card-title">
            <span>Receipt verifier</span>
            <h2>Verification API</h2>
          </div>
          <PremiumProofRow label="Endpoint" value={verification.endpoint} status="success" />
          <PremiumProofRow label="Sample receipt" value={sampleReceipt} status={receipts.length > 0 ? 'success' : 'warning'} />
          <PremiumProofRow label="Positive path" value={verification.positivePath} status={verification.positivePath === 'not_found' ? 'warning' : 'success'} />
          <PremiumProofRow label="Webhook tamper test" value={webhook.tamperTest ? 'rejects tampered payload' : 'needs review'} status={webhook.tamperTest ? 'success' : 'danger'} />
        </PremiumSurface>
      </section>

      <section className="premium-workspace-grid">
        <PremiumSurface tone="light" className="premium-ops-card">
          <div className="premium-card-title">
            <span>SDK</span>
            <h2>{surface.packageName}</h2>
          </div>
          <div className="premium-workspace-metrics is-compact">
            <PremiumMetric label="Entrypoint" value={sdk.entrypoint} detail="Typed package surface" />
            <PremiumMetric label="Helpers" value={String(sdk.exports.length)} detail="Read and action helpers" />
            <PremiumMetric label="Policy" value="read-only" detail={surface.mutationPolicy} />
          </div>
          <div className="premium-table-list">
            {surface.helpers.map((helper) => (
              <div className="premium-table-row" key={helper}>
                <div><strong>{helper}</strong><span>{surface.apiReview}</span></div>
                <PremiumStatusBadge tone="success">documented</PremiumStatusBadge>
              </div>
            ))}
          </div>
        </PremiumSurface>

        <PremiumSurface tone="light" className="premium-ops-card">
          <div className="premium-card-title">
            <span>Copyable code sample</span>
            <h2>Verify receipt and fetch graph</h2>
          </div>
          <pre className="premium-code-block"><code>{codeSample}</code></pre>
          <div className="premium-actions">
            <CopyValueButton value={codeSample} label="Copy code" />
            <Link className="premium-button premium-button-secondary" href={`/api/launch/receipts/verify/${encodeURIComponent(sampleReceipt)}`}>Open verifier JSON</Link>
          </div>
        </PremiumSurface>
      </section>

      <PremiumSurface tone="light" className="premium-ops-card">
        <div className="premium-card-title">
          <span>Developer docs checklist</span>
          <h2>{review.decision}</h2>
        </div>
        <div className="premium-replay-strip">
          {docs.docs.map((item) => (
            <div key={item}>
              <span>Doc path</span>
              <strong>{item}</strong>
              <p>{example.route} proves a third-party reader can consume the primitive.</p>
            </div>
          ))}
        </div>
      </PremiumSurface>
    </PremiumWorkspace>
  );
}
