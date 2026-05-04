import Link from 'next/link';
import { ArrowRight, Copy, Lightbulb } from '@phosphor-icons/react/dist/ssr';
import { PremiumNav, PremiumShell } from '@/components/premium/PremiumUi';
import { VisitPass } from '@/components/product/VisitPass';
import { getProofState } from '@/lib/proof/getProofState';

export default async function ClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const proof = getProofState();

  return (
    <PremiumShell className="claim-page">
      <PremiumNav />
      <section className="claim-hero">
        <div className="claim-copy">
          <span className="eyebrow-pill">Visit reward</span>
          <div className="demo-banner">Demo claim flow. The public receipt page shows the generated devnet proof.</div>
          <h1>You were invited to Thamel Brew.</h1>
          <p>Visit today and earn Rs. 15. Your friend earns Rs. 75 after your visit is verified at the counter.</p>
          <div className="product-actions">
            <Link className="product-button primary" href="#show-pass">Claim visit pass <ArrowRight size={16} weight="bold" /></Link>
            <Link className="product-button secondary" href={`/receipt/${encodeURIComponent(proof.receiptId)}`}>View sample receipt</Link>
          </div>
        </div>
        <VisitPass stage="claim" />
      </section>

      <section id="show-pass" className="claim-steps">
        <div className="claim-step-card">
          <span>1</span>
          <h2>Create your visit pass.</h2>
          <p>This links the reward to your wallet. No payment required.</p>
          <VisitPass stage="claim" />
        </div>
        <div className="claim-step-card">
          <span>2</span>
          <h2>Show this pass at the counter.</h2>
          <p>The terminal will confirm your visit.</p>
          <VisitPass stage="show" />
          <div className="pass-actions">
            <button className="product-button secondary" type="button"><Lightbulb size={16} /> Brightness boost</button>
            <button className="product-button secondary" type="button"><Copy size={16} /> Copy code</button>
          </div>
        </div>
        <div className="claim-step-card">
          <span>3</span>
          <h2>Visit verified.</h2>
          <p>Your reward was settled on Solana.</p>
          <VisitPass stage="verified" />
          <Link className="product-button primary" href={`/receipt/${encodeURIComponent(proof.receiptId)}`}>Open receipt</Link>
        </div>
      </section>
      <p className="claim-token-note">Invite token: {token}</p>
    </PremiumShell>
  );
}
