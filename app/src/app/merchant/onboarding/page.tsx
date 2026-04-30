import Link from 'next/link';
import SignalRibbon from '@/components/launch/SignalRibbon';
import { getMerchantSummary } from '@/lib/launch/server';

const steps = [
  {
    title: 'Organization',
    detail: 'Pilot operator: Viral Sync Nepal. Billing is held in revenue-share mode until verified value is visible.',
    status: 'Ready',
  },
  {
    title: 'Merchant',
    detail: 'Confirm the merchant identity, district, and counter location before issuing staff devices.',
    status: 'Ready',
  },
  {
    title: 'Location',
    detail: 'Launch at one front counter first so staff can learn the scanner flow without branch confusion.',
    status: 'Ready',
  },
  {
    title: 'Staff',
    detail: 'Enroll the cashier device, keep the manager PIN private, and rehearse the challenge confirmation.',
    status: 'Training',
  },
  {
    title: 'First campaign',
    detail: 'Publish one bounded offer with clear reward copy, a small referral goal, and a short redemption window.',
    status: 'Publish',
  },
];

export default async function MerchantOnboardingPage() {
  const summary = await getMerchantSummary();

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Merchant onboarding</div>
            <h1 className="surface-title">Day 71 setup path for the first live counter.</h1>
            <p className="surface-subtitle">
              Bring one merchant from blank account to trained staff and a publishable campaign without needing a back-office team.
            </p>
          </div>
        </div>

        <SignalRibbon items={['Org', 'Merchant', 'Location', 'Staff', 'First campaign']} />

        <div className="merchant-grid" style={{ marginTop: 18 }}>
          <section className="paper-sheet sheet-pad">
            <div className="eyebrow">Pilot merchant</div>
            <div className="ticket-title" style={{ marginTop: 10 }}>{summary.merchant.name}</div>
            <p className="sheet-copy" style={{ marginTop: 10 }}>
              {summary.merchant.locationLabel}, {summary.merchant.city}. Active campaign: {summary.offer.title}.
            </p>
            <div className="metric-stack">
              <div className="metric-line">
                <div className="metric-label">
                  <strong>Offer reward</strong>
                  <span>{summary.offer.reward}</span>
                </div>
                <div className="metric-value">{summary.offer.referralGoal}</div>
              </div>
              <div className="metric-line">
                <div className="metric-label">
                  <strong>Window</strong>
                  <span>Hours customers have to redeem after claim.</span>
                </div>
                <div className="metric-value">{summary.offer.redemptionWindowHours}h</div>
              </div>
            </div>
            <Link className="vs-link-chip" href="/merchant/campaigns" style={{ marginTop: 18 }}>
              Publish campaign
            </Link>
          </section>

          <section className="paper-sheet sheet-pad">
            <div className="eyebrow">Wizard checklist</div>
            <div className="campaign-sequence">
              {steps.map((step, index) => (
                <div className="campaign-sequence-step" key={step.title}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <strong>{step.title} - {step.status}</strong>
                    <p>{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
