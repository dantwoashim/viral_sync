import { PremiumNav, PremiumShell, PremiumSurface } from '@/components/premium/PremiumUi';

export default function Loading() {
  return (
    <PremiumShell>
      <PremiumNav />
      <section className="premium-hero">
        <div className="premium-hero-copy">
          <span className="premium-eyebrow">Loading</span>
          <h1 className="premium-h1">Preparing the proof path.</h1>
          <p className="premium-lede">Checking the current route, ledger state, and the next safe action.</p>
        </div>
        <PremiumSurface tone="light" className="premium-system-section">
          <div className="premium-state-stack" aria-hidden="true">
            <div className="premium-state"><strong>Loading route</strong><p>Merchant, visitor, or developer context.</p></div>
            <div className="premium-state"><strong>Loading proof</strong><p>Receipt, campaign, or queue state.</p></div>
            <div className="premium-state"><strong>Loading action</strong><p>Next step stays visible when ready.</p></div>
          </div>
        </PremiumSurface>
      </section>
    </PremiumShell>
  );
}
