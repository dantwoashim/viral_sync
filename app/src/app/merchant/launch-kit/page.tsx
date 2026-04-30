import Link from 'next/link';
import { getMerchantSummary } from '@/lib/launch/server';

export default async function MerchantLaunchKitPage() {
  const summary = await getMerchantSummary();
  const shareCopy = `Bring ${summary.offer.referralGoal} friends to ${summary.merchant.name} and unlock: ${summary.offer.reward}. Ask the counter for Viral Sync.`;

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Launch kit</div>
            <h1 className="surface-title">Day 74 materials for the first merchant push.</h1>
            <p className="surface-subtitle">
              Counter cards, poster copy, and social captions are ready for a QR-first pilot without promising more than the product can prove.
            </p>
          </div>
        </div>

        <div className="merchant-grid">
          <section className="paper-sheet sheet-pad">
            <div className="eyebrow">Counter card</div>
            <div className="ticket-title" style={{ marginTop: 10 }}>{summary.merchant.name}</div>
            <p className="ticket-note" style={{ marginTop: 14 }}>
              Scan, share, bring friends, and let staff confirm the reward at the counter.
            </p>
            <div className="metric-stack">
              <div className="metric-line">
                <div className="metric-label">
                  <strong>Reward</strong>
                  <span>{summary.offer.reward}</span>
                </div>
                <div className="metric-value">{summary.offer.referralGoal}</div>
              </div>
              <div className="metric-line">
                <div className="metric-label">
                  <strong>QR destination</strong>
                  <span>Current invite and redeem screens use scanner-grade QR images.</span>
                </div>
                <div className="metric-value">Live</div>
              </div>
            </div>
            <Link className="vs-link-chip" href="/invite" style={{ marginTop: 18 }}>Open invite QR</Link>
          </section>

          <section className="paper-sheet sheet-pad">
            <div className="eyebrow">WhatsApp / Instagram copy</div>
            <div className="field-stack" style={{ marginTop: 14 }}>
              <div className="field">
                <label htmlFor="poster-copy">Poster headline</label>
                <textarea id="poster-copy" readOnly value={`Your friends can unlock a real ${summary.merchant.name} reward.`} />
              </div>
              <div className="field">
                <label htmlFor="share-copy">Social caption</label>
                <textarea id="share-copy" readOnly value={shareCopy} />
              </div>
              <div className="field-helper">Use this copy with a table QR and staff training mode before the live shift.</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
