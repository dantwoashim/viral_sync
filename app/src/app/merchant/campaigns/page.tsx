'use client';

import { useMemo, useState } from 'react';
import { Broadcast, Coins, Timer, UsersThree } from '@phosphor-icons/react';
import SignalRibbon from '@/components/launch/SignalRibbon';
import { merchantCampaignDefaults } from '@/lib/nepalData';

export default function MerchantCampaignsPage() {
  const [title, setTitle] = useState(merchantCampaignDefaults.title);
  const [reward, setReward] = useState(merchantCampaignDefaults.reward);
  const [threshold, setThreshold] = useState(merchantCampaignDefaults.threshold);
  const [windowLabel, setWindowLabel] = useState(merchantCampaignDefaults.window);
  const [publishState, setPublishState] = useState<'idle' | 'publishing' | 'published' | 'error'>('idle');
  const [publishMessage, setPublishMessage] = useState('');

  const { estimate, effectiveClaims, cadence } = useMemo(() => {
    const claimCount = Number.parseInt(threshold, 10);
    const effectiveClaims = Number.isFinite(claimCount) ? Math.max(claimCount, 3) : 3;
    return {
      estimate: `~ NPR ${effectiveClaims * 260}`,
      effectiveClaims,
      cadence: effectiveClaims >= 5 ? 'Best for high-energy dinner groups' : 'Best for short tea and snack clusters',
    };
  }, [threshold]);

  async function publishCampaign() {
    setPublishState('publishing');
    setPublishMessage('');
    const windowHours = Number.parseInt(windowLabel, 10);

    try {
      const response = await fetch('/api/launch/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          reward,
          referralGoal: effectiveClaims,
          redemptionWindowHours: Number.isFinite(windowHours) ? windowHours : 72,
          description: `${effectiveClaims} invited confirmations unlock a merchant-confirmed reward.`,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload?.reason || payload?.error?.message || 'Campaign could not be published.');
      }

      setPublishState('published');
      setPublishMessage('Campaign published to the pilot ledger.');
    } catch (error) {
      setPublishState('error');
      setPublishMessage(error instanceof Error ? error.message : 'Campaign could not be published.');
    }
  }

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Campaigns</div>
            <h1 className="surface-title">Launch a reward staff can explain in one breath.</h1>
            <p className="surface-subtitle">
              Set the reward, invite trigger, redemption window, and expected cost without turning a cafe pilot into enterprise software.
            </p>
          </div>
        </div>

        <SignalRibbon
          items={[
            'Compose the reward',
            'Set the invite trigger',
            'Bound the redemption window',
            'Keep reward cost inside merchant reality',
          ]}
        />

        <div className="merchant-grid" style={{ marginTop: 18 }}>
          <section className="paper-sheet sheet-pad campaign-composer">
            <div className="campaign-head">
              <div className="eyebrow">Offer composition</div>
              <div className="campaign-headline">Make the promise clear enough to repeat at the counter.</div>
              <p className="sheet-copy">
                Customers share faster when the offer sounds like a real table reward, not a campaign configuration.
              </p>
            </div>

            <div className="field-stack" style={{ marginTop: 22 }}>
              <div className="field">
                <label htmlFor="campaign-title">Campaign title</label>
                <input id="campaign-title" value={title} onChange={(event) => setTitle(event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="campaign-reward">Reward</label>
                <textarea id="campaign-reward" value={reward} onChange={(event) => setReward(event.target.value)} />
              </div>
              <div className="field-row">
                <div className="field" style={{ flex: 1 }}>
                  <label htmlFor="campaign-threshold">Unlock trigger</label>
                  <input id="campaign-threshold" value={threshold} onChange={(event) => setThreshold(event.target.value)} />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label htmlFor="campaign-window">Redemption window</label>
                  <input id="campaign-window" value={windowLabel} onChange={(event) => setWindowLabel(event.target.value)} />
                </div>
              </div>
              <div className="field-helper">{merchantCampaignDefaults.budgetHint}</div>
            </div>

            <div className="field-row" style={{ marginTop: 18, alignItems: 'center' }}>
              <button className="vs-link-chip" type="button" onClick={publishCampaign} disabled={publishState === 'publishing'}>
                {publishState === 'publishing' ? 'Publishing...' : 'Publish campaign'}
              </button>
              <div className="field-helper" role="status">
                {publishMessage || 'Publishes reward, cap, timing, copy, preview, and active status into the pilot ledger.'}
              </div>
            </div>

            <div className="campaign-sequence">
              <div className="campaign-sequence-step">
                <span>01</span>
                <div>
                  <strong>Share</strong>
                  <p>The customer sends a clean invite link or QR from the passbook.</p>
                </div>
              </div>
              <div className="campaign-sequence-step">
                <span>02</span>
                <div>
                  <strong>Claim</strong>
                  <p>Friends claim on their own devices and create distinct visit lines.</p>
                </div>
              </div>
              <div className="campaign-sequence-step">
                <span>03</span>
                <div>
                  <strong>Confirm</strong>
                  <p>Staff approves the live code at the counter, which turns attribution into truth.</p>
                </div>
              </div>
            </div>
          </section>

          <div className="poster-side">
            <section className="ticket-sheet sheet-pad">
              <div className="eyebrow">Live offer preview</div>
              <div className="ticket-title" style={{ marginTop: 10 }}>
                {effectiveClaims + 1} friends unlock a real table reward.
              </div>
              <p className="ticket-note" style={{ marginTop: 16 }}>
                {reward}
              </p>
              <div className="metric-stack">
                <div className="metric-line">
                  <div className="metric-label">
                    <strong>Trigger</strong>
                    <span>The invite chain needs enough merchant-confirmed visits to unlock.</span>
                  </div>
                  <div className="metric-value">{threshold}</div>
                </div>
                <div className="metric-line">
                  <div className="metric-label">
                    <strong>Window</strong>
                    <span>Short enough to create urgency, long enough for real group planning.</span>
                  </div>
                  <div className="metric-value">{windowLabel}</div>
                </div>
                <div className="metric-line">
                  <div className="metric-label">
                    <strong>Estimated cost</strong>
                    <span>Preview only. Merchant-funded rewards stay bounded or the loop breaks.</span>
                  </div>
                  <div className="metric-value">{estimate}</div>
                </div>
              </div>
            </section>

            <section className="ink-sheet sheet-pad campaign-ops-sheet">
              <div className="eyebrow">Operator readout</div>
              <div className="campaign-op-line">
                <UsersThree size={18} />
                <div>
                  <strong>Group shape</strong>
                  <span>{effectiveClaims} invited confirmations before table unlock</span>
                </div>
              </div>
              <div className="campaign-op-line">
                <Timer size={18} />
                <div>
                  <strong>Cadence</strong>
                  <span>{cadence}</span>
                </div>
              </div>
              <div className="campaign-op-line">
                <Coins size={18} />
                <div>
                  <strong>Budget posture</strong>
                  <span>Keep each reward inside a predictable merchant-side contribution.</span>
                </div>
              </div>
              <div className="campaign-op-line">
                <Broadcast size={18} />
                <div>
                  <strong>Launch channel</strong>
                  <span>Best distributed through cashier QR, table tent, and repeat customer sharing.</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
