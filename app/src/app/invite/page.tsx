import {
  PremiumButton,
  PremiumMetric,
  PremiumNav,
  PremiumProofRow,
  PremiumShell,
  PremiumStatusBadge,
  PremiumSurface,
  PremiumTransactionPanel,
} from '@/components/premium/PremiumUi';

export default function InvitePage() {
  return (
    <PremiumShell>
      <PremiumNav />
      <section className="premium-invite-grid">
        <div className="premium-hero-copy">
          <span className="premium-eyebrow">Visitor invite</span>
          <h1 className="premium-h1">Your counter-attested invite.</h1>
          <p className="premium-lede">
            A verified invite should not feel like a coupon page. It should feel like a secure claim:
            clear reward, clear place, clear next action, and immediate confidence that replay fraud
            will fail.
          </p>
          <div className="premium-actions">
            <PremiumButton href="/offer/demo-token">Claim demo invite</PremiumButton>
            <PremiumButton href="/demo" variant="secondary">See settlement path</PremiumButton>
          </div>
          <div className="premium-metrics">
            <PremiumMetric label="Reward" value="250 VS" detail="Settles only after staff confirms the visit." />
            <PremiumMetric label="Window" value="24h" detail="Expired claims cannot create receipts." />
            <PremiumMetric label="Fraud check" value="On-chain" detail="Duplicate nullifier rejection is visible." />
          </div>
        </div>

        <PremiumSurface tone="light" className="premium-invite-preview">
          <div className="premium-card-title">
            <span>Invite preview</span>
            <h2>Himalayan Java Thamel</h2>
          </div>
          <p className="premium-copy">
            Bring this invite to the counter. Staff confirmation records a Causal Receipt and unlocks
            settlement from the funded campaign vault.
          </p>
          <div className="premium-divider" />
          <PremiumProofRow label="Claim ID" value="9F4A...C21B" meta="Shown before visit" status="muted" />
          <PremiumProofRow label="Nullifier" value="pending wallet signature" meta="Prevents replay" status="warning" />
          <PremiumProofRow label="Receipt" value="created after staff attest" meta="Permanent proof object" status="default" />
          <div className="premium-component-row">
            <PremiumStatusBadge tone="success">Merchant funded</PremiumStatusBadge>
            <PremiumStatusBadge tone="warning">Visit required</PremiumStatusBadge>
          </div>
        </PremiumSurface>
      </section>

      <section className="premium-demo-grid" style={{ marginTop: 'clamp(48px, 7vw, 84px)' }}>
        <PremiumTransactionPanel eyebrow="Trust copy" title="What the visitor can verify">
          <PremiumProofRow label="Place" value="merchant PDA" meta="The invite resolves to one merchant" status="success" />
          <PremiumProofRow label="Reward" value="escrow-funded" meta="No promise without vault backing" status="success" />
          <PremiumProofRow label="Replay" value="blocked" meta="A reused claim is rejected" status="danger" />
        </PremiumTransactionPanel>
        <PremiumSurface tone="raised" className="premium-system-section">
          <div className="premium-card-title">
            <span>Mobile direction</span>
            <h2>One hand, one task.</h2>
          </div>
          <p className="premium-copy">
            The primary button owns the screen on small devices, proof rows wrap instead of clipping,
            and mono data never forces horizontal scroll.
          </p>
        </PremiumSurface>
      </section>
    </PremiumShell>
  );
}
