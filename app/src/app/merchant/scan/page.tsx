'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CheckCircle, QrCode, WarningCircle } from '@phosphor-icons/react';
import { PremiumNav, PremiumShell } from '@/components/premium/PremiumUi';
import { TerminalPanel } from '@/components/product/TerminalPanel';

type TerminalState = 'idle' | 'detected' | 'signing' | 'success' | 'error';

export default function MerchantScanPage() {
  const [state, setState] = useState<TerminalState>('idle');
  const [code, setCode] = useState('');
  const stateCopy = {
    idle: ['Ready to confirm visits', 'Scan pass or enter code.'],
    detected: ['Visit pass found', 'Customer reward: Rs. 15. Router reward: Rs. 75. Expires in 18 minutes.'],
    signing: ['Terminal signing receipt', 'Waiting for customer wallet.'],
    success: ['Visit verified', 'Reward settled.'],
    error: ['This pass was already used.', 'Open technical details for the program error.'],
  }[state];

  function confirm() {
    setState('signing');
    window.setTimeout(() => setState('success'), 650);
  }

  return (
    <PremiumShell className="terminal-page">
      <PremiumNav />
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
                setCode(event.target.value.toUpperCase());
                if (event.target.value.length >= 4) setState('detected');
              }}
              placeholder="Enter code"
            />
            <button className="product-button secondary" type="button" onClick={() => setState('detected')}><QrCode size={16} /> Scan</button>
          </div>
          <div className="terminal-actions-row">
            <button className="product-button primary" type="button" onClick={confirm} disabled={state === 'idle' || state === 'signing'}>
              <CheckCircle size={16} /> Confirm visit
            </button>
            <button className="product-button secondary" type="button" onClick={() => setState('error')}><WarningCircle size={16} /> Test used pass</button>
          </div>
          {state === 'error' ? (
            <details className="terminal-error-details" open>
              <summary>Show program error</summary>
              <code>ClaimPassAlreadyRecorded: claim pass cannot be reused for a second receipt.</code>
            </details>
          ) : null}
        </div>
        <TerminalPanel state={state === 'error' ? 'detected' : state} />
      </section>

      <section className="merchant-today-strip">
        <span><small>Campaign</small><b>Thamel Brew Visit Reward</b></span>
        <span><small>Reward pool remaining</small><b>9.40 USDC</b></span>
        <span><small>Verified visits today</small><b>12</b></span>
        <Link className="product-button secondary" href="/merchant/today">Open merchant dashboard</Link>
      </section>
    </PremiumShell>
  );
}
