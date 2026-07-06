import Link from 'next/link';
import { ArrowRight, CheckCircle, Fingerprint, HandCoins, ListChecks, PlayCircle, Prohibit, Receipt, ShieldCheck } from '@phosphor-icons/react/dist/ssr';
import { CivicShell } from '@/components/civic/CivicExperience';
import { ReplayRejectionPanel } from '@/components/civic/ReplayRejectionPanel';
import { getFeaturedCivicMarket } from '@/lib/civic/civicMarket';

export default function CivicDemoPage() {
  const market = getFeaturedCivicMarket();
  const steps = [
    {
      title: 'Open the Ward 12 signal',
      text: 'Show the civic question, data boundary, conviction signal, and sponsor pool.',
      href: `/market/${market.slug}`,
      icon: PlayCircle,
    },
    {
      title: 'Issue signed participation pass',
      text: 'Create a stateless pass packet that survives hosted serverless routing.',
      href: `/participate/${market.slug}`,
      icon: HandCoins,
    },
    {
      title: 'Verify at station',
      text: 'Confirm the pass signature, receipt binding, and no forecast payout coupling.',
      href: `/verify/${market.slug}`,
      icon: Fingerprint,
    },
    {
      title: 'Open civic receipt',
      text: 'Show the Solana receipt backing the action reward path.',
      href: `/receipt/${encodeURIComponent(market.evidence.receiptId)}?mode=civic`,
      icon: Receipt,
    },
    {
      title: 'Show replay rejection',
      text: 'Open the nullifier-backed replay proof and negative-path artifact.',
      href: '/proofs/civic-fraud-gauntlet.json',
      icon: Prohibit,
    },
    {
      title: 'Finish at ledger',
      text: 'End on the public civic ledger and raw artifact links.',
      href: '/ledger',
      icon: ListChecks,
    },
  ];

  return (
    <CivicShell>
      <section className="mx-auto grid max-w-[1180px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--civic-muted)]">Guided judge demo</p>
          <h1 className="mt-3 text-[clamp(2.5rem,6vw,5.6rem)] font-semibold leading-[0.96] tracking-normal text-[var(--civic-ink)]">
            One path from civic signal to receipt to replay proof.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--civic-muted)]">
            This demo keeps the story tight: forecast signal, sponsor-funded action, signed participation pass, verifier station, civic receipt, replay rejection, and ledger.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[var(--civic-ink)] px-5 text-sm font-semibold text-white" href={`/market/${market.slug}`}>
              Start demo <ArrowRight size={16} weight="bold" />
            </Link>
            <Link className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-[var(--civic-line-strong)] bg-white px-5 text-sm font-semibold text-[var(--civic-ink)]" href="/ledger">
              Skip to ledger
            </Link>
          </div>
        </div>

        <section className="rounded-lg border border-[var(--civic-line)] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <ShieldCheck size={24} weight="duotone" className="text-[var(--civic-green)]" />
            <h2 className="text-xl font-semibold tracking-normal">Demo proof contract</h2>
          </div>
          <div className="mt-5 grid gap-3">
            <DemoFact label="Market" value={market.title} />
            <DemoFact label="Pass model" value="stateless signed packet" />
            <DemoFact label="Settlement depends on forecast" value="false" />
            <DemoFact label="Replay evidence" value={`${market.evidence.gauntletLabel} invalid flows rejected`} />
          </div>
        </section>
      </section>

      <section className="mx-auto max-w-[1180px] px-4 pb-10 sm:px-6 lg:px-8">
        <div className="grid gap-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Link
                key={step.title}
                href={step.href}
                className="grid gap-4 rounded-lg border border-[var(--civic-line)] bg-white p-5 shadow-sm transition-transform hover:-translate-y-0.5 md:grid-cols-[64px_1fr_auto]"
              >
                <span className="grid size-12 place-items-center rounded-md bg-[var(--civic-wash)] text-[var(--civic-green)]">
                  <Icon size={23} weight="duotone" />
                </span>
                <span>
                  <span className="font-mono text-xs text-[var(--civic-muted)]">0{index + 1}</span>
                  <strong className="mt-1 block text-lg font-semibold tracking-normal text-[var(--civic-ink)]">{step.title}</strong>
                  <span className="mt-1 block text-sm leading-6 text-[var(--civic-muted)]">{step.text}</span>
                </span>
                <span className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--civic-line-strong)] bg-[var(--civic-paper)] px-3 text-sm font-semibold text-[var(--civic-ink)]">
                  Open <ArrowRight size={15} weight="bold" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto grid max-w-[1180px] gap-4 px-4 pb-16 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8">
        <ReplayRejectionPanel market={market} />
        <section className="rounded-lg border border-[var(--civic-line)] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <CheckCircle size={23} weight="fill" className="text-[var(--civic-green)]" />
            <h2 className="text-xl font-semibold tracking-normal">What judges should see</h2>
          </div>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-[var(--civic-muted)]">
            <li>Forecast credits have no cash value and are non-transferable.</li>
            <li>Sponsor reward settlement is tied to the receipt, not the forecast answer.</li>
            <li>The verifier flow works from a signed token rather than in-memory hosted state.</li>
            <li>Replay rejection is backed by the public nullifier and negative-path artifact.</li>
          </ul>
        </section>
      </section>
    </CivicShell>
  );
}

function DemoFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[var(--civic-wash)] px-3 py-2">
      <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--civic-muted)]">{label}</span>
      <strong className="mt-1 block break-words text-sm font-semibold text-[var(--civic-ink)]">{value}</strong>
    </div>
  );
}
