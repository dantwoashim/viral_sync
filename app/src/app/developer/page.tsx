import { getDeveloperDocsV2, getDeveloperSdkPackageV2, getDeveloperSdkSurfaceV2, getExampleReceiptGraphAppV2, getVerificationApiV2, getWebhookSigningV2, getWeeklyDeveloperReviewV2 } from '@/lib/launch/server';

export default async function DeveloperPage() {
  const surface = getDeveloperSdkSurfaceV2();
  const sdk = getDeveloperSdkPackageV2();
  const verification = await getVerificationApiV2();
  const example = getExampleReceiptGraphAppV2();
  const docs = getDeveloperDocsV2();
  const webhook = getWebhookSigningV2();
  const review = getWeeklyDeveloperReviewV2();

  return (
    <div className="surface"><div className="surface-inner">
      <div className="surface-header"><div className="surface-title-block"><div className="eyebrow">Developer</div><h1 className="surface-title">SDK, public verification, examples, docs, and signed webhooks.</h1><p className="surface-subtitle">{surface.apiReview}</p></div></div>
      <div className="merchant-grid">
        <section className="paper-sheet sheet-pad"><div className="ticket-title">{surface.packageName}</div><div className="campaign-sequence">{surface.helpers.map((helper) => <div className="campaign-sequence-step" key={helper}><span>SDK</span><div><strong>{helper}</strong><p>{surface.mutationPolicy}</p></div></div>)}</div></section>
        <section className="paper-sheet sheet-pad"><div className="ticket-title">Verification API</div><p className="sheet-copy" style={{ marginTop: 12 }}>Endpoint: {verification.endpoint}. Positive path: {verification.positivePath}.</p><p className="sheet-copy" style={{ marginTop: 12 }}>Example app: {example.route}. Webhook tamper test: {webhook.tamperTest ? 'passes' : 'fails'}.</p></section>
      </div>
      <section className="ticket-sheet sheet-pad" style={{ marginTop: 18 }}><div className="ticket-title">Developer review</div><p className="ticket-note" style={{ marginTop: 12 }}>Package tests: {sdk.tests.join(', ')}.</p><p className="ticket-note" style={{ marginTop: 12 }}>Docs: {docs.docs.join(', ')}. Decision: {review.decision}.</p></section>
    </div></div>
  );
}
