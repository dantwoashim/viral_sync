import { notFound } from 'next/navigation';
import {
  PremiumButton,
  PremiumDisclosure,
  PremiumMetric,
  PremiumNav,
  PremiumProofRow,
  PremiumShell,
  PremiumStatusBadge,
  PremiumSurface,
  PremiumTransactionPanel,
} from '@/components/premium/PremiumUi';
import { getReceiptExplorer } from '@/lib/launch/server';

function short(value?: string | null) {
  if (!value) return 'missing';
  if (value.length <= 22) return value;
  return `${value.slice(0, 8)}...${value.slice(-8)}`;
}

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

  const { receipt, merchant, offer, claim, referral, challenge, settlement, compressedProof } = proof;
  const actionUrl = `${baseUrl}/api/actions/causal-receipt/${encodeURIComponent(receipt.id)}`;
  const blinkUrl = `solana-action:${actionUrl}`;
  const settled = settlement.status === 'settled';
  const txIsDemoReference = receipt.txSignature.startsWith('demo_tx_');

  return (
    <PremiumShell>
      <PremiumNav />
      <section className="premium-flow-grid">
        <div className="premium-hero-copy">
          <span className="premium-eyebrow">Causal Receipt</span>
          <h1 className="premium-h1">Verify the visit receipt.</h1>
          <p className="premium-lede">
            {merchant?.name ?? 'A merchant'} verified a referred visit for {offer?.title ?? 'a Growth Bounty'}.
            The proof object exposes receipt, nullifier, attestation, and settlement state without exposing
            private customer identity.
          </p>
          <div className="premium-actions">
            <PremiumButton href="/causal-graph">Open graph</PremiumButton>
            <PremiumButton href="/demo" variant="secondary">Replay proof</PremiumButton>
            <PremiumButton href={actionUrl} variant="quiet">Action metadata</PremiumButton>
          </div>

          <div className="premium-proof-grid">
            <div className="premium-code-display premium-code-compact">
              <span>Receipt PDA</span>
              <strong>{short(receipt.receiptPda)}</strong>
            </div>
            <PremiumSurface tone="light" className="premium-system-section">
              <div className="premium-card-title">
                <span>Receipt path</span>
                <h2>Referral to visit to settlement.</h2>
              </div>
              <ol className="premium-timeline">
                <li><span>1</span><div><strong>Referrer</strong><p>{claim?.referrerDisplayName ?? 'Private referrer'} shared the invite.</p></div></li>
                <li><span>2</span><div><strong>Visitor</strong><p>{claim?.claimerDisplayName ?? 'Private visitor'} claimed with a campaign nullifier.</p></div></li>
                <li><span>3</span><div><strong>Merchant</strong><p>{merchant?.name ?? 'Merchant'} confirmed the counter visit.</p></div></li>
              </ol>
            </PremiumSurface>
          </div>
        </div>

        <PremiumTransactionPanel eyebrow={settled ? 'Settlement complete' : 'Settlement pending'} title="Proof object">
          <PremiumProofRow label="Receipt" value={short(receipt.receiptPda)} meta="Receipt PDA" status="success" />
          <PremiumProofRow
            label="Tx"
            value={short(receipt.txSignature)}
            meta={txIsDemoReference ? 'Local launch ledger reference' : 'Submission signature'}
            status={txIsDemoReference ? 'warning' : 'success'}
          />
          <PremiumProofRow label="Attestation" value={challenge?.status === 'consumed' ? 'dual-attested' : 'recorded'} meta="Customer and staff path" status={challenge?.status === 'consumed' ? 'success' : 'warning'} />
          <PremiumProofRow label="Settlement" value={settlement.status} meta={`${settlement.referrerAmount}/${settlement.visitorAmount} reward split`} status={settled ? 'success' : 'warning'} />
          <PremiumProofRow label="Blink" value={short(blinkUrl)} meta="Solana Action verification URL" status="muted" />
          <div className="premium-component-row">
            <PremiumStatusBadge tone={settled ? 'success' : 'warning'}>{settled ? 'Settled' : 'Submitted'}</PremiumStatusBadge>
            <PremiumStatusBadge tone="muted">Privacy-safe labels</PremiumStatusBadge>
          </div>
        </PremiumTransactionPanel>
      </section>

      <section className="premium-system-grid" style={{ marginTop: 'clamp(42px, 7vw, 76px)' }}>
        <PremiumSurface tone="light" className="premium-system-section">
          <div className="premium-card-title">
            <span>Public commitments</span>
            <h2>What can be verified.</h2>
          </div>
          <PremiumDisclosure title="Show technical commitments" summary="Hashes and nullifier">
            <div className="premium-proof-stack">
              <PremiumProofRow label="Receipt hash" value={receipt.receiptIdHash} meta="Receipt commitment" status="success" />
              <PremiumProofRow label="Invite hash" value={receipt.inviteHash} meta="Referral commitment" status="success" />
              <PremiumProofRow label="Nullifier" value={receipt.campaignNullifierHash} meta="Duplicate claim defense" status="danger" />
              <PremiumProofRow label="Visit hash" value={receipt.visitAttestationHash} meta="Staff-confirmed visit" status="success" />
            </div>
          </PremiumDisclosure>
        </PremiumSurface>

        <PremiumSurface tone="raised" className="premium-system-section">
          <div className="premium-card-title">
            <span>Composable proof</span>
            <h2>Use it outside this app.</h2>
          </div>
          <p className="premium-copy">
            The web fallback and Action metadata can be linked from a Blink, merchant ledger, SDK verifier,
            or partner dashboard without trusting screenshots.
          </p>
          <div className="premium-proof-stack">
            <PremiumProofRow label="Referral" value={referral?.token ?? receipt.referralToken} meta="Invite token" status="muted" />
            <PremiumProofRow label="Web fallback" value={`${baseUrl}/receipts/${encodeURIComponent(receipt.id)}`} meta="Walletless URL" status="muted" />
            <PremiumProofRow label="Merkle root" value={short(compressedProof.root)} meta="Compressed history preview" status="muted" />
          </div>
        </PremiumSurface>
      </section>

      <section className="premium-metrics" aria-label="Receipt proof summary">
        <PremiumMetric label="Merchant" value={merchant?.name ?? 'Merchant'} detail={merchant?.district ?? 'Pilot district'} />
        <PremiumMetric label="Evidence" value={receipt.evidenceLevel ?? 'staff_only'} detail="Evidence level is explicit." />
        <PremiumMetric label="Status" value={receipt.status} detail={receipt.settledAt ? `Settled ${receipt.settledAt.slice(0, 10)}` : 'Awaiting settlement'} />
      </section>
    </PremiumShell>
  );
}
