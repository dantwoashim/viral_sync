import Link from 'next/link';
import {
  ArrowRight,
  ChartLineUp,
  CheckCircle,
  Database,
  Fingerprint,
  Globe,
  HandCoins,
  ListChecks,
  LockKey,
  MagnifyingGlass,
  Pulse,
  Receipt,
  Scales,
  ShieldCheck,
  WarningCircle,
} from '@phosphor-icons/react/dist/ssr';
import type { ComponentType, ReactNode } from 'react';
import type { CivicMarket, CivicPassVerification } from '@/lib/civic/types';
import { civicSourceArtifacts } from '@/lib/civic/civicProof';
import { CivicParticipationFlow } from './CivicParticipationFlow';
import { ReplayRejectionPanel } from './ReplayRejectionPanel';
import { VerifierStationFlow } from './VerifierStationFlow';

type Icon = ComponentType<{ size?: number; weight?: 'regular' | 'bold' | 'duotone' | 'fill'; className?: string }>;

const navLinks = [
  { href: '/market/ward12-water-repair', label: 'Market' },
  { href: '/participate/ward12-water-repair', label: 'Participate' },
  { href: '/verify/ward12-water-repair', label: 'Verify' },
  { href: '/ledger', label: 'Ledger' },
  { href: '/for-sponsors', label: 'Sponsors' },
];

export function CivicShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-[var(--civic-paper)] text-[var(--civic-ink)]">
      <CivicNav />
      {children}
    </main>
  );
}

export function CivicNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--civic-line)] bg-[rgba(250,250,246,0.86)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1180px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3 font-semibold text-[var(--civic-ink)]">
          <span className="grid size-9 place-items-center rounded-lg border border-[var(--civic-line-strong)] bg-white shadow-sm" aria-hidden="true">
            <Scales size={19} weight="bold" className="text-[var(--civic-green)]" />
          </span>
          <span className="truncate">Civic Impact Markets</span>
        </Link>
        <nav className="hidden items-center gap-1 text-sm font-medium text-[var(--civic-muted)] md:flex" aria-label="Civic navigation">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-md px-3 py-2 transition-colors hover:bg-white hover:text-[var(--civic-ink)]">
              {link.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/ledger"
          className="hidden h-10 items-center gap-2 rounded-md border border-[var(--civic-line-strong)] bg-white px-3 text-sm font-semibold text-[var(--civic-ink)] shadow-sm transition-transform hover:-translate-y-0.5 md:inline-flex"
        >
          <ShieldCheck size={17} weight="bold" className="text-[var(--civic-green)]" />
          Devnet proof
        </Link>
      </div>
    </header>
  );
}

export function CivicHome({ market }: { market: CivicMarket }) {
  return (
    <CivicShell>
      <section className="border-b border-[var(--civic-line)]">
        <div className="mx-auto grid min-h-[calc(100dvh-64px)] w-full max-w-[1180px] grid-cols-1 items-center gap-8 overflow-hidden px-4 py-10 pb-24 sm:px-6 lg:min-h-[720px] lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:pb-12">
          <div className="flex min-w-0 flex-col justify-center">
            <div className="mb-5 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--civic-muted)]">
              <span className="rounded-md border border-[var(--civic-line)] bg-white px-2.5 py-1">{market.phaseLabel}</span>
              <span className="rounded-md border border-[var(--civic-line)] bg-[var(--civic-green-soft)] px-2.5 py-1 text-[var(--civic-green-ink)]">
                {market.statusLabel}
              </span>
            </div>
            <h1 className="max-w-full text-balance break-words text-[clamp(2.25rem,10vw,5.8rem)] font-semibold leading-[0.98] tracking-normal text-[var(--civic-ink)] lg:leading-[0.94]">
              Civic Impact Markets
            </h1>
            <p className="mt-6 max-w-2xl break-words text-base leading-7 text-[var(--civic-muted)] sm:text-xl sm:leading-8">
              Forecast civic outcomes, fund verified public-good actions, and settle participation receipts on Solana without pretending the chain proves real-world facts by itself.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[var(--civic-ink)] px-5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 sm:w-auto" href={`/market/${market.slug}`}>
                Open Ward 12 market <ArrowRight size={16} weight="bold" />
              </Link>
              <Link className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border border-[var(--civic-line-strong)] bg-white px-5 text-sm font-semibold text-[var(--civic-ink)] transition-colors hover:bg-[var(--civic-wash)] sm:w-auto" href={`/verify/${market.slug}`}>
                Verify receipt <Fingerprint size={16} weight="bold" />
              </Link>
            </div>
          </div>
          <CivicMarketConsole market={market} />
        </div>
      </section>
      <section id="how-it-works" className="mx-auto grid w-full max-w-[1180px] gap-4 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr_1.1fr] lg:px-8">
        <CivicRail icon={ChartLineUp} title="Forecast signal" text={market.question} detail="No outcome payout. The forecast organizes public attention and resolution assumptions." />
        <CivicRail icon={HandCoins} title="Sponsor action pool" text={market.sponsorPool.releaseRule} detail={`${market.sponsorPool.actionRewardLabel} from ${market.sponsorPool.assetLabel}.`} />
        <CivicRail icon={Receipt} title="Receipt settlement" text="A reward can settle only after authority, verifier station, participant, nullifier, and settlement records line up." detail={`${market.evidence.gauntletLabel} invalid flows rejected.`} />
      </section>
      <section className="mx-auto grid w-full max-w-[1180px] gap-4 px-4 pb-24 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:pb-10">
        <SponsorPoolPanel market={market} />
        <ReplayRejectionPanel market={market} />
      </section>
      <ProofBoundary market={market} compact />
    </CivicShell>
  );
}

