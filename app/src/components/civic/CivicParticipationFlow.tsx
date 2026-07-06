'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle, FileText, Fingerprint, ShieldCheck, WarningCircle } from '@phosphor-icons/react';
import type { CivicConvictionSignalCommitment, CivicMarket, CivicParticipationPass, ConvictionChoice } from '@/lib/civic/types';

type State = {
  status: 'idle' | 'loading' | 'issued' | 'error';
  packet: CivicParticipationPass | null;
  conviction: CivicConvictionSignalCommitment | null;
  error: string | null;
};

function short(value?: string | null) {
  if (!value) return 'missing';
  return value.length > 22 ? `${value.slice(0, 10)}...${value.slice(-8)}` : value;
}

export function CivicParticipationFlow({ market }: { market: CivicMarket }) {
  const [participantLabel, setParticipantLabel] = useState('Ward 12 resident');
  const [choice, setChoice] = useState<ConvictionChoice>('repair_likely');
  const [creditsCommitted, setCreditsCommitted] = useState(62);
  const [state, setState] = useState<State>({ status: 'idle', packet: null, conviction: null, error: null });
  const canSubmit = participantLabel.trim().length >= 3 && state.status !== 'loading';
  const allocationTotal = useMemo(() => {
    const packet = state.packet;
    if (!packet) return 100;
    return packet.forecastCredits.repairLikely + packet.forecastCredits.repairDelayed;
  }, [state.packet]);

  async function issuePass() {
    if (!canSubmit) return;
    setState({ status: 'loading', packet: null, conviction: null, error: null });
    try {
      const response = await fetch('/api/civic/participation-pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: market.slug, participantLabel }),
      });
      const payload = await response.json();
      if (!response.ok || payload?.ok !== true) throw new Error(payload?.error || payload?.reason || 'pass_issue_failed');
      const convictionResponse = await fetch('/api/civic/conviction-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: market.slug,
          participantLabel,
          choice,
          creditsCommitted,
          confidenceBps: creditsCommitted * 100,
        }),
      });
      const convictionPayload = await convictionResponse.json();
      if (!convictionResponse.ok || convictionPayload?.ok !== true) {
        throw new Error(convictionPayload?.error || convictionPayload?.reason || 'conviction_signal_failed');
      }
      setState({
        status: 'issued',
        packet: payload as CivicParticipationPass,
        conviction: convictionPayload as CivicConvictionSignalCommitment,
        error: null,
      });
    } catch (error) {
      setState({
        status: 'error',
        packet: null,
        conviction: null,
        error: error instanceof Error ? error.message : 'pass_issue_failed',
      });
    }
  }

  return (
    <section className="min-w-0 rounded-lg border border-[var(--civic-line)] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <Fingerprint size={24} weight="duotone" className="text-[var(--civic-green)]" />
        <div>
          <h2 className="text-xl font-semibold tracking-normal">Stateless participation pass</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--civic-muted)]">Signed packet. No hosted memory store required.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-2">
        <label className="text-sm font-semibold text-[var(--civic-ink)]" htmlFor="participant-label">
          Participant label
        </label>
        <input
          id="participant-label"
          value={participantLabel}
          onChange={(event) => setParticipantLabel(event.target.value)}
          className="h-12 rounded-md border border-[var(--civic-line-strong)] bg-[var(--civic-paper)] px-3 text-base text-[var(--civic-ink)] outline-none transition-colors focus:border-[var(--civic-green)]"
          placeholder="Ward 12 resident"
        />
        <p className="text-xs leading-5 text-[var(--civic-muted)]">
          The label is hashed into a participant commitment before it is placed in the signed pass.
        </p>
      </div>

      <fieldset className="mt-5 grid gap-3 rounded-lg border border-[var(--civic-line)] bg-[var(--civic-paper)] p-4">
        <legend className="px-1 text-sm font-semibold text-[var(--civic-ink)]">Conviction signal</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            ['repair_likely', 'Repair likely'],
            ['repair_delayed', 'Repair delayed'],
            ['abstain', 'Abstain'],
          ].map(([value, label]) => (
            <label
              key={value}
              className={`flex min-h-11 items-center justify-center rounded-md border px-3 text-sm font-semibold transition-colors ${
                choice === value
                  ? 'border-[var(--civic-green)] bg-[var(--civic-green-soft)] text-[var(--civic-green-ink)]'
                  : 'border-[var(--civic-line-strong)] bg-white text-[var(--civic-ink)]'
              }`}
            >
              <input
                className="sr-only"
                type="radio"
                name="conviction-choice"
                value={value}
                checked={choice === value}
                onChange={() => setChoice(value as ConvictionChoice)}
              />
              {label}
            </label>
          ))}
        </div>
        <label className="grid gap-2 text-sm font-semibold text-[var(--civic-ink)]" htmlFor="conviction-credits">
          Non-transferable credits: {creditsCommitted} / 100
          <input
            id="conviction-credits"
            type="range"
            min={1}
            max={100}
            value={creditsCommitted}
            onChange={(event) => setCreditsCommitted(Number(event.target.value))}
            className="accent-[var(--civic-green)]"
          />
        </label>
        <p className="text-xs leading-5 text-[var(--civic-muted)]">
          A signed conviction artifact derives the on-chain `ConvictionSignal` PDA. Credits cannot transfer, cannot be redeemed, and cannot affect settlement.
        </p>
      </fieldset>

      <button
        type="button"
        onClick={issuePass}
        disabled={!canSubmit}
        className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[var(--civic-ink)] px-5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {state.status === 'loading' ? 'Issuing pass...' : 'Issue signed pass'}
        <ArrowRight size={16} weight="bold" />
      </button>

      {state.status === 'idle' ? (
        <div className="mt-4 rounded-lg border border-dashed border-[var(--civic-line-strong)] bg-[var(--civic-paper)] p-4" role="status" aria-live="polite">
          <p className="text-sm font-semibold text-[var(--civic-ink)]">No pass issued yet</p>
          <p className="mt-1 text-sm leading-6 text-[var(--civic-muted)]">
            Issue one signed packet, then follow the verifier, receipt, replay, and ledger links from the generated result.
          </p>
        </div>
      ) : null}

      {state.status === 'loading' ? (
        <div className="mt-4 rounded-lg border border-[var(--civic-line)] bg-[var(--civic-wash)] p-4" role="status" aria-live="polite">
          <p className="text-sm font-semibold text-[var(--civic-ink)]">Creating signed packet</p>
          <div className="mt-3 grid gap-3">
            <span className="h-3 w-3/4 animate-pulse rounded-full bg-[rgba(19,22,17,0.14)]" />
            <span className="h-3 w-1/2 animate-pulse rounded-full bg-[rgba(19,22,17,0.14)]" />
            <span className="h-10 w-full animate-pulse rounded-md bg-white/70" />
          </div>
        </div>
      ) : null}

      {state.status === 'error' ? (
        <div className="mt-4 flex gap-3 rounded-md border border-[rgba(183,57,47,0.25)] bg-[rgba(183,57,47,0.08)] p-3 text-sm text-[var(--civic-red)]" role="alert">
          <WarningCircle size={18} weight="fill" className="shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      {state.packet ? (
        <div className="mt-5 min-w-0 rounded-lg border border-[var(--civic-line)] bg-[var(--civic-wash)] p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--civic-muted)]">Pass issued</p>
              <strong className="mt-1 block break-all font-mono text-sm text-[var(--civic-ink)]">{state.packet.passId}</strong>
            </div>
            <CheckCircle size={24} weight="fill" className="text-[var(--civic-green)]" />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <PassFact label="Participant commitment" value={short(state.packet.participantCommitment)} />
            <PassFact label="Verifier station" value={state.packet.verifierStation} />
            <PassFact label="Conviction credits" value={`${allocationTotal} total, cash value ${state.packet.forecastCredits.cashValue}`} />
            <PassFact label="Settlement depends on forecast" value={String(state.packet.settlement.dependsOnForecast)} />
          </div>
          {state.conviction ? (
            <div className="mt-4 min-w-0 rounded-lg border border-[var(--civic-line)] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--civic-muted)]">Conviction signal</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <PassFact label="Signal PDA" value={short(state.conviction.convictionSignalPda)} />
                <PassFact label="Duplicate prevention" value={state.conviction.duplicatePrevention.method} />
                <PassFact label="Transferable" value={String(state.conviction.transfer.transferable)} />
                <PassFact label="Settlement depends on signal" value={String(state.conviction.settlement.dependsOnConviction)} />
              </div>
            </div>
          ) : null}
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Link className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--civic-green)] px-4 text-sm font-semibold text-white" href={state.packet.verifierPath}>
              Verify <ShieldCheck size={16} weight="bold" />
            </Link>
            <Link className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[var(--civic-line-strong)] bg-white px-4 text-sm font-semibold text-[var(--civic-ink)]" href={state.packet.receiptPath}>
              Receipt <FileText size={16} weight="bold" />
            </Link>
            <Link className="inline-flex h-11 items-center justify-center rounded-md border border-[var(--civic-line-strong)] bg-white px-4 text-sm font-semibold text-[var(--civic-ink)]" href="/ledger">
              Ledger
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PassFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-white px-3 py-2">
      <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--civic-muted)]">{label}</span>
      <strong className="mt-1 block break-words text-sm font-semibold text-[var(--civic-ink)]">{value}</strong>
    </div>
  );
}
