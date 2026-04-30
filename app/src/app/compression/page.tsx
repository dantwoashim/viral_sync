import { getCompressionCostModel, getCompressionDesign, getCompressionFallbackPlan, getCompressionTreeDemo, getCompressionWeeklyReview, getMerkleLeafSchema } from '@/lib/launch/server';

export default async function CompressionPage() {
  const design = getCompressionDesign();
  const schema = getMerkleLeafSchema();
  const tree = await getCompressionTreeDemo();
  const cost = getCompressionCostModel();
  const fallback = getCompressionFallbackPlan();
  const review = getCompressionWeeklyReview();

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Compression prototype</div>
            <h1 className="surface-title">{design.scope}</h1>
            <p className="surface-subtitle">{design.costComplexityReview} Root: {tree.root.slice(0, 16)}.</p>
          </div>
        </div>
        <div className="merchant-grid">
          <section className="paper-sheet sheet-pad">
            <div className="ticket-title">Compressed fields</div>
            <div className="campaign-sequence">
              {schema.fields.map((field) => (
                <div className="campaign-sequence-step" key={field.name}><span>v{schema.leafVersion}</span><div><strong>{field.name}</strong><p>{field.description}</p></div></div>
              ))}
            </div>
          </section>
          <section className="paper-sheet sheet-pad">
            <div className="ticket-title">Hot state stays live</div>
            <div className="campaign-sequence">
              {design.staysHot.map((item) => (
                <div className="campaign-sequence-step" key={item}><span>HOT</span><div><strong>{item}</strong><p>Not compressed in this design.</p></div></div>
              ))}
            </div>
          </section>
        </div>
        <section className="ticket-sheet sheet-pad" style={{ marginTop: 18 }}>
          <div className="ticket-title">Proof fields</div>
          <p className="ticket-note" style={{ marginTop: 12 }}>{schema.proofFields.join(', ')}</p>
          <p className="ticket-note" style={{ marginTop: 12 }}>{schema.noPiiReview}</p>
        </section>
        <section className="ticket-sheet sheet-pad" style={{ marginTop: 18 }}>
          <div className="ticket-title">Cost model and fallback</div>
          <p className="ticket-note" style={{ marginTop: 12 }}>{cost.recommendation}</p>
          <p className="ticket-note" style={{ marginTop: 12 }}>{fallback.compressionFailureMode}</p>
          <p className="ticket-note" style={{ marginTop: 12 }}>Weekly decision: {review.decision}.</p>
        </section>
      </div>
    </div>
  );
}
