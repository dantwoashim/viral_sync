import type { FraudCase } from '@/lib/proof/types';

export function FraudCaseRow({ item }: { item: FraudCase }) {
  return (
    <details className="fraud-case-row">
      <summary>
        <span>{item.title ?? item.id}</span>
        <b>{item.expectedErrorCode ?? item.expectedError ?? 'Program rejection'}</b>
        <em>{item.observed === 'rejected' && item.expectedErrorMatched ? 'Rejected' : 'Review'}</em>
      </summary>
      <div>
        <p>{item.attack ?? item.reason ?? 'Structured attack evidence from the proof run.'}</p>
        <code>{item.actualError ?? 'No log excerpt published.'}</code>
        <small>Mutation check: {item.accountsMutationVerified ? 'passed' : 'pending'} / Source: {item.proofSource ?? 'proof artifact'}</small>
      </div>
    </details>
  );
}
