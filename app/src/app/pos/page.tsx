import { getOneMerchantPosPilot, getPosAdapterSkeleton, getPosFailureHandling, getPosReconciliationUi, getSelectedPosImportPath, getWeeklyPosReview } from '@/lib/launch/server';

export default async function PosPage() {
  const selected = getSelectedPosImportPath();
  const adapter = getPosAdapterSkeleton();
  const reconciliation = getPosReconciliationUi();
  const failures = getPosFailureHandling();
  const pilot = await getOneMerchantPosPilot();
  const review = await getWeeklyPosReview();

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">POS import</div>
            <h1 className="surface-title">{selected.selected}</h1>
            <p className="surface-subtitle">{selected.reason} Decision: {review.decision}.</p>
          </div>
        </div>
        <div className="merchant-grid">
          <section className="paper-sheet sheet-pad">
            <div className="ticket-title">Adapter skeleton</div>
            <div className="campaign-sequence">
              {adapter.importModes.map((mode) => (
                <div className="campaign-sequence-step" key={mode}><span>POS</span><div><strong>{mode}</strong><p>{adapter.auth.mode}</p></div></div>
              ))}
            </div>
          </section>
          <section className="paper-sheet sheet-pad">
            <div className="ticket-title">Reconciliation</div>
            <div className="metric-stack">
              <div className="metric-line"><div className="metric-label"><strong>Matched</strong><span>Sales matched to redemptions.</span></div><div className="metric-value">{reconciliation.matched.length}</div></div>
              <div className="metric-line"><div className="metric-label"><strong>Unmatched</strong><span>Needs merchant review.</span></div><div className="metric-value">{reconciliation.unmatched.length}</div></div>
              <div className="metric-line"><div className="metric-label"><strong>Imported</strong><span>One merchant pilot rows.</span></div><div className="metric-value">{pilot.metrics.importedRows}</div></div>
            </div>
          </section>
        </div>
        <section className="ticket-sheet sheet-pad" style={{ marginTop: 18 }}>
          <div className="ticket-title">Failure handling</div>
          <p className="ticket-note" style={{ marginTop: 12 }}>{failures.outage}</p>
          <p className="ticket-note" style={{ marginTop: 12 }}>{failures.duplicateWebhook}</p>
          <p className="ticket-note" style={{ marginTop: 12 }}>{failures.badData}</p>
        </section>
      </div>
    </div>
  );
}
