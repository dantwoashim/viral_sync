import Link from 'next/link';
import { getBillingEvents } from '@/lib/launch/server';

export default async function InvoicesPage() {
  const events = await getBillingEvents();

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Invoices</div>
            <h1 className="surface-title">CSV/PDF-ready billing export for redemptions and settlements.</h1>
            <p className="surface-subtitle">Day 116 ships the v1 export. The PDF path is represented by the printable browser view.</p>
          </div>
        </div>
        <section className="paper-sheet sheet-pad">
          <Link className="vs-link-chip" href="/api/launch/business/invoice">Download CSV</Link>
          <div className="campaign-sequence" style={{ marginTop: 18 }}>
            {events.map((event) => (
              <div className="campaign-sequence-step" key={event.id}>
                <span>{event.status.slice(0, 2).toUpperCase()}</span>
                <div><strong>{event.type} - NPR {event.amountNpr}</strong><p>{event.merchantId} {event.receiptId ?? 'invoice'}</p></div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
