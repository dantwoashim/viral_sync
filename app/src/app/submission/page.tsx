import { getFinalDemoScript, getFinalReadmeRewritePlan, getInvestorMemo, getPaidCommitmentPushFinal, getPublicTractionPageSummary, getWeeklyTractionReviewFinal } from '@/lib/launch/server';

export default async function SubmissionPage() {
  const traction = await getPublicTractionPageSummary();
  const paid = getPaidCommitmentPushFinal();
  const memo = getInvestorMemo();
  const review = await getWeeklyTractionReviewFinal();
  const readme = getFinalReadmeRewritePlan();
  const script = getFinalDemoScript();

  return (
    <div className="surface"><div className="surface-inner">
      <div className="surface-header"><div className="surface-title-block"><div className="eyebrow">Submission</div><h1 className="surface-title">Final traction story, investor memo, README plan, and demo script.</h1><p className="surface-subtitle">{script.timingQuality}</p></div></div>
      <section className="metric-stack">
        <div className="metric-line"><div className="metric-label"><strong>Demo seconds</strong><span>{script.beats[0]}</span></div><div className="metric-value">{script.durationSeconds}</div></div>
        <div className="metric-line"><div className="metric-label"><strong>Warm merchants</strong><span>{paid.ask}</span></div><div className="metric-value">{paid.warmMerchants.length}</div></div>
        <div className="metric-line"><div className="metric-label"><strong>README sections</strong><span>{readme.externalRead}</span></div><div className="metric-value">{readme.sections.length}</div></div>
      </section>
      <section className="ticket-sheet sheet-pad" style={{ marginTop: 18 }}><div className="ticket-title">Final story</div><p className="ticket-note" style={{ marginTop: 12 }}>Traction route: {traction.route}. Strongest numbers: {review.strongestNumbers.join(', ')}.</p><p className="ticket-note" style={{ marginTop: 12 }}>Memo: {memo.sections.join(', ')}. Cut weak stats: {review.cutWeakStats.join(', ')}.</p></section>
    </div></div>
  );
}
