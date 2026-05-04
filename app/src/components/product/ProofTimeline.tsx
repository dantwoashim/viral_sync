import { CheckCircle } from '@phosphor-icons/react/dist/ssr';
import type { CSSProperties } from 'react';

export function ProofTimeline() {
  const steps = [
    'Campaign funded',
    'Visit pass issued',
    'Terminal enrolled',
    'Receipt co-signed',
    'Nullifier recorded',
    'Reward settled',
    'Fraud replay rejected',
  ];

  return (
    <ol className="proof-timeline">
      {steps.map((step, index) => (
        <li key={step} style={{ '--delay': `${index * 80}ms` } as CSSProperties}>
          <CheckCircle size={18} weight="fill" />
          <span>{step}</span>
          <small>{index < 3 ? 'Before visit' : index < 6 ? 'At counter' : 'Attack check'}</small>
        </li>
      ))}
    </ol>
  );
}
