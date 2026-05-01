import {
  PremiumButton,
  PremiumDisclosure,
  PremiumMetric,
  PremiumNav,
  PremiumShell,
  PremiumSurface,
} from '@/components/premium/PremiumUi';

const steps = [
  ['Invite', 'A visitor receives one link tied to a real merchant-funded reward.'],
  ['Claim', 'The claim binds to session and device so replay attempts have a nullifier trail.'],
  ['Counter', 'Staff confirms the visit with code entry or QR fallback.'],
  ['Receipt', 'The verified visit becomes a proof object the visitor, merchant, or developer can inspect.'],
] as const;

export default function RoutesPage() {
  return (
    <PremiumShell>
      <PremiumNav />
      <section className="premium-hero">
        <div className="premium-hero-copy">
          <span className="premium-eyebrow">Visitor flow</span>
          <h1 className="premium-h1">One reward path, four concrete steps.</h1>
          <p className="premium-lede">
            The flow guide explains the job of each screen without pretending the product is a phone mockup.
            Every step moves the visitor closer to a receipt the merchant can trust.
          </p>
          <div className="premium-actions">
            <PremiumButton href="/invite">Start with invite</PremiumButton>
            <PremiumButton href="/merchant/scan" variant="secondary">Open staff confirmation</PremiumButton>
          </div>
        </div>

        <PremiumSurface tone="proof" className="premium-ops-card">
          <div className="premium-card-title">
            <span>Flow promise</span>
            <h2>No click gets paid without a visit.</h2>
          </div>
          <div className="premium-workspace-metrics is-proof">
            <PremiumMetric label="Visitor action" value="Claim" detail="Intent before visit" />
            <PremiumMetric label="Staff action" value="Confirm" detail="Truth at counter" />
            <PremiumMetric label="Proof result" value="Receipt" detail="Inspectable later" />
          </div>
        </PremiumSurface>
      </section>

      <section className="premium-system-grid" style={{ marginTop: 'clamp(38px, 6vw, 72px)' }}>
        <PremiumSurface tone="light" className="premium-system-section">
          <div className="premium-card-title">
            <span>Route sequence</span>
            <h2>Each screen has one job.</h2>
          </div>
          <ol className="premium-timeline">
            {steps.map(([title, copy], index) => (
              <li key={title}>
                <span>{index + 1}</span>
                <div>
                  <strong>{title}</strong>
                  <p>{copy}</p>
                </div>
              </li>
            ))}
          </ol>
        </PremiumSurface>

        <PremiumSurface tone="raised" className="premium-system-section">
          <div className="premium-card-title">
            <span>Progressive proof</span>
            <h2>Explain enough, then let experts inspect.</h2>
          </div>
          <p className="premium-copy">
            Visitors should not need protocol literacy. Merchants and developers can expand the proof
            details when they need PDA, nullifier, settlement, or webhook context.
          </p>
          <PremiumDisclosure title="Technical proof objects" summary="For operators and developers">
            <ol className="premium-timeline">
              <li><span>1</span><div><strong>Nullifier</strong><p>Blocks duplicate claims against the same campaign.</p></div></li>
              <li><span>2</span><div><strong>Receipt PDA</strong><p>Stores the proof object for a confirmed visit.</p></div></li>
              <li><span>3</span><div><strong>Settlement</strong><p>Moves reward only after staff confirmation.</p></div></li>
            </ol>
          </PremiumDisclosure>
        </PremiumSurface>
      </section>
    </PremiumShell>
  );
}
