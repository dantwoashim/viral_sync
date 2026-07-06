import { CivicShell } from '@/components/civic/CivicExperience';

export default function Loading() {
  return (
    <CivicShell>
      <section className="mx-auto max-w-[1180px] px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--civic-muted)]">Loading</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-normal text-[var(--civic-ink)]">
          Preparing the civic receipt path.
        </h1>
        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {[
            ['Route', 'Opening the civic market surface.'],
            ['Ledger', 'Checking receipt evidence and public artifacts.'],
            ['Boundary', 'Keeping missing integrations visible.'],
          ].map(([label, text]) => (
            <div key={label} className="rounded-lg border border-[var(--civic-line)] bg-white p-4 shadow-sm">
              <strong className="text-sm text-[var(--civic-ink)]">{label}</strong>
              <p className="mt-2 text-sm leading-6 text-[var(--civic-muted)]">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </CivicShell>
  );
}
