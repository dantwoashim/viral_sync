import Link from 'next/link';
import { CheckCircle, Receipt, ShieldCheck, Wallet } from '@phosphor-icons/react/dist/ssr';
import { PremiumNav, PremiumShell } from '@/components/premium/PremiumUi';
import { defaultProductLoopCampaign } from '@/lib/product-loop/productLoop';
import { gauntletLabel, getProofState } from '@/lib/proof/getProofState';
import { getWorldClassReadiness } from '@/lib/readiness/phases6to10';
import { getYearOneAudit } from '@/lib/readiness/yearOneAudit';
import { getMerchantValidationState } from '@/lib/traction/merchantValidation';

export default async function MerchantTodayPage() {
  const proof = getProofState();
  const campaign = defaultProductLoopCampaign();
  const remaining = campaign?.rewardPoolRemainingLabel ?? 'Pending';
  const settled = campaign?.settledCount ?? 0;
  const reward = campaign?.rewardLabel ?? proof.rewardAmountLabel;
  const validation = getMerchantValidationState(proof);
  const readiness = getWorldClassReadiness(proof, validation);
  const yearOne = getYearOneAudit(proof, validation, readiness);

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

      <section className="merchant-work-panel readiness-operator-panel">
        <div>
          <span className="eyebrow-pill">phases 6-10 gate</span>
          <h2>Operator readiness is {readiness.score}/100.</h2>
          <p>
            The counter can run the proof-backed demo, but the business story stays disciplined:
            protocol proof is claimable, live traction waits for merchant evidence.
          </p>
        </div>
        <Link className="product-button secondary" href="/proof#readiness">Review readiness</Link>
      </section>

      <section className="merchant-work-panel readiness-operator-panel">
        <div>
          <span className="eyebrow-pill">phases 1-12 audit</span>
          <h2>{yearOne.summary.completephases}/12 phases fully complete.</h2>
          <p>
            Code-executable work is complete at submission quality. Personal evidence gates remain
            for live traction, mainnet claims, and final founder delivery.
          </p>
        </div>
        <Link className="product-button secondary" href="/proof#year-one">Open final audit</Link>
      </section>
    </PremiumShell>
  );
}
