import { getDataRetentionDeletionProcess, getJurisdictionLocalMarketReview, getMerchantAgreementDraft, getPrivacyPolicyDraft, getPromotionTermsTemplate, getUserTermsDraft, getWeeklyLegalReview } from '@/lib/launch/server';

export default function LegalPage() {
  const promo = getPromotionTermsTemplate();
  const privacy = getPrivacyPolicyDraft();
  const merchant = getMerchantAgreementDraft();
  const user = getUserTermsDraft();
  const deletion = getDataRetentionDeletionProcess();
  const market = getJurisdictionLocalMarketReview();
  const review = getWeeklyLegalReview();

  return (
    <div className="surface"><div className="surface-inner">
      <div className="surface-header"><div className="surface-title-block"><div className="eyebrow">Legal</div><h1 className="surface-title">Promotion terms, privacy, merchant agreement, user terms, deletion, and local-market review.</h1><p className="surface-subtitle">{market.advisorCheck}</p></div></div>
      <div className="merchant-grid">
        <section className="paper-sheet sheet-pad"><div className="ticket-title">Terms pack</div><p className="sheet-copy" style={{ marginTop: 12 }}>Promotion: {promo.sections.join(', ')}.</p><p className="sheet-copy" style={{ marginTop: 12 }}>Merchant: {merchant.sections.join(', ')}.</p><p className="sheet-copy" style={{ marginTop: 12 }}>User: {user.sections.join(', ')}.</p></section>
        <section className="paper-sheet sheet-pad"><div className="ticket-title">Privacy and deletion</div><p className="sheet-copy" style={{ marginTop: 12 }}>{privacy.retention}</p><p className="sheet-copy" style={{ marginTop: 12 }}>{deletion.testRequest}</p></section>
      </div>
      <section className="ticket-sheet sheet-pad" style={{ marginTop: 18 }}><div className="ticket-title">Weekly legal review</div><p className="ticket-note" style={{ marginTop: 12 }}>Open: {review.openItems.join(', ')}. Nepal constraints: {market.constraints.join(', ')}.</p></section>
    </div></div>
  );
}
