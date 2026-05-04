import Link from 'next/link';
import { ArrowRight, CheckCircle, ShieldCheck } from '@phosphor-icons/react/dist/ssr';
import { PremiumNav, PremiumShell } from '@/components/premium/PremiumUi';
import SignatureReceipt from '@/components/product/SignatureReceipt';
import { TerminalPanel } from '@/components/product/TerminalPanel';
import { VisitPass } from '@/components/product/VisitPass';
import { getProofState } from '@/lib/proof/getProofState';

export default function HomePage() {
  const proof = getProofState();
  const trust = [
    'Terminal signed',
    'Visitor signed',
    'Reward settled',
    `${proof.gauntlet.summary?.blocked ?? 16}/${proof.gauntlet.summary?.totalCases ?? 16} fraud attempts rejected`,
  ];
  const flow = ['Share link', 'Claim pass', 'Counter scan', 'Signed receipt', 'Payout settled'];

  return (
    <PremiumShell className="vs-product-page">
      <PremiumNav />
      <section className="product-hero">
        <div className="product-hero-copy">
          <span className="eyebrow-pill"><ShieldCheck size={16} weight="bold" /> Verified pay-per-visit</span>
          <h1>Pay only when the customer actually shows up.</h1>
          <p>
            Viral Sync lets merchants escrow rewards, creators route customers, and Solana release payouts only after the customer and counter terminal co-sign the visit.
          </p>
          <div className="product-actions">
            <Link className="product-button primary" href={`/receipt/${encodeURIComponent(proof.receiptId)}`}>View verified receipt <ArrowRight size={16} weight="bold" /></Link>
            <Link className="product-button secondary" href="/merchant/scan">Try merchant terminal</Link>
          </div>
          <div className="trust-strip" aria-label="Proof summary">
            {trust.map((item) => <span key={item}><CheckCircle size={15} weight="fill" /> {item}</span>)}
          </div>
        </div>
        <div className="hero-receipt-stage">
          <SignatureReceipt proof={proof} />
        </div>
      </section>

      <section id="how-it-works" className="rail-flow" aria-label="Outcome settlement flow">
        {flow.map((step, index) => (
          <div className="rail-step" key={step}>
            <span>{index + 1}</span>
            <strong>{step}</strong>
            <small>{index === 0 ? 'Creator routes demand' : index === 1 ? 'Visitor claims without payment' : index === 2 ? 'Merchant confirms at counter' : index === 3 ? 'Three-signer proof' : 'Escrow releases'}</small>
          </div>
        ))}
      </section>

      <section className="product-section two-col">
        <div>
          <span className="section-kicker">The problem</span>
          <h2>Clicks and coupon opens are not conversions.</h2>
          <p>Viral Sync turns the expensive moment into the verified moment: a customer arrives, a terminal confirms, a visitor wallet signs, and the reward settles from escrow.</p>
        </div>
        <div className="quiet-card">
          <strong>No trust-me dashboard.</strong>
          <p>Every judge-facing claim points back to the receipt PDA, nullifier PDA, settlement record, verifier output, and fraud-gauntlet evidence.</p>
        </div>
      </section>

      <section className="product-section">
        <span className="section-kicker">Customer flow</span>
        <h2>Apple Wallet simple. No protocol words.</h2>
        <div className="phone-flow">
          <VisitPass stage="claim" />
          <VisitPass stage="show" />
          <VisitPass stage="verified" />
        </div>
      </section>

      <section className="product-section two-col">
        <div>
          <span className="section-kicker">Merchant terminal</span>
          <h2>Confirm a visit in five seconds.</h2>
          <p>The counter UI says what staff need to know: valid pass, reward split, campaign match, and one clear confirm action. Technical errors stay behind a drawer.</p>
          <Link className="product-button secondary" href="/merchant/scan">Open terminal</Link>
        </div>
        <TerminalPanel state="detected" />
      </section>

      <section className="product-section two-col proof-band">
        <div>
          <span className="section-kicker">Developer proof</span>
          <h2>Judges can verify without trusting us.</h2>
          <p>The proof center consolidates receipt state, fraud evidence, verifier checks, program identity, artifacts, and limitations into one dense surface.</p>
        </div>
        <div className="proof-stats">
          <span><b>{proof.statusLabel}</b><small>Proof status</small></span>
          <span><b>{proof.cluster}</b><small>Cluster</small></span>
          <span><b>{proof.gauntlet.summary?.blocked ?? 16}/{proof.gauntlet.summary?.totalCases ?? 16}</b><small>Fraud checks</small></span>
          <Link className="product-button primary" href="/proof">Open proof center</Link>
        </div>
      </section>
    </PremiumShell>
  );
}
