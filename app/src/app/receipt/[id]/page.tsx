import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import Link from 'next/link';
import { ArrowSquareOut, CheckCircle, Fingerprint, ListChecks, Receipt, ShieldCheck } from '@phosphor-icons/react/dist/ssr';
import { CivicShell } from '@/components/civic/CivicExperience';
import { ReplayRejectionPanel } from '@/components/civic/ReplayRejectionPanel';
import { getFeaturedCivicMarket } from '@/lib/civic/civicMarket';
import { getProofState } from '@/lib/proof/getProofState';
import { receiptMatches } from '@/lib/proof/normalizeReceipt';
import { explorerAddress, explorerTx, shortHash, signatureValue } from '@/lib/proof/links';

export default async function CivicReceiptProofPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proof = getProofState();
  if (!receiptMatches(proof, id)) notFound();

  const market = getFeaturedCivicMarket();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const publicUrl = `${baseUrl.replace(/\/$/, '')}/receipt/${encodeURIComponent(proof.receiptId)}?mode=civic`;
  const qrDataUrl = await QRCode.toDataURL(publicUrl, { margin: 1, width: 164, color: { dark: '#131611', light: '#ffffff' } });
  const recordSig = signatureValue(proof.manifest.signatures?.recordCausalReceipt);
  const settleSig = signatureValue(proof.manifest.signatures?.settleReceiptReward);

  return (
    <CivicShell>
      <section className="mx-auto grid max-w-[1180px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_0.86fr] lg:px-8">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--civic-muted)]">Civic action receipt</p>
          <h1 className="mt-3 max-w-3xl text-[clamp(2.3rem,6vw,5.4rem)] font-semibold leading-[0.96] tracking-normal text-[var(--civic-ink)]">
            Participation can be rewarded only after the receipt path checks out.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--civic-muted)]">
            This receipt is the Solana evidence behind the Ward 12 civic MVP. It proves a counter-attested devnet settlement path; it does not prove the public authority dataset or physical repair completion.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[var(--civic-ink)] px-5 text-sm font-semibold text-white" href="/ledger">
              Open civic ledger <ListChecks size={16} weight="bold" />
            </Link>
            <Link className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-[var(--civic-line-strong)] bg-white px-5 text-sm font-semibold text-[var(--civic-ink)]" href={`/verify/${market.slug}`}>
              Verify another pass <Fingerprint size={16} weight="bold" />
            </Link>
          </div>
        </div>

        <section className="rounded-lg border border-[var(--civic-line)] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--civic-muted)]">{market.locality}</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-normal text-[var(--civic-ink)]">{market.title}</h2>
            </div>
            <Receipt size={24} weight="duotone" className="text-[var(--civic-green)]" />
          </div>
          <div className="mt-5 grid gap-3">
            <ReceiptFact label="Receipt PDA" value={market.evidence.receiptPda} />
            <ReceiptFact label="Settlement PDA" value={market.evidence.settlementPda} />
            <ReceiptFact label="Nullifier PDA" value={market.evidence.nullifierPda} />
            <ReceiptFact label="Forecast payout coupling" value="false" />
          </div>
          <div className="mt-5 flex items-center justify-between gap-4 rounded-md bg-[var(--civic-wash)] p-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--civic-muted)]">Portable receipt</p>
              <p className="mt-1 text-sm text-[var(--civic-muted)]">Public URL for judges and verifiers.</p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="size-[96px] rounded-md border border-[var(--civic-line)] bg-white p-1" src={qrDataUrl} alt="QR code for civic receipt URL" />
          </div>
        </section>
      </section>

      <section className="mx-auto grid max-w-[1180px] gap-4 px-4 pb-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <section className="rounded-lg border border-[var(--civic-line)] bg-[var(--civic-ink)] p-5 text-white shadow-sm">
          <div className="flex items-center gap-3">
            <ShieldCheck size={24} weight="duotone" className="text-[var(--civic-green-light)]" />
            <h2 className="text-xl font-semibold tracking-normal">Technical receipt binding</h2>
          </div>
          <div className="mt-5 grid gap-3">
            <DarkReceiptFact label="Program" value={proof.programId} href={explorerAddress(proof.programId, proof.cluster)} />
            <DarkReceiptFact label="Record tx" value={shortHash(recordSig, 12, 10)} href={explorerTx(recordSig, proof.cluster)} />
            <DarkReceiptFact label="Settle tx" value={shortHash(settleSig, 12, 10)} href={explorerTx(settleSig, proof.cluster)} />
            <DarkReceiptFact label="Intent hash" value={String(proof.manifest.hashes?.intentManifestHash ?? 'missing')} />
          </div>
        </section>
        <ReplayRejectionPanel market={market} />
      </section>

      <section className="mx-auto max-w-[1180px] px-4 pb-16 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-[var(--civic-line)] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <CheckCircle size={23} weight="fill" className="text-[var(--civic-green)]" />
            <h2 className="text-xl font-semibold tracking-normal">What this receipt proves</h2>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {market.proofBoundary.proven.map((item) => (
              <p key={item} className="rounded-md bg-[var(--civic-wash)] p-3 text-sm leading-6 text-[var(--civic-muted)]">{item}</p>
            ))}
          </div>
        </div>
      </section>
    </CivicShell>
  );
}

function ReceiptFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[var(--civic-wash)] px-3 py-2">
      <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--civic-muted)]">{label}</span>
      <strong className="mt-1 block break-all text-sm font-semibold text-[var(--civic-ink)]">{value}</strong>
    </div>
  );
}

function DarkReceiptFact({ label, value, href }: { label: string; value: string; href?: string | null }) {
  const content = <strong className="mt-1 block break-all font-mono text-xs font-semibold text-white">{value}</strong>;
  return (
    <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2">
      <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50">{label}</span>
      {href ? (
        <a className="group inline-flex w-full items-start gap-2" href={href} target="_blank" rel="noreferrer">
          {content}
          <ArrowSquareOut size={14} weight="bold" className="mt-1 shrink-0 text-white/45 transition-colors group-hover:text-white" />
        </a>
      ) : content}
    </div>
  );
}
