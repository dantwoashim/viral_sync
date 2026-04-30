export default function EvidenceImportPage() {
  const sample = 'receipt_id,amount_npr,timestamp\nBILL-1001,450,2026-04-29T10:00:00Z';
  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">CSV import</div>
            <h1 className="surface-title">Upload sales records and match receipt IDs or timestamps.</h1>
            <p className="surface-subtitle">POST CSV text to /api/launch/evidence/csv-import with text/csv or a JSON csv field.</p>
          </div>
        </div>
        <section className="paper-sheet sheet-pad">
          <div className="eyebrow">Sample CSV</div>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{sample}</pre>
        </section>
      </div>
    </div>
  );
}
