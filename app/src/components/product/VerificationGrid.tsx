import type { NormalizedReceiptProof } from '@/lib/proof/types';

function labelFromKey(value: string) {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (char) => char.toUpperCase());
}

export function VerificationGrid({ proof }: { proof: NormalizedReceiptProof }) {
  const groups: Array<[string, Record<string, boolean> | undefined]> = [
    ['Terminal', proof.verifier.terminalChecks],
    ['Lineage', proof.verifier.lineageChecks],
    ['Settlement', proof.verifier.settlementChecks],
    ['Nullifier', proof.verifier.nullifierChecks],
    ['Token account', proof.verifier.tokenAccountChecks],
  ];

  const checks = groups.flatMap(([group, entries]) =>
    Object.entries(entries ?? {}).map(([label, ok]) => ({ group, label, ok })),
  );

  return (
    <div className="verification-grid">
      {checks.length > 0 ? checks.map((check) => (
        <div className="verification-cell" data-ok={check.ok === true} key={`${check.group}-${check.label}`}>
          <span>{check.ok === true ? 'Passed' : 'Pending'}</span>
          <strong>{labelFromKey(check.label)}</strong>
          <small>{check.group}</small>
        </div>
      )) : (
        <div className="verification-cell" data-ok={false}>
          <span>Pending</span>
          <strong>Verifier checks unavailable</strong>
          <small>Proof artifact missing structured checks</small>
        </div>
      )}
    </div>
  );
}
