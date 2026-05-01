import Link from 'next/link';
import {
  PremiumButton,
  PremiumMetric,
  PremiumNav,
  PremiumShell,
  PremiumSurface,
} from '@/components/premium/PremiumUi';
import { getReceiptReconciliation } from '@/lib/launch/server';

const examples = [
  ['Proof demo', '/demo', 'Walk through fund, claim, confirm, settle, and replay rejection.'],
  ['Visitor invite', '/invite', 'See the conversion surface before a visitor claims.'],
  ['Staff scan', '/merchant/scan', 'Confirm a counter code with manual fallback first.'],
  ['Developer verifier', '/developer', 'Verify receipts and consume the graph without the app.'],
] as const;

export default async function ExamplesPage() {
  const receipts = await getReceiptReconciliation();
  const firstReceipt = receipts[0]?.receiptId;

  return (
    <PremiumShell>
      <PremiumNav />
      <section className="premium-hero">
        <div className="premium-hero-copy">
          <span className="premium-eyebrow">Examples</span>
          <h1 className="premium-h1">Start from a working proof path.</h1>
          <p className="premium-lede">
            Examples should make the system feel real in under a minute: run the proof, inspect a
            receipt, confirm a code, or integrate the verifier in another app.
          </p>
          <div className="premium-actions">
            <PremiumButton href="/demo">Run proof demo</PremiumButton>
            <PremiumButton href={firstReceipt ? `/receipts/${encodeURIComponent(firstReceipt)}` : '/causal-graph'} variant="secondary">
              {firstReceipt ? 'Open sample receipt' : 'Open graph'}
            </PremiumButton>
          </div>
        </div>

        <PremiumSurface tone="proof" className="premium-ops-card">
          <div className="premium-card-title">
            <span>Example library</span>
            <h2>{examples.length} core flows, one proof model.</h2>
          </div>
          <div className="premium-workspace-metrics is-proof">
            <PremiumMetric label="Demo" value="Proof" detail="End-to-end path" />
            <PremiumMetric label="Receipt" value={firstReceipt ? 'Live' : 'Fallback'} detail="Inspectable object" />
            <PremiumMetric label="SDK" value="External" detail="Third-party verifier" />
          </div>
        </PremiumSurface>
      </section>

      <section className="premium-system-grid" style={{ marginTop: 'clamp(38px, 6vw, 72px)' }}>
        {examples.map(([title, href, copy]) => (
          <Link className="premium-surface premium-surface-light premium-system-section" href={href} key={title}>
            <div className="premium-card-title">
              <span>{href}</span>
              <h2>{title}</h2>
            </div>
            <p className="premium-copy">{copy}</p>
          </Link>
        ))}
      </section>
    </PremiumShell>
  );
}
