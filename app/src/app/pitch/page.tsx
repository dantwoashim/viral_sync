import { getFinalPitch } from '@/lib/launch/server';

export default function PitchPage() {
  const pitch = getFinalPitch();
  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Final pitch</div>
            <h1 className="surface-title">{pitch.headline}</h1>
            <p className="surface-subtitle">{pitch.positioning}</p>
          </div>
        </div>
        <section className="ticket-sheet sheet-pad">
          <div className="ticket-title">{pitch.businessModel}</div>
          <p className="ticket-note" style={{ marginTop: 14 }}>{pitch.close}</p>
        </section>
      </div>
    </div>
  );
}
