'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, ShieldCheck, WarningCircle } from '@phosphor-icons/react';
import type { CivicPassVerification } from '@/lib/civic/types';

type State = {
  status: 'idle' | 'loading' | 'verified' | 'rejected';
  result: CivicPassVerification | null;
};

function short(value?: string | null) {
  if (!value) return 'missing';
  return value.length > 22 ? `${value.slice(0, 10)}...${value.slice(-8)}` : value;
}

export function VerifierStationFlow({
  marketSlug,
  passToken,
  initialVerification,
}: {
  marketSlug: string;
  passToken?: string;
  initialVerification?: CivicPassVerification;
}) {
  const [state, setState] = useState<State>(() => ({
    status: initialVerification ? (initialVerification.ok ? 'verified' : 'rejected') : 'idle',
    result: initialVerification ?? null,
  }));

  const verify = useCallback(async () => {
    if (!passToken) return;
    setState({ status: 'loading', result: null });
    try {
      const response = await fetch('/api/civic/verifier/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketSlug, passToken }),
      });
      const payload = await response.json() as CivicPassVerification;
      setState({ status: payload.ok ? 'verified' : 'rejected', result: payload });
    } catch (error) {
      setState({
        status: 'rejected',
        result: {
          ok: false,
          status: 'rejected',
          reason: error instanceof Error ? error.message : 'verifier_request_failed',
        },
      });
    }
  }, [marketSlug, passToken]);

  useEffect(() => {
    if (passToken && !initialVerification) {
      const verificationTimer = window.setTimeout(() => {
        void verify();
      }, 0);

      return () => window.clearTimeout(verificationTimer);
    }
    return undefined;
  }, [initialVerification, passToken, verify]);

  if (!passToken) {
    return (
      <section className="min-w-0 rounded-lg border border-[var(--civic-line)] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <WarningCircle size={23} weight="duotone" className="text-[var(--civic-amber)]" />
          <h2 className="text-xl font-semibold tracking-normal">No pass loaded</h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--civic-muted)]">
          Issue a signed participation pass first. The verifier does not rely on server memory, so a copied pass token can be verified from any instance.
        </p>
        <Link className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-[var(--civic-ink)] px-4 text-sm font-semibold text-white" href={`/participate/${marketSlug}`}>
          Issue participation pass
        </Link>
      </section>
    );
  }

  return (
    <section className="min-w-0 rounded-lg border border-[var(--civic-line)] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <ShieldCheck size={23} weight="duotone" className="text-[var(--civic-green)]" />
        <div>
          <h2 className="text-xl font-semibold tracking-normal">Verifier station</h2>
          <p className="mt-1 text-sm text-[var(--civic-muted)]">Validates the signed pass without reading a pass database.</p>
        </div>
      </div>
      <button
        type="button"
        onClick={verify}
        disabled={state.status === 'loading'}
        className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[var(--civic-ink)] px-5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {state.status === 'loading' ? 'Verifying...' : 'Verify signed pass'}
      </button>

      {state.status === 'loading' ? (
        <div className="mt-5 rounded-lg border border-[var(--civic-line)] bg-[var(--civic-wash)] p-4" role="status" aria-live="polite">
          <p className="text-sm font-semibold text-[var(--civic-ink)]">Checking signature and receipt binding</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <span className="h-16 animate-pulse rounded-md bg-white/70" />
            <span className="h-16 animate-pulse rounded-md bg-white/70" />
            <span className="h-16 animate-pulse rounded-md bg-white/70" />
          </div>
        </div>
      ) : null}

      {state.result ? (
        <div className={`mt-5 min-w-0 rounded-lg border p-4 ${state.result.ok ? 'border-[rgba(22,122,75,0.25)] bg-[var(--civic-green-soft)]' : 'border-[rgba(183,57,47,0.25)] bg-[rgba(183,57,47,0.08)]'}`} role={state.result.ok ? 'status' : 'alert'} aria-live="polite">
          <div className="flex items-center gap-3">
            {state.result.ok ? (
              <CheckCircle size={22} weight="fill" className="text-[var(--civic-green)]" />
            ) : (
              <WarningCircle size={22} weight="fill" className="text-[var(--civic-red)]" />
            )}
            <strong className="text-sm capitalize text-[var(--civic-ink)]">{state.result.status}</strong>
          </div>
          <p className="mt-2 break-words text-sm leading-6 text-[var(--civic-muted)]">{state.result.reason.replaceAll('_', ' ')}</p>
          {state.result.ok ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <VerifyFact label="Pass" value={short(state.result.passId)} />
              <VerifyFact label="Participant" value={short(state.result.participantCommitment)} />
              <VerifyFact label="Forecast payout" value={String(state.result.settlement?.dependsOnForecast)} />
            </div>
          ) : null}
          {state.result.ok ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Link className="inline-flex h-11 items-center justify-center rounded-md bg-[var(--civic-green)] px-4 text-sm font-semibold text-white" href={state.result.receiptPath ?? '/receipt/latest'}>
                Open receipt
              </Link>
              <Link className="inline-flex h-11 items-center justify-center rounded-md border border-[var(--civic-line-strong)] bg-white px-4 text-sm font-semibold text-[var(--civic-ink)]" href={state.result.replayProofPath ?? '/api/civic/replay-proof'}>
                Replay proof
              </Link>
              <Link className="inline-flex h-11 items-center justify-center rounded-md border border-[var(--civic-line-strong)] bg-white px-4 text-sm font-semibold text-[var(--civic-ink)]" href="/ledger">
                Ledger
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function VerifyFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-white/70 px-3 py-2">
      <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--civic-muted)]">{label}</span>
      <strong className="mt-1 block break-words text-sm font-semibold text-[var(--civic-ink)]">{value}</strong>
    </div>
  );
}
