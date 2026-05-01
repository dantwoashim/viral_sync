import {
  PremiumButton,
  PremiumMetric,
  PremiumNav,
  PremiumProofRow,
  PremiumShell,
  PremiumSurface,
  PremiumTransactionPanel,
} from '@/components/premium/PremiumUi';

export default function SupportPage() {
  return (
    <PremiumShell>
      <PremiumNav />
      <section className="premium-hero">
        <div className="premium-hero-copy">
          <span className="premium-eyebrow">Support</span>
          <h1 className="premium-h1">Resolve counter issues without losing the proof trail.</h1>
          <p className="premium-lede">
            Support should not mean “try again later.” A merchant needs a clear path for expired
            codes, camera denial, missing receipts, failed relayer jobs, and duplicate-claim attempts.
          </p>
          <div className="premium-actions">
            <PremiumButton href="/merchant/scan">Open staff scan</PremiumButton>
            <PremiumButton href="/admin/relayer" variant="secondary">Review relayer state</PremiumButton>
          </div>
        </div>

        <PremiumTransactionPanel eyebrow="Support queue" title="Failure states are first-class">
          <PremiumProofRow label="Camera denied" value="manual code fallback" meta="Staff can still confirm" status="success" />
          <PremiumProofRow label="Expired code" value="generate fresh code" meta="Visitor gets a recoverable path" status="warning" />
          <PremiumProofRow label="Duplicate claim" value="replay blocked" meta="Fraud attempt is visible" status="danger" />
          <PremiumProofRow label="Relayer failed" value="operator queue" meta="Retry state remains inspectable" status="warning" />
        </PremiumTransactionPanel>
      </section>

      <section className="premium-system-grid" style={{ marginTop: 'clamp(38px, 6vw, 72px)' }}>
        <PremiumSurface tone="light" className="premium-system-section">
          <div className="premium-card-title">
            <span>Merchant desk</span>
            <h2>Fast answers at the counter.</h2>
          </div>
          <div className="premium-state-stack">
            <div className="premium-state"><strong>Code does not scan</strong><p>Use manual entry. The form normalizes six-character codes before confirmation.</p></div>
            <div className="premium-state"><strong>Code is expired</strong><p>Ask the visitor to generate a fresh counter code from the redeem screen.</p></div>
            <div className="premium-state"><strong>Receipt missing</strong><p>Open the ledger or relayer queue; failed receipt jobs stay visible.</p></div>
          </div>
        </PremiumSurface>

        <PremiumSurface tone="raised" className="premium-system-section">
          <div className="premium-card-title">
            <span>Operator escalation</span>
            <h2>Every support answer points to evidence.</h2>
          </div>
          <p className="premium-copy">
            Support should attach a claim token, redeem code, receipt id, transaction signature, or
            relayer failure reason. Screenshots alone are not trusted evidence.
          </p>
        </PremiumSurface>
      </section>

      <section className="premium-metrics" aria-label="Support readiness">
        <PremiumMetric label="Manual fallback" value="Available" detail="Camera permission is not a blocker." />
        <PremiumMetric label="Expired path" value="Recoverable" detail="Fresh codes can be created from active claims." />
        <PremiumMetric label="Escalation" value="Evidence-led" detail="Support starts from receipt or queue state." />
      </section>
    </PremiumShell>
  );
}
