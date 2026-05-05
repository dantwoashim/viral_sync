import { notFound } from 'next/navigation';
import { PremiumButton, PremiumMetric, PremiumNav, PremiumProofRow, PremiumShell, PremiumSurface } from '@/components/premium/PremiumUi';
import { findProductLoopCampaign } from '@/lib/product-loop/productLoop';
import { shortHash } from '@/lib/proof/links';

export default async function CampaignPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const campaign = findProductLoopCampaign(decodeURIComponent(slug));
  if (!campaign) notFound();
  const proofTone = campaign.proofBacked ? 'success' : 'muted';

  return (
    <PremiumShell>
      <PremiumNav />
      <section className="premium-proof-console">
        <div className="premium-proof-header">
          <div>
            <span className="premium-eyebrow">Campaign link</span>
            <h1 className="premium-proof-title">{campaign.title}</h1>
            <p className="premium-lede">
              A public conversion bounty link. Referrers, creators, or agents route demand to the merchant;
              settlement only happens after the POC-1 receipt path verifies.
            </p>
            <div className="premium-actions">
              <PremiumButton href={campaign.claimPath}>Claim visit pass</PremiumButton>
              <PremiumButton href="/proof" variant="secondary">View proof</PremiumButton>
              <a className="premium-button premium-button-quiet" href={campaign.actionApiPath} target="_blank" rel="noreferrer">View action JSON</a>
            </div>
          </div>
          <PremiumSurface tone={campaign.proofBacked ? 'proof' : 'raised'} className="premium-compact-proof-card">
            <div className="premium-card-title">
              <span>{campaign.merchantAlias}</span>
              <h2>{campaign.proofBacked ? 'Proof-backed live artifact' : 'Vision-only lane'}</h2>
              <p>Proof level: {campaign.proofLevel} / {campaign.status}</p>
            </div>
          </PremiumSurface>
        </div>

        <section className="premium-metrics compact">
          <PremiumMetric label="Reward" value={campaign.rewardLabel} detail="Total payout after verified conversion" />
          <PremiumMetric label="Customer" value={campaign.visitorRewardLabel} detail="Visitor payout" />
          <PremiumMetric label="Router" value={campaign.routerRewardLabel} detail="Creator or agent payout" />
        </section>

        <section className="premium-system-grid">
          <PremiumSurface tone="light" className="premium-system-section">
            <div className="premium-card-title">
              <span>Claim pass preview</span>
              <h2>Send a customer to the counter.</h2>
              <p>The claim page creates a server-issued pass code; the terminal verifies that same code against the proof-backed campaign.</p>
            </div>
            <div className="premium-proof-stack">
              <PremiumProofRow label="Campaign URL" value={campaign.publicPath} meta="Shareable link" status={proofTone} />
              <PremiumProofRow label="Action API" value={campaign.actionApiPath} meta="Agent-readable metadata and pass creation" status={proofTone} />
              <PremiumProofRow label="Receipt PDA" value={shortHash(campaign.receiptPda)} meta="Public proof object" status={proofTone} />
            </div>
          </PremiumSurface>

          <PremiumSurface tone="raised" className="premium-system-section">
            <div className="premium-card-title">
              <span>Verification gates</span>
              <h2>What must be true before payout.</h2>
            </div>
            <div className="premium-proof-stack">
              <PremiumProofRow label="Terminal device" value={shortHash(campaign.terminalDevicePda)} meta="Enrolled counter signer" status={proofTone} />
              <PremiumProofRow label="Claim pass" value={shortHash(campaign.claimPassPda)} meta="Issued visit pass PDA" status={proofTone} />
              <PremiumProofRow label="Protocol fee" value={campaign.protocolFeeLabel} meta="Treasury take from settlement" status={proofTone} />
            </div>
          </PremiumSurface>
        </section>
      </section>
    </PremiumShell>
  );
}
