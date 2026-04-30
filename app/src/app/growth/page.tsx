import { getAutomatedWeeklyMerchantReports, getCampaignRecommendations, getMerchantHealthScores, getOnboardingConversion, getPaidConversionSprint, getWeeklyGrowthReview } from '@/lib/launch/server';

export default async function GrowthPage() {
  const onboarding = await getOnboardingConversion();
  const health = await getMerchantHealthScores();
  const recommendations = await getCampaignRecommendations();
  const reports = await getAutomatedWeeklyMerchantReports();
  const paid = await getPaidConversionSprint();
  const growth = await getWeeklyGrowthReview();

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Growth ops</div>
            <h1 className="surface-title">Onboarding conversion, merchant health, recommendations, and paid asks.</h1>
            <p className="surface-subtitle">Live {growth.live}, active {growth.active}, paid {growth.paid}, churn-risk {growth.churnRisk}.</p>
          </div>
        </div>

        <div className="merchant-grid">
          <section className="paper-sheet sheet-pad">
            <div className="eyebrow">Onboarding conversion</div>
            <p className="sheet-copy">Median setup path: {onboarding.setupTimeMinutes} minutes.</p>
            <div className="campaign-sequence">
              {onboarding.dropOffs.map((row) => (
                <div className="campaign-sequence-step" key={row.step}><span>{row.count}</span><div><strong>{row.step}</strong><p>{row.lostFromPrior} lost from prior step.</p></div></div>
              ))}
            </div>
          </section>

          <section className="paper-sheet sheet-pad">
            <div className="eyebrow">Merchant health</div>
            <div className="campaign-sequence">
              {health.map((row) => (
                <div className="campaign-sequence-step" key={row.merchant}><span>{row.score}</span><div><strong>{row.merchant}</strong><p>{row.status}</p></div></div>
              ))}
            </div>
          </section>
        </div>

        <section className="ticket-sheet sheet-pad" style={{ marginTop: 18 }}>
          <div className="eyebrow">Recommendations and paid conversion</div>
          <div className="campaign-sequence">
            {recommendations.map((item) => (
              <div className="campaign-sequence-step" key={item.type}><span>{item.type.slice(0, 2).toUpperCase()}</span><div><strong>{item.type}</strong><p>{item.recommendation}</p></div></div>
            ))}
            {reports.map((report) => (
              <div className="campaign-sequence-step" key={report.merchant}><span>ROI</span><div><strong>{report.merchant}</strong><p>{report.subject}. {report.nextAction}</p></div></div>
            ))}
          </div>
          <p className="ticket-note" style={{ marginTop: 14 }}>{paid.ask}: {paid.target} targets.</p>
        </section>
      </div>
    </div>
  );
}
