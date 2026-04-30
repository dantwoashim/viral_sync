import { getActivationRedesign, getChurnAnalysis, getMerchantSuccessPlaybooks, getPartnerNetworkExpansionPlan, getPartnerNetworkHardening, getPartnerNetworkIntegration, getPartnerNetworkMeasurement, getPartnerNetworkPilot, getRecurringCampaignTemplates, getRetentionCaseStudy, getStaffAdherenceTools, getWeeklyRetentionReview } from '@/lib/launch/server';

export default async function RetentionPage() {
  const churn = await getChurnAnalysis();
  const activation = getActivationRedesign();
  const playbooks = getMerchantSuccessPlaybooks();
  const recurring = getRecurringCampaignTemplates();
  const staff = getStaffAdherenceTools();
  const caseStudy = await getRetentionCaseStudy();
  const review = await getWeeklyRetentionReview();
  const partnerPlan = getPartnerNetworkExpansionPlan();
  const partnerIntegration = await getPartnerNetworkIntegration();
  const hardening = getPartnerNetworkHardening();
  const measurement = await getPartnerNetworkMeasurement();
  const pilot = await getPartnerNetworkPilot();

  return (
    <div className="surface"><div className="surface-inner">
      <div className="surface-header"><div className="surface-title-block"><div className="eyebrow">Retention</div><h1 className="surface-title">Merchant retention and partner expansion.</h1><p className="surface-subtitle">{review.adjustment}</p></div></div>
      <div className="merchant-grid">
        <section className="paper-sheet sheet-pad"><div className="ticket-title">Retention ops</div><div className="campaign-sequence">{playbooks.map((row) => <div className="campaign-sequence-step" key={row.scenario}><span>PB</span><div><strong>{row.scenario}</strong><p>{row.action}</p></div></div>)}</div><p className="sheet-copy" style={{ marginTop: 12 }}>Activation {activation.beforeMinutes}m to {activation.afterMinutes}m. Staff: {staff.terminalAccess}.</p></section>
        <section className="paper-sheet sheet-pad"><div className="ticket-title">Partner expansion</div><p className="sheet-copy" style={{ marginTop: 12 }}>{partnerPlan.spec}</p><p className="sheet-copy" style={{ marginTop: 12 }}>Integrated: {partnerIntegration.integrated ? 'yes' : 'no'}; pilot {pilot.result}.</p><p className="sheet-copy" style={{ marginTop: 12 }}>Hardening: {hardening.errorStates.join(', ')}.</p></section>
      </div>
      <section className="ticket-sheet sheet-pad" style={{ marginTop: 18 }}><div className="ticket-title">{caseStudy.merchant}</div><p className="ticket-note" style={{ marginTop: 12 }}>{caseStudy.story}</p><p className="ticket-note" style={{ marginTop: 12 }}>Low-health merchants: {churn.lowHealthMerchants.join(', ') || 'none'}. Recurring templates: {recurring.map((item) => item.cadence).join(', ')}. Partner metrics: {measurement.analytics.length}.</p></section>
    </div></div>
  );
}
