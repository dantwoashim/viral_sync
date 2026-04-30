import Link from 'next/link';
import { getReceiptReconciliation, getRelayerMonitoring, runRelayerAttackSimulation } from '@/lib/launch/server';

export default async function RelayerOpsPage() {
  const monitoring = await getRelayerMonitoring();
  const reconciliation = await getReceiptReconciliation();
  const attacks = await runRelayerAttackSimulation();

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Relayer ops</div>
            <h1 className="surface-title">Replay protection, spend caps, monitoring, indexing, and reconciliation.</h1>
            <p className="surface-subtitle">
              Day 101-107 keeps sponsored verification safe before any real fee-payer key is used.
            </p>
          </div>
        </div>

        <div className="merchant-grid">
          <section className="paper-sheet sheet-pad">
            <div className="eyebrow">Monitoring</div>
            <div className="metric-stack">
              <div className="metric-line"><div className="metric-label"><strong>Balance</strong><span>{monitoring.balance.label}</span></div><div className="metric-value">{monitoring.balance.lamports}</div></div>
              <div className="metric-line"><div className="metric-label"><strong>Success rate</strong><span>Sponsored verification intents.</span></div><div className="metric-value">{monitoring.successRate}%</div></div>
              <div className="metric-line"><div className="metric-label"><strong>Outbox</strong><span>{monitoring.outbox.pending} pending, {monitoring.outbox.failed} failed.</span></div><div className="metric-value">{monitoring.outbox.succeeded}</div></div>
            </div>
          </section>

          <section className="paper-sheet sheet-pad">
            <div className="eyebrow">Attack simulation</div>
            <div className="campaign-sequence">
              {Object.entries(attacks).map(([name, result], index) => (
                <div className="campaign-sequence-step" key={name}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div><strong>{name}</strong><p>{result}</p></div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="ticket-sheet sheet-pad" style={{ marginTop: 18 }}>
          <div className="eyebrow">Receipt reconciliation</div>
          <div className="campaign-sequence">
            {reconciliation.length === 0 ? (
              <div className="campaign-sequence-step"><span>--</span><div><strong>No receipts yet</strong><p>Confirmed redemptions will appear here.</p></div></div>
            ) : reconciliation.map((receipt) => (
              <div className="campaign-sequence-step" key={receipt.receiptId}>
                <span>{receipt.status.slice(0, 2).toUpperCase()}</span>
                <div><strong>{receipt.receiptId}</strong><p>{receipt.receiptPda}</p></div>
              </div>
            ))}
          </div>
          <Link className="vs-link-chip" href="/api/launch/receipts/reconcile" style={{ marginTop: 18 }}>Open reconciliation JSON</Link>
        </section>
      </div>
    </div>
  );
}
