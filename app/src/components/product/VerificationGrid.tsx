import type { NormalizedReceiptProof } from '@/lib/proof/types';

export function VerificationGrid({ proof }: { proof: NormalizedReceiptProof }) {
  const checks = [
    ['Terminal account active', proof.verifier.terminalVerified],
    ['Terminal authority matched', proof.verifier.terminalVerified],
    ['Visitor signed', proof.verifier.visitorVerified],
    ['Claim pass consumed', proof.verifier.lineageVerified],
    ['Lineage hash matched', proof.verifier.lineageVerified],
    ['Settlement paid', proof.verifier.settlementVerified],
    ['Nullifier recorded', proof.verifier.nullifierVerified],
  ];

  return (
    <div className="verification-grid">
      {checks.map(([label, ok]) => (
        <div className="verification-cell" data-ok={ok === true} key={String(label)}>
          <span>{ok === true ? 'Passed' : 'Pending'}</span>
          <strong>{label}</strong>
          <small>Source: verifier output</small>
        </div>
      ))}
    </div>
  );
}
