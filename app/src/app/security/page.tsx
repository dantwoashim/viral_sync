import {
  PremiumButton,
  PremiumDisclosure,
  PremiumMetric,
  PremiumNav,
  PremiumProofRow,
  PremiumShell,
  PremiumSurface,
  PremiumTransactionPanel,
} from '@/components/premium/PremiumUi';
import { getProductionReadiness } from '@/lib/launch/server';

export default function SecurityPage() {
  const readiness = getProductionReadiness();

  return (
    <PremiumShell>
      <PremiumNav />
      <section className="premium-hero">
        <div className="premium-hero-copy">
          <span className="premium-eyebrow">Trust and security</span>
          <h1 className="premium-h1">Make every reward explainable after the fact.</h1>
          <p className="premium-lede">
            Viral Sync&apos;s trust model is simple enough for operators and concrete enough for builders:
            bound budgets, device/session nullifiers, staff attestation, public receipt objects, and
            visible replay failures.
          </p>
          <div className="premium-actions">
            <PremiumButton href="/causal-graph">Inspect graph</PremiumButton>
            <PremiumButton href="/developer" variant="secondary">Open verifier docs</PremiumButton>
          </div>
        </div>

        <PremiumTransactionPanel eyebrow="Proof model" title="Controls customers can audit">
          <PremiumProofRow label="Budget" value="campaign vault / cap" meta="Merchant risk is bounded" status="success" />
          <PremiumProofRow label="Identity" value="privacy-safe commitments" meta="Private users are not exposed as raw PII" status="success" />
          <PremiumProofRow label="Replay" value="nullifier rejection" meta="Duplicate claims are visible failures" status="danger" />
          <PremiumProofRow label="Settlement" value="receipt before payout" meta="Reward movement has a public proof object" status="success" />
        </PremiumTransactionPanel>
      </section>

      <section className="premium-system-grid" style={{ marginTop: 'clamp(38px, 6vw, 72px)' }}>
        <PremiumSurface tone="light" className="premium-system-section">
          <div className="premium-card-title">
            <span>Merchant controls</span>
            <h2>Spend cannot drift quietly.</h2>
          </div>
          <div className="premium-state-stack">
            <div className="premium-state"><strong>Funded cap</strong><p>Reward exposure is modeled before the campaign opens.</p></div>
            <div className="premium-state"><strong>Staff gate</strong><p>Production confirmation requires a scoped session and enrolled staff device.</p></div>
            <div className="premium-state"><strong>Close path</strong><p>Unused reward budget must stay visible before reclaim.</p></div>
          </div>
        </PremiumSurface>

        <PremiumSurface tone="raised" className="premium-system-section">
          <div className="premium-card-title">
            <span>Progressive disclosure</span>
            <h2>Trust copy first, protocol detail second.</h2>
          </div>
          <PremiumDisclosure title="Technical controls" summary="Nullifier, PDA, vault, webhook">
            <ol className="premium-timeline">
              <li><span>1</span><div><strong>Nullifier</strong><p>Prevents the same claim from becoming multiple paid visits.</p></div></li>
              <li><span>2</span><div><strong>Receipt PDA</strong><p>Gives every confirmed visit a deterministic proof object.</p></div></li>
              <li><span>3</span><div><strong>Webhook signature</strong><p>Lets external systems reject tampered receipt events.</p></div></li>
              <li><span>4</span><div><strong>Pause switch</strong><p>Launch API mutations and on-chain campaign status can stop during an incident.</p></div></li>
            </ol>
          </PremiumDisclosure>
        </PremiumSurface>
      </section>

      <section className="premium-metrics" aria-label="Security summary">
        <PremiumMetric label="Replay defense" value="Designed in" detail="Not treated as an afterthought." />
        <PremiumMetric label="Privacy posture" value="Commitments" detail="No raw customer identity in public proof copy." />
        <PremiumMetric label="Production gate" value={readiness.releaseClassification} detail={readiness.gate.blocking.length > 0 ? `${readiness.gate.blocking.length} blocker(s) remain.` : 'Runtime gate is clear.'} />
      </section>
    </PremiumShell>
  );
}
