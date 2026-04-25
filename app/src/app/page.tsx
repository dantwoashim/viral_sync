'use client';

import Link from 'next/link';
import { ArrowRight, SealCheck, Ticket, TrendUp } from '@phosphor-icons/react';
import AnimatedStampRail from '@/components/launch/AnimatedStampRail';
import SignalRibbon from '@/components/launch/SignalRibbon';
import { useAuth } from '@/lib/auth';
import { useConsumerSummary } from '@/lib/launch/hooks';
import { consumerPassbook, consumerRoutes, consumerStamps } from '@/lib/nepalData';

export default function ConsumerHomePage() {
  const { displayName, sessionId } = useAuth();
  const { data, loading } = useConsumerSummary(sessionId);
  const progressCurrent = data?.progress.current ?? 0;
  const progressTotal = data?.progress.total ?? 3;
  const passbookRows = data?.passbook.length ? data.passbook : consumerPassbook.map((entry, index) => ({
    id: `fallback-${index}`,
    title: entry.title,
    subtitle: entry.subtitle,
    meta: entry.meta,
    status: 'progress' as const,
    createdAt: new Date().toISOString(),
  }));
  const headline = data?.offer.title ?? 'Bring 3 friends. All 4 unlock a warm momo set.';
  const merchantName = data?.offer.merchantName ?? 'Nyano Chiya Ghar';
  const district = data?.offer.district ?? 'Thamel';
  const ribbonItems = [
    `${merchantName} - live pass`,
    `${progressCurrent}/${progressTotal} confirmed`,
    `${data?.referral.openCount ?? 0} link opens`,
    `${district} route active`,
    'Merchant-funded reward',
  ];

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">{district} Pilot</div>
            <h1 className="surface-title">Your passbook should feel alive, not financial.</h1>
            <p className="surface-subtitle">
              {displayName || 'Guest'}, the launch loop starts with one reward ticket, one strong reason to share,
              and one district route that makes local discovery feel social.
            </p>
          </div>
          <div className="mode-pill">
            <SealCheck size={18} weight="fill" />
            Consumer Mode
          </div>
        </div>

        <div className="poster-grid poster-hero">
          <section className="ticket-sheet sheet-pad poster-ticket">
            <div className="ticket-head">
              <div>
                <div className="eyebrow">Live reward ticket</div>
                <div className="ticket-title">{headline}</div>
              </div>
              <Ticket size={34} weight="duotone" />
            </div>

            <p className="ticket-note" style={{ marginTop: 16 }}>
              {merchantName} is pushing a group reward built for friends, classmates, and crews that arrive together.
            </p>

            <AnimatedStampRail
              progressCurrent={progressCurrent}
              progressTotal={progressTotal}
              stamps={consumerStamps}
            />

            <div className="ticket-stats">
              <div className="metric-line">
                <div className="metric-label">
                  <strong>Confirmed redemptions</strong>
                  <span>Only merchant-approved visits advance the ticket.</span>
                </div>
                <div className="metric-value">{progressCurrent}/{progressTotal}</div>
              </div>
              <div className="metric-line">
                <div className="metric-label">
                  <strong>Share link opens</strong>
                  <span>Useful signal, but not the truth event.</span>
                </div>
                <div className="metric-value">{data?.referral.openCount ?? 0}</div>
              </div>
            </div>

            <div className="cta-row" style={{ marginTop: 22 }}>
              <Link href="/invite" className="primary-button">
                Share ticket
                <ArrowRight size={18} />
              </Link>
              <Link href="/redeem" className="secondary-button">
                Redeem at the counter
              </Link>
            </div>
          </section>

          <div className="poster-side">
            <section className="route-sheet sheet-pad atlas-sheet">
              <div className="eyebrow">Next move</div>
              <div style={{ fontSize: '1.55rem', fontWeight: 650, letterSpacing: '-0.04em', marginTop: 10 }}>
                {data?.progress.remaining
                  ? `${data.progress.remaining} more confirmed redemption${data.progress.remaining === 1 ? '' : 's'} unlock the full table reward.`
                  : 'Your ticket is ready for the full group reward.'}
              </div>
              <p className="sheet-copy" style={{ marginTop: 12 }}>
                The first screen should answer one thing immediately: what happens if I share right now?
              </p>
              <div className="metric-stack">
                {passbookRows.slice(0, 2).map((entry) => (
                  <div key={entry.id} className="metric-line">
                    <div className="metric-label">
                      <strong>{entry.title}</strong>
                      <span>{entry.subtitle}</span>
                    </div>
                    <div className="metric-value">{entry.meta.split(' - ')[0].trim()}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="paper-sheet sheet-pad route-atlas">
              <div className="eyebrow">Nearby route teaser</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 650, letterSpacing: '-0.04em', marginTop: 10 }}>
                Tonight&apos;s district feels like a route, not a coupon wall.
              </div>
              <div className="route-points">
                {consumerRoutes.slice(0, 2).map((route) => (
                  <div key={route.title} className={`route-stop ${route.complete ? 'is-complete' : ''}`}>
                    <div className="route-stop-copy">
                      <div className="row-title">{route.title}</div>
                      <div className="row-subtitle">{route.subtitle}</div>
                    </div>
                    <div className="row-meta">{route.meta}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        <SignalRibbon items={ribbonItems} />

        <div className="split-grid" style={{ marginTop: 18 }}>
          <section className="list-sheet">
            {loading ? (
              <div style={{ padding: 22 }}>
                <div className="loading-pulse" />
                <div className="loading-pulse" style={{ marginTop: 10 }} />
                <div className="loading-pulse" style={{ marginTop: 10 }} />
              </div>
            ) : (
              passbookRows.map((entry) => (
                <div key={entry.id} className="passbook-entry">
                  <div className="row-copy">
                    <div className="row-title">{entry.title}</div>
                    <div className="row-subtitle">{entry.subtitle}</div>
                  </div>
                  <div className="row-meta">
                    <div>{entry.meta}</div>
                    <div className="tone-copper" style={{ marginTop: 6 }}>{entry.status}</div>
                  </div>
                </div>
              ))
            )}
          </section>

          <section className="ink-sheet sheet-pad">
            <div className="eyebrow">
              <TrendUp size={18} />
              Why this spreads
            </div>
            <div style={{ fontSize: '1.55rem', fontWeight: 650, letterSpacing: '-0.04em', marginTop: 10 }}>
              A poster-like first screen is doing the job of marketing.
            </div>
            <p className="sheet-copy" style={{ marginTop: 12 }}>
              The reward is visible, the next action is obvious, and the route hint makes the product feel bigger than one merchant.
            </p>
            <div className="metric-stack">
              <div className="metric-line">
                <div className="metric-label">
                  <strong>Truth event</strong>
                  <span>Merchant-confirmed redemption, not vanity impressions.</span>
                </div>
                <div className="metric-value">Counter</div>
              </div>
              <div className="metric-line">
                <div className="metric-label">
                  <strong>Reward truth</strong>
                  <span>Merchant-funded, no platform cash liability.</span>
                </div>
                <div className="metric-value">Safe</div>
              </div>
              <div className="metric-line">
                <div className="metric-label">
                  <strong>Launch fit</strong>
                  <span>PWA-first and walkable in a dense district.</span>
                </div>
                <div className="metric-value">Nepal</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
