import Link from 'next/link';
import { Prohibit, ShieldCheck } from '@phosphor-icons/react/dist/ssr';
import type { CivicMarket } from '@/lib/civic/types';

export function ReplayRejectionPanel({ market }: { market: CivicMarket }) {
  return (
    <section className="min-w-0 rounded-lg border border-[rgba(183,57,47,0.22)] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <Prohibit size={24} weight="duotone" className="text-[var(--civic-red)]" />
        <div>
          <h2 className="text-xl font-semibold tracking-normal text-[var(--civic-ink)]">Replay rejection</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--civic-muted)]">Duplicate settlement attempts are rejected by the published nullifier evidence.</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <ReplayFact label="Nullifier PDA" value={market.evidence.nullifierPda} />
        <ReplayFact label="Negative paths" value={`${market.evidence.gauntletLabel} rejected`} />
        <ReplayFact label="Forecast payout link" value="false" />
      </div>
      <details className="mt-5 rounded-md border border-[var(--civic-line)] bg-[var(--civic-paper)] p-4">
        <summary className="cursor-pointer text-sm font-semibold text-[var(--civic-ink)]">
          Why the replay fails
        </summary>
        <ol className="mt-3 grid gap-2 text-sm leading-6 text-[var(--civic-muted)]">
          <li>1. The first valid action creates a receipt and nullifier record.</li>
          <li>2. A duplicate attempt reuses the same nullifier path.</li>
          <li>3. The negative-path artifact records that duplicate settlement is rejected without account mutation.</li>
        </ol>
      </details>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Link className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--civic-ink)] px-4 text-sm font-semibold text-white" href="/proofs/civic-fraud-gauntlet.json">
          Open replay artifact <ShieldCheck size={16} weight="bold" />
        </Link>
        <Link className="inline-flex h-11 items-center justify-center rounded-md border border-[var(--civic-line-strong)] bg-white px-4 text-sm font-semibold text-[var(--civic-ink)]" href="/ledger">
          View ledger
        </Link>
      </div>
    </section>
  );
}

function ReplayFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-[var(--civic-wash)] px-3 py-2">
      <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--civic-muted)]">{label}</span>
      <strong className="mt-1 block break-all text-sm font-semibold text-[var(--civic-ink)]">{value}</strong>
    </div>
  );
}
