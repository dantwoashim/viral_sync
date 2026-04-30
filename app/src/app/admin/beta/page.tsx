import {
  getCappedBetaDeployment,
  getExternalReviewPacket,
  getFailureRecoveryPlan,
  getHighSeverityReviewFixes,
  getMerchantPipeline,
  getProofAssets,
  getPublishedTechnicalDocs,
  getRealMerchantCampaignRunbook,
  getWeeklyBetaMemo,
  getWeeklyBetaReview,
} from '@/lib/launch/server';

export default async function BetaOpsPage() {
  const review = await getWeeklyBetaReview();
  const deployment = getCappedBetaDeployment();
  const campaign = getRealMerchantCampaignRunbook();
  const proof = await getProofAssets();
  const recovery = getFailureRecoveryPlan();
  const tech = getPublishedTechnicalDocs();
  const memo = await getWeeklyBetaMemo();
  const pipeline = getMerchantPipeline();
  const external = getExternalReviewPacket();
  const fixes = getHighSeverityReviewFixes();

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Beta ops</div>
            <h1 className="surface-title">{review.recommendation}</h1>
            <p className="surface-subtitle">{review.reason}</p>
          </div>
        </div>

        <div className="merchant-grid">
          <section className="paper-sheet sheet-pad">
            <div className="eyebrow">External review / fixes</div>
            <div className="campaign-sequence">
              {external.scope.map((item, index) => (
                <div className="campaign-sequence-step" key={item}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{item}</strong><p>{external.request}</p></div></div>
              ))}
              {fixes.map((fix) => (
                <div className="campaign-sequence-step" key={fix.issue}><span>HI</span><div><strong>{fix.issue}</strong><p>{fix.fix}. Test: {fix.test}.</p></div></div>
              ))}
            </div>
          </section>

          <section className="paper-sheet sheet-pad">
            <div className="eyebrow">Capped deployment</div>
            <div className="ticket-title" style={{ marginTop: 10 }}>{deployment.environment}</div>
            <p className="sheet-copy" style={{ marginTop: 10 }}>Program {deployment.program}; cap NPR {deployment.appCaps.cappedFundsNpr}; allowlist {deployment.appCaps.allowlistedMerchants.join(', ')}.</p>
            <div className="campaign-sequence">
              {deployment.checklist.map((item, index) => (
                <div className="campaign-sequence-step" key={item}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{item}</strong><p>Required before deployment.</p></div></div>
              ))}
            </div>
          </section>
        </div>

        <section className="ticket-sheet sheet-pad" style={{ marginTop: 18 }}>
          <div className="eyebrow">Real merchant campaign</div>
          <div className="ticket-title" style={{ marginTop: 10 }}>{campaign.merchant} / NPR {campaign.budgetNpr}</div>
          <p className="ticket-note" style={{ marginTop: 14 }}>{campaign.staff}; target {campaign.targetRedemptions} redemptions.</p>
        </section>

        <div className="merchant-grid" style={{ marginTop: 18 }}>
          <section className="paper-sheet sheet-pad">
            <div className="eyebrow">Proof assets and recovery</div>
            <p className="sheet-copy">{proof.txLinks.length} tx references, {proof.graphNodeCount} graph nodes. Recovery: {recovery.failedTxRetry}</p>
            <div className="campaign-sequence">
              {recovery.supportActions.map((action) => (
                <div className="campaign-sequence-step" key={action}><span>SR</span><div><strong>{action}</strong><p>Support action for failed or pending states.</p></div></div>
              ))}
            </div>
          </section>

          <section className="paper-sheet sheet-pad">
            <div className="eyebrow">Technical docs</div>
            <p className="sheet-copy">Program {tech.programId}</p>
            <div className="campaign-sequence">
              {tech.accounts.slice(0, 4).map((account) => (
                <div className="campaign-sequence-step" key={account}><span>AC</span><div><strong>{account}</strong><p>{tech.limitations.join(', ')}</p></div></div>
              ))}
            </div>
          </section>
        </div>

        <section className="paper-sheet sheet-pad" style={{ marginTop: 18 }}>
          <div className="eyebrow">Weekly beta memo and pipeline</div>
          <div className="ticket-title" style={{ marginTop: 10 }}>{pipeline.total} leads / {pipeline.bookedDemos} demos booked</div>
          <p className="sheet-copy" style={{ marginTop: 10 }}>Costs: NPR {memo.costs.totalCostNpr}; feedback: {memo.merchantFeedback.join(' ')}</p>
        </section>
      </div>
    </div>
  );
}
