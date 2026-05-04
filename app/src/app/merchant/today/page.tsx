import Link from 'next/link';
import { CheckCircle, Receipt, ShieldCheck, Wallet } from '@phosphor-icons/react/dist/ssr';
import { PremiumNav, PremiumShell } from '@/components/premium/PremiumUi';
import { defaultProductLoopCampaign } from '@/lib/product-loop/productLoop';
import { gauntletLabel, getProofState } from '@/lib/proof/getProofState';

export default async function MerchantTodayPage() {
  const proof = getProofState();
  const campaign = defaultProductLoopCampaign();
  const remaining = campaign?.rewardPoolRemainingLabel ?? 'Pending';
  const settled = campaign?.settledCount ?? 0;
  const reward = campaign?.rewardLabel ?? proof.rewardAmountLabel;

  return (
    <PremiumShell className="merchant-today-page">
      <PremiumNav />

      <section className="merchant-today-hero">
        <div>
          <span className="eyebrow-pill">Merchant terminal</span>
          <h1>Today&apos;s verified visits.</h1>
          <p>
            A quiet operator view for the only work that matters: keep the terminal active,
            confirm real visits, and make sure every payout has a receipt.
          </p>
          <div className="hero-actions">
            <Link className="product-button primary" href="/merchant/scan">Open scanner</Link>
            <Link className="product-button secondary" href="/proof">View proof</Link>
          </div>
        </div>

        <div className="merchant-proof-card">
          <span>Proof status</span>
          <strong>{proof.statusLabel}</strong>
          <p>Receipt {proof.health === 'verified' ? 'is ready for counter operations.' : 'needs a fresh proof check before live use.'}</p>
        </div>
      </section>

      <section className="merchant-metrics-grid" aria-label="Merchant metrics">
        <article>
          <Wallet size={20} />
          <span>Reward pool remaining</span>
          <strong>{remaining}</strong>
        </article>
        <article>
          <Receipt size={20} />
          <span>Verified visits today</span>
          <strong>{settled}</strong>
        </article>
        <article>
          <CheckCircle size={20} />
          <span>Reward per visit</span>
          <strong>{reward}</strong>
        </article>
        <article>
          <ShieldCheck size={20} />
          <span>Fraud checks</span>
          <strong>{gauntletLabel(proof.gauntlet)}</strong>
        </article>
      </section>

      <section className="merchant-work-panel">
        <div>
          <span className="eyebrow-pill">Counter flow</span>
          <h2>Confirm the next visit in five seconds.</h2>
          <p>
            Staff only need the pass code. Technical proof stays tucked behind the receipt page,
            where judges and builders can inspect it without slowing down the counter.
          </p>
        </div>
        <Link className="product-button primary" href={campaign ? `/claim/${encodeURIComponent(campaign.slug)}` : '/merchant/scan'}>Issue next pass</Link>
      </section>
    </PremiumShell>
  );
}
