import { CheckCircle, Circle, WarningCircle } from '@phosphor-icons/react/dist/ssr';
import type { CSSProperties } from 'react';
import type { NormalizedReceiptProof, ProofSignature } from '@/lib/proof/types';
import { signatureValue } from '@/lib/proof/links';

type StepStatus = 'verified' | 'pending' | 'failed' | 'stale';

function hasSignature(value: ProofSignature | undefined) {
  return Boolean(signatureValue(value));
}

function icon(status: StepStatus) {
  if (status === 'verified') return <CheckCircle size={20} weight="fill" />;
  if (status === 'failed') return <WarningCircle size={20} weight="fill" />;
  return <Circle size={20} weight="duotone" />;
}

export function ProofTimeline({ proof }: { proof: NormalizedReceiptProof }) {
  const signatures = proof.manifest.signatures ?? {};
  const gauntletOk = typeof proof.gauntlet.summary?.blocked === 'number' &&
    proof.gauntlet.summary.blocked === proof.gauntlet.summary.totalCases &&
    proof.gauntlet.summary.missing === 0 &&
    proof.gauntlet.summary.failed === 0;
  const steps: Array<{ label: string; phase: string; status: StepStatus }> = [
    { label: 'Campaign funded', phase: 'Before visit', status: hasSignature(signatures.fundGrowthBounty) ? 'verified' : 'pending' },
    { label: 'Visit pass issued', phase: 'Before visit', status: hasSignature(signatures.issueClaimPass) ? 'verified' : 'pending' },
    { label: 'Terminal enrolled', phase: 'Before visit', status: hasSignature(signatures.enrollTerminalDevice) ? 'verified' : 'pending' },
    { label: 'Receipt co-signed', phase: 'At counter', status: hasSignature(signatures.recordCausalReceipt) && proof.verifier.terminalVerified && proof.verifier.visitorVerified ? 'verified' : 'pending' },
    { label: 'Nullifier recorded', phase: 'At counter', status: proof.verifier.nullifierVerified ? 'verified' : 'pending' },
    { label: 'Reward settled', phase: 'At counter', status: hasSignature(signatures.settleReceiptReward) && proof.verifier.settlementVerified ? 'verified' : 'pending' },
    { label: 'Fraud replay rejected', phase: 'Attack check', status: gauntletOk ? 'verified' : proof.health === 'failed' ? 'failed' : 'pending' },
  ];

  return (
    <ol className="relative flex flex-col gap-6 w-full before:absolute before:inset-y-3 before:left-[11px] before:w-0.5 before:bg-gray-100">
      {steps.map((step, index) => (
        <li
          key={step.label}
          className={`relative flex items-start gap-4 animate-[fadeInUp_0.5s_ease-out_forwards] ${
            step.status === 'verified' ? 'text-gray-900' :
            step.status === 'failed' ? 'text-rose-600' :
            'text-gray-400'
          }`}
          style={{ animationDelay: `${index * 80}ms`, opacity: 0 } as CSSProperties}
        >
          <div className={`relative z-10 flex items-center justify-center bg-white mt-0.5 ${
            step.status === 'verified' ? 'text-emerald-500' :
            step.status === 'failed' ? 'text-rose-500' :
            'text-gray-300'
          }`}>
            {icon(step.status)}
          </div>
          <div className="flex flex-col gap-1 items-start cursor-default">
            <span className={`text-[15px] font-bold leading-none ${
               step.status === 'verified' ? 'text-gray-900' :
               step.status === 'failed' ? 'text-rose-900' :
               'text-gray-500'
            }`}>
              {step.label}
            </span>
            <span className="text-xs font-semibold tracking-widest uppercase opacity-60">
              {step.phase}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}
