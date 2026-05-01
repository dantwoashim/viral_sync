'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { PremiumAsyncState, PremiumMetric, PremiumStatusBadge, PremiumSurface } from '@/components/premium/PremiumUi';
import { PremiumWorkspace } from '@/components/premium/PremiumWorkspace';
import { merchantCampaignDefaults } from '@/lib/nepalData';

export default function MerchantCampaignsPage() {
  const [title, setTitle] = useState(merchantCampaignDefaults.title);
  const [reward, setReward] = useState(merchantCampaignDefaults.reward);
  const [threshold, setThreshold] = useState(merchantCampaignDefaults.threshold);
  const [windowLabel, setWindowLabel] = useState(merchantCampaignDefaults.window);
  const [publishState, setPublishState] = useState<'idle' | 'publishing' | 'published' | 'error'>('idle');
  const [publishMessage, setPublishMessage] = useState('');

  const preview = useMemo(() => {
    const claimCount = Number.parseInt(threshold, 10);
    const effectiveClaims = Number.isFinite(claimCount) ? Math.max(claimCount, 3) : 3;
    const windowHours = Number.parseInt(windowLabel, 10);
    const safeWindow = Number.isFinite(windowHours) ? Math.max(windowHours, 1) : 72;
    const estimatedLiability = effectiveClaims * 260;
    const closeState = publishState === 'published' ? 'ready to close when cap is spent' : 'not closable until published';

    return {
      effectiveClaims,
      safeWindow,
      estimatedLiability,
      cap: `NPR ${estimatedLiability}`,
      closeState,
      fundingState: publishState === 'published' ? 'funded draft' : 'unfunded draft',
    };
  }, [publishState, threshold, windowLabel]);

  async function publishCampaign() {
    setPublishState('publishing');
    setPublishMessage('');

    try {
      const response = await fetch('/api/launch/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          reward,
          referralGoal: preview.effectiveClaims,
          redemptionWindowHours: preview.safeWindow,
          description: `${preview.effectiveClaims} invited confirmations unlock a merchant-confirmed reward.`,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload?.reason || payload?.error?.message || 'Campaign could not be published.');
      }

      setPublishState('published');
      setPublishMessage('Campaign published with explicit funding, cap, and close states.');
    } catch (error) {
      setPublishState('error');
      setPublishMessage(error instanceof Error ? error.message : 'Campaign could not be published.');
    }
  }

  return (
    <PremiumWorkspace audience="merchant" active="campaigns">
      <section className="premium-taskbar" aria-label="Campaign next action">
        <div>
          <span>Campaign action</span>
          <strong>{publishState === 'published' ? 'Watch confirmed visits and close unused budget later' : 'Set a cap, confirm the liability, then publish'}</strong>
        </div>
        <button className="premium-button premium-button-primary" type="button" onClick={publishCampaign} disabled={publishState === 'publishing'}>
          {publishState === 'publishing' ? 'Publishing' : publishState === 'published' ? 'Published' : 'Publish bounty'}
        </button>
      </section>

      <section className="premium-workspace-hero">
        <div>
          <span className="premium-eyebrow">Campaign management</span>
          <h1 className="premium-h2">Launch a funded visit bounty with a visible cap.</h1>
          <p className="premium-lede">
            A merchant should never wonder whether a reward is merely copy, actually funded, capped, or safe to close and reclaim.
          </p>
        </div>
        <PremiumSurface tone="proof" className="premium-ops-card">
          <div className="premium-card-title">
            <span>Campaign status</span>
            <h2>{publishState === 'published' ? 'Published to pilot ledger' : 'Draft needs funding'}</h2>
          </div>
          <div className="premium-proof-stack">
            <div className="premium-proof-row">
              <div><span>Funding</span><small>Rewards stay merchant-funded.</small></div>
              <code>{preview.fundingState}</code>
              <PremiumStatusBadge tone={publishState === 'published' ? 'success' : 'warning'}>{publishState === 'published' ? 'funded' : 'draft'}</PremiumStatusBadge>
            </div>
            <div className="premium-proof-row">
              <div><span>Cap</span><small>Estimated liability before launch.</small></div>
              <code>{preview.cap}</code>
              <PremiumStatusBadge tone="success">bounded</PremiumStatusBadge>
            </div>
            <div className="premium-proof-row">
              <div><span>Close</span><small>Closure is visible before reclaim.</small></div>
              <code>{preview.closeState}</code>
              <PremiumStatusBadge tone={publishState === 'published' ? 'success' : 'muted'}>close</PremiumStatusBadge>
            </div>
          </div>
        </PremiumSurface>
      </section>

      <section className="premium-workspace-grid">
        <PremiumSurface tone="light" className="premium-ops-card">
          <div className="premium-card-title">
            <span>Builder</span>
            <h2>Funded bounty setup</h2>
          </div>
          <div className="premium-form">
            <div className="premium-field">
              <label htmlFor="campaign-title">Campaign title</label>
              <input className="premium-input" id="campaign-title" value={title} onChange={(event) => setTitle(event.target.value)} />
              <small>Use counter language a staff member can repeat without training.</small>
            </div>
            <div className="premium-field">
              <label htmlFor="campaign-reward">Reward promise</label>
              <textarea className="premium-input premium-textarea" id="campaign-reward" value={reward} onChange={(event) => setReward(event.target.value)} />
              <small>The reward must describe a visit outcome, not a click outcome.</small>
            </div>
            <div className="premium-form-row">
              <div className="premium-field">
                <label htmlFor="campaign-threshold">Visit cap</label>
                <input className="premium-input" id="campaign-threshold" value={threshold} onChange={(event) => setThreshold(event.target.value)} />
              </div>
              <div className="premium-field">
                <label htmlFor="campaign-window">Window hours</label>
                <input className="premium-input" id="campaign-window" value={windowLabel} onChange={(event) => setWindowLabel(event.target.value)} />
              </div>
            </div>
            <div className="premium-actions">
              <button className="premium-button premium-button-primary" type="button" onClick={publishCampaign} disabled={publishState === 'publishing'}>
                {publishState === 'publishing' ? 'Publishing' : 'Publish funded bounty'}
              </button>
              <Link className="premium-button premium-button-quiet" href="/merchant/today">Back to today</Link>
            </div>
            <PremiumAsyncState
              tone={publishState === 'error' ? 'error' : publishState === 'published' ? 'success' : publishState === 'publishing' ? 'pending' : 'empty'}
              title={publishState === 'error' ? 'Publish failed' : publishState === 'published' ? 'Ready for staff' : 'Funding policy'}
              detail={publishMessage || merchantCampaignDefaults.budgetHint}
            />
          </div>
        </PremiumSurface>

        <PremiumSurface tone="light" className="premium-ops-card">
          <div className="premium-card-title">
            <span>Preview</span>
            <h2>{title}</h2>
          </div>
          <div className="premium-workspace-metrics is-compact">
            <PremiumMetric label="Visit trigger" value={String(preview.effectiveClaims)} detail="Merchant-confirmed visits" />
            <PremiumMetric label="Window" value={`${preview.safeWindow}h`} detail="Claim to counter" />
            <PremiumMetric label="Liability" value={preview.cap} detail="Before reclaim" />
          </div>
          <div className="premium-state-stack">
            <div className="premium-state"><strong>Reward</strong><p>{reward}</p></div>
            <div className="premium-state"><strong>Close and reclaim flow</strong><p>When the cap is spent or the window expires, the merchant can close the bounty and see the remaining amount before reclaim.</p></div>
          </div>
        </PremiumSurface>
      </section>
    </PremiumWorkspace>
  );
}
