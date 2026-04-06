'use client';

import { useState } from 'react';
import { Receipt, SealCheck, WarningCircle } from '@phosphor-icons/react';
import CounterStatusPanel from '@/components/launch/CounterStatusPanel';
import SignalRibbon from '@/components/launch/SignalRibbon';
import { confirmMerchantCode } from '@/lib/launch/client';

export default function MerchantScanPage() {
  const [redeemCode, setRedeemCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'confirmed' | 'blocked'>('idle');
  const [message, setMessage] = useState('Only an authenticated operator session can confirm a live counter redemption.');
  const ribbonItems = [
    'Counter truth desk',
    status === 'confirmed' ? 'Last code confirmed' : status === 'blocked' ? 'Last code blocked' : 'Waiting for customer code',
    'One code, one visit, one confirmation',
    'Low-light friendly feedback',
  ];

  const handleConfirm = async () => {
    if (!redeemCode.trim()) {
      return;
    }

    const result = await confirmMerchantCode(redeemCode.trim());
    if (result.ok) {
      setStatus('confirmed');
      setMessage(`Code ${result.code} is now marked ${result.status}.`);
      return;
    }

    setStatus('blocked');
    setMessage(result.reason ?? 'This code could not be confirmed.');
  };

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Scan Desk</div>
            <h1 className="surface-title">Counter confirmation should be fast, obvious, and tightly scoped.</h1>
            <p className="surface-subtitle">
              This is a single-purpose operator tool: verify one live code for one merchant, under pressure, with clear feedback.
            </p>
          </div>
        </div>

        <SignalRibbon items={ribbonItems} />

        <div className="merchant-grid" style={{ marginTop: 18 }}>
          <section className="scan-sheet sheet-pad scan-desk-stage">
            <CounterStatusPanel status={status} />
            <div className="metric-stack" style={{ marginTop: 22 }}>
              <div className="metric-line">
                <div className="metric-label">
                  <strong>Desk rule</strong>
                  <span>A code becomes true only when an authenticated counter operator confirms a live customer visit here.</span>
                </div>
                <div className="metric-value">Truth</div>
              </div>
              <div className="metric-line">
                <div className="metric-label">
                  <strong>Feedback mode</strong>
                  <span>The interface should tell staff immediately whether to move the line or stop and review the case.</span>
                </div>
                <div className="metric-value">{status === 'confirmed' ? 'Go' : status === 'blocked' ? 'Stop' : 'Wait'}</div>
              </div>
            </div>
          </section>

          <section className="paper-sheet sheet-pad scan-desk-rail">
            <div className="eyebrow">
              <Receipt size={18} />
              Confirmation rail
            </div>

            <div className="field-stack" style={{ marginTop: 18 }}>
              <div className="field">
                <label htmlFor="merchant-redeem-code">Customer code</label>
                <input
                  id="merchant-redeem-code"
                  data-testid="merchant-code-input"
                  value={redeemCode}
                  onChange={(event) => setRedeemCode(event.target.value)}
                  placeholder="ABC-123"
                />
                <div className="field-helper">
                  Launch rule: a code is only true after the authenticated operator watching the counter confirms it here.
                </div>
              </div>

              <div className="cta-row">
                <button className="primary-button" data-testid="merchant-confirm-button" onClick={handleConfirm}>
                  Confirm redemption
                </button>
                <button
                  className="secondary-button"
                  onClick={() => {
                    setRedeemCode('');
                    setStatus('idle');
                  }}
                >
                  Reset
                </button>
              </div>

              <div className="campaign-sequence">
                <div className="campaign-sequence-step">
                  <span>01</span>
                  <div>
                    <strong>Check presence</strong>
                    <p>Confirm the customer is actually at the counter with the live code open.</p>
                  </div>
                </div>
                <div className="campaign-sequence-step">
                  <span>02</span>
                  <div>
                    <strong>Confirm once</strong>
                    <p>One redemption should map to one real visit, not a repeat tap or duplicated window.</p>
                  </div>
                </div>
                <div className="campaign-sequence-step">
                  <span>03</span>
                  <div>
                    <strong>Move the line</strong>
                    <p>Good confirmation should feel instant; bad confirmation should stop the desk cleanly.</p>
                  </div>
                </div>
              </div>

              <div className="metric-stack" style={{ marginTop: 24 }}>
                <div className="metric-line">
                  <div className="metric-label">
                    <strong>Good redemption</strong>
                    <span>Valid code, clear customer present, one reward window still open.</span>
                  </div>
                  <div className="metric-value">
                    <SealCheck size={18} />
                  </div>
                </div>
                <div className="metric-line">
                  <div className="metric-label">
                    <strong>Stop and review</strong>
                    <span>Same device cluster, duplicate window, or code mismatch.</span>
                  </div>
                  <div className="metric-value">
                    <WarningCircle size={18} />
                  </div>
                </div>
              </div>

              <div className="empty-line" data-testid="merchant-confirm-message">{message}</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
