import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getReceiptExplorer } from '@/lib/launch/server';

export default async function ReceiptExplorerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const proof = await getReceiptExplorer(decodeURIComponent(id));
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.PUBLIC_BASE_URL || 'http://localhost:3000';

  if (!proof) {
    notFound();
  }

  const { receipt, merchant, offer, claim, referral, challenge, settlement } = proof;
  const actionUrl = `${baseUrl}/api/actions/causal-receipt/${encodeURIComponent(receipt.id)}`;
  const blinkUrl = `solana-action:${actionUrl}`;

  return (
    <main className="proof-page">
      <section className="proof-hero">
        <span>Causal Receipt</span>
        <h1>{merchant?.name ?? 'Merchant'} verified a referred visit.</h1>
        <p>{offer?.title ?? 'Growth Bounty'} produced a receipt without exposing private customer identity.</p>
        <div className="proof-actions">
          <Link href="/causal-graph">Open graph</Link>
          <Link href="/fraud-demo">Replay demo</Link>
          <Link href={actionUrl}>Action metadata</Link>
        </div>
      </section>

      <section className="proof-grid">
        <article>
          <span>Receipt PDA</span>
          <strong>{receipt.receiptPda}</strong>
        </article>
        <article>
          <span>Tx reference</span>
          <strong>{receipt.txSignature}</strong>
        </article>
        <article>
          <span>Attestation</span>
          <strong>{challenge?.status === 'consumed' ? 'Dual-attested' : 'Recorded'}</strong>
        </article>
        <article>
          <span>Settlement</span>
          <strong>{settlement.status}</strong>
        </article>
      </section>

      <section className="proof-path">
        <div><span>Referrer</span><strong>{claim?.referrerDisplayName ?? 'Private referrer'}</strong></div>
        <i />
        <div><span>Visitor</span><strong>{claim?.claimerDisplayName ?? 'Private visitor'}</strong></div>
        <i />
        <div><span>Merchant</span><strong>{merchant?.name ?? 'Merchant'}</strong></div>
      </section>

      <section className="proof-table">
        <div><span>Receipt hash</span><code>{receipt.receiptIdHash}</code></div>
        <div><span>Invite hash</span><code>{receipt.inviteHash}</code></div>
        <div><span>Nullifier</span><code>{receipt.campaignNullifierHash}</code></div>
        <div><span>Visit attestation</span><code>{receipt.visitAttestationHash}</code></div>
        <div><span>Referral token</span><code>{referral?.token ?? receipt.referralToken}</code></div>
        <div><span>Blink URL</span><code>{blinkUrl}</code></div>
        <div><span>Walletless fallback</span><code>{`${baseUrl}/receipts/${encodeURIComponent(receipt.id)}`}</code></div>
      </section>
    </main>
  );
}
