'use client';

import { BellSimpleRinging, Receipt, SealCheck, Storefront } from '@phosphor-icons/react';
import SignalRibbon from '@/components/launch/SignalRibbon';
import { useMerchantSummary } from '@/lib/launch/hooks';

export default function MerchantTodayPage() {
  const { data, loading, error } = useMerchantSummary();
  const nextQueue = data?.queue[0] ?? null;
  const remainingQueue = data?.queue.slice(1) ?? [];
  const ribbonItems = [
    `${data?.merchant.name ?? 'Nyano Chiya Ghar'} desk live`,
    `${data?.metrics[0]?.value ?? '0'} attributed`,
    `${data?.metrics[1]?.value ?? '0'} redemptions`,
    `${data?.metrics[2]?.value ?? '0'} waiting`,
    'Merchant confirmation is the truth event',
  ];

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">{data?.merchant.district ?? 'Thamel'} pilot</div>
            <h1 className="surface-title">Merchant mode should feel calm, exact, and trustworthy.</h1>
            <p className="surface-subtitle">
              Today is the operational command center: attributed visits, redemptions, repeat behavior, queue health, and the one next action for staff.
            </p>
          </div>
          <div className="mode-pill">
            <SealCheck size={18} weight="fill" />
            Merchant Mode
          </div>
        </div>

        <SignalRibbon items={ribbonItems} />

        <div className="merchant-grid command-stage" style={{ marginTop: 18 }}>
          <section className="paper-sheet sheet-pad command-sheet">
            <div className="eyebrow">{data?.merchant.name ?? 'Nyano Chiya Ghar'}</div>
            <div className="command-stage-title">Staff mode is live. The next job should always be obvious.</div>
            <p className="sheet-copy" style={{ marginTop: 14 }}>
              Merchant mode is the truth desk. It needs one clear next action, a clean live queue,
              and enough numbers to tell whether the launch is creating real visits instead of noise.
            </p>

            <div className="metric-strip" style={{ marginTop: 24 }}>
              {(loading ? [] : data?.metrics ?? []).map((metric) => (
                <div key={metric.label} className="metric-flag">
                  <div className="eyebrow">{metric.note}</div>
                  <div className={`stat-value ${metric.tone}`} style={{ marginTop: 10 }}>
                    {metric.value}
                  </div>
                  <div className="sheet-copy" style={{ marginTop: 8 }}>
                    {metric.label}
                  </div>
                </div>
              ))}
              {loading && Array.from({ length: 4 }).map((_, index) => (
                <div key={`metric-skeleton-${index}`} className="metric-sheet sheet-pad">
                  <div className="loading-pulse" />
                </div>
              ))}
            </div>

            <div className="command-alert-rail">
              {(data?.alerts ?? []).map((alert) => (
                <div key={alert} className="command-alert-line">
                  <BellSimpleRinging size={18} />
                  <span>{alert}</span>
                </div>
              ))}
              {!loading && !data?.alerts.length && (
                <div className="command-alert-line">
                  <BellSimpleRinging size={18} />
                  <span>No active desk alerts right now.</span>
                </div>
              )}
            </div>
          </section>

          <section className="ink-sheet sheet-pad queue-command">
            <div className="eyebrow">
              <Receipt size={18} />
              Next action
            </div>

            {loading ? (
              <div style={{ marginTop: 22 }}>
                <div className="loading-pulse" />
                <div className="loading-pulse" style={{ marginTop: 10 }} />
              </div>
            ) : nextQueue ? (
              <>
                <div className="queue-command-headline">{nextQueue.title}</div>
                <p className="sheet-copy" style={{ marginTop: 14 }}>
                  {nextQueue.subtitle}
                </p>
                <div className="queue-token">{nextQueue.value}</div>
                <div className="queue-command-meta">{nextQueue.meta}</div>

                <div className="queue-mini-list">
                  {remainingQueue.map((item) => (
                    <div key={item.title} className="queue-mini-line">
                      <span>{item.title}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-state">No live queue right now.</div>
            )}
          </section>
        </div>

        <div className="split-grid" style={{ marginTop: 18 }}>
          <section className="list-sheet desk-feed">
            {(data?.queue ?? []).map((item, index) => (
              <div key={`${item.title}-row`} className="queue-row desk-feed-row">
                <div className="route-stop-index">{String(index + 1).padStart(2, '0')}</div>
                <div className="row-copy">
                  <div className="row-title">{item.title}</div>
                  <div className="row-subtitle">{item.subtitle}</div>
                </div>
                <div className="row-meta">
                  <div>{item.meta}</div>
                  <div className="status-note is-ready" style={{ marginTop: 8 }}>
                    {item.value}
                  </div>
                </div>
              </div>
            ))}
            {error && <div className="empty-state">{error}</div>}
          </section>

          <section className="paper-sheet sheet-pad command-notes">
            <div className="eyebrow">
              <Storefront size={18} />
              Desk doctrine
            </div>
            <div className="metric-stack">
              <div className="metric-line">
                <div className="metric-label">
                  <strong>Confirm the live code</strong>
                  <span>The counter event is what turns attribution into something a merchant can trust.</span>
                </div>
                <div className="metric-value">Truth</div>
              </div>
              <div className="metric-line">
                <div className="metric-label">
                  <strong>Ignore vanity volume</strong>
                  <span>A smaller queue with real redemptions is better than inflated opens with no counter proof.</span>
                </div>
                <div className="metric-value">Quality</div>
              </div>
              <div className="metric-line">
                <div className="metric-label">
                  <strong>Teach staff one sentence</strong>
                  <span>Scan or enter the code, confirm the visit, and the reward line updates immediately.</span>
                </div>
                <div className="metric-value">Simple</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
