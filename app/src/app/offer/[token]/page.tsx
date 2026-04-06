'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowRight,
  MapPin,
  SealCheck,
  Storefront,
  Ticket,
  Timer,
  UsersThree,
} from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth';
import SignalRibbon from '@/components/launch/SignalRibbon';
import { claimReferralLink, fetchReferralDetail, recordReferralOpen } from '@/lib/launch/client';
import type { ReferralDetail } from '@/lib/launch/types';

export default function OfferReferralPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { deviceId, sessionId } = useAuth();
  const token = params.token;
  const [detail, setDetail] = useState<ReferralDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!token) {
        return;
      }

      setLoading(true);
      try {
        const next = await fetchReferralDetail(token);
        if (cancelled) {
          return;
        }
        setDetail(next);
        setMessage(next.viewer.reason);
        void recordReferralOpen(token);
      } catch (caught) {
        if (!cancelled) {
          setMessage(caught instanceof Error ? caught.message : 'This referral could not be loaded.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [sessionId, token]);

  const handleClaim = async () => {
    if (!token || !sessionId) {
      return;
    }

    const result = await claimReferralLink(token, {
      deviceFingerprint: deviceId,
    });

    if (!result.ok) {
      setMessage(result.reason ?? 'This referral could not be claimed.');
      return;
    }

    router.push('/redeem');
  };

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Shared offer</div>
            <h1 className="surface-title">Claim the offer, then finish the truth step at the counter.</h1>
            <p className="surface-subtitle">
              The link gets you into the passbook fast. The merchant confirmation step is what makes the reward real.
            </p>
          </div>
        </div>

        <SignalRibbon
          items={[
            `${detail?.offer.merchantName ?? 'Merchant'} live offer`,
            `${detail?.offer.district ?? 'Pilot district'} pilot`,
            `${detail?.offer.referralGoal ?? 3} confirmed visits unlock the table reward`,
            `${detail?.offer.redemptionWindowHours ?? 72} hour redemption window`,
          ]}
        />

        <div className="poster-grid poster-hero" style={{ marginTop: 18 }}>
          <section className="ticket-sheet sheet-pad poster-ticket offer-stage">
            <div className="ticket-head">
              <div>
                <div className="eyebrow">Invite from {detail?.referral.referrerDisplayName ?? 'a friend'}</div>
                <div className="ticket-title">{detail?.offer.title ?? 'Loading offer...'}</div>
              </div>
              <Ticket size={34} weight="duotone" />
            </div>
            <p className="ticket-note" style={{ marginTop: 16 }}>
              {detail?.offer.merchantName ?? 'Merchant'} - {detail?.offer.reward ?? 'Reward loading'}
            </p>

            <div className="offer-facts">
              <div className="offer-fact">
                <MapPin size={18} />
                <div>
                  <strong>District</strong>
                  <span>{detail?.offer.district ?? 'Pilot district'}</span>
                </div>
              </div>
              <div className="offer-fact">
                <UsersThree size={18} />
                <div>
                  <strong>Unlock line</strong>
                  <span>{detail?.offer.referralGoal ?? 3} confirmed visits for the shared reward</span>
                </div>
              </div>
              <div className="offer-fact">
                <Timer size={18} />
                <div>
                  <strong>Window</strong>
                  <span>{detail?.offer.redemptionWindowHours ?? 72} hours after claim</span>
                </div>
              </div>
              <div className="offer-fact">
                <Storefront size={18} />
                <div>
                  <strong>Truth check</strong>
                  <span>Staff confirmation at the counter makes the reward real</span>
                </div>
              </div>
            </div>

            <div className="offer-sequence">
              <div className="offer-sequence-step">
                <span>01</span>
                <div>
                  <strong>Open the ticket</strong>
                  <p>The link drops you into the same passbook system your friend is building.</p>
                </div>
              </div>
              <div className="offer-sequence-step">
                <span>02</span>
                <div>
                  <strong>Claim your visit</strong>
                  <p>A live visit record is created only once for your device and session.</p>
                </div>
              </div>
              <div className="offer-sequence-step">
                <span>03</span>
                <div>
                  <strong>Finish at the counter</strong>
                  <p>Merchant mode confirms the code so the chain cannot be gamed from home.</p>
                </div>
              </div>
            </div>

            <div className="offer-footer-line">
              <span>Confirmed from this link</span>
              <strong>{detail?.referral.redeemedCount ?? 0}</strong>
            </div>
          </section>

          <section className="paper-sheet sheet-pad offer-claim-rail">
            <div className="eyebrow">Claim flow</div>
            <div className="offer-claim-title">Claim the visit now, then go to the counter with your live code.</div>

            {loading ? (
              <div style={{ marginTop: 24 }}>
                <div className="loading-pulse" />
                <div className="loading-pulse" style={{ marginTop: 10 }} />
              </div>
            ) : (
              <>
                <div className="offer-claim-block">
                  <div className="offer-claim-row">
                    <span>Can this device claim?</span>
                    <strong>{detail?.viewer.canClaim ? 'Yes' : 'No'}</strong>
                  </div>
                  <p className="offer-claim-note">
                    {detail?.viewer.canClaim
                      ? 'Yes. This passbook does not have an active claim window yet.'
                      : detail?.viewer.reason ?? 'This invite is not claimable right now.'}
                  </p>
                </div>

                <div className="offer-claim-block">
                  <div className="offer-claim-row">
                    <span>After you claim</span>
                    <strong>Redeem</strong>
                  </div>
                  <p className="offer-claim-note">
                    Open the Redeem screen and let staff confirm the live code in merchant mode.
                  </p>
                </div>

                <div className="offer-claim-block">
                  <div className="offer-claim-row">
                    <span>Why this is strict</span>
                    <strong>Anti-abuse</strong>
                  </div>
                  <p className="offer-claim-note">
                    The system blocks same-device self-referrals and waits for a merchant-side truth step.
                  </p>
                </div>

                <div className="cta-row" style={{ marginTop: 24 }}>
                  <button
                    className="primary-button"
                    data-testid="offer-claim-button"
                    onClick={handleClaim}
                    disabled={!detail?.viewer.canClaim || !sessionId}
                  >
                    Claim this visit
                    <ArrowRight size={18} />
                  </button>
                  <Link href="/" className="secondary-button">
                    Go to home
                  </Link>
                </div>
              </>
            )}

            {message && (
              <div className="vs-chip" style={{ marginTop: 18 }}>
                <SealCheck size={18} />
                {message}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
