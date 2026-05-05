'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle, Copy, Lightbulb } from '@phosphor-icons/react';
import { VisitPass } from './VisitPass';
import type { ProductLoopCampaign, VisitPassPacket } from '@/lib/product-loop/types';

type ClaimStage = 'offer' | 'creating' | 'pass' | 'error';

export function ProductClaimFlow({
  campaign,
  token,
}: {
  campaign: ProductLoopCampaign;
  token: string;
}) {
  const [stage, setStage] = useState<ClaimStage>('offer');
  const [pass, setPass] = useState<VisitPassPacket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const terminalHref = useMemo(() => {
    const code = pass?.passCode ?? '';
    const mac = pass?.passMac ?? '';
    return `/merchant/scan?slug=${encodeURIComponent(campaign.slug)}&pass=${encodeURIComponent(code)}&mac=${encodeURIComponent(mac)}&token=${encodeURIComponent(token)}`;
  }, [campaign.slug, pass?.passCode, pass?.passMac, token]);

  async function createPass() {
    setStage('creating');
    setError(null);
    const response = await fetch('/api/product-loop/claim-pass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: campaign.slug, token }),
    });
    const payload = await response.json();
    if (!response.ok || payload?.ok !== true) {
      setError(payload?.error ?? 'The pass could not be created from the proof artifact.');
      setStage('error');
      return;
    }
    setPass(payload as VisitPassPacket);
    setStage('pass');
  }

  async function copyCode() {
    if (!pass?.passCode || !navigator.clipboard) return;
    await navigator.clipboard.writeText(pass.passCode);
  }

  return (
    <>
      <section className="claim-hero">
        <div className="claim-copy">
          <span className="eyebrow-pill">Proof-backed visit reward</span>
          <h1>You were invited to {campaign.merchantAlias}.</h1>
          <p>
            Visit and earn {campaign.visitorRewardLabel}. The router earns {campaign.routerRewardLabel}
            only after the counter terminal confirms the same pass and the POC-1 receipt verifies.
          </p>
          <div className="product-actions">
            <button className="product-button primary" type="button" onClick={createPass} disabled={stage === 'creating'}>
              {stage === 'creating' ? 'Creating pass...' : 'Claim visit pass'} <ArrowRight size={16} weight="bold" />
            </button>
            <Link className="product-button secondary" href={campaign.receiptPath}>View verified receipt</Link>
          </div>
          {error ? <div className="loop-error" role="alert">{error}</div> : null}
        </div>
        <VisitPass
          stage={stage === 'pass' ? 'show' : 'claim'}
          merchant={campaign.merchantAlias}
          visitorReward={campaign.visitorRewardLabel}
          routerReward={campaign.routerRewardLabel}
          passCode={pass?.passCode}
          passId={pass?.passId}
          expiresAt={pass?.expiresAt ?? campaign.expiresAt}
        />
      </section>

      <section id="show-pass" className="claim-steps">
        <div className="claim-step-card" data-state={pass ? 'complete' : 'active'}>
          <span>1</span>
          <h2>Create your visit pass.</h2>
          <p>The server issues a proof-backed pass packet tied to the current campaign, claim-pass PDA, and receipt PDA.</p>
          <button className="product-button secondary" type="button" onClick={createPass} disabled={stage === 'creating'}>
            {pass ? <CheckCircle size={16} /> : null}{pass ? 'Pass created' : 'Create pass'}
          </button>
        </div>
        <div className="claim-step-card" data-state={pass ? 'active' : 'pending'}>
          <span>2</span>
          <h2>Show this pass at the counter.</h2>
          <p>The terminal checks this code against the proof-backed campaign before opening the receipt.</p>
          <VisitPass
            stage="show"
            merchant={campaign.merchantAlias}
            visitorReward={campaign.visitorRewardLabel}
            routerReward={campaign.routerRewardLabel}
            passCode={pass?.passCode}
            passId={pass?.passId}
            expiresAt={pass?.expiresAt ?? campaign.expiresAt}
          />
          <div className="pass-actions">
            <button className="product-button secondary" type="button"><Lightbulb size={16} /> Brightness boost</button>
            <button className="product-button secondary" type="button" onClick={copyCode} disabled={!pass}><Copy size={16} /> Copy code</button>
          </div>
        </div>
        <div className="claim-step-card" data-state={pass ? 'active' : 'pending'}>
          <span>3</span>
          <h2>Confirm at terminal.</h2>
          <p>Open the counter view with this pass code preloaded, then inspect the resulting receipt.</p>
          <div className="proof-check-list">
            {(pass?.checks ?? []).map((check) => (
              <span key={check.label} data-ok={check.ok}>{check.ok ? 'Passed' : 'Review'} - {check.label}</span>
            ))}
          </div>
          <Link className={`product-button primary ${pass ? '' : 'is-disabled'}`} href={pass ? terminalHref : '#show-pass'} aria-disabled={!pass}>
            Open terminal
          </Link>
        </div>
      </section>
      <p className="claim-token-note">Invite token: {token}</p>
    </>
  );
}
