'use client';

import { useState } from 'react';
import { LockKey, ShieldCheck, Storefront } from '@phosphor-icons/react';
import { useMerchantOperatorSession } from '@/lib/launch/hooks';

export default function MerchantAccessGate({ children }: { children: React.ReactNode }) {
  const { session, loading, error, login, logout } = useMerchantOperatorSession();
  const [operatorLabel, setOperatorLabel] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (loading && !session) {
    return (
      <div className="surface">
        <div className="surface-inner">
          <div className="loading-pulse" />
          <div className="loading-pulse" style={{ marginTop: 12 }} />
        </div>
      </div>
    );
  }

  if (session?.authenticated) {
    return (
      <>
        <div className="merchant-session-banner">
          <div className="vs-chip">
            <ShieldCheck size={18} />
            <span>{session.operatorLabel} - {session.merchantName}</span>
          </div>
          <button className="quiet-button" onClick={() => void logout()}>
            Sign out operator
          </button>
        </div>
        {children}
      </>
    );
  }

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">
              <LockKey size={18} />
              Counter access
            </div>
            <h1 className="surface-title">Merchant tools stay locked until an operator session is active.</h1>
            <p className="surface-subtitle">
              The URL can open the merchant screens, but it does not grant authority. Counter confirmation and campaign changes require an operator session.
            </p>
          </div>
        </div>

        <div className="split-grid">
          <section className="paper-sheet sheet-pad">
            <div className="eyebrow">Operator sign-in</div>
            <div className="offer-claim-title">Enter the counter name and access code for this merchant.</div>

            <div className="field-stack" style={{ marginTop: 22 }}>
              <div className="field">
                <label htmlFor="merchant-operator-name">Operator name</label>
                <input
                  id="merchant-operator-name"
                  data-testid="merchant-operator-name"
                  value={operatorLabel}
                  onChange={(event) => setOperatorLabel(event.target.value)}
                  placeholder="Counter lead"
                />
              </div>
              <div className="field">
                <label htmlFor="merchant-access-code">Access code</label>
                <input
                  id="merchant-access-code"
                  data-testid="merchant-access-code"
                  type="password"
                  value={accessCode}
                  onChange={(event) => setAccessCode(event.target.value)}
                  placeholder="Counter code"
                />
              </div>

              <div className="cta-row">
                <button
                  className="primary-button"
                  data-testid="merchant-access-submit"
                  onClick={async () => {
                    try {
                      setSubmitError(null);
                      await login({ operatorLabel, accessCode });
                    } catch (caught) {
                      setSubmitError(caught instanceof Error ? caught.message : 'Merchant sign-in failed.');
                    }
                  }}
                >
                  Unlock merchant mode
                </button>
              </div>

              {(submitError || error) && (
                <div className="empty-line">{submitError ?? error}</div>
              )}
            </div>
          </section>

          <section className="ink-sheet sheet-pad">
            <div className="eyebrow">
              <Storefront size={18} />
              Why it is locked
            </div>
            <div className="metric-stack">
              <div className="metric-line">
                <div className="metric-label">
                  <strong>Counter truth</strong>
                  <span>Only authenticated operators can settle a redemption.</span>
                </div>
                <div className="metric-value">Required</div>
              </div>
              <div className="metric-line">
                <div className="metric-label">
                  <strong>Campaign mutations</strong>
                  <span>Offer edits are merchant actions, not consumer navigation side effects.</span>
                </div>
                <div className="metric-value">Protected</div>
              </div>
              <div className="metric-line">
                <div className="metric-label">
                  <strong>Path is not auth</strong>
                  <span>Opening a merchant URL no longer acts like a permission system.</span>
                </div>
                <div className="metric-value">Fixed</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
