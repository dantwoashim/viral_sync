import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import Link from 'next/link';
import { PremiumNav, PremiumShell } from '@/components/premium/PremiumUi';
import SignatureReceipt from '@/components/product/SignatureReceipt';
import { ProofTimeline } from '@/components/product/ProofTimeline';
import { VerificationGrid } from '@/components/product/VerificationGrid';
import { getProofState } from '@/lib/proof/getProofState';
import { receiptMatches } from '@/lib/proof/normalizeReceipt';
import { explorerAddress, explorerTx, shortHash, signatureValue } from '@/lib/proof/links';

export default async function ReceiptProofPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proof = getProofState();
  if (!receiptMatches(proof, id)) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const publicUrl = `${baseUrl.replace(/\/$/, '')}/receipt/${encodeURIComponent(proof.receiptId)}`;
  const qrDataUrl = await QRCode.toDataURL(publicUrl, { margin: 1, width: 164 });
  const recordSig = signatureValue(proof.manifest.signatures?.recordCausalReceipt);
  const settleSig = signatureValue(proof.manifest.signatures?.settleReceiptReward);

  return (
    <PremiumShell className="receipt-page">
      <PremiumNav />
      <section className="receipt-hero">
        <div className="receipt-copy">
          <span className="eyebrow-pill">Verified receipt</span>
          <h1>Verified Visit Receipt</h1>
          <p>{proof.merchantName} · settled on Solana · {proof.statusLabel}</p>
          <div className="receipt-pills">
            <span>{proof.statusLabel}</span>
            <span>{proof.cluster}</span>
            <span>{proof.gauntlet.summary?.blocked ?? 16}/{proof.gauntlet.summary?.totalCases ?? 16} fraud checks</span>
          </div>
        </div>
        <SignatureReceipt proof={proof} />
      </section>

      <section className="receipt-layout">
        <div className="receipt-panel">
          <span className="section-kicker">Timeline</span>
          <h2>How this receipt became payable.</h2>
          <ProofTimeline />
        </div>
        <div className="receipt-panel">
          <span className="section-kicker">Share proof</span>
          <h2>Portable receipt link.</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="receipt-qr" src={qrDataUrl} alt="QR code to this receipt proof" />
          <Link className="product-button secondary" href="/proof">Open proof center</Link>
        </div>
      </section>

      <section className="receipt-panel technical-drawer">
        <details>
          <summary>Show technical proof</summary>
          <div className="technical-grid">
            <div><small>Receipt PDA</small><a href={explorerAddress(proof.manifest.pdas?.causalReceipt, proof.cluster) ?? undefined}>{String(proof.manifest.pdas?.causalReceipt ?? 'missing')}</a></div>
            <div><small>TerminalDevice PDA</small><a href={explorerAddress(proof.manifest.pdas?.terminalDevice, proof.cluster) ?? undefined}>{String(proof.manifest.pdas?.terminalDevice ?? 'missing')}</a></div>
            <div><small>ClaimPass PDA</small><a href={explorerAddress(proof.manifest.pdas?.claimPass, proof.cluster) ?? undefined}>{String(proof.manifest.pdas?.claimPass ?? 'missing')}</a></div>
            <div><small>Nullifier PDA</small><a href={explorerAddress(proof.manifest.pdas?.nullifierRecord, proof.cluster) ?? undefined}>{String(proof.manifest.pdas?.nullifierRecord ?? 'missing')}</a></div>
            <div><small>SettlementRecord PDA</small><a href={explorerAddress(proof.manifest.pdas?.settlementRecord, proof.cluster) ?? undefined}>{String(proof.manifest.pdas?.settlementRecord ?? 'missing')}</a></div>
            <div><small>Intent manifest hash</small><b>{String(proof.manifest.hashes?.intentManifestHash ?? 'missing')}</b></div>
            <div><small>Lineage proof hash</small><b>{String(proof.manifest.intentManifest?.lineageProofHash ?? proof.manifest.pdas?.lineageProofHash ?? 'missing')}</b></div>
            <div><small>Record transaction</small><a href={explorerTx(recordSig, proof.cluster) ?? undefined}>{shortHash(recordSig, 12, 10)}</a></div>
            <div><small>Settlement transaction</small><a href={explorerTx(settleSig, proof.cluster) ?? undefined}>{shortHash(settleSig, 12, 10)}</a></div>
          </div>
          <VerificationGrid proof={proof} />
        </details>
      </section>
    </PremiumShell>
  );
}
