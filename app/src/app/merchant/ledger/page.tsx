'use client';

import { Bank, Coins, Receipt, SealCheck, TrendUp } from '@phosphor-icons/react';
import SignalRibbon from '@/components/launch/SignalRibbon';
import { useMerchantSummary } from '@/lib/launch/hooks';

export default function MerchantLedgerPage() {
  const { data, loading, error } = useMerchantSummary();
  const attributedVisits = data?.ledger[0]?.value ?? '0';
  const rewardCost = data?.ledger[1]?.value ?? 'Pending';
  const platformFee = data?.ledger[2]?.value ?? 'Pending';

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Ledger</div>
            <h1 className="surface-title">The money view should be honest, not theatrical.</h1>
            <p className="surface-subtitle">
              Before PSP integrations, the merchant ledger needs to show attributed activity, reward cost, and the exact line between deferred platform fees and real value delivered.
            </p>
          </div>
        </div>

        <SignalRibbon
          items={[
            `${data?.merchant.name ?? 'Merchant'} cycle ledger`,
            `${attributedVisits} attributed visits`,
            `${rewardCost} reward cost`,
            `${platformFee} platform fee line`,
          ]}
        />

        <div className="split-grid" style={{ marginTop: 18 }}>
          <section className="paper-sheet sheet-pad finance-board">
            <div className="eyebrow">Cycle snapshot</div>
            <div className="finance-board-title">Verified merchant value comes before platform billing.</div>

            <div className="finance-hero">
              <div className="finance-hero-value">{attributedVisits}</div>
              <div className="sheet-copy">Attributed visits in the current pilot cycle</div>
            </div>

            <div className="route-fact-band finance-fact-band">
              <div className="route-fact">
                <TrendUp size={18} />
                <div>
                  <strong>Attributed activity</strong>
                  <span>Every non-blocked claim that entered through a referral path.</span>
                </div>
              </div>
              <div className="route-fact">
                <Coins size={18} />
                <div>
                  <strong>Reward cost</strong>
                  <span>{rewardCost}</span>
                </div>
              </div>
              <div className="route-fact">
                <Receipt size={18} />
                <div>
                  <strong>Fee posture</strong>
                  <span>{platformFee}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="ink-sheet sheet-pad finance-side-note">
            <div className="eyebrow">
              <Bank size={18} />
              Policy line
            </div>
            <div className="queue-command-headline">No platform fee before merchant truth exists.</div>
            <div className="metric-stack" style={{ marginTop: 18 }}>
              <div className="metric-line">
                <div className="metric-label">
                  <strong>Reward first</strong>
                  <span>The merchant should see the cost of redeemed value before any platform charge appears.</span>
                </div>
                <div className="metric-value">Fair</div>
              </div>
              <div className="metric-line">
                <div className="metric-label">
                  <strong>Truth over volume</strong>
                  <span>Counter-confirmed redemption matters more than inflated opens or noisy clicks.</span>
                </div>
                <div className="metric-value">Proof</div>
              </div>
              <div className="metric-line">
                <div className="metric-label">
                  <strong>Billing only after trust</strong>
                  <span>Deferred fee mode protects the pilot until the value loop is obvious to merchants.</span>
                </div>
                <div className="metric-value">
                  <SealCheck size={18} />
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="list-sheet passbook-ledger ledger-sheet" style={{ marginTop: 18 }}>
          {loading ? (
            <div style={{ padding: 22 }}>
              <div className="loading-pulse" />
              <div className="loading-pulse" style={{ marginTop: 10 }} />
            </div>
          ) : error ? (
            <div className="empty-state">{error}</div>
          ) : (
            <>
              <div className="ledger-head">
                <div>
                  <div className="eyebrow">Ledger lines</div>
                  <div className="ledger-headline">The numbers should explain the business without sales theater.</div>
                </div>
                <div className="row-meta">
                  <div>{data?.merchant.district ?? 'Pilot'}</div>
                  <div style={{ marginTop: 6 }}>{data?.ledger.length ?? 0} lines</div>
                </div>
              </div>

              {data?.ledger.map((row, index) => (
                <div key={row.title} className="ledger-row ledger-row-rich">
                  <div className="route-stop-index">{String(index + 1).padStart(2, '0')}</div>
                  <div className="row-copy">
                    <div className="row-title">{row.title}</div>
                    <div className="row-subtitle">{row.subtitle}</div>
                  </div>
                  <div className="row-meta">
                    <div>{row.meta}</div>
                    <div className="ledger-value-note" style={{ marginTop: 8 }}>
                      {row.value}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
