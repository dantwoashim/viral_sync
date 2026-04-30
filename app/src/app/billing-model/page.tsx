import { getAutomatedInvoiceGeneration, getDunningReminders, getFeeModelFinalization, getPaidMerchantPush, getPaymentCollectionIntegration, getRevenueDashboard, getWeeklyBillingReview } from '@/lib/launch/server';

export default async function BillingModelPage() {
  const model = getFeeModelFinalization();
  const invoice = await getAutomatedInvoiceGeneration();
  const collection = getPaymentCollectionIntegration();
  const dunning = getDunningReminders();
  const revenue = await getRevenueDashboard();
  const push = await getPaidMerchantPush();
  const review = await getWeeklyBillingReview();
  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Fee model</div>
            <h1 className="surface-title">Usage fee, take rate, and SaaS tiers.</h1>
            <p className="surface-subtitle">{model.usageFee} Billing review: {review.paidConversion}.</p>
          </div>
        </div>
        <section className="metric-stack">
          {model.saasTiers.map((tier) => (
            <div className="metric-line" key={tier.tier}><div className="metric-label"><strong>{tier.tier}</strong><span>{tier.includedVisits} included visits.</span></div><div className="metric-value">{tier.monthlyNpr}</div></div>
          ))}
        </section>
        <section className="ticket-sheet sheet-pad" style={{ marginTop: 18 }}>
          <div className="ticket-title">{model.takeRate}</div>
          <p className="ticket-note" style={{ marginTop: 12 }}>{model.interviewPrompts.join(' ')}</p>
        </section>
        <section className="metric-stack" style={{ marginTop: 18 }}>
          <div className="metric-line"><div className="metric-label"><strong>Usage fees</strong><span>{invoice.invoiceId}</span></div><div className="metric-value">{revenue.usageFeesNpr}</div></div>
          <div className="metric-line"><div className="metric-label"><strong>Platform take</strong><span>{collection.selected}</span></div><div className="metric-value">{revenue.platformTakeNpr}</div></div>
          <div className="metric-line"><div className="metric-label"><strong>Paid targets</strong><span>{push.ask}</span></div><div className="metric-value">{push.targetMerchants}</div></div>
        </section>
        <section className="ticket-sheet sheet-pad" style={{ marginTop: 18 }}>
          <div className="ticket-title">Dunning</div>
          <p className="ticket-note" style={{ marginTop: 12 }}>{dunning.reminders[0]}</p>
          <p className="ticket-note" style={{ marginTop: 12 }}>{dunning.merchantUxReview}</p>
        </section>
      </div>
    </div>
  );
}
