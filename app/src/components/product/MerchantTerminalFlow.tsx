'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CheckCircle, QrCode, WarningCircle } from '@phosphor-icons/react';
import { TerminalPanel } from './TerminalPanel';
import type { ProductLoopCampaign, TerminalConfirmation } from '@/lib/product-loop/types';

type TerminalState = 'idle' | 'detected' | 'signing' | 'success' | 'error';

export function MerchantTerminalFlow({
  campaign,
  initialPassCode,
  token,
}: {
  campaign: ProductLoopCampaign;
  initialPassCode?: string;
  token?: string;
}) {
  const [state, setState] = useState<TerminalState>(initialPassCode ? 'detected' : 'idle');
  const [code, setCode] = useState(initialPassCode ?? '');
  const [confirmation, setConfirmation] = useState<TerminalConfirmation | null>(null);
  const stateCopy = useMemo(() => ({
    idle: ['Ready to confirm visits', 'Scan pass or enter code.'],
    detected: ['Visit pass found', `${campaign.visitorRewardLabel} customer reward. ${campaign.routerRewardLabel} router reward.`],
    signing: ['Terminal checking receipt proof', 'Server is matching the pass code to the POC-1 proof packet.'],
    success: ['Visit verified', 'Reward settlement proof is ready.'],
    error: ['This pass could not be verified.', confirmation?.reason ?? 'Open technical details for the program error.'],
  }[state]), [campaign.routerRewardLabel, campaign.visitorRewardLabel, confirmation?.reason, state]);

  async function detect() {
    if (!code.trim()) return;
    setConfirmation(null);
    setState('detected');
  }

  async function confirm() {
    setState('signing');
    const response = await fetch('/api/product-loop/terminal/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: campaign.slug, passCode: code, token: token || campaign.slug }),
    });
    const payload = await response.json() as TerminalConfirmation;
    setConfirmation(payload);
    setState(response.ok && payload.ok ? 'success' : 'error');
  }

  return (
    <>
      <section className="terminal-screen">
        <div className="terminal-copy">
          <span className="eyebrow-pill">Terminal active</span>
          <h1>{stateCopy[0]}</h1>
          <p>{stateCopy[1]}</p>
          <div className="terminal-input-row">
            <input
              aria-label="Visit pass code"
              value={code}
              onChange={(event) => {
                const next = event.target.value.toUpperCase();
                setCode(next);
                if (next.length >= 4) setState('detected');
              }}
              placeholder="VS-0000-0000"
            />
            <button className="product-button secondary" type="button" onClick={detect}><QrCode size={16} /> Scan</button>
          </div>
          <div className="terminal-actions-row">
            <button className="product-button primary" type="button" onClick={confirm} disabled={state === 'idle' || state === 'signing'}>
              <CheckCircle size={16} /> Confirm visit
            </button>
            <button className="product-button secondary" type="button" onClick={() => {
              setCode('VS-USED-PASS');
              setState('detected');
            }}><WarningCircle size={16} /> Test used pass</button>
          </div>
          {state === 'success' && confirmation ? (
            <div className="terminal-success-card" role="status">
              <strong>Receipt opened</strong>
              <p>{confirmation.reason}</p>
              <Link className="product-button primary" href={confirmation.receiptPath}>Open receipt</Link>
            </div>
          ) : null}
          {state === 'error' && confirmation ? (
            <details className="terminal-error-details" open>
              <summary>Show program checks</summary>
              <div className="proof-check-list">
                {confirmation.checks.map((check) => (
                  <span key={check.label} data-ok={check.ok}>{check.ok ? 'Passed' : 'Review'} · {check.label}: {check.detail}</span>
                ))}
              </div>
            </details>
          ) : null}
        </div>
        <TerminalPanel
          state={state === 'error' ? 'detected' : state}
          merchant={campaign.merchantAlias}
          campaignTitle={campaign.title}
          passCode={code}
          visitorReward={campaign.visitorRewardLabel}
          routerReward={campaign.routerRewardLabel}
          checks={confirmation?.checks}
        />
      </section>

      <section className="merchant-today-strip">
        <span><small>Campaign</small><b>{campaign.title}</b></span>
        <span><small>Reward pool remaining</small><b>{campaign.rewardPoolRemainingLabel}</b></span>
        <span><small>Verified visits today</small><b>{campaign.settledCount}</b></span>
        <Link className="product-button secondary" href="/merchant/today">Open merchant dashboard</Link>
      </section>
    </>
  );
}
