import { getSolanaPayPrototype } from '@/lib/launch/server';

export default function SolanaPayEvidencePage() {
  const prototype = getSolanaPayPrototype();
  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Solana Pay prototype</div>
            <h1 className="surface-title">{prototype.label}</h1>
            <p className="surface-subtitle">Optional QR/payment reference path for stronger payment evidence.</p>
          </div>
        </div>
        <section className="paper-sheet sheet-pad">
          <div className="field-stack">
            <div className="field"><label>Reference</label><input readOnly value={prototype.reference} /></div>
            <div className="field"><label>QR payload</label><textarea readOnly value={prototype.qrPayload} /></div>
            <div className="field"><label>Callback</label><input readOnly value={prototype.callbackUrl} /></div>
          </div>
        </section>
      </div>
    </div>
  );
}
