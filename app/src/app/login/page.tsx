'use client';

import Link from 'next/link';
import { ArrowRight, ChartBar, House, Storefront } from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { displayName, login } = useAuth();

  return (
    <div className="login-stage">
      <div className="login-grid">
        <section className="paper-sheet login-sheet">
          <div className="eyebrow">Viral Sync Nepal</div>
          <h1 className="login-title">One app. Two modes. Zero-store launch.</h1>
          <p className="login-copy">
            Consumer mode is the public entry. Merchant mode is the growth operating surface. Both live inside the same PWA so launch can happen without Play Store dependency.
          </p>
          <div className="cta-row" style={{ marginTop: 24 }}>
            <button className="primary-button" data-testid="login-name-passbook" onClick={login}>
              Name this passbook
            </button>
          </div>
          <div className="sheet-copy" style={{ marginTop: 12 }}>
            Current passbook: {displayName || 'Guest'}
          </div>
        </section>

        <section className="paper-sheet login-sheet">
          <div className="field-stack">
            <Link href="/" className="secondary-button" data-testid="login-enter-consumer" style={{ justifyContent: 'space-between' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                <House size={20} />
                Enter consumer mode
              </span>
              <ArrowRight size={18} />
            </Link>
            <Link href="/merchant/today" className="secondary-button" data-testid="login-enter-merchant" style={{ justifyContent: 'space-between' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                <ChartBar size={20} />
                Enter merchant mode
              </span>
              <ArrowRight size={18} />
            </Link>
            <div className="ink-sheet sheet-pad">
              <div className="eyebrow">
                <Storefront size={18} />
                Launch doctrine
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 650, letterSpacing: '-0.04em', marginTop: 10 }}>
                Merchant-funded rewards, QR-first confirmation, and no public token in the Nepal launch path.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
