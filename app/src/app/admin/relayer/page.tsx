import Link from 'next/link';
import { PremiumMetric, PremiumProofRow, PremiumStatusBadge, PremiumSurface } from '@/components/premium/PremiumUi';
import { PremiumWorkspace } from '@/components/premium/PremiumWorkspace';
import { getReceiptReconciliation, getRelayerMonitoring, getRelayerPolicy, runRelayerAttackSimulation } from '@/lib/launch/server';

export default async function RelayerOpsPage() {
  const [monitoring, reconciliation, attacks] = await Promise.all([
    getRelayerMonitoring(),
    getReceiptReconciliation(),
    runRelayerAttackSimulation(),
  ]);
  const policy = getRelayerPolicy();
  const failureEntries = Object.entries(monitoring.failureReasons);

  return (
    <PremiumWorkspace audience="ops" active="relayer" action={<Link className="premium-button premium-button-secondary" href="/api/launch/relayer/monitoring">Open monitoring JSON</Link>}>
      <section className="premium-workspace-hero">
        <div>
          <span className="premium-eyebrow">Relayer operations</span>
          <h1 className="premium-h2">Keep signed app intents capped, visible, and retryable.</h1>
          <p className="premium-lede">
            The app intent simulation only earns trust if policy, replay protection, queue health, and errors are boringly visible to operators.
          </p>
        </div>
        <PremiumSurface tone="proof" className="premium-ops-card">
          <div className="premium-card-title">
            <span>Ops shell foundation</span>
            <h2>No passbook visual metaphor in ops.</h2>
          </div>
          <PremiumProofRow label="Simulation" value={policy.simulationRequired ? 'Policy simulation required' : 'Simulation disabled'} status={policy.simulationRequired ? 'success' : 'danger'} />
          <PremiumProofRow label="Service auth" value={policy.serviceAuthRequired ? 'Service auth required' : 'Service auth disabled'} status={policy.serviceAuthRequired ? 'success' : 'danger'} />
          <PremiumProofRow label="Program allowlist" value={policy.allowedPrograms[0]} status="success" />
        </PremiumSurface>
      </section>

      <section className="premium-workspace-metrics" aria-label="Relayer metrics">
        <PremiumMetric label="Sponsored balance" value={String(monitoring.balance.lamports)} detail={monitoring.balance.label} />
        <PremiumMetric label="Success rate" value={`${monitoring.successRate}%`} detail="Sponsored verification intents" />
        <PremiumMetric label="P50 latency" value={`${monitoring.latencyMsP50}ms`} detail="Receipt outbox jobs" />
        <PremiumMetric label="Daily cap" value={String(policy.dailySponsoredTxCap)} detail="Signed intent ceiling" />
      </section>

      <section className="premium-workspace-grid">
        <PremiumSurface tone="light" className="premium-ops-card">
          <div className="premium-card-title">
            <span>Replay protection</span>
            <h2>Attack simulation</h2>
          </div>
          <div className="premium-state-stack">
            {Object.entries(attacks).map(([name, result]) => (
              <div className="premium-state" key={name}>
                <strong>{name}</strong>
                <p>{result}</p>
              </div>
            ))}
          </div>
        </PremiumSurface>

        <PremiumSurface tone="light" className="premium-ops-card">
          <div className="premium-card-title">
            <span>Spend caps and errors</span>
            <h2>Policy cannot be implicit</h2>
          </div>
          <div className="premium-proof-stack">
            <PremiumProofRow label="Wallet cap" value={`${policy.perWalletDailyCap} per wallet per day`} status="success" />
            <PremiumProofRow label="Campaign cap" value={`${policy.perCampaignDailyCap} per campaign per day`} status="success" />
            <PremiumProofRow label="Merchant cap" value={`${policy.perMerchantDailyCap} per merchant per day`} status="success" />
            <PremiumProofRow label="Outbox failed" value={String(monitoring.outbox.failed)} status={monitoring.outbox.failed > 0 ? 'danger' : 'success'} />
          </div>
          {failureEntries.length > 0 ? (
            <div className="premium-state-stack">
              {failureEntries.map(([reason, count]) => (
                <div className="premium-state is-danger" key={reason}>
                  <strong>{reason}</strong>
                  <p>{count} failed sponsored verification attempts.</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="premium-state">
              <strong>No relayer errors recorded</strong>
              <p>Failure state is still designed: any failed reason will appear here with a count.</p>
            </div>
          )}
        </PremiumSurface>
      </section>

      <PremiumSurface tone="light" className="premium-ops-card">
        <div className="premium-card-title">
          <span>Receipt reconciliation</span>
          <h2>Queue state cannot disappear</h2>
        </div>
        <div className="premium-table-list">
          {reconciliation.length === 0 ? (
            <div className="premium-state"><strong>No receipts yet</strong><p>Receipt submission, indexing, and retry states will appear after merchant confirmation.</p></div>
          ) : reconciliation.map((receipt) => (
            <div className="premium-table-row" key={receipt.receiptId}>
              <div>
                <strong>{receipt.receiptId}</strong>
                <span>{receipt.receiptPda}</span>
              </div>
              <code>{receipt.txSignature}</code>
              <PremiumStatusBadge tone={receipt.status === 'failed' ? 'danger' : receipt.status === 'pending' ? 'warning' : 'success'}>{receipt.status}</PremiumStatusBadge>
            </div>
          ))}
        </div>
      </PremiumSurface>
    </PremiumWorkspace>
  );
}
