import Link from 'next/link';
import { getWeeklyIterationReview, getRelayerPolicy } from '@/lib/launch/server';

export default async function BlinksReviewPage() {
  const review = await getWeeklyIterationReview();
  const policy = getRelayerPolicy();

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Blinks review</div>
            <h1 className="surface-title">Before/after funnel and receipt verification Action readiness.</h1>
            <p className="surface-subtitle">
              Day 98 checks whether Blink receipt verification helps the pilot or adds confusion.
            </p>
          </div>
        </div>

        <div className="merchant-grid">
          <section className="paper-sheet sheet-pad">
            <div className="eyebrow">Before</div>
            <div className="campaign-sequence">
              {review.before.map((row, index) => (
                <div className="campaign-sequence-step" key={row.stage}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div><strong>{row.stage}</strong><p>{row.note}</p></div>
                </div>
              ))}
            </div>
          </section>

          <section className="paper-sheet sheet-pad">
            <div className="eyebrow">After</div>
            <div className="campaign-sequence">
              {review.after.map((row) => (
                <div className="campaign-sequence-step" key={row.stage}>
                  <span>{row.rate}%</span>
                  <div><strong>{row.stage}</strong><p>{row.note}</p></div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="ticket-sheet sheet-pad" style={{ marginTop: 18 }}>
          <div className="eyebrow">Relayer policy</div>
          <div className="ticket-title" style={{ marginTop: 10 }}>Receipt verification is the selected Action use case.</div>
          <p className="ticket-note" style={{ marginTop: 14 }}>
            Allowed instruction: {policy.allowedInstructions.join(', ')}. Sponsored API requires service auth, signed user intent, and simulation.
          </p>
          <Link className="vs-link-chip" href="/api/launch/relayer/policy" style={{ marginTop: 18 }}>Open policy JSON</Link>
        </section>
      </div>
    </div>
  );
}
