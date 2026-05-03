import Link from 'next/link';
import {
  PremiumButton,
  PremiumMetric,
  PremiumNav,
  PremiumShell,
  PremiumSurface,
} from '@/components/premium/PremiumUi';

const examples = [
  ['/frontier-proof', 'Devnet proof', 'Receipt PDA, settlement, nullifier, intent hash, replay checks, and verifier path.'],
  ['/frontier-gauntlet', 'Fraud Gauntlet', 'A judge-facing list of attacks that should fail before any reward can move.'],
  ['/conversion-orderbook', 'Conversion Orderbook', 'Proof-of-conversion campaign links: referrers route demand, terminals and visitors counter-attest, Solana settles.'],
  ['/merchant-passport', 'Merchant Proof Passport', 'Portable proof-of-local-commerce for a small merchant without publishing customer data.'],
  ['/invite', 'Visitor invite', 'Show the reward, counter code, awaiting-visit state, and receipt path.'],
  ['/merchant/scan', 'Staff scan', 'Confirm a visitor code at the counter and record the Causal Receipt.'],
  ['/security', 'Trust model', 'Nullifiers, vault custody, receipt trail, counter attestation, and honest limitations.'],
] as const;

export default function ExamplesPage() {
  return (
    <PremiumShell>
      <PremiumNav />
      <section className="premium-hero">
        <div className="premium-hero-copy">
          <span className="premium-eyebrow">Examples</span>
          <h1 className="premium-h1">Start from the verified proof.</h1>
          <p className="premium-lede">
            Open the devnet receipt, inspect the fraud gauntlet, preview the conversion orderbook, verify the merchant passport, or read the trust model. The demo is organized around proof artifacts, not broad product surface area.
          </p>
          <div className="premium-actions">
            <PremiumButton href="/frontier-proof">View devnet proof</PremiumButton>
            <PremiumButton href="/frontier-gauntlet" variant="secondary">Open gauntlet</PremiumButton>
            <PremiumButton href="/conversion-orderbook" variant="quiet">Orderbook</PremiumButton>
          </div>
        </div>

        <PremiumSurface tone="proof" className="premium-ops-card">
          <div className="premium-card-title">
            <span>Route launcher</span>
            <h2>{examples.length} core surfaces, one receipt model.</h2>
          </div>
          <div className="premium-workspace-metrics is-proof">
            <PremiumMetric label="Proof" value="Devnet" detail="Receipt + settlement" />
            <PremiumMetric label="Gauntlet" value="Blocked attacks" detail="Fraud cases" />
            <PremiumMetric label="Apps" value="Visitor + staff" detail="Counter workflow" />
          </div>
        </PremiumSurface>
      </section>

      <section className="premium-system-grid" style={{ marginTop: 'clamp(38px, 6vw, 72px)' }}>
        {examples.map(([href, title, copy]) => (
          <Link className="premium-surface premium-surface-light premium-system-section" href={href} key={href}>
            <div className="premium-card-title">
              <span>{href}</span>
              <h2>{title}</h2>
            </div>
            <p className="premium-copy">{copy}</p>
            <p className="premium-copy" style={{ fontWeight: 900, color: '#101010' }}>Open →</p>
          </Link>
        ))}
      </section>
    </PremiumShell>
  );
}
