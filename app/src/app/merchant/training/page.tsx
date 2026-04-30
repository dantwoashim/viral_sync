import Link from 'next/link';

const practiceRows = [
  { label: 'Practice code', value: 'TRN-101', note: 'Fake code used to rehearse scanner framing and manual fallback.' },
  { label: 'Challenge result', value: 'Signed', note: 'Staff sees a signed challenge before confirming the counter visit.' },
  { label: 'Receipt mode', value: 'Training only', note: 'No customer reward, ledger mutation, or receipt settlement is produced.' },
];

export default function MerchantTrainingPage() {
  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Staff training mode</div>
            <h1 className="surface-title">Practice the scan-to-confirm flow before customers arrive.</h1>
            <p className="surface-subtitle">
              Day 73 adds a safe rehearsal lane so cashiers can learn code framing, challenge checks, and handoff language without touching production rewards.
            </p>
          </div>
        </div>

        <div className="merchant-grid">
          <section className="paper-sheet sheet-pad">
            <div className="eyebrow">Counter drill</div>
            <div className="ticket-title" style={{ marginTop: 10 }}>Visitor says they have a Viral Sync code.</div>
            <div className="campaign-sequence">
              <div className="campaign-sequence-step">
                <span>01</span>
                <div>
                  <strong>Open scanner</strong>
                  <p>Ask for the QR or type the six-character code if the camera misses.</p>
                </div>
              </div>
              <div className="campaign-sequence-step">
                <span>02</span>
                <div>
                  <strong>Check challenge</strong>
                  <p>Confirm the live challenge is not expired and the customer is physically at the counter.</p>
                </div>
              </div>
              <div className="campaign-sequence-step">
                <span>03</span>
                <div>
                  <strong>Confirm once</strong>
                  <p>One successful confirmation creates the receipt; repeated taps should be treated as a replay.</p>
                </div>
              </div>
            </div>
            <Link className="vs-link-chip" href="/merchant/scan" style={{ marginTop: 18 }}>Open live scanner</Link>
          </section>

          <section className="ticket-sheet sheet-pad">
            <div className="eyebrow">Training payload</div>
            <div className="metric-stack">
              {practiceRows.map((row) => (
                <div className="metric-line" key={row.label}>
                  <div className="metric-label">
                    <strong>{row.label}</strong>
                    <span>{row.note}</span>
                  </div>
                  <div className="metric-value">{row.value}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
