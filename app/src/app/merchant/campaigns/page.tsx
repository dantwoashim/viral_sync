'use client';

import { useEffect, useMemo, useState } from 'react';
import { Broadcast, Coins, Timer, UsersThree } from '@phosphor-icons/react';
import SignalRibbon from '@/components/launch/SignalRibbon';
import { updateMerchantOffer } from '@/lib/launch/client';
import { useMerchantSummary } from '@/lib/launch/hooks';

export default function MerchantCampaignsPage() {
  const { data, error, refresh } = useMerchantSummary();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState('');
  const [threshold, setThreshold] = useState('3');
  const [windowLabel, setWindowLabel] = useState('72');
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data?.offer) {
      return;
    }

    setTitle(data.offer.title);
    setDescription(data.offer.description);
    setReward(data.offer.reward);
    setThreshold(String(data.offer.referralGoal));
    setWindowLabel(String(data.offer.redemptionWindowHours));
  }, [data?.offer]);

  const { estimate, effectiveClaims, cadence } = useMemo(() => {
    const claimCount = Number.parseInt(threshold, 10);
    const effectiveClaims = Number.isFinite(claimCount) ? Math.max(claimCount, 3) : 3;
    return {
      estimate: `~ NPR ${effectiveClaims * 260}`,
      effectiveClaims,
      cadence: effectiveClaims >= 5 ? 'Best for high-energy dinner groups' : 'Best for short tea and snack clusters',
    };
  }, [threshold]);

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Campaigns</div>
            <h1 className="surface-title">Compose offers like a merchant, not an enterprise admin.</h1>
            <p className="surface-subtitle">
              Campaign creation should answer four things fast: what the customer gets, what triggers it, how long it lasts, and what it is likely to cost.
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
              <div className="campaign-headline">Write the reward as something staff can explain in one breath.</div>
              <p className="sheet-copy">
                This is not ad copy. It should read like a clear promise that a cashier, student group, or office friend can repeat without confusion.
              </p>
            </div>

            <div className="field-stack" style={{ marginTop: 22 }}>
              <div className="field">
                <label htmlFor="campaign-title">Campaign title</label>
                <input id="campaign-title" value={title} onChange={(event) => setTitle(event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="campaign-description">Offer description</label>
                <textarea id="campaign-description" value={description} onChange={(event) => setDescription(event.target.value)} />
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
              <div className="field-helper">
                Pilot discipline: keep the reward bounded and staff-explainable, because merchant-funded growth breaks the moment the offer cost becomes fuzzy.
              </div>
              <div className="cta-row">
                <button
                  className="primary-button"
                  onClick={async () => {
                    setSaving(true);
                    try {
                      const result = await updateMerchantOffer({
                        title,
                        description,
                        reward,
                        referralGoal: Number.parseInt(threshold, 10),
                        redemptionWindowHours: Number.parseInt(windowLabel, 10),
                      });

                      if (!result.ok) {
                        setMessage(result.reason ?? 'Campaign update failed.');
                        return;
                      }

                      setMessage('Pilot offer updated.');
                      await refresh();
                    } catch (caught) {
                      setMessage(caught instanceof Error ? caught.message : 'Campaign update failed.');
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  {saving ? 'Saving...' : 'Save live offer'}
                </button>
              </div>
              {(message || error) && <div className="empty-line">{message ?? error}</div>}
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
                {title || `${effectiveClaims + 1} friends unlock a real table reward.`}
              </div>
              <p className="ticket-note" style={{ marginTop: 16 }}>
                {reward}
              </p>
              <p className="ticket-note" style={{ marginTop: 12 }}>
                {description}
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
