'use client';

import { Repeat, ShieldCheck, TrendUp, UsersThree } from '@phosphor-icons/react';
import SignalRibbon from '@/components/launch/SignalRibbon';
import { useMerchantSummary } from '@/lib/launch/hooks';

export default function MerchantCustomersPage() {
  const { data, loading, error } = useMerchantSummary();
  const leadCustomer = data?.customers[0] ?? null;
  const customerCount = data?.customers.length ?? 0;
  const ribbonItems = [
    `${data?.merchant.name ?? 'Merchant'} relationship desk`,
    `${customerCount} tracked people`,
    leadCustomer ? `${leadCustomer.title} leading` : 'No lead signal yet',
    'Fast pattern reading beats CRM bloat',
  ];

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Customers</div>
            <h1 className="surface-title">Use this in under 30 seconds.</h1>
            <p className="surface-subtitle">
              Merchant customer views should surface rising referrers, repeat visitors, and suspicious patterns without turning into CRM bloat.
            </p>
          </div>
        </div>

        <SignalRibbon items={ribbonItems} />

        <div className="split-grid" style={{ marginTop: 18 }}>
          <section className="list-sheet customer-manifest">
            {loading ? (
              <div style={{ padding: 22 }}>
                <div className="loading-pulse" />
                <div className="loading-pulse" style={{ marginTop: 10 }} />
                <div className="loading-pulse" style={{ marginTop: 10 }} />
              </div>
            ) : error ? (
              <div className="empty-state">{error}</div>
            ) : (
              <>
                <div className="ledger-head">
                  <div>
                    <div className="eyebrow">Relationship ledger</div>
                    <div className="ledger-headline">The roster should tell you who is real, not who clicked.</div>
                  </div>
                  <div className="row-meta">
                    <div>{data?.merchant.district ?? 'Pilot'}</div>
                    <div style={{ marginTop: 6 }}>{customerCount} tracked lines</div>
                  </div>
                </div>

                {data?.customers.map((customer, index) => (
                  <div key={customer.title} className="customer-row customer-row-rich">
                    <div className={`route-stop-index ${index === 0 ? 'is-complete' : ''}`}>
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <div className="row-copy">
                      <div className="row-title">{customer.title}</div>
                      <div className="row-subtitle">{customer.subtitle}</div>
                    </div>
                    <div className="row-meta">
                      <div>{customer.meta}</div>
                      <div className={`status-note ${index === 0 ? 'is-ready' : 'is-progress'}`} style={{ marginTop: 8 }}>
                        {customer.value}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </section>

          <div className="poster-side">
            <section className="ink-sheet sheet-pad customer-hero">
              <div className="eyebrow">
                <UsersThree size={18} />
                Relationship pulse
              </div>
              <div className="queue-command-headline">
                {leadCustomer?.title ?? 'No live relationship signal yet.'}
              </div>
              <p className="sheet-copy" style={{ marginTop: 14 }}>
                {leadCustomer?.subtitle ?? 'Once the pilot has real referral and repeat activity, the strongest customer line will show here first.'}
              </p>
              {leadCustomer && <div className="queue-token">{leadCustomer.value}</div>}

              <div className="metric-stack" style={{ marginTop: 22 }}>
                <div className="metric-line">
                  <div className="metric-label">
                    <strong>Lead status</strong>
                    <span>{leadCustomer?.meta ?? 'Waiting for a trustworthy first line.'}</span>
                  </div>
                  <div className="metric-value">Live</div>
                </div>
                <div className="metric-line">
                  <div className="metric-label">
                    <strong>Tracked people</strong>
                    <span>The launch should stay small enough that every line still means something.</span>
                  </div>
                  <div className="metric-value">{customerCount}</div>
                </div>
                <div className="metric-line">
                  <div className="metric-label">
                    <strong>Merchant rule</strong>
                    <span>Trust confirmed visits, repeat presence, and clear referral chains more than noisy opens.</span>
                  </div>
                  <div className="metric-value">Proof</div>
                </div>
              </div>
            </section>

            <section className="paper-sheet sheet-pad customer-note-sheet">
              <div className="eyebrow">How to read this</div>
              <div className="route-fact-band">
                <div className="route-fact">
                  <TrendUp size={18} />
                  <div>
                    <strong>Rising referrer</strong>
                    <span>A strong customer creates repeated confirmed visits, not just one loud burst.</span>
                  </div>
                </div>
                <div className="route-fact">
                  <Repeat size={18} />
                  <div>
                    <strong>Repeat signal</strong>
                    <span>Return behavior matters because it means the venue itself is sticky, not just the offer.</span>
                  </div>
                </div>
                <div className="route-fact">
                  <ShieldCheck size={18} />
                  <div>
                    <strong>Suspicion check</strong>
                    <span>Same-device loops and duplicate patterns belong in the holdout logic, not in customer praise.</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