export function CivicMarketPage({ market }: { market: CivicMarket }) {
  return (
    <CivicShell>
      <section className="mx-auto w-full max-w-[1180px] overflow-hidden px-4 py-10 pb-24 sm:px-6 lg:px-8 lg:pb-10">
        <CivicPageHeader
          eyebrow={market.locality}
          title={market.title}
          text={market.summary}
          primary={{ href: `/participate/${market.slug}`, label: 'Create participation preview' }}
          secondary={{ href: `/verify/${market.slug}`, label: 'Verify proof path' }}
        />
        <div className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="min-w-0 rounded-lg border border-[var(--civic-line)] bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--civic-muted)]">Forecast question</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-normal text-[var(--civic-ink)]">{market.question}</h2>
              </div>
              <Pulse size={24} weight="duotone" className="text-[var(--civic-amber)]" />
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {market.signals.map((signal) => (
                <div key={signal.id} className="min-w-0 rounded-lg border border-[var(--civic-line)] bg-[var(--civic-wash)] p-4">
                  <p className="text-xs font-medium text-[var(--civic-muted)]">{signal.label}</p>
                  <strong className="mt-2 block text-2xl font-semibold tracking-normal text-[var(--civic-ink)]">{signal.value}</strong>
                  <p className="mt-3 text-xs leading-5 text-[var(--civic-muted)]">{signal.source}</p>
                </div>
              ))}
            </div>
          </section>
          <SponsorPoolPanel market={market} />
        </div>
        <section className="mt-4 min-w-0 rounded-lg border border-[var(--civic-line)] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <ListChecks size={22} weight="bold" className="text-[var(--civic-green)]" />
            <h2 className="text-xl font-semibold tracking-normal">Resolution rules</h2>
          </div>
          <div className="mt-4 divide-y divide-[var(--civic-line)]">
            {market.outcomes.map((outcome) => (
              <div key={outcome.id} className="grid gap-3 py-4 md:grid-cols-[0.7fr_0.5fr_1fr]">
                <div>
                  <p className="font-semibold text-[var(--civic-ink)]">{outcome.label}</p>
                  <p className="text-sm text-[var(--civic-muted)]">Target: {outcome.target}</p>
                </div>
                <StatusPill status={outcome.verificationStatus} />
                <p className="text-sm leading-6 text-[var(--civic-muted)]">{outcome.resolutionRule}</p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </CivicShell>
  );
}

export function CivicParticipationPage({ market }: { market: CivicMarket }) {
  return (
    <CivicShell>
      <section className="mx-auto w-full max-w-[1180px] overflow-hidden px-4 py-10 pb-24 sm:px-6 lg:px-8 lg:pb-10">
        <CivicPageHeader
          eyebrow="Verified participation"
          title="Sponsor rewards are earned by action, not prediction."
          text="Signed participation packets can be verified from another instance without relying on in-memory pass state."
          primary={{ href: `/api/civic/participation-pass?slug=${market.slug}`, label: 'Open pass JSON' }}
          secondary={{ href: `/market/${market.slug}`, label: 'Back to market' }}
        />
        <div className="mt-8 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <CivicParticipationFlow market={market} />
          <ProofBoundary market={market} mode="panel" />
        </div>
      </section>
    </CivicShell>
  );
}

export function CivicVerifyPage({
  market,
  passToken,
  initialVerification,
}: {
  market: CivicMarket;
  passToken?: string;
  initialVerification?: CivicPassVerification;
}) {
  return (
    <CivicShell>
      <section className="mx-auto w-full max-w-[1180px] overflow-hidden px-4 py-10 pb-24 sm:px-6 lg:px-8 lg:pb-10">
        <CivicPageHeader
          eyebrow="Independent verification"
          title="Verify every civic receipt before the story is believed."
          text="The verifier view separates Solana-proven evidence from civic adapters that still need real integrations."
          primary={{ href: '/ledger', label: 'Open civic ledger' }}
          secondary={{ href: '/proofs/civic-verifier.json', label: 'Open verifier JSON' }}
        />
        <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <VerifierStationFlow marketSlug={market.slug} passToken={passToken} initialVerification={initialVerification} />
          <ReplayRejectionPanel market={market} />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <section className="min-w-0 rounded-lg border border-[var(--civic-line)] bg-[var(--civic-ink)] p-5 text-white shadow-sm">
            <div className="flex items-center gap-3">
              <ShieldCheck size={24} weight="duotone" className="text-[var(--civic-green-light)]" />
              <h2 className="text-xl font-semibold tracking-normal">Devnet receipt evidence</h2>
            </div>
            <div className="mt-5 space-y-3">
              <DarkFact label="Cluster" value={market.evidence.cluster} />
              <DarkFact label="Program ID" value={market.evidence.programId} mono />
              <DarkFact label="Receipt PDA" value={market.evidence.receiptPda} mono />
              <DarkFact label="Nullifier PDA" value={market.evidence.nullifierPda} mono />
              <DarkFact label="Settlement PDA" value={market.evidence.settlementPda} mono />
              <DarkFact label="Negative paths" value={`${market.evidence.gauntletLabel} rejected`} />
            </div>
          </section>
          <section className="min-w-0 rounded-lg border border-[var(--civic-line)] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <MagnifyingGlass size={24} weight="duotone" className="text-[var(--civic-amber)]" />
              <h2 className="text-xl font-semibold tracking-normal">Verification checklist</h2>
            </div>
            <div className="mt-5 space-y-3">
              <CheckItem label="Published manifest is bound" state="pass" />
              <CheckItem label="Verifier output is bound" state="pass" />
              <CheckItem label="Receipt PDA is present" state="pass" />
              <CheckItem label="Replay nullifier is present" state="pass" />
              <CheckItem label="Official civic data feed" state="missing" />
              <CheckItem label="Private identity adapter" state="missing" />
            </div>
          </section>
        </div>
      </section>
    </CivicShell>
  );
}

export function CivicLedgerPage({ market }: { market: CivicMarket }) {
  const rows = [
    ['Market opened', 'verified proof sidecar', 'Civic signal and reward model published.'],
    ['Action pool mapped', market.sponsorPool.custodyStatus.replaceAll('_', ' '), market.sponsorPool.releaseRule],
    ['Receipt recorded', 'verified devnet', market.evidence.receiptPda],
    ['Reward settled', 'verified devnet', market.evidence.settlementPda],
    ['Replay controls', 'verified devnet', `${market.evidence.gauntletLabel} invalid flows rejected.`],
  ];
  const sourceHashes = civicSourceArtifacts.filter((artifact) =>
    ['manifest', 'verifier', 'negative-paths', 'proof-feed'].includes(artifact.id)
  );

  return (
    <CivicShell>
      <section className="mx-auto w-full max-w-[1180px] overflow-hidden px-4 py-10 pb-24 sm:px-6 lg:px-8 lg:pb-10">
        <CivicPageHeader
          eyebrow="Public ledger"
          title="A civic receipt feed with explicit proof limits."
          text="This page is the judge-facing bridge between the polished product surface and the raw proof artifacts."
          primary={{ href: '/proofs/civic-ledger.json', label: 'Open ledger JSON' }}
          secondary={{ href: '/proofs/civic-market-ward12-water-repair.json', label: 'Open market packet' }}
        />
        <section className="mt-8 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="min-w-0 rounded-lg border border-[var(--civic-line)] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <ShieldCheck size={24} weight="duotone" className="text-[var(--civic-green)]" />
              <h2 className="text-xl font-semibold tracking-normal">Independent verification</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--civic-muted)]">
              A reviewer can verify the civic receipt bundle offline. The command checks the receipt PDA, nullifier, settlement record, source artifact hashes, non-wager boundary, and compatibility claims.
            </p>
            <code className="mt-4 block max-w-full overflow-x-auto rounded-md bg-[var(--civic-ink)] px-4 py-3 font-mono text-xs text-white">
              npm run civic:verify-receipt
            </code>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link className="inline-flex h-11 items-center justify-center rounded-md bg-[var(--civic-ink)] px-4 text-sm font-semibold text-white" href="/proofs/civic-proof-sidecar.json">
                Open proof sidecar
              </Link>
              <Link className="inline-flex h-11 items-center justify-center rounded-md border border-[var(--civic-line-strong)] bg-white px-4 text-sm font-semibold text-[var(--civic-ink)]" href="/proofs/civic-verifier.json">
                Open verifier JSON
              </Link>
            </div>
          </div>
          <div className="min-w-0 rounded-lg border border-[var(--civic-line)] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <Fingerprint size={24} weight="duotone" className="text-[var(--civic-amber)]" />
              <h2 className="text-xl font-semibold tracking-normal">Source hash bindings</h2>
            </div>
            <div className="mt-4 space-y-3">
              {sourceHashes.map((artifact) => (
                <FactRow key={artifact.id} label={artifact.id.replaceAll('-', ' ')} value={artifact.sha256} mono />
              ))}
            </div>
          </div>
        </section>
        <section className="mt-8 overflow-hidden rounded-lg border border-[var(--civic-line)] bg-white shadow-sm">
          <div className="hidden grid-cols-[0.7fr_0.55fr_1fr] border-b border-[var(--civic-line)] bg-[var(--civic-wash)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--civic-muted)] md:grid">
            <span>Event</span>
            <span>Status</span>
            <span>Evidence</span>
          </div>
          {rows.map(([event, status, evidence]) => (
            <div key={event} className="grid min-w-0 gap-2 border-b border-[var(--civic-line)] px-4 py-4 last:border-b-0 md:grid-cols-[0.7fr_0.55fr_1fr] md:gap-3">
              <strong className="min-w-0 text-sm text-[var(--civic-ink)]">{event}</strong>
              <span className="min-w-0 text-sm capitalize text-[var(--civic-muted)]">{status}</span>
              <span className="min-w-0 break-all font-mono text-xs leading-5 text-[var(--civic-muted)]">{evidence}</span>
            </div>
          ))}
        </section>
        <div className="mt-4">
          <ReplayRejectionPanel market={market} />
        </div>
      </section>
    </CivicShell>
  );
}

export function SponsorPage({ market }: { market: CivicMarket }) {
  return (
    <CivicShell>
      <section className="mx-auto w-full max-w-[1180px] overflow-hidden px-4 py-10 pb-24 sm:px-6 lg:px-8 lg:pb-10">
        <CivicPageHeader
          eyebrow="For sponsors"
          title="Fund useful civic participation without buying attention metrics."
          text="A sponsor pool pays only when a verifier-backed civic action receipt exists. The forecast surface explains demand; the receipt surface handles settlement evidence."
          primary={{ href: `/participate/${market.slug}`, label: 'Preview action flow' }}
          secondary={{ href: '/how-it-works', label: 'Read model' }}
        />
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <CivicRail icon={HandCoins} title="Escrowed reward logic" text={market.sponsorPool.releaseRule} detail="The action reward maps to the existing Solana receipt settlement primitive." />
          <CivicRail icon={LockKey} title="Abuse controls" text="Nullifier, lineage, authority, and verifier-station checks reject replay and wrong-signer flows." detail={`${market.evidence.gauntletLabel} negative paths are published.`} />
          <CivicRail icon={Globe} title="Civic data boundary" text="Official civic data and private identity adapters are not claimed live." detail="The missing integrations are documented and visible in the product." />
        </div>
      </section>
    </CivicShell>
  );
}

export function HowItWorksPage({ market }: { market: CivicMarket }) {
  return (
    <CivicShell>
      <section className="mx-auto w-full max-w-[1180px] overflow-hidden px-4 py-10 pb-24 sm:px-6 lg:px-8 lg:pb-10">
        <CivicPageHeader
          eyebrow="System model"
          title="Prediction signal plus action reward plus receipt settlement."
          text="The project is deliberately not a pure forecasting app and not a donation tracker. The Solana primitive is the settlement receipt that makes action rewards auditable."
          primary={{ href: `/market/${market.slug}`, label: 'Open live market' }}
          secondary={{ href: '/proofs/civic-readiness.json', label: 'Readiness JSON' }}
        />
        <div className="mt-8 grid gap-4">
          {[
            ['Signal', 'Residents, analysts, or agents express probability and confidence around a civic outcome.'],
            ['Sponsor', 'A public-good sponsor funds a reward pool for useful verified participation.'],
            ['Verify', 'A verifier station confirms the participant and action context.'],
            ['Settle', 'The Solana receipt path records the event, blocks replay, and settles reward units.'],
            ['Audit', 'JSON artifacts and explorer links let reviewers verify the claim boundary.'],
          ].map(([label, text], index) => (
            <div key={label} className="grid gap-4 rounded-lg border border-[var(--civic-line)] bg-white p-5 shadow-sm md:grid-cols-[80px_1fr]">
              <span className="font-mono text-sm text-[var(--civic-muted)]">0{index + 1}</span>
              <div>
                <h2 className="text-xl font-semibold tracking-normal text-[var(--civic-ink)]">{label}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--civic-muted)]">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </CivicShell>
  );
}

function CivicMarketConsole({ market }: { market: CivicMarket }) {
  return (
    <section className="min-w-0 rounded-lg border border-[var(--civic-line)] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--civic-line)] pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--civic-muted)]">{market.locality}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal">{market.title}</h2>
        </div>
        <Database size={24} weight="duotone" className="text-[var(--civic-amber)]" />
      </div>
      <div className="mt-4 space-y-3">
        <FactRow label="Question" value={market.question} />
        <FactRow label="Data status" value={market.sourceDatasetLabel} />
        <FactRow label="Reward rule" value={market.sponsorPool.releaseRule} />
        <FactRow label="Receipt PDA" value={market.evidence.receiptPda} mono />
      </div>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link className="inline-flex h-11 items-center justify-center rounded-md bg-[var(--civic-ink)] px-4 text-sm font-semibold text-white" href={`/participate/${market.slug}`}>
          Participate
        </Link>
        <Link className="inline-flex h-11 items-center justify-center rounded-md border border-[var(--civic-line-strong)] bg-white px-4 text-sm font-semibold text-[var(--civic-ink)]" href="/ledger">
          Ledger
        </Link>
      </div>
    </section>
  );
}

function SponsorPoolPanel({ market }: { market: CivicMarket }) {
  return (
    <section className="min-w-0 rounded-lg border border-[var(--civic-line)] bg-[var(--civic-ink)] p-5 text-white shadow-sm">
      <div className="flex items-center gap-3">
        <HandCoins size={24} weight="duotone" className="text-[var(--civic-green-light)]" />
        <h2 className="text-xl font-semibold tracking-normal">Sponsor action pool</h2>
      </div>
      <div className="mt-5 space-y-3">
        <DarkFact label="Sponsor" value={market.sponsorPool.sponsorLabel} />
        <DarkFact label="Available" value={market.sponsorPool.availableLabel} />
        <DarkFact label="Action reward" value={market.sponsorPool.actionRewardLabel} />
        <DarkFact label="Release rule" value={market.sponsorPool.releaseRule} />
      </div>
    </section>
  );
}

function ProofBoundary({ market, compact = false, mode = 'section' }: { market: CivicMarket; compact?: boolean; mode?: 'section' | 'panel' }) {
  const Wrapper = mode === 'panel' ? 'section' : 'section';
  return (
    <Wrapper className={mode === 'panel' ? 'min-w-0 rounded-lg border border-[var(--civic-line)] bg-white p-5 shadow-sm' : 'border-t border-[var(--civic-line)] bg-white'}>
      <div className={mode === 'panel' ? '' : 'mx-auto max-w-[1180px] px-4 py-10 sm:px-6 lg:px-8'}>
        <div className="flex items-center gap-3">
          <WarningCircle size={23} weight="duotone" className="text-[var(--civic-red)]" />
          <h2 className="text-xl font-semibold tracking-normal">Proof boundary</h2>
        </div>
        <div className={`mt-5 grid gap-4 ${compact ? 'lg:grid-cols-3' : 'lg:grid-cols-3'}`}>
          <BoundaryColumn title="Proven now" items={market.proofBoundary.proven} tone="green" />
          <BoundaryColumn title="Not proven yet" items={market.proofBoundary.notProven} tone="red" />
          <BoundaryColumn title="Production requirements" items={market.proofBoundary.requiredForProduction} tone="amber" />
        </div>
      </div>
    </Wrapper>
  );
}

function BoundaryColumn({ title, items, tone }: { title: string; items: string[]; tone: 'green' | 'red' | 'amber' }) {
  const color =
    tone === 'green' ? 'text-[var(--civic-green)]' : tone === 'red' ? 'text-[var(--civic-red)]' : 'text-[var(--civic-amber)]';
  return (
    <div className="min-w-0 rounded-lg border border-[var(--civic-line)] bg-[var(--civic-wash)] p-4">
      <h3 className={`text-sm font-semibold uppercase tracking-[0.14em] ${color}`}>{title}</h3>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--civic-muted)]">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-current opacity-50" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CivicRail({ icon: IconComponent, title, text, detail }: { icon: Icon; title: string; text: string; detail: string }) {
  return (
    <article className="min-w-0 rounded-lg border border-[var(--civic-line)] bg-white p-5 shadow-sm">
      <IconComponent size={25} weight="duotone" className="text-[var(--civic-green)]" />
      <h2 className="mt-4 text-xl font-semibold tracking-normal">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-[var(--civic-muted)]">{text}</p>
      <p className="mt-4 rounded-md bg-[var(--civic-wash)] px-3 py-2 text-xs font-medium leading-5 text-[var(--civic-muted)]">{detail}</p>
    </article>
  );
}

function CivicPageHeader({
  eyebrow,
  title,
  text,
  primary,
  secondary,
}: {
  eyebrow: string;
  title: string;
  text: string;
  primary: { href: string; label: string };
  secondary: { href: string; label: string };
}) {
  return (
    <div className="min-w-0 max-w-4xl overflow-hidden">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--civic-muted)]">{eyebrow}</p>
      <h1 className="mt-3 max-w-full text-balance break-words text-[clamp(2rem,9vw,4.8rem)] font-semibold leading-[1.02] tracking-normal text-[var(--civic-ink)] md:leading-[0.98]">{title}</h1>
      <p className="mt-5 max-w-2xl break-words text-base leading-7 text-[var(--civic-muted)] sm:text-lg sm:leading-8">{text}</p>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <Link className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[var(--civic-ink)] px-5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 sm:w-auto" href={primary.href}>
          {primary.label} <ArrowRight size={16} weight="bold" />
        </Link>
        <Link className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border border-[var(--civic-line-strong)] bg-white px-5 text-sm font-semibold text-[var(--civic-ink)] transition-colors hover:bg-[var(--civic-wash)] sm:w-auto" href={secondary.href}>
          {secondary.label}
        </Link>
      </div>
    </div>
  );
}

function FactRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid min-w-0 gap-2 rounded-md bg-[var(--civic-wash)] px-3 py-2 sm:grid-cols-[140px_1fr]">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--civic-muted)]">{label}</span>
      <span className={`${mono ? 'break-all font-mono text-xs leading-5' : 'text-sm'} min-w-0 break-words text-[var(--civic-ink)]`}>{value}</span>
    </div>
  );
}

function DarkFact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid min-w-0 gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 sm:grid-cols-[130px_1fr]">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-white/50">{label}</span>
      <span className={`${mono ? 'break-all font-mono text-xs leading-5' : 'text-sm'} min-w-0 break-words text-white`}>{value}</span>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const pass = status === 'verified_devnet';
  return (
    <span className={`inline-flex h-8 w-fit items-center gap-2 rounded-md px-2.5 text-xs font-semibold capitalize ${pass ? 'bg-[var(--civic-green-soft)] text-[var(--civic-green-ink)]' : 'bg-[var(--civic-amber-soft)] text-[var(--civic-amber-ink)]'}`}>
      {pass ? <CheckCircle size={15} weight="fill" /> : <WarningCircle size={15} weight="fill" />}
      {status.replaceAll('_', ' ')}
    </span>
  );
}

function CheckItem({ label, state }: { label: string; state: 'pass' | 'missing' }) {
  const pass = state === 'pass';
  return (
    <div className="flex flex-col gap-2 rounded-md bg-[var(--civic-wash)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="min-w-0 text-sm text-[var(--civic-ink)]">{label}</span>
      <span className={`inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${pass ? 'bg-[var(--civic-green-soft)] text-[var(--civic-green-ink)]' : 'bg-[var(--civic-amber-soft)] text-[var(--civic-amber-ink)]'}`}>
        {pass ? <CheckCircle size={14} weight="fill" /> : <WarningCircle size={14} weight="fill" />}
        {pass ? 'pass' : 'not integrated'}
      </span>
    </div>
  );
}
