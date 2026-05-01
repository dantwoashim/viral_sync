'use client';

import { PremiumAsyncState, PremiumNav, PremiumShell } from '@/components/premium/PremiumUi';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PremiumShell>
      <PremiumNav />
      <section className="premium-hero">
        <div className="premium-hero-copy">
          <span className="premium-eyebrow">Route error</span>
          <h1 className="premium-h1">This screen needs a clean retry.</h1>
          <p className="premium-lede">
            The product should fail with a clear recovery path, not a silent dead end.
          </p>
          <PremiumAsyncState
            tone="error"
            title="Screen failed to load"
            detail={error.message || 'The route could not render. Retry the screen or open support if this repeats.'}
            action={<button className="premium-button premium-button-primary" onClick={reset}>Retry screen</button>}
          />
        </div>
      </section>
    </PremiumShell>
  );
}
