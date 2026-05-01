'use client';

import Link from 'next/link';
import {
  PremiumAsyncState,
  PremiumMetric,
  PremiumNav,
  PremiumShell,
  PremiumSurface,
} from '@/components/premium/PremiumUi';
import { useAuth } from '@/lib/auth';
import { useConsumerSummary } from '@/lib/launch/hooks';

export default function ProfilePage() {
  const { displayName, login, logout, sessionId } = useAuth();
  const { data, loading, error, refresh } = useConsumerSummary(sessionId);
  const name = displayName || 'Guest';
  const hasInvite = Boolean(data?.referral.token);

  return (
    <PremiumShell>
      <PremiumNav />
      <section className="premium-hero">
        <div className="premium-hero-copy">
          <span className="premium-eyebrow">Visitor profile</span>
          <h1 className="premium-h1">Control identity, invites, and privacy.</h1>
          <p className="premium-lede">
            A profile page should help a visitor understand who they are in the pilot, whether
            they have a live referral link, and how to reset or switch contexts without confusion.
          </p>
          <div className="premium-actions">
            <button className="premium-button premium-button-primary" onClick={login}>Name this passbook</button>
            <Link className="premium-button premium-button-secondary" href="/merchant/today">Switch to merchant</Link>
          </div>
        </div>

        <PremiumSurface tone="proof" className="premium-ops-card">
          <div className="premium-card-title">
            <span>Current identity</span>
            <h2>{name}</h2>
          </div>
          <div className="premium-workspace-metrics is-proof">
            <PremiumMetric label="Referral link" value={hasInvite ? 'Active' : 'Not created'} detail="Visitor-owned sharing state" />
            <PremiumMetric label="Redemptions" value={String(data?.progress.current ?? 0)} detail="Counter-confirmed" />
            <PremiumMetric label="District" value={data?.offer.district ?? 'Pilot'} detail="Current offer context" />
          </div>
        </PremiumSurface>
      </section>

      <section className="premium-system-grid" style={{ marginTop: 'clamp(38px, 6vw, 72px)' }}>
        <PremiumSurface tone="light" className="premium-system-section">
          <div className="premium-card-title">
            <span>Account actions</span>
            <h2>Keep the pilot state understandable.</h2>
          </div>
          <div className="premium-state-stack">
            <div className="premium-state">
              <strong>{hasInvite ? 'Referral link is active' : 'Create a referral link'}</strong>
              <p>{hasInvite ? 'Visitors can share the current offer and track confirmed visits.' : 'No link exists yet; create one before expecting ledger activity.'}</p>
              <div className="premium-actions">
                <Link className="premium-button premium-button-primary" href="/invite">{hasInvite ? 'Open invite' : 'Create invite'}</Link>
              </div>
            </div>
            <div className="premium-state">
              <strong>Reset guest session</strong>
              <p>Use this only when testing. A production reset should warn about active claims before clearing local identity.</p>
              <div className="premium-actions">
                <button className="premium-button premium-button-secondary" onClick={logout}>Reset session</button>
              </div>
            </div>
          </div>
        </PremiumSurface>

        <PremiumSurface tone="raised" className="premium-system-section">
          <div className="premium-card-title">
            <span>Status</span>
            <h2>{loading ? 'Loading pilot state' : error ? 'Profile state needs attention' : 'Profile state is ready'}</h2>
          </div>
          {error ? (
            <PremiumAsyncState
              tone="error"
              title="Profile failed to load"
              detail={error}
              action={<button className="premium-button premium-button-secondary" onClick={() => void refresh()}>Retry</button>}
            />
          ) : (
            <PremiumAsyncState
              tone={loading ? 'loading' : 'success'}
              title={loading ? 'Loading profile' : 'Pilot context loaded'}
              detail={loading ? 'Checking identity, invite, and redemption state.' : `${data?.offer.merchantName ?? 'Merchant'} context is available.`}
              action={<button className="premium-button premium-button-secondary" onClick={() => void refresh()}>Refresh state</button>}
            />
          )}
          <div className="premium-actions">
            <Link className="premium-button premium-button-quiet" href="/routes">Read flow guide</Link>
            <Link className="premium-button premium-button-quiet" href="/support">Get support</Link>
          </div>
        </PremiumSurface>
      </section>
    </PremiumShell>
  );
}
