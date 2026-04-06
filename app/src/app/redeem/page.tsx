'use client';

import { useEffect, useState } from 'react';
import { Clock, QrCode, SealCheck, Storefront, Ticket } from '@phosphor-icons/react';
import SignalRibbon from '@/components/launch/SignalRibbon';
import { useAuth } from '@/lib/auth';
import { createRedeemCode } from '@/lib/launch/client';
import { useConsumerSummary } from '@/lib/launch/hooks';

const qrPattern = [
  1, 1, 1, 0, 1, 0, 1, 1, 1,
  1, 0, 0, 1, 0, 1, 0, 0, 1,
  1, 0, 1, 1, 1, 1, 1, 0, 1,
  0, 1, 1, 0, 0, 1, 1, 1, 0,
  1, 0, 1, 1, 0, 1, 0, 0, 1,
  0, 1, 1, 1, 1, 0, 1, 0, 0,
  1, 0, 0, 1, 0, 1, 1, 1, 1,
  1, 1, 0, 0, 1, 0, 0, 1, 0,
  1, 1, 1, 0, 1, 1, 0, 1, 1,
];

export default function RedeemPage() {
  const { sessionId } = useAuth();
  const { data, loading, error, refresh } = useConsumerSummary(sessionId);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId || !data || data.activeRedeemCode || !data.activeClaim || data.activeClaim.status === 'blocked') {
      return;
    }

    let cancelled = false;
    void createRedeemCode(sessionId)
      .then((result) => {
        if (!cancelled) {
          if (!result.ok) {
            setMessage(result.reason ?? 'Could not create a redeem code.');
            return;
          }
          setMessage(null);
          void refresh();
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setMessage(caught instanceof Error ? caught.message : 'Could not create a redeem code.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [data, refresh, sessionId]);

  const redeemCode = data?.activeRedeemCode?.code ?? '--- ---';
  const redeemExpiry = data?.activeRedeemCode?.expiresAt
    ? new Date(data.activeRedeemCode.expiresAt).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
    : 'Pending';
  const attemptsRemaining = data?.activeRedeemCode
    ? Math.max(data.activeRedeemCode.maxAttempts - data.activeRedeemCode.attemptCount, 0)
    : null;
  const ribbonItems = [
    `${data?.offer.merchantName ?? 'Merchant'} counter handoff`,
    data?.activeRedeemCode ? `Live code ${redeemCode}` : 'Preparing live code',
    `${data?.offer.reward ?? 'Reward'} at the counter`,
    'Merchant confirmation stays required',
  ];

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Redeem</div>
            <h1 className="surface-title">Fast at the counter, clear under pressure.</h1>
            <p className="surface-subtitle">
              Redemption is the highest-friction moment in the product. The only job here is to make the code obvious and the staff action unambiguous.
            </p>
          </div>
        </div>

        <SignalRibbon items={ribbonItems} />

        <div className="split-grid" style={{ marginTop: 18 }}>
          <section className="scan-sheet sheet-pad redeem-stage-sheet">
            <div className="eyebrow">
              <QrCode size={18} />
              Live counter code
            </div>
            <div className="redeem-stage-title">{data?.offer.merchantName ?? 'Counter ready'}</div>

            <div className="code-stage" style={{ marginTop: 22 }}>
              <div className="qr-block">
                <div className="qr-grid">
                  {qrPattern.map((cell, index) => (
                    <span key={`${cell}-${index}`} className={`qr-cell ${cell ? 'is-on' : ''}`} />
                  ))}
                </div>
              </div>
              <div className="code-pill" data-testid="redeem-active-code">
                <Clock size={18} />
                {redeemCode}
              </div>
            </div>

            <div className="metric-stack" style={{ marginTop: 24 }}>
              <div className="metric-line">
                <div className="metric-label">
                  <strong>Reward</strong>
                  <span>{data?.offer.reward ?? 'Waiting for reward details'}</span>
                </div>
                <div className="metric-value">
                  <Ticket size={18} />
                </div>
              </div>
              <div className="metric-line">
                <div className="metric-label">
                  <strong>Status</strong>
                  <span>The line only settles after staff confirms this code.</span>
                </div>
                <div className="metric-value">{data?.activeRedeemCode?.status ?? 'Waiting'}</div>
              </div>
              <div className="metric-line">
                <div className="metric-label">
                  <strong>Code expiry</strong>
                  <span>Live codes are short-lived and should be opened only when you are physically at the counter.</span>
                </div>
                <div className="metric-value">{redeemExpiry}</div>
              </div>
              <div className="metric-line">
                <div className="metric-label">
                  <strong>Attempt window</strong>
                  <span>Staff should resolve the code cleanly. Repeated bad confirmations will invalidate it.</span>
                </div>
                <div className="metric-value">{attemptsRemaining ?? '-'}</div>
              </div>
            </div>
          </section>

          <section className="paper-sheet sheet-pad">
            <div className="eyebrow">Counter sequence</div>
            <div className="offer-claim-title">Show this, let staff confirm, and keep the moment moving.</div>

            {loading ? (
              <div style={{ marginTop: 24 }}>
                <div className="loading-pulse" />
                <div className="loading-pulse" style={{ marginTop: 10 }} />
              </div>
            ) : (
              <>
                <div className="campaign-sequence">
                  <div className="campaign-sequence-step">
                    <span>01</span>
                    <div>
                      <strong>Open before the counter</strong>
                      <p>Arrive with the code already visible so the line does not stall under pressure.</p>
                    </div>
                  </div>
                  <div className="campaign-sequence-step">
                    <span>02</span>
                    <div>
                      <strong>Staff confirms once</strong>
                      <p>Merchant mode checks the code and settles one redemption for one live visit.</p>
                    </div>
                  </div>
                  <div className="campaign-sequence-step">
                    <span>03</span>
                    <div>
                      <strong>Passbook updates quietly</strong>
                      <p>The reward becomes real in the passbook without asking the customer to understand any protocol detail.</p>
                    </div>
                  </div>
                </div>

                <div className="metric-stack" style={{ marginTop: 24 }}>
                  <div className="metric-line">
                    <div className="metric-label">
                      <strong>Visual code block</strong>
                      <span>This square is only a visual cue in the pilot. The live short code above is the actual counter artifact right now.</span>
                    </div>
                    <div className="metric-value">
                      <Storefront size={18} />
                    </div>
                  </div>
                  <div className="metric-line">
                    <div className="metric-label">
                      <strong>Passbook line</strong>
                      <span>After confirmation, the reward settles into the ledger instead of becoming a noisy wallet event.</span>
                    </div>
                    <div className="metric-value">{data?.progress.current ?? 0}/{data?.progress.total ?? 0}</div>
                  </div>
                </div>
              </>
            )}

            <div className="vs-chip" style={{ marginTop: 24 }}>
              <SealCheck size={18} />
              Merchant-side confirmation stays required at launch
            </div>

            {(message || error) && (
              <div className="empty-line" style={{ marginTop: 18 }}>
                {message ?? error}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
