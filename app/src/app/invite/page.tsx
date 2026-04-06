'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Copy,
  LinkSimple,
  PaperPlaneTilt,
  ShareNetwork,
  Ticket,
  UsersThree,
} from '@phosphor-icons/react';
import SignalRibbon from '@/components/launch/SignalRibbon';
import { useAuth } from '@/lib/auth';
import { ensureConsumerReferral } from '@/lib/launch/client';
import { useConsumerSummary } from '@/lib/launch/hooks';

export default function InvitePage() {
  const { deviceId, displayName, sessionId } = useAuth();
  const { data, refresh } = useConsumerSummary(sessionId);
  const [copied, setCopied] = useState(false);
  const [sharePath, setSharePath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    let cancelled = false;
    void ensureConsumerReferral(sessionId, displayName || 'Guest', deviceId)
      .then((result) => {
        if (!cancelled) {
          setSharePath(result.sharePath);
          setError(null);
          void refresh();
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'Failed to create a share link.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [deviceId, displayName, refresh, sessionId]);

  const inviteUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return sharePath ? `${origin}${sharePath}` : '';
  }, [sharePath]);

  const shareCopy = `${displayName || 'A friend'} invited you to ${data?.offer.merchantName ?? 'Nyano Chiya Ghar'}. Bring 3 friends. All 4 unlock the copper ticket tonight. ${inviteUrl}`;
  const ribbonItems = [
    `${data?.offer.merchantName ?? 'Nyano Chiya Ghar'} share card`,
    `${data?.progress.current ?? 0} confirmed`,
    `${data?.referral.openCount ?? 0} opens`,
    'Claim without OTP cost',
    'Counter confirmation required',
  ];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'Viral Sync Nepal',
        text: shareCopy,
        url: inviteUrl,
      });
      return;
    }

    await handleCopy();
  };

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Invite</div>
            <h1 className="surface-title">The share screen is the engine, not a side feature.</h1>
            <p className="surface-subtitle">
              Sharing has to feel inevitable. The user needs to see the real reward, the real stakes, and the cleanest path to get friends moving.
            </p>
          </div>
        </div>

        <SignalRibbon items={ribbonItems} />

        <div className="split-grid" style={{ marginTop: 18 }}>
          <section className="ticket-sheet sheet-pad poster-ticket invite-stage">
            <div className="ticket-head">
              <div>
                <div className="eyebrow">Share card preview</div>
                <div className="ticket-title">{data?.offer.title ?? 'Bring 3 friends. All 4 unlock a warm momo set.'}</div>
              </div>
              <Ticket size={34} weight="duotone" />
            </div>
            <p className="ticket-note" style={{ marginTop: 16 }}>
              {data?.offer.merchantName ?? 'Nyano Chiya Ghar'} - {data?.offer.district ?? 'Thamel'} - unlock after {data?.offer.referralGoal ?? 3} confirmed invited redemptions
            </p>

            <div className="offer-facts">
              <div className="offer-fact">
                <ShareNetwork size={18} />
                <div>
                  <strong>What friends see</strong>
                  <span>A live ticket instead of a vague “join this app” message.</span>
                </div>
              </div>
              <div className="offer-fact">
                <UsersThree size={18} />
                <div>
                  <strong>Unlock line</strong>
                  <span>Three merchant-confirmed invited visits trigger the group reward.</span>
                </div>
              </div>
              <div className="offer-fact">
                <LinkSimple size={18} />
                <div>
                  <strong>Invite token</strong>
                  <span>{data?.referral.token?.slice(0, 6).toUpperCase() ?? 'WAIT'}</span>
                </div>
              </div>
            </div>

            <div className="offer-sequence">
              <div className="offer-sequence-step">
                <span>01</span>
                <div>
                  <strong>Share the ticket</strong>
                  <p>Friends should immediately understand the reward, the venue, and the group condition.</p>
                </div>
              </div>
              <div className="offer-sequence-step">
                <span>02</span>
                <div>
                  <strong>Get real claims</strong>
                  <p>Opens matter for reach, but only distinct claimed visits start building value.</p>
                </div>
              </div>
              <div className="offer-sequence-step">
                <span>03</span>
                <div>
                  <strong>Let the counter settle truth</strong>
                  <p>The merchant confirmation step is what turns the invite chain into revenue-quality proof.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="paper-sheet sheet-pad invite-studio">
            <div className="eyebrow">Share transmission</div>
            <div className="offer-claim-title">Write the message once, then send it everywhere the crew already talks.</div>

            <div className="invite-copy-card">
              <div className="eyebrow">
                <PaperPlaneTilt size={18} />
                Share copy
              </div>
              <div className="invite-copy-text">{shareCopy}</div>
            </div>

            <div className="cta-group" style={{ marginTop: 22 }}>
              <button className="primary-button" onClick={handleShare} disabled={!sharePath}>
                <ShareNetwork size={18} />
                Share now
              </button>
              <button className="secondary-button" onClick={handleCopy} disabled={!sharePath}>
                <Copy size={18} />
                {copied ? 'Copied' : 'Copy message'}
              </button>
              <a className="quiet-button" data-testid="invite-open-preview" href={inviteUrl || '#'}>
                Open preview
                <ArrowRight size={18} />
              </a>
            </div>

            <div className="metric-stack" style={{ marginTop: 28 }}>
              <div className="metric-line">
                <div className="metric-label">
                  <strong>Open count</strong>
                  <span>Useful reach signal, but not the revenue event.</span>
                </div>
                <div className="metric-value">{data?.referral.openCount ?? 0}</div>
              </div>
              <div className="metric-line">
                <div className="metric-label">
                  <strong>Confirmed redemptions</strong>
                  <span>Only merchant-approved visits move the reward line.</span>
                </div>
                <div className="metric-value">{data?.progress.current ?? 0}</div>
              </div>
            </div>

            {error && <div className="empty-line" style={{ marginTop: 18 }}>{error}</div>}
          </section>
        </div>
      </div>
    </div>
  );
}
