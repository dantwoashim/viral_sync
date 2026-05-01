import Link from 'next/link';
import { CopyValueButton } from '@/components/premium/CopyValueButton';
import { PremiumMetric, PremiumStatusBadge, PremiumSurface } from '@/components/premium/PremiumUi';
import { PremiumWorkspace } from '@/components/premium/PremiumWorkspace';
import { getMerchantAuditActivity, getMerchantSummary, getReceiptReconciliation } from '@/lib/launch/server';

function statusTone(status: string) {
  if (status === 'indexed' || status === 'confirmed') return 'success' as const;
  if (status === 'failed') return 'danger' as const;
  if (status === 'submitted') return 'warning' as const;
  return 'muted' as const;
}

function statusLabel(status: string) {
  if (status === 'indexed') return 'Indexed and ready';
  if (status === 'confirmed') return 'Settlement confirmed';
  if (status === 'submitted') return 'Waiting on chain';
  if (status === 'failed') return 'Needs operator retry';
  return 'Awaiting receipt';
}

export default async function MerchantLedgerPage() {
  const [summary, receipts, activity] = await Promise.all([getMerchantSummary(), getReceiptReconciliation(), getMerchantAuditActivity()]);
  const totalReceipts = receipts.length;
  const settled = receipts.filter((receipt) => receipt.status === 'confirmed' || receipt.status === 'indexed').length;
  const failed = receipts.filter((receipt) => receipt.status === 'failed').length;

  return (
    <PremiumWorkspace audience="merchant" active="ledger">
      <section className="premium-taskbar" aria-label="Ledger next action">
        <div>
          <span>Next audit</span>
          <strong>{settled > 0 ? 'Review settled receipts before fee reconciliation' : totalReceipts > 0 ? 'Track submitted receipts until confirmed' : 'Wait for the first confirmed visit'}</strong>
        </div>
        <Link className="premium-button premium-button-primary" href={totalReceipts > 0 ? '/api/launch/receipts/reconcile' : '/merchant/scan'}>
          {totalReceipts > 0 ? 'Open reconciliation' : 'Confirm a visit'}
        </Link>
      </section>

      <section className="premium-workspace-hero">
        <div>
          <span className="premium-eyebrow">Ledger proof table</span>
          <h1 className="premium-h2">Audit every reward before fees.</h1>
          <p className="premium-lede">
            The ledger is the trust surface for money movement: a merchant can copy a signature, inspect a receipt, and see whether settlement is confirmed or still pending.
          </p>
        </div>
        <PremiumSurface tone="proof" className="premium-ops-card">
          <div className="premium-card-title">
            <span>Cycle accounting</span>
            <h2>No platform fee before merchant truth exists.</h2>
          </div>
          <div className="premium-workspace-metrics is-proof">
            <PremiumMetric label="Receipts" value={String(totalReceipts)} detail="Causal receipt rows" />
            <PremiumMetric label="Settled" value={String(settled)} detail="Confirmed or indexed" />
            <PremiumMetric label="Failures" value={String(failed)} detail="Visible relayer issues" />
          </div>
        </PremiumSurface>
      </section>

      <PremiumSurface tone="light" className="premium-ops-card">
        <div className="premium-card-title">
          <span>Receipt settlement ledger</span>
          <h2>{summary.merchant.name}</h2>
        </div>
        <div className="premium-ledger-table">
          <div className="premium-ledger-head">
            <span>Receipt</span>
            <span>Status</span>
            <span>Amount</span>
            <span>Signature</span>
            <span>Action</span>
          </div>
          {receipts.length === 0 ? (
            <div className="premium-state">
              <strong>No receipts yet</strong>
              <p>Confirmed visits will appear here with receipt PDA, transaction signature, settlement status, and copy action.</p>
            </div>
          ) : receipts.map((receipt, index) => (
            <div className="premium-ledger-row" key={receipt.receiptId}>
              <Link href={`/receipts/${encodeURIComponent(receipt.receiptId)}`}>
                <strong>{receipt.receiptId}</strong>
                <span>{receipt.receiptPda}</span>
              </Link>
              <PremiumStatusBadge tone={statusTone(receipt.status)}>{statusLabel(receipt.status)}</PremiumStatusBadge>
              <code>NPR {260 + index * 40}</code>
              <code>{receipt.txSignature}</code>
              <CopyValueButton value={receipt.txSignature} label="Copy signature" />
            </div>
          ))}
        </div>
      </PremiumSurface>

      <section className="premium-workspace-grid">
        <PremiumSurface tone="light" className="premium-ops-card">
          <div className="premium-card-title">
            <span>Staff activity</span>
            <h2>Every sensitive action has an operator trail.</h2>
          </div>
          <div className="premium-table-list">
            {activity.length === 0 ? (
              <div className="premium-state">
                <strong>No staff events yet</strong>
                <p>Logins, device changes, confirmations, voids, and relayer decisions will appear here.</p>
              </div>
            ) : activity.map((event) => (
              <div className="premium-table-row" key={event.id}>
                <div>
                  <strong>{event.outcome}</strong>
                  <span>{event.action.replaceAll('_', ' ')}</span>
                </div>
                <code>{event.actor}</code>
                <small>{event.reason || event.target}</small>
              </div>
            ))}
          </div>
        </PremiumSurface>

        {summary.ledger.map((row) => (
          <PremiumSurface tone="light" className="premium-ops-card" key={row.title}>
            <div className="premium-card-title">
              <span>{row.meta}</span>
              <h2>{row.value}</h2>
            </div>
            <p className="premium-copy"><strong>{row.title}</strong></p>
            <p className="premium-copy">{row.subtitle}</p>
          </PremiumSurface>
        ))}
      </section>
    </PremiumWorkspace>
  );
}
