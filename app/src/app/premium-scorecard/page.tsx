import {
  PremiumButton,
  PremiumCompletionMoment,
  PremiumMetric,
  PremiumNav,
  PremiumProofRow,
  PremiumShell,
  PremiumStatusBadge,
  PremiumSurface,
  PremiumTransactionPanel,
} from '@/components/premium/PremiumUi';

const readinessGates = [
  ['Performance', 'route load and perceived-speed budget', 'premium:performance'],
  ['Accessibility', 'focus, live regions, motion, labels', 'premium:a11y'],
  ['Visual QA', 'final mobile and desktop screenshots', 'premium:screenshots'],
  ['Copy QA', 'no internal or unsupported product copy', 'premium:copy'],
  ['Release', 'scorecard and packet generated from gates', 'premium:release-candidate'],
] as const;

const finalRoutes = [
  ['Demo', '/demo', 'Timed proof path, replay, fallback'],
  ['Invite', '/invite', 'First user action'],
  ['Redeem', '/redeem', 'Counter handoff'],
  ['Scan', '/merchant/scan', 'Staff attestation'],
  ['Receipt', '/receipts/localnet-receipt', 'Proof object'],
  ['Graph', '/causal-graph', 'Causal edge'],
  ['Developer', '/developer', 'SDK verification'],
] as const;

export default function PremiumScorecardPage() {
  return (
    <PremiumShell>
      <PremiumNav />
      <section className="premium-hero" style={{ alignItems: 'center' }}>
        <div className="premium-hero-copy">
          <span className="premium-eyebrow">Release readiness</span>
          <h1 className="premium-h1">Release proof, not launch theater.</h1>
          <p className="premium-lede">
            The final build is judged by proof, speed, accessibility, responsive polish, and a demo
            path that still works when live infrastructure slows down.
          </p>
          <div className="premium-actions">
            <PremiumButton href="/demo">Run the proof demo</PremiumButton>
            <PremiumButton href="/developer" variant="secondary">Open verification docs</PremiumButton>
          </div>
        </div>
        <PremiumTransactionPanel eyebrow="Final gate" title="Ship criteria">
          {readinessGates.map(([label, meta, value]) => (
            <PremiumProofRow key={label} label={label} value={value} meta={meta} status="success" />
          ))}
        </PremiumTransactionPanel>
      </section>

      <section className="premium-metrics" aria-label="Premium readiness metrics">
        <PremiumMetric label="Final viewport widths" value="6" detail="320, 390, 430, 1024, 1440, and 1728 pixels." />
        <PremiumMetric label="Core proof routes" value="12" detail="Each route receives screenshot, copy, and layout checks." />
        <PremiumMetric label="Demo target" value="1:52" detail="The rehearsal script keeps the proof path under two minutes." />
      </section>

      <section className="premium-system-grid" style={{ marginTop: 'clamp(42px, 7vw, 76px)' }}>
        <PremiumSurface tone="light" className="premium-system-section">
          <div className="premium-card-title">
            <span>Core path</span>
            <h2>Every route has one job.</h2>
          </div>
          <div className="premium-readiness-list">
            {finalRoutes.map(([label, href, detail]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{href}</strong>
                <p>{detail}</p>
              </div>
            ))}
          </div>
        </PremiumSurface>

        <PremiumSurface tone="raised" className="premium-system-section">
          <div className="premium-card-title">
            <span>Submission posture</span>
            <h2>What the interface now has to prove.</h2>
          </div>
          <div className="premium-state-stack">
            <div className="premium-state">
              <strong>First-time user clarity</strong>
              <p>Within the first screen, the product says verified visit rewards, not attribution analytics.</p>
            </div>
            <div className="premium-state">
              <strong>Merchant trust</strong>
              <p>Vault, cap, settlement, replay, and close states are visible before funding feels risky.</p>
            </div>
            <div className="premium-state">
              <strong>Developer confidence</strong>
              <p>The SDK route and example app show how to verify receipts outside the launch app.</p>
            </div>
          </div>
          <div className="premium-component-row">
            <PremiumStatusBadge tone="success">release candidate</PremiumStatusBadge>
            <PremiumStatusBadge tone="success">fallback ready</PremiumStatusBadge>
            <PremiumStatusBadge tone="success">proof-first</PremiumStatusBadge>
          </div>
          <PremiumCompletionMoment
            title="Freeze criteria preserved"
            detail="After release candidate, only blocker fixes should move the product surface."
          />
        </PremiumSurface>
      </section>
    </PremiumShell>
  );
}
