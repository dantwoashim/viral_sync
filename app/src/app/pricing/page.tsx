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

const pricingRules = [
  ['Pilot setup', 'Free', 'Use the workflow with a capped pilot merchant before rollout.'],
  ['Referral reward', 'Merchant-funded', 'Rewards are funded by the merchant and settle only after visit proof.'],
  ['Platform fee', 'After receipt', 'No platform fee is earned before a confirmed receipt exists.'],
] as const;

export default function PricingPage() {
  return (
    <PremiumShell>
      <PremiumNav />
      <section className="premium-hero">
        <div className="premium-hero-copy">
          <span className="premium-eyebrow">Pricing</span>
          <h1 className="premium-h1">Pay for verified growth, not empty traffic.</h1>
          <p className="premium-lede">
            Pricing follows the product promise: a merchant funds a capped reward, staff confirms
            the visit, the receipt is created, and fees only make sense after proof exists.
          </p>
          <div className="premium-actions">
            <PremiumButton href="/merchant/campaigns">Model a campaign</PremiumButton>
            <PremiumButton href="/security" variant="secondary">Review trust model</PremiumButton>
          </div>
        </div>

        <PremiumTransactionPanel eyebrow="Commercial policy" title="Fees wait for receipt truth">
          <PremiumProofRow label="Budget" value="merchant funded cap" meta="Spend is bounded before launch" status="success" />
          <PremiumProofRow label="Trigger" value="staff-confirmed visit" meta="No click-only payout" status="success" />
          <PremiumProofRow label="Fee timing" value="after confirmed receipt" meta="No fee before merchant truth" status="success" />
          <PremiumProofRow label="Reclaim" value="close unused bounty" meta="Unspent rewards stay visible" status="muted" />
        </PremiumTransactionPanel>
      </section>

      <section className="premium-metrics" aria-label="Pricing summary">
        <PremiumMetric label="Pilot minimum" value="0" detail="Start with a capped local test." />
        <PremiumMetric label="Merchant risk" value="Capped" detail="Reward liability is modeled before launch." />
        <PremiumMetric label="Fee posture" value="Receipt-first" detail="No fee before proof." />
      </section>

      <section className="premium-system-grid" style={{ marginTop: 'clamp(38px, 6vw, 72px)' }}>
        {pricingRules.map(([title, value, copy]) => (
          <PremiumSurface key={title} tone="light" className="premium-system-section">
            <div className="premium-card-title">
              <span>{title}</span>
              <h2>{value}</h2>
            </div>
            <p className="premium-copy">{copy}</p>
          </PremiumSurface>
        ))}
        <PremiumSurface tone="raised" className="premium-system-section">
          <div className="premium-card-title">
            <span>Buyer detail</span>
            <h2>What finance can verify.</h2>
          </div>
          <PremiumDisclosure title="Billing evidence" summary="Receipts, campaign cap, settlement state">
            <p className="premium-copy">
              A buyer can reconcile every charge to a campaign, a receipt, a confirmation state, and
              a settlement status instead of accepting an opaque attribution report.
            </p>
          </PremiumDisclosure>
        </PremiumSurface>
      </section>
    </PremiumShell>
  );
}
