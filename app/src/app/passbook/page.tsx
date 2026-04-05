'use client';

import { Ticket, Timer, TrendUp } from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth';
import SignalRibbon from '@/components/launch/SignalRibbon';
import { useConsumerSummary } from '@/lib/launch/hooks';

export default function PassbookPage() {
  const { sessionId } = useAuth();
  const { data, loading, error } = useConsumerSummary(sessionId);
  const statusCopy = {
    progress: 'Building',
    ready: 'Ready',
    redeemed: 'Redeemed',
    blocked: 'Blocked',
  } as const;

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Passbook</div>
            <h1 className="surface-title">A modern ledger, not a noisy wallet.</h1>
            <p className="surface-subtitle">
              Each line should tell a story: who invited whom, what unlocked, what redeemed, and what is still building toward a reward.
            </p>
          </div>
        </div>

        <SignalRibbon
          items={[
            `${data?.offer.merchantName ?? 'Merchant'} passbook`,
            `${data?.progress.current ?? 0}/${data?.progress.total ?? 3} invite confirmations`,
            data?.activeRedeemCode ? `Live code ${data.activeRedeemCode.code}` : 'No live redeem code yet',
            `${data?.offer.district ?? 'Pilot district'} activity ledger`,
          ]}
        />

        <div className="split-grid" style={{ marginTop: 18 }}>
          <section className="ticket-sheet sheet-pad passbook-band">
            <div className="eyebrow">Active line</div>
            <div className="ticket-title" style={{ marginTop: 10 }}>
              {data?.offer.title ?? 'Your current reward line'}
            </div>
            <p className="ticket-note" style={{ marginTop: 16 }}>
              {data?.offer.reward ?? 'Loading reward'} · {data?.offer.merchantName ?? 'Merchant'}
            </p>

            <div className="passbook-facts">
              <div className="passbook-fact">
                <Ticket size={18} />
                <div>
                  <strong>Progress</strong>
                  <span>
                    {data?.progress.current ?? 0} of {data?.progress.total ?? 0} confirmed visits
                  </span>
                </div>
              </div>
              <div className="passbook-fact">
                <TrendUp size={18} />
                <div>
                  <strong>Remaining</strong>
                  <span>{data?.progress.remaining ?? 0} more confirmations until reward unlock</span>
                </div>
              </div>
              <div className="passbook-fact">
                <Timer size={18} />
                <div>
                  <strong>Counter status</strong>
                  <span>
                    {data?.activeRedeemCode
                      ? `Live code ${data.activeRedeemCode.code} is ${data.activeRedeemCode.status}`
                      : 'No live counter code at the moment'}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="list-sheet passbook-ledger">
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
                    <div className="eyebrow">Passbook lines</div>
                    <div className="ledger-headline">Every action stays visible until the reward is real.</div>
                  </div>
                  <div className="row-meta">
                    <div>{data?.offer.district ?? 'Pilot'}</div>
                    <div style={{ marginTop: 6 }}>{data?.passbook.length ?? 0} entries</div>
                  </div>
                </div>

                {data?.passbook.map((entry, index) => (
                  <div key={entry.id} className="passbook-entry passbook-entry-rich">
                    <div className={`passbook-marker is-${entry.status}`}>{String(index + 1).padStart(2, '0')}</div>
                    <div className="row-copy">
                      <div className="row-title">{entry.title}</div>
                      <div className="row-subtitle">{entry.subtitle}</div>
                    </div>
                    <div className="row-meta">
                      <div>{entry.meta}</div>
                      <div className={`status-note is-${entry.status}`} style={{ marginTop: 8 }}>
                        {statusCopy[entry.status]}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
