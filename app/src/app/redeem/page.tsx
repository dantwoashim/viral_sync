'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowClockwise, QrCode } from '@phosphor-icons/react';
import QrPayload from '@/components/launch/QrPayload';
import {
  PremiumAsyncState,
  PremiumButton,
  PremiumMetric,
  PremiumNav,
  PremiumProofRow,
  PremiumShell,
  PremiumStatusBadge,
  PremiumSurface,
  PremiumTransactionPanel,
} from '@/components/premium/PremiumUi';
import { useAuth } from '@/lib/auth';
import { createRedeemCode, fetchConsumerSummary } from '@/lib/launch/client';
import type { ConsumerSummary } from '@/lib/launch/types';

export default function RedeemPage() {
  const { sessionId } = useAuth();
  const [data, setData] = useState<ConsumerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!sessionId) return;

    setLoading(true);
    setError(null);
    try {
      setData(await fetchConsumerSummary(sessionId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Redeem state could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refresh]);

  const code = data?.activeRedeemCode?.code ?? null;
  const hasClaim = Boolean(data?.activeClaim && data.activeClaim.status !== 'blocked');
  const qrPayload = useMemo(() => code ? JSON.stringify({
    type: 'viral-sync-redeem-code',
    version: '1',
    code,
    offerId: data?.offer.id,
  }) : '', [code, data?.offer.id]);

  const generateCode = async () => {
    if (!sessionId) {
      setMessage('Guest session is still preparing. Try again in a moment.');
      return;
    }

    setWorking(true);
    setMessage(null);
    try {
      const result = await createRedeemCode(sessionId);
      if (!result.ok) {
        setMessage(result.reason ?? 'No eligible claim is ready for redemption.');
        return;
      }
      await refresh();
      setMessage(result.status === 'redeemed' ? 'This code was already confirmed.' : 'Live code ready for staff confirmation.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <PremiumShell>
      <PremiumNav />
      <section className="premium-utility-grid">
        <PremiumSurface tone="light" className="premium-system-section">
          <span className="premium-eyebrow">Counter handoff</span>
          <div className="premium-card-title">
            <h1 className="premium-h2">Create the code staff needs right now.</h1>
          </div>

          <div className="premium-actions">
            <button className="premium-button premium-button-primary" onClick={generateCode} disabled={working || loading || !hasClaim}>
              {working ? 'Preparing code' : code ? 'Refresh code' : 'Generate code'}
              <ArrowClockwise size={17} weight="bold" />
            </button>
            <PremiumButton href="/merchant/scan" variant="secondary">Open staff scan</PremiumButton>
          </div>

          <div className="premium-proof-grid">
            <div className="premium-code-display">
              <span>Counter code</span>
              <strong>{loading ? '...' : code ?? 'No code'}</strong>
            </div>
            <div className="premium-qr-box" aria-label="Redeem QR preview">
              {code ? <QrPayload payload={qrPayload} label="Redeem code QR" /> : <QrCode size={74} weight="duotone" />}
            </div>
          </div>

          {error ? (
            <PremiumAsyncState tone="error" title="Redeem state failed" detail={error} />
          ) : null}
          {message ? (
            <PremiumAsyncState tone={code ? 'success' : 'pending'} title="Redeem update" detail={message} />
          ) : null}
          {!loading && !code && !message ? (
            <PremiumAsyncState tone={hasClaim ? 'empty' : 'pending'} title={hasClaim ? 'No code yet' : 'Claim required'} detail={hasClaim ? 'Generate a short-lived code when you are at the counter.' : 'Claim an invite before creating a counter code.'} />
          ) : null}
        </PremiumSurface>

        <div className="premium-hero-copy">
          <h2 className="premium-h2">Visitor code, ready at the counter.</h2>
          <p className="premium-lede">
            This screen has one job: produce a short-lived code or explain exactly why the visitor
            cannot redeem yet. QR is helpful; manual entry remains the reliable fallback.
          </p>
          <PremiumTransactionPanel eyebrow="Redeem status" title={data?.offer.merchantName ?? 'Visit proof'}>
            <PremiumProofRow label="Claim" value={hasClaim ? data?.activeClaim?.status ?? 'active' : 'missing'} meta={hasClaim ? 'Eligible for counter handoff' : 'Claim an invite first'} status={hasClaim ? 'success' : 'warning'} />
            <PremiumProofRow label="Code" value={code ?? 'not generated'} meta={data?.activeRedeemCode?.status ?? 'No live code'} status={code ? 'success' : 'warning'} />
            <PremiumProofRow label="Window" value={`${data?.offer.redemptionWindowHours ?? 72} hours`} meta="After claim creation" status="muted" />
            <PremiumProofRow label="Staff action" value="merchant confirm" meta="Creates receipt proof" status={code ? 'success' : 'warning'} />
            <div className="premium-component-row">
              <PremiumStatusBadge tone={code ? 'success' : 'warning'}>{code ? 'Ready for counter' : 'Needs code'}</PremiumStatusBadge>
              <PremiumStatusBadge tone="muted">{data?.offer.reward ?? 'Reward after visit'}</PremiumStatusBadge>
            </div>
          </PremiumTransactionPanel>
        </div>
      </section>

      <section className="premium-metrics" aria-label="Redeem guardrails">
        <PremiumMetric label="Primary object" value="Code" detail="No secondary UI competes with the counter handoff." />
        <PremiumMetric label="Fallback" value="Manual" detail="Staff can type the code if QR scanning fails." />
        <PremiumMetric label="Proof result" value="Receipt" detail="Confirmation leads to the receipt explorer." />
      </section>
    </PremiumShell>
  );
}
