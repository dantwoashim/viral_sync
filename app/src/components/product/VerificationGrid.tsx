import { CheckCircle, WarningCircle } from '@phosphor-icons/react/dist/ssr';
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
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-8 pt-8 border-t border-gray-800">
      {checks.length > 0 ? checks.map((check) => (
        <div
          className={`flex flex-col gap-2 p-5 rounded-2xl border transition-colors ${
            check.ok === true
              ? 'bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10 hover:border-emerald-500/30'
              : 'bg-rose-500/5 border-rose-500/20 hover:bg-rose-500/10 hover:border-rose-500/30'
          }`}
          key={`${check.group}-${check.label}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-md ${
              check.ok === true ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
            }`}>
              {check.ok === true ? <CheckCircle size={14} weight="fill" /> : <WarningCircle size={14} weight="fill" />}
              {check.ok === true ? 'Passed' : 'Pending'}
            </span>
          </div>
          <strong className={`text-base font-bold leading-tight ${check.ok === true ? 'text-white' : 'text-gray-300'}`}>
            {labelFromKey(check.label)}
          </strong>
          <small className="text-xs font-mono font-medium text-gray-400 tracking-widest uppercase">
            {check.group} check
          </small>
        </div>
      )) : (
        <div className="col-span-full flex flex-col items-center justify-center gap-4 p-12 rounded-3xl bg-gray-800/50 border border-gray-800 border-dashed text-center">
          <div className="flex items-center gap-2 text-rose-400 px-4 py-2 rounded-full bg-rose-500/10">
            <WarningCircle size={20} weight="fill" />
            <span className="text-sm font-bold tracking-widest uppercase">Verification Unavailable</span>
          </div>
          <strong className="text-xl font-bold text-white">Verifier checks are missing</strong>
          <p className="text-gray-400 max-w-sm">
            The proof artifact is missing the structured on-chain checks required for cryptographic verification.
          </p>
        </div>
      )}
    </div>
  );
}
