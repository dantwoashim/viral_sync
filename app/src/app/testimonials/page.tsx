import { getPilotTestimonials } from '@/lib/launch/server';

export default function TestimonialsPage() {
  const testimonials = getPilotTestimonials();

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Testimonials</div>
            <h1 className="surface-title">Merchant, staff, and customer quotes with permission status.</h1>
            <p className="surface-subtitle">
              Day 90 creates the collection surface while keeping every quote clearly marked until permission is final.
            </p>
          </div>
        </div>

        <div className="merchant-grid">
          {testimonials.map((item) => (
            <section className="paper-sheet sheet-pad" key={item.role}>
              <div className="eyebrow">{item.role}</div>
              <div className="ticket-title" style={{ marginTop: 10 }}>{item.name}</div>
              <p className="ticket-note" style={{ marginTop: 14 }}>{item.quote}</p>
              <div className="field-helper">Permission status: {item.permission}</div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
