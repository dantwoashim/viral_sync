import {
  PremiumButton,
  PremiumMetric,
  PremiumNav,
  PremiumProofRow,
  PremiumShell,
  PremiumSurface,
  PremiumTransactionPanel,
} from '@/components/premium/PremiumUi';

export default function ConsumerHomePage() {
  return (
    <PremiumShell>
      <PremiumNav />
      <section className="premium-hero">
        <div className="premium-hero-copy">
          <span className="premium-eyebrow">Causal receipt protocol</span>
          <h1 className="premium-h1">Only pay referral rewards after real visits.</h1>
          <p className="premium-lede">
            Viral Sync helps local merchants fund capped referral rewards, confirm visits at the
            counter, and keep every payout tied to an inspectable receipt.
          </p>
          <div className="premium-actions">
            <PremiumButton href="/demo">Run the proof</PremiumButton>
            <PremiumButton href="/invite" variant="secondary">Open visitor invite</PremiumButton>
            <PremiumButton href="/security" variant="quiet">Review trust model</PremiumButton>
          </div>
          <div className="premium-metrics" aria-label="Protocol proof points">
            <PremiumMetric label="Receipt primitive" value="PDA" detail="Every visit has a deterministic proof address." />
            <PremiumMetric label="Replay defense" value="Nullifier" detail="The same claim cannot settle twice." />
            <PremiumMetric label="Custody model" value="SPL vault" detail="Rewards move only through the program path." />
          </div>
        </div>

        <PremiumTransactionPanel eyebrow="Live flow" title="Verified visit, not vanity traffic">
          <PremiumProofRow label="Merchant" value="register_merchant" meta="Creates authority-bound merchant state" status="success" />
          <PremiumProofRow label="Bounty" value="create_growth_campaign" meta="Funds campaign reward vault" status="success" />
          <PremiumProofRow label="Claim" value="record_causal_receipt" meta="Stores nullifier and causal route" status="success" />
          <PremiumProofRow label="Settlement" value="settle_receipt_reward" meta="Transfers reward to claimant" status="success" />
          <PremiumProofRow label="Replay" value="duplicate rejected" meta="Fraud attempt is provable in the demo" status="danger" />
        </PremiumTransactionPanel>
      </section>

      <section className="premium-system-grid" style={{ marginTop: 'clamp(52px, 8vw, 96px)' }}>
        <PremiumSurface tone="light" className="premium-system-section">
          <div className="premium-card-title">
            <span>For merchants</span>
            <h2>Budget goes to outcomes.</h2>
          </div>
          <p className="premium-copy">
            The interface leads with funded bounty, verified visit, settled reward, and reclaimed
            balance. No campaign vanity metrics get more hierarchy than proof.
          </p>
        </PremiumSurface>
        <PremiumSurface tone="raised" className="premium-system-section">
          <div className="premium-card-title">
            <span>For builders</span>
            <h2>Composable receipts.</h2>
          </div>
          <p className="premium-copy">
            A second app can read the graph, verify a receipt PDA, and prove why a reward was paid
            without trusting the Viral Sync frontend.
          </p>
        </PremiumSurface>
      </section>
    </PremiumShell>
  );
}
