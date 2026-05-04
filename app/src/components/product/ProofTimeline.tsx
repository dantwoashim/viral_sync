import { CheckCircle, Circle, WarningCircle } from '@phosphor-icons/react/dist/ssr';
import type { CSSProperties } from 'react';
import type { NormalizedReceiptProof, ProofSignature } from '@/lib/proof/types';
import { signatureValue } from '@/lib/proof/links';

type StepStatus = 'verified' | 'pending' | 'failed' | 'stale';

function hasSignature(value: ProofSignature | undefined) {
  return Boolean(signatureValue(value));
}

function icon(status: StepStatus) {
  if (status === 'verified') return <CheckCircle size={18} weight="fill" />;
  if (status === 'failed') return <WarningCircle size={18} weight="fill" />;
  return <Circle size={18} />;
}

export function ProofTimeline({ proof }: { proof: NormalizedReceiptProof }) {
  const signatures = proof.manifest.signatures ?? {};
  const steps: Array<{ label: string; phase: string; status: StepStatus }> = [
    { label: 'Campaign funded', phase: 'Before visit', status: hasSignature(signatures.fundGrowthBounty) ? 'verified' : 'pending' },
    { label: 'Visit pass issued', phase: 'Before visit', status: hasSignature(signatures.issueClaimPass) ? 'verified' : 'pending' },
    { label: 'Terminal enrolled', phase: 'Before visit', status: hasSignature(signatures.enrollTerminalDevice) ? 'verified' : 'pending' },
    { label: 'Receipt co-signed', phase: 'At counter', status: hasSignature(signatures.recordCausalReceipt) && proof.verifier.terminalVerified && proof.verifier.visitorVerified ? 'verified' : 'pending' },
    { label: 'Nullifier recorded', phase: 'At counter', status: proof.verifier.nullifierVerified ? 'verified' : 'pending' },
    { label: 'Reward settled', phase: 'At counter', status: hasSignature(signatures.settleReceiptReward) && proof.verifier.settlementVerified ? 'verified' : 'pending' },
    { label: 'Fraud replay rejected', phase: 'Attack check', status: proof.health === 'verified' ? 'verified' : proof.health === 'failed' ? 'failed' : 'pending' },
  ];

  return (
    <ol className="proof-timeline">
      {steps.map((step, index) => (
        <li key={step.label} data-status={step.status} style={{ '--delay': `${index * 80}ms` } as CSSProperties}>
          {icon(step.status)}
          <span>{step.label}</span>
          <small>{step.phase}</small>
        </li>
      ))}
    </ol>
  );
}
