import { getCampaignTemplates } from '@/lib/launch/server';

export default function CampaignTemplatesPage() {
  const templates = getCampaignTemplates();

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Campaign templates</div>
            <h1 className="surface-title">Cafe, QSR, hostel, and creator campaigns without bespoke code.</h1>
            <p className="surface-subtitle">
              Day 88 gives operators reusable templates for faster merchant #2 and #3 launches.
            </p>
          </div>
        </div>

        <div className="merchant-grid">
          {templates.map((template) => (
            <section className="paper-sheet sheet-pad" key={template.category}>
              <div className="eyebrow">{template.category}</div>
              <div className="ticket-title" style={{ marginTop: 10 }}>{template.title}</div>
              <p className="sheet-copy" style={{ marginTop: 10 }}>{template.reward}</p>
              <div className="metric-stack">
                <div className="metric-line">
                  <div className="metric-label"><strong>Goal</strong><span>{template.bestFor}</span></div>
                  <div className="metric-value">{template.referralGoal}</div>
                </div>
                <div className="metric-line">
                  <div className="metric-label"><strong>Window</strong><span>Hours after claim.</span></div>
                  <div className="metric-value">{template.redemptionWindowHours}h</div>
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
