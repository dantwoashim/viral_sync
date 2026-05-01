import {
  PremiumButton,
  PremiumCompletionMoment,
  PremiumMetric,
  PremiumNav,
  PremiumProofRow,
  PremiumShell,
  PremiumStatusBadge,
  PremiumStepRail,
  PremiumSurface,
  PremiumTransactionStatus,
  PremiumTransactionPanel,
} from '@/components/premium/PremiumUi';
import { proofLifecycleSteps } from '@/lib/premium/design-system';
import { readLocalnetProofSummary } from '@/lib/premium/localnet-proof';

export default function DemoPage() {
  const proof = readLocalnetProofSummary();

  return (
    <PremiumShell>
      <PremiumNav />
      <section className="premium-demo-grid">
        <div className="premium-hero-copy">
          <span className="premium-eyebrow">Live proof path</span>
          <h1 className="premium-h1">Prove one visit reward end to end.</h1>
          <p className="premium-lede">
            Follow the proof sequence: fund the bounty, share an invite, claim with a nullifier,
            confirm the visit, write the receipt, settle the reward, reject the replay, and verify
            with the SDK.
          </p>
          <div className="premium-actions">
            <PremiumButton href="/evidence">View localnet evidence</PremiumButton>
            <PremiumButton href="/developer" variant="secondary">Open SDK docs</PremiumButton>
          </div>
          <PremiumSurface tone="light" className="premium-system-section">
            <div className="premium-card-title">
              <span>Proof rail</span>
              <h2>Every claim maps to code.</h2>
            </div>
            <PremiumStepRail steps={proofLifecycleSteps} activeIndex={proof.available ? 7 : 3} />
          </PremiumSurface>
        </div>

        <PremiumTransactionPanel
          eyebrow={proof.available ? 'Localnet manifest loaded' : 'Awaiting localnet manifest'}
          title="Proof transaction panel"
        >
          <PremiumProofRow label="Program" value={proof.programId} meta={proof.cluster} status={proof.available ? 'success' : 'warning'} />
          <PremiumProofRow label="Campaign" value={proof.campaign} meta="Growth campaign PDA" status={proof.available ? 'success' : 'warning'} />
          <PremiumProofRow label="Receipt" value={proof.receipt} meta="Causal Receipt PDA" status={proof.available ? 'success' : 'warning'} />
          <PremiumProofRow label="Vault" value={proof.vault} meta="Reward custody account" status={proof.vaultClosed ? 'success' : 'warning'} />
          <PremiumProofRow label="Record tx" value={proof.receiptSignature} meta="record_causal_receipt" status={proof.available ? 'success' : 'warning'} />
          <PremiumProofRow label="Settle tx" value={proof.settlementSignature} meta="settle_receipt_reward" status={proof.available ? 'success' : 'warning'} />
          <PremiumProofRow label="Replay" value={proof.replayRejected ? 'duplicate rejected' : 'not proven yet'} meta="Fraud defense" status={proof.replayRejected ? 'danger' : 'warning'} />
          <div className="premium-component-row">
            <PremiumStatusBadge tone={proof.vaultClosed ? 'success' : 'warning'}>
              {proof.vaultClosed ? 'Vault close proven' : 'Vault close pending'}
            </PremiumStatusBadge>
            <PremiumStatusBadge tone={proof.available ? 'success' : 'warning'}>
              {proof.available ? 'Manifest connected' : 'Fallback state'}
            </PremiumStatusBadge>
          </div>
        </PremiumTransactionPanel>
      </section>

      <section className="premium-metrics" aria-label="Demo proof quality">
        <PremiumMetric label="Audience" value="Reviewers" detail="The proof starts before any setup tour." />
        <PremiumMetric label="Failure mode" value="Replay" detail="The demo shows the fraud attempt after success." />
        <PremiumMetric label="Fallback" value="Localnet" detail="The page remains explainable if devnet is flaky." />
      </section>

      <section className="premium-system-grid premium-final-rehearsal" aria-label="Demo rehearsal readiness">
        <PremiumSurface tone="raised" className="premium-system-section">
          <div className="premium-card-title">
            <span>Two-minute rehearsal</span>
            <h2>The demo path has a timed spine.</h2>
          </div>
          <div className="premium-readiness-list">
            <div>
              <span>00:00</span>
              <strong>Open with the claim</strong>
              <p>Pay rewards only after verified visits.</p>
            </div>
            <div>
              <span>00:18</span>
              <strong>Create and share the invite</strong>
              <p>The referrer action is visible before any dashboard tour.</p>
            </div>
            <div>
              <span>00:42</span>
              <strong>Claim, redeem, and attest</strong>
              <p>The counter handoff proves this is not click attribution.</p>
            </div>
            <div>
              <span>01:14</span>
              <strong>Show receipt and settlement</strong>
              <p>The PDA, signature, vault, and reward movement stay together.</p>
            </div>
            <div>
              <span>01:42</span>
              <strong>Reject the replay</strong>
              <p>The fraud attempt appears immediately after the valid settlement.</p>
            </div>
          </div>
          <PremiumCompletionMoment
            title="Backup path ready"
            detail="If devnet slows down, the localnet manifest keeps the same proof sequence visible."
          />
        </PremiumSurface>

        <PremiumSurface tone="light" className="premium-system-section">
          <div className="premium-card-title">
            <span>Release fallback</span>
            <h2>No fragile live-demo dependency.</h2>
          </div>
          <div className="premium-proof-stack">
            <PremiumProofRow label="Primary" value="devnet proof path" meta="Live proof whenever RPC cooperates" status="success" />
            <PremiumProofRow label="Fallback" value="localnet manifest" meta="Same sequence, deterministic evidence" status="success" />
            <PremiumProofRow label="Package" value="frontier:submission" meta="Packet, go/no-go, and vault close evidence" status="success" />
            <PremiumProofRow label="Verification" value="premium:final" meta="Copy, visual, a11y, performance, release gates" status="success" />
          </div>
          <div className="premium-actions">
            <PremiumButton href="/premium-scorecard">Open readiness scorecard</PremiumButton>
            <PremiumButton href="/example-receipt-graph" variant="secondary">Verify with example app</PremiumButton>
          </div>
        </PremiumSurface>
      </section>

      <section className="premium-system-grid" style={{ marginTop: 'clamp(42px, 7vw, 76px)' }}>
        <PremiumSurface tone="light" className="premium-system-section">
          <div className="premium-card-title">
            <span>Replay proof</span>
            <h2>Success is followed by the fraud attempt.</h2>
          </div>
          <div className="premium-replay-strip">
            <div><span>First claim</span><strong>Accepted</strong><p>Nullifier creates the first Causal Receipt.</p></div>
            <div><span>Settlement</span><strong>Paid once</strong><p>Reward leaves the funded vault only through settlement.</p></div>
            <div><span>Replay</span><strong>Rejected</strong><p>Duplicate nullifier and duplicate settlement fail visibly.</p></div>
          </div>
          <div className="premium-state-stack" style={{ marginTop: 14 }}>
            <PremiumTransactionStatus phase="pending" title="Recording receipt" detail="The user sees the PDA and signature while confirmation is pending." />
            <PremiumTransactionStatus phase="confirmed" title="Settlement confirmed" detail="The completion state explains exactly what moved and why." />
            <PremiumTransactionStatus phase="failed" title="Replay rejected" detail="The failed state is part of the proof, not a hidden error." />
          </div>
        </PremiumSurface>
        <PremiumSurface tone="raised" className="premium-system-section">
          <div className="premium-card-title">
            <span>Replay script</span>
            <h2>Do not explain fraud later.</h2>
          </div>
          <p className="premium-copy">
            The proof path shows the valid receipt, then immediately shows the replay failure while the same
            transaction panel is still visible.
          </p>
          <PremiumCompletionMoment title="Reward settled once" detail="The memorable moment is restraint: one verified visit creates one settlement." />
        </PremiumSurface>
      </section>
    </PremiumShell>
  );
}
