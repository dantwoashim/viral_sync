'use client';

import { Compass, FlagBanner, Path, Storefront } from '@phosphor-icons/react';
import RouteAtlas from '@/components/launch/RouteAtlas';
import SignalRibbon from '@/components/launch/SignalRibbon';
import { consumerRoutes } from '@/lib/nepalData';

export default function RoutesPage() {
  const completedCount = consumerRoutes.filter((route) => route.complete).length;

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Routes</div>
            <h1 className="surface-title">Local discovery should feel like a route, not maps software.</h1>
            <p className="surface-subtitle">
              The route layer is where the product becomes bigger than one merchant and starts feeling like a local status system.
            </p>
          </div>
        </div>

        <SignalRibbon
          items={[
            `${consumerRoutes.length} route stories in launch`,
            `${completedCount} route${completedCount === 1 ? '' : 's'} already active`,
            'Curated district loops beat generic nearby search',
            'Each stop should feel social, walkable, and memorable',
          ]}
        />

        <div className="split-grid" style={{ marginTop: 18 }}>
          <section className="route-sheet sheet-pad atlas-sheet">
            <div className="eyebrow">District atlas</div>
            <div className="route-atlas-title">Thamel first, then the rest of the city unfolds.</div>
            <p className="sheet-copy" style={{ marginTop: 14 }}>
              A route is not navigation software. It is a sequence with taste: the right first stop,
              the right detour, and a finish that makes sharing feel like local status instead of coupon hunting.
            </p>

            <div className="route-fact-band">
              <div className="route-fact">
                <Compass size={18} />
                <div>
                  <strong>Start small</strong>
                  <span>One dense district is easier to make feel alive than a scattered city grid.</span>
                </div>
              </div>
              <div className="route-fact">
                <Path size={18} />
                <div>
                  <strong>Sequence matters</strong>
                  <span>The product should suggest a night, not just a merchant directory.</span>
                </div>
              </div>
              <div className="route-fact">
                <FlagBanner size={18} />
                <div>
                  <strong>Finish with proof</strong>
                  <span>Completed routes become social receipts for where the crew actually went.</span>
                </div>
              </div>
            </div>

            <RouteAtlas routes={consumerRoutes} />
          </section>

          <section className="list-sheet route-manifest">
            <div className="route-manifest-head">
              <div>
                <div className="eyebrow">Route manifest</div>
                <div className="ledger-headline">Every route needs a clear social promise.</div>
              </div>
              <div className="row-meta">
                <div>Kathmandu first</div>
                <div style={{ marginTop: 6 }}>{consumerRoutes.length} live concepts</div>
              </div>
            </div>

            {consumerRoutes.map((route, index) => (
              <div key={route.title} className={`route-stop route-stop-rich ${route.complete ? 'is-complete' : ''}`}>
                <div className={`route-stop-index ${route.complete ? 'is-complete' : ''}`}>
                  {String(index + 1).padStart(2, '0')}
                </div>
                <div className="route-stop-copy">
                  <div className="row-title">{route.title}</div>
                  <div className="row-subtitle">{route.subtitle}</div>
                </div>
                <div className="row-meta">
                  <div>{route.meta}</div>
                  <div className={`status-note ${route.complete ? 'is-ready' : 'is-progress'}`} style={{ marginTop: 8 }}>
                    {route.complete ? 'Running' : 'Drafting'}
                  </div>
                </div>
              </div>
            ))}

            <div className="route-manifest-foot">
              <Storefront size={18} />
              Routes should be curated around moments people already want to repeat: late tea, courtyard pauses, or weekend detours.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
