import {
  PremiumButton,
  PremiumMetric,
  PremiumNav,
  PremiumProofRow,
  PremiumShell,
  PremiumStatusBadge,
  PremiumStepRail,
  PremiumSurface,
  PremiumTransactionPanel,
} from '@/components/premium/PremiumUi';
import { premiumTokens, proofLifecycleSteps } from '@/lib/premium/design-system';

export default function DesignSystemPage() {
  return (
    <PremiumShell>
      <PremiumNav />
      <section className="premium-hero" style={{ alignItems: 'center' }}>
        <div className="premium-hero-copy">
          <span className="premium-eyebrow">Week 5-8 system</span>
          <h1 className="premium-h1">Premium interface rules in code.</h1>
          <p className="premium-lede">
            The product now has a named token map, a tighter typography stack, fewer competing
            colors, stable components, and proof-first primitives for the pages that matter.
          </p>
          <div className="premium-actions">
            <PremiumButton href="/">Home</PremiumButton>
            <PremiumButton href="/demo" variant="secondary">Demo</PremiumButton>
          </div>
        </div>
        <PremiumSurface tone="light" className="premium-system-section">
          <div className="premium-card-title">
            <span>Token sample</span>
            <h2>{premiumTokens.color.accent}</h2>
          </div>
          <p className="premium-copy">
            One action accent, neutral product base, dark proof material, semantic states only where
            status needs to be understood instantly.
          </p>
        </PremiumSurface>
      </section>

      <section className="premium-system-grid" style={{ marginTop: 'clamp(48px, 7vw, 84px)' }}>
        <PremiumSurface tone="raised" className="premium-system-section">
          <div className="premium-card-title">
            <span>Controls</span>
            <h2>Buttons, fields, badges.</h2>
          </div>
          <div className="premium-component-row">
            <PremiumButton>Primary action</PremiumButton>
            <PremiumButton variant="secondary">Secondary</PremiumButton>
            <PremiumButton variant="quiet">Quiet</PremiumButton>
          </div>
          <input className="premium-input" defaultValue="receipt PDA" aria-label="Receipt PDA" />
          <div className="premium-component-row">
            <PremiumStatusBadge tone="success">success</PremiumStatusBadge>
            <PremiumStatusBadge tone="warning">warning</PremiumStatusBadge>
            <PremiumStatusBadge tone="danger">danger</PremiumStatusBadge>
            <PremiumStatusBadge tone="muted">muted</PremiumStatusBadge>
          </div>
        </PremiumSurface>

        <PremiumTransactionPanel eyebrow="Proof primitive" title="Transaction display">
          <PremiumProofRow label="Receipt" value="3hB3...9xQ2" meta="PDA" status="success" />
          <PremiumProofRow label="Signature" value="5kJ1...aA7p" meta="Explorer-ready proof" status="success" />
          <PremiumProofRow label="Replay" value="duplicate rejected" meta="Expected fraud result" status="danger" />
        </PremiumTransactionPanel>
      </section>

      <section className="premium-system-grid" style={{ marginTop: 'clamp(32px, 5vw, 60px)' }}>
        <PremiumSurface tone="light" className="premium-system-section">
          <div className="premium-card-title">
            <span>Step rail</span>
            <h2>Demo progression.</h2>
          </div>
          <PremiumStepRail steps={proofLifecycleSteps} activeIndex={4} />
        </PremiumSurface>
        <div className="premium-metrics" style={{ marginTop: 0 }}>
          <PremiumMetric label="Font" value="Geist" detail="UI text reads modern and neutral." />
          <PremiumMetric label="Accent" value="1" detail="Green is reserved for action and proof." />
          <PremiumMetric label="Radius" value="8px" detail="Premium SaaS surfaces, not toy cards." />
        </div>
      </section>
    </PremiumShell>
  );
}
