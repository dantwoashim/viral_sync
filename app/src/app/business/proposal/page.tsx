import { getPaidPilotProposal } from '@/lib/launch/server';

export default function PaidPilotProposalPage() {
  const proposal = getPaidPilotProposal();
  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Paid pilot proposal</div>
            <h1 className="surface-title">{proposal.pricing}</h1>
            <p className="surface-subtitle">{proposal.closeAsk}</p>
          </div>
        </div>
        <section className="paper-sheet sheet-pad">
          <div className="campaign-sequence">
            {proposal.successTerms.map((term, index) => (
              <div className="campaign-sequence-step" key={term}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div><strong>Success term</strong><p>{term}</p></div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
