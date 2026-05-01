'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle, SealWarning } from '@phosphor-icons/react';
import {
  PremiumAsyncState,
  PremiumButton,
  PremiumMetric,
  PremiumNav,
  PremiumProofRow,
  PremiumShell,
  PremiumStatusBadge,
  PremiumSurface,
  PremiumTransactionPanel,
} from '@/components/premium/PremiumUi';
import { useAuth } from '@/lib/auth';
import { claimReferralLink, fetchReferralDetail, recordReferralOpen } from '@/lib/launch/client';
import type { ReferralDetail } from '@/lib/launch/types';

export default function OfferReferralPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { deviceId, sessionId, displayName } = useAuth();
  const token = params.token;
  const [detail, setDetail] = useState<ReferralDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!token) return;

      setLoading(true);
      setError(null);
      try {
        const next = await fetchReferralDetail(token, sessionId ?? undefined);
        if (cancelled) return;
        setDetail(next);
        setMessage(next.viewer.reason);
        void recordReferralOpen(token);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'This invite could not be loaded.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [sessionId, token]);

  const handleClaim = async () => {
    if (!token || !sessionId) {
      setMessage('Guest session is still preparing. Try again in a moment.');
      return;
    }

    setWorking(true);
    setMessage(null);
    try {
      const result = await claimReferralLink(token, {
        sessionId,
        displayName: displayName || 'Guest',
        deviceFingerprint: deviceId,
      });

      if (!result.ok) {
        setMessage(result.reason ?? 'This invite could not be claimed.');
        return;
      }

      router.push('/redeem');
    } finally {
      setWorking(false);
    }
  };

  const canClaim = Boolean(detail?.viewer.canClaim);

  return (
    <PremiumShell>
      <PremiumNav />
      <section className="premium-flow-grid">
        <div className="premium-hero-copy">
          <span className="premium-eyebrow">Offer claim</span>
          <h1 className="premium-h1">Claim once. Redeem after the visit.</h1>
          <p className="premium-lede">
            This page is the conversion moment. It gives the visitor one clear action while making
            the requirement honest: the reward is not real until the counter confirms the visit.
          </p>

          <div className="premium-actions">
            <button className="premium-button premium-button-primary" onClick={handleClaim} disabled={!canClaim || working || loading}>
              {working ? 'Claiming visit' : canClaim ? 'Claim this visit' : 'Claim unavailable'}
              <ArrowRight size={17} weight="bold" />
            </button>
            <PremiumButton href="/invite" variant="secondary">Back to invite</PremiumButton>
          </div>

          {loading ? (
            <PremiumAsyncState tone="loading" title="Loading invite" detail="Checking the token, claim window, and whether this device already has a live claim." />
          ) : error ? (
            <PremiumAsyncState tone="error" title="Invite unavailable" detail={error} />
          ) : !canClaim ? (
            <PremiumAsyncState tone="error" title="Invite cannot be claimed" detail={detail?.viewer.reason ?? 'This invite is expired, already claimed, or blocked by the device/session rules.'} />
          ) : (
            <div className="premium-metrics">
              <PremiumMetric label="Reward" value={detail?.offer.reward ?? 'Reward'} detail="Unlocked after staff confirmation." />
              <PremiumMetric label="Window" value={`${detail?.offer.redemptionWindowHours ?? 72}h`} detail="Expired claims cannot create receipts." />
              <PremiumMetric label="Confirmed" value={`${detail?.referral.redeemedCount ?? 0}`} detail="Visits already proven from this invite." />
            </div>
          )}

          <PremiumSurface tone="light" className="premium-system-section">
            <div className="premium-card-title">
              <span>Claim sequence</span>
              <h2>One CTA, three proof steps.</h2>
            </div>
            <ol className="premium-timeline">
              <li><span>1</span><div><strong>Claim once</strong><p>The app binds the claim to session and device nullifier.</p></div></li>
              <li><span>2</span><div><strong>Show counter code</strong><p>The redeem screen creates a short-lived code for the merchant terminal.</p></div></li>
              <li><span>3</span><div><strong>Receipt appears</strong><p>Staff confirmation produces receipt proof and settlement status.</p></div></li>
            </ol>
          </PremiumSurface>
        </div>

        <PremiumTransactionPanel eyebrow="Invite proof" title={detail?.offer.title ?? 'Checking reward'}>
          <PremiumProofRow label="Merchant" value={detail?.offer.merchantName ?? 'Loading'} meta={detail?.offer.district ?? 'Pilot district'} status={detail ? 'success' : 'warning'} />
          <PremiumProofRow label="Token" value={token ?? 'missing'} meta="Referral invite" status={token ? 'success' : 'danger'} />
          <PremiumProofRow label="Claimable" value={canClaim ? 'yes' : 'no'} meta={detail?.viewer.reason ?? 'Device and session checked'} status={canClaim ? 'success' : 'warning'} />
          <PremiumProofRow label="Referrer" value={detail?.referral.referrerDisplayName ?? 'Private referrer'} meta="Displayed only as provided by app session" status="muted" />
          <div className="premium-component-row">
            <PremiumStatusBadge tone={canClaim ? 'success' : 'warning'}>{canClaim ? 'Ready to claim' : 'Claim blocked'}</PremiumStatusBadge>
            {message ? <PremiumStatusBadge tone="warning">{message}</PremiumStatusBadge> : null}
          </div>
        </PremiumTransactionPanel>
      </section>

      <section className="premium-system-grid" style={{ marginTop: 'clamp(42px, 7vw, 76px)' }}>
        <PremiumSurface tone="raised" className="premium-system-section">
          <div className="premium-card-title">
            <span><CheckCircle size={15} weight="bold" /> Conversion rule</span>
            <h2>No vague rewards.</h2>
          </div>
          <p className="premium-copy">The visitor sees the reward, expiry, merchant, and proof requirement before tapping the primary action.</p>
        </PremiumSurface>
        <PremiumSurface tone="raised" className="premium-system-section">
          <div className="premium-card-title">
            <span><SealWarning size={15} weight="bold" /> Fraud rule</span>
            <h2>Replay is not hidden.</h2>
          </div>
          <p className="premium-copy">The claim path explicitly names the device/session nullifier so duplicate attempts feel designed against, not surprising.</p>
        </PremiumSurface>
      </section>
    </PremiumShell>
  );
}
