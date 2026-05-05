import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import Link from 'next/link';
import { ArrowSquareOut, CheckCircle, Fingerprint, Receipt, ShareNetwork, ShieldCheck } from '@phosphor-icons/react/dist/ssr';
import { PremiumNav, PremiumShell } from '@/components/premium/PremiumUi';
import SignatureReceipt from '@/components/product/SignatureReceipt';
import { ProofTimeline } from '@/components/product/ProofTimeline';
import { VerificationGrid } from '@/components/product/VerificationGrid';
import { gauntletLabel, getProofState } from '@/lib/proof/getProofState';
import { receiptMatches } from '@/lib/proof/normalizeReceipt';
import { explorerAddress, explorerTx, shortHash, signatureValue } from '@/lib/proof/links';

export default async function ReceiptProofPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proof = getProofState();
  if (!receiptMatches(proof, id)) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const publicUrl = `${baseUrl.replace(/\/$/, '')}/receipt/${encodeURIComponent(proof.receiptId)}`;
  const qrDataUrl = await QRCode.toDataURL(publicUrl, { margin: 1, width: 164, color: { dark: '#111827', light: '#ffffff' } });
  const recordSig = signatureValue(proof.manifest.signatures?.recordCausalReceipt);
  const settleSig = signatureValue(proof.manifest.signatures?.settleReceiptReward);

  return (
    <PremiumShell>
      <PremiumNav />
      <section className="bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50/80 via-white to-white min-h-[50vh] border-b border-gray-100 flex flex-col pt-32 pb-24 px-6 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 p-64 bg-indigo-500/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 p-64 bg-emerald-500/5 blur-[120px] rounded-full -translate-x-1/2 translate-y-1/2 pointer-events-none" />

        <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-[1fr_0.8fr] gap-16 lg:gap-24 items-center relative z-10">
          <div className="flex flex-col gap-6 max-w-2xl text-center lg:text-left mx-auto lg:mx-0">
            <div className="inline-flex w-fit mx-auto lg:mx-0 items-center gap-2 border border-emerald-100 rounded-full px-4 py-1.5 bg-emerald-50/50 text-emerald-700 text-xs font-bold tracking-widest uppercase shadow-sm">
              <ShieldCheck size={16} weight="bold" /> Verified Receipt
            </div>

            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight leading-[1.05] text-gray-900 font-serif">
              Proof of Visit
            </h1>

            <p className="text-xl text-gray-500 leading-relaxed font-medium">
              Digital receipt for <strong className="text-gray-900 font-semibold">{proof.merchantName}</strong> — settled transparently on the {proof.cluster} network.
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mt-4">
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-gray-200 text-sm font-semibold shadow-sm text-gray-700">
                <CheckCircle size={16} className="text-emerald-500" weight="fill" /> {proof.statusLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-gray-200 text-sm font-semibold shadow-sm text-gray-700">
                <ShareNetwork size={16} className="text-indigo-500" weight="bold" /> {proof.cluster}
              </span>
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-gray-200 text-sm font-semibold shadow-sm text-gray-700">
                <Fingerprint size={16} className="text-rose-500" weight="bold" /> {gauntletLabel(proof.gauntlet)} fraud checks
              </span>
            </div>
          </div>

          <div className="flex justify-center items-center">
            <SignatureReceipt proof={proof} />
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-gray-50/50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 lg:gap-24">
          <div className="flex flex-col bg-white rounded-[32px] p-8 lg:p-12 shadow-sm border border-gray-100">
            <span className="text-xs font-bold tracking-widest uppercase text-indigo-600 mb-4 inline-flex items-center gap-2">
              <CheckCircle size={16} /> Timeline
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 mb-10">How this receipt became payable.</h2>
            <ProofTimeline proof={proof} />
          </div>

          <div className="flex flex-col gap-12">
            <div className="flex flex-col items-center justify-center bg-white rounded-[32px] p-10 lg:p-16 shadow-sm border border-gray-100 text-center">
              <span className="text-xs font-bold tracking-widest uppercase text-emerald-600 mb-4 inline-flex items-center gap-2">
                <ShareNetwork size={16} /> Share Proof
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-8">Portable receipt link.</h2>
              <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100 mb-8 w-fit mx-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="w-[164px] h-[164px] object-contain rounded-xl" src={qrDataUrl} alt="QR code" />
              </div>
              <Link className="inline-flex items-center gap-2 h-12 px-8 rounded-full bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20 hover:-translate-y-0.5 transition-transform w-full sm:w-auto" href="/proof">
                Open proof center
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 max-w-7xl mx-auto">
        <details className="group bg-[#0a0a0a] rounded-[32px] overflow-hidden text-white border border-white/5 shadow-xl">
          <summary className="flex items-center justify-between px-8 py-6 cursor-pointer select-none hover:bg-[#111] transition-colors list-none">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#111] text-indigo-400">
                <Receipt size={24} weight="duotone" />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-bold text-lg">Technical Proof Manifest</span>
                <span className="text-sm text-gray-400">Cryptographically verifiable PDA mappings and signatures</span>
              </div>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#111] text-gray-400 group-open:rotate-180 transition-transform duration-300">
              <ArrowSquareOut size={18} weight="bold" />
            </div>
          </summary>

          <div className="p-8 border-t border-white/5 flex flex-col gap-12 bg-[#0a0a0a]">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-[#111] border border-white/5">
                <small className="text-[10px] font-bold tracking-widest uppercase text-indigo-400">Receipt PDA</small>
                <a className="font-mono text-sm break-all font-medium hover:text-indigo-300 transition-colors" href={explorerAddress(proof.manifest.pdas?.causalReceipt, proof.cluster) ?? undefined} target="_blank" rel="noopener noreferrer">{String(proof.manifest.pdas?.causalReceipt ?? 'missing')}</a>
              </div>
              <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-[#111] border border-white/5">
                <small className="text-[10px] font-bold tracking-widest uppercase text-indigo-400">TerminalDevice PDA</small>
                <a className="font-mono text-sm break-all font-medium hover:text-indigo-300 transition-colors" href={explorerAddress(proof.manifest.pdas?.terminalDevice, proof.cluster) ?? undefined} target="_blank" rel="noopener noreferrer">{String(proof.manifest.pdas?.terminalDevice ?? 'missing')}</a>
              </div>
              <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-[#111] border border-white/5">
                <small className="text-[10px] font-bold tracking-widest uppercase text-indigo-400">ClaimPass PDA</small>
                <a className="font-mono text-sm break-all font-medium hover:text-indigo-300 transition-colors" href={explorerAddress(proof.manifest.pdas?.claimPass, proof.cluster) ?? undefined} target="_blank" rel="noopener noreferrer">{String(proof.manifest.pdas?.claimPass ?? 'missing')}</a>
              </div>
              <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-[#111] border border-white/5">
                <small className="text-[10px] font-bold tracking-widest uppercase text-indigo-400">Nullifier PDA</small>
                <a className="font-mono text-sm break-all font-medium hover:text-indigo-300 transition-colors" href={explorerAddress(proof.manifest.pdas?.nullifierRecord, proof.cluster) ?? undefined} target="_blank" rel="noopener noreferrer">{String(proof.manifest.pdas?.nullifierRecord ?? 'missing')}</a>
              </div>
              <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-[#111] border border-white/5">
                <small className="text-[10px] font-bold tracking-widest uppercase text-indigo-400">SettlementRecord PDA</small>
                <a className="font-mono text-sm break-all font-medium hover:text-indigo-300 transition-colors" href={explorerAddress(proof.manifest.pdas?.settlementRecord, proof.cluster) ?? undefined} target="_blank" rel="noopener noreferrer">{String(proof.manifest.pdas?.settlementRecord ?? 'missing')}</a>
              </div>
              <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-[#111] border border-white/5">
                <small className="text-[10px] font-bold tracking-widest uppercase text-emerald-400">Intent manifest hash</small>
                <b className="font-mono text-sm break-all text-white font-medium">{String(proof.manifest.hashes?.intentManifestHash ?? 'missing')}</b>
              </div>
              <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-[#111] border border-white/5">
                <small className="text-[10px] font-bold tracking-widest uppercase text-emerald-400">Lineage proof hash</small>
                <b className="font-mono text-sm break-all text-white font-medium">{String(proof.manifest.intentManifest?.lineageProofHash ?? proof.manifest.pdas?.lineageProofHash ?? 'missing')}</b>
              </div>
              <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-[#111] border border-white/5">
                <small className="text-[10px] font-bold tracking-widest uppercase text-rose-400">Record transaction</small>
                <a className="font-mono text-sm font-medium hover:text-rose-300 transition-colors" href={explorerTx(recordSig, proof.cluster) ?? undefined} target="_blank" rel="noopener noreferrer">{shortHash(recordSig, 12, 10)}</a>
              </div>
              <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-[#111] border border-white/5">
                <small className="text-[10px] font-bold tracking-widest uppercase text-rose-400">Settlement transaction</small>
                <a className="font-mono text-sm font-medium hover:text-rose-300 transition-colors" href={explorerTx(settleSig, proof.cluster) ?? undefined} target="_blank" rel="noopener noreferrer">{shortHash(settleSig, 12, 10)}</a>
              </div>
            </div>

            <VerificationGrid proof={proof} />
          </div>
        </details>
      </section>
    </PremiumShell>
  );
}
