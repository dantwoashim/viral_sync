import Link from 'next/link';
import { DownloadSimple, LockKey, FileCode, Checks, Bug, ShieldWarning, ArrowRight } from '@phosphor-icons/react/dist/ssr';
import SignatureReceipt from '@/components/product/SignatureReceipt';
import { FraudCaseRow } from '@/components/product/FraudCaseRow';
import { VerificationGrid } from '@/components/product/VerificationGrid';
import { ProofTimeline } from '@/components/product/ProofTimeline';
import { PremiumNav, PremiumShell } from '@/components/premium/PremiumUi';
import { gauntletLabel, getProofState } from '@/lib/proof/getProofState';
import { explorerAddress, explorerTx, shortHash, signatureValue } from '@/lib/proof/links';

export default function ProofCenterPage() {
  const proof = getProofState();
  const manifest = proof.manifest;
  const gauntletCases = proof.gauntlet.cases ?? manifest.attackEvidence ?? [];
  const recordSig = signatureValue(manifest.signatures?.recordCausalReceipt);
  const settleSig = signatureValue(manifest.signatures?.settleReceiptReward);
  const programMatches = proof.programIdConsistency.programIdConsistency?.matches === true;

  const sections = [
    { id: 'receipt', label: 'Receipt Proof', icon: FileCode },
    { id: 'gauntlet', label: 'Negative Tests', icon: Bug },
    { id: 'verifier', label: 'Verifier Checks', icon: Checks },
    { id: 'program', label: 'Devnet Evidence', icon: LockKey },
    { id: 'artifacts', label: 'Artifacts', icon: DownloadSimple },
    { id: 'limitations', label: 'Limitations', icon: ShieldWarning },
  ];

  return (
    <PremiumShell className="bg-gray-50">
      <PremiumNav />
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[760px] h-[760px] bg-indigo-500/5 blur-[120px] rounded-full translate-x-1/3 -translate-y-1/3" />
        <div className="absolute top-[42vh] left-0 w-[540px] h-[540px] bg-emerald-500/5 blur-[120px] rounded-full -translate-x-1/3" />
      </div>

      <div className="max-w-[1320px] mx-auto px-6 py-28 relative z-10 grid lg:grid-cols-[260px_1fr] gap-12 items-start">
        <aside className="hidden lg:flex flex-col sticky top-28 gap-6" aria-label="Proof sections">
          <div className="flex items-center gap-3 px-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center font-bold tracking-tighter text-lg shadow-sm">VS</div>
            <div className="flex flex-col">
              <span className="font-bold text-gray-900 leading-tight">Proof Center</span>
              <span className="text-xs font-semibold uppercase tracking-widest text-indigo-600 leading-tight">Devnet POC-1</span>
            </div>
          </div>
          <nav className="flex flex-col gap-1 pr-4">
            {sections.map(({ id, label, icon: Icon }) => (
              <a
                key={id}
                href={`#${id}`}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-600 font-medium hover:bg-white hover:text-indigo-600 hover:shadow-sm transition-all text-sm group"
              >
                <Icon size={18} className="text-gray-400 group-hover:text-indigo-500 transition-colors" weight="duotone" />
                {label}
              </a>
            ))}
          </nav>
        </aside>

        <main className="flex flex-col gap-12 lg:gap-14 max-w-4xl min-w-0">
          <header className="flex flex-col gap-8 md:flex-row md:items-end justify-between border-b border-gray-200 pb-10">
            <div className="flex flex-col gap-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-bold uppercase tracking-widest text-gray-600 shadow-sm w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {proof.statusLabel} devnet proof
              </span>
              <h1 className="text-4xl lg:text-6xl font-bold tracking-tight text-gray-900 font-serif">Proof Center</h1>
              <p className="text-xl text-gray-500 leading-relaxed font-medium max-w-2xl">
                Public evidence for one POC-1 receipt: counter-attestation, replay protection, settlement, verifier output, and known limits.
              </p>
            </div>
            <a
              className="inline-flex shrink-0 items-center gap-2 h-12 px-6 rounded-full bg-white border border-gray-200 text-gray-900 font-semibold shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all text-sm"
              href="/proofs/devnet-causal-commerce.json"
              download
            >
              <DownloadSimple size={18} weight="bold" /> Download proof
            </a>
          </header>

          <section className="grid grid-cols-2 md:grid-cols-5 gap-px bg-gray-200 border border-gray-200 rounded-[24px] overflow-hidden" aria-label="Proof summary">
            <Metric label="Receipt PDA" value={shortHash(manifest.pdas?.causalReceipt)} mono />
            <Metric label="Program ID" value={shortHash(proof.programId)} mono />
            <Metric label="Cluster" value={proof.cluster} tone="indigo" />
            <Metric label="Negative Tests" value={gauntletLabel(proof.gauntlet)} tone="emerald" />
            <Metric label="Source Binding" value={programMatches ? 'Matched' : 'Review'} tone={programMatches ? 'emerald' : 'rose'} />
          </section>

          <section id="receipt" className="flex flex-col bg-white rounded-[28px] border border-gray-100 shadow-sm overflow-hidden scroll-mt-28">
            <div className="grid md:grid-cols-[1fr_300px] gap-8 p-8 lg:p-12">
              <div className="flex flex-col gap-6">
                <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-indigo-600">
                  <FileCode size={16} /> Receipt Evidence
                </span>
                <h2 className="text-3xl font-bold tracking-tight text-gray-900">A counter-attested settlement receipt.</h2>
                <p className="text-gray-500 font-medium leading-relaxed mb-4">
                  This receipt was recorded and settled on devnet using the merchant authority, enrolled terminal, visitor signer, claim-pass account, reward escrow, nullifier PDA, and settlement PDA.
                </p>
                <ProofTimeline proof={proof} />
              </div>
              <div className="flex justify-center items-center bg-gray-50 rounded-3xl p-6 border border-gray-100">
                <SignatureReceipt proof={proof} compact />
              </div>
            </div>
          </section>

          <section id="gauntlet" className="flex flex-col bg-[#0a0a0a] text-white rounded-[28px] border border-white/5 shadow-xl overflow-hidden scroll-mt-28">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 lg:p-12 border-b border-white/5">
              <div className="flex flex-col gap-2">
                <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-emerald-400">
                  <Bug size={16} /> Negative-Path Tests
                </span>
                <h2 className="text-3xl font-bold tracking-tight">{gauntletLabel(proof.gauntlet)} invalid flows rejected</h2>
                <p className="text-gray-400 font-medium max-w-2xl">
                  Deterministic test evidence with expected-error matching and account mutation checks. This is not a claim of live production fraud traffic.
                </p>
              </div>
              <Link href="/proofs/fraud-gauntlet.json" className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-[#111] border border-white/10 text-white text-sm font-bold hover:bg-[#1a1a1a] transition-colors shrink-0">Open JSON <ArrowRight size={14} /></Link>
            </div>
            <div className="flex flex-col p-4">
              {gauntletCases.slice(0, 19).map((item) => <FraudCaseRow item={item} key={item.id} />)}
            </div>
          </section>

          <section id="verifier" className="flex flex-col bg-[#0a0a0a] text-white rounded-[28px] border border-white/5 shadow-xl overflow-hidden scroll-mt-28 p-8 lg:p-12">
            <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-indigo-400 mb-2">
              <Checks size={16} /> Verifier Output
            </span>
            <h2 className="text-3xl font-bold tracking-tight mb-3">Field checks from the receipt and related accounts.</h2>
            <p className="text-gray-400 font-medium mb-8 max-w-2xl">
              The verifier checks the receipt, campaign, escrow, settlement, nullifier, terminal, visitor, lineage, and payout fields against the published manifest.
            </p>
            <VerificationGrid proof={proof} />
          </section>

          <section id="program" className="flex flex-col bg-[#0a0a0a] text-white rounded-[28px] border border-white/5 shadow-xl overflow-hidden scroll-mt-28">
            <div className="flex flex-col p-8 lg:p-12 gap-6">
              <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-indigo-400">
                <LockKey size={16} /> Devnet Evidence
              </span>
              <h2 className="text-3xl font-bold tracking-tight">Program identity and transaction links.</h2>
              <div className="grid gap-6 mt-2">
                <div className="flex flex-col gap-1.5">
                  <small className="text-[10px] font-bold tracking-widest uppercase text-gray-500">Program ID</small>
                  <a className="font-mono text-sm font-medium text-white hover:text-indigo-400 break-all transition-colors" href={explorerAddress(proof.programId, proof.cluster) ?? undefined} target="_blank" rel="noopener noreferrer">{proof.programId}</a>
                </div>
                <div className="grid sm:grid-cols-2 gap-6">
                  <EvidenceLink label="record_causal_receipt" href={explorerTx(recordSig, proof.cluster)} value={shortHash(recordSig)} />
                  <EvidenceLink label="settle_receipt_reward" href={explorerTx(settleSig, proof.cluster)} value={shortHash(settleSig)} />
                  <MetricDark label="Intent manifest hash" value={shortHash(manifest.hashes?.intentManifestHash, 12, 10)} />
                  <MetricDark label="Lineage proof hash" value={shortHash(manifest.intentManifest?.lineageProofHash ?? manifest.pdas?.lineageProofHash, 12, 10)} />
                  <div className="flex flex-col gap-1.5">
                    <small className="text-[10px] font-bold tracking-widest uppercase text-gray-500">Program ID consistency</small>
                    <b className={`text-sm font-bold uppercase tracking-wider ${programMatches ? 'text-emerald-400' : 'text-rose-400'}`}>{programMatches ? 'matched' : 'review'}</b>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="artifacts" className="flex flex-col bg-white rounded-[28px] border border-gray-100 shadow-sm overflow-hidden scroll-mt-28 p-8 lg:p-12">
            <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-indigo-600 mb-6">
              <DownloadSimple size={16} /> Public Artifacts
            </span>
            <div className="grid sm:grid-cols-2 gap-4">
              <ArtifactLink href="/proofs/devnet-causal-commerce.json" label="POC-1 manifest" />
              <ArtifactLink href="/proofs/devnet-causal-commerce-verifier.json" label="Verifier output" />
              <ArtifactLink href="/proofs/fraud-gauntlet.json" label="Negative-path suite" />
              <ArtifactLink href="/proofs/proof-feed.json" label="Proof feed" />
            </div>
          </section>

          <section id="limitations" className="flex flex-col bg-rose-50/50 rounded-[28px] border border-rose-100 shadow-sm overflow-hidden scroll-mt-28 p-8 lg:p-12 mb-20">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-100 text-rose-600 mb-6">
              <ShieldWarning size={24} weight="duotone" />
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-4">What this proof does not claim.</h2>
            <div className="grid gap-3 text-gray-600 font-medium leading-relaxed">
              <p>{manifest.limitation ?? 'Devnet POC-1 proof. External audit, capped mainnet controls, and production operations are required before real-value deployment.'}</p>
              <p>This proves merchant, terminal, and visitor counter-attestation. It does not independently prove physical-world truth, GPS location, POS payment, or live merchant traction.</p>
            </div>
          </section>
        </main>
      </div>
    </PremiumShell>
  );
}

function Metric({ label, value, mono = false, tone = 'gray' }: { label: string; value: string; mono?: boolean; tone?: 'gray' | 'indigo' | 'emerald' | 'rose' }) {
  const color = tone === 'indigo' ? 'text-indigo-600' : tone === 'emerald' ? 'text-emerald-600' : tone === 'rose' ? 'text-rose-600' : 'text-gray-900';
  return (
    <div className="flex flex-col gap-1 p-5 bg-white min-w-0">
      <small className="text-[10px] font-bold tracking-widest uppercase text-gray-500">{label}</small>
      <b className={`text-sm truncate ${mono ? 'font-mono' : 'font-semibold'} ${color}`}>{value}</b>
    </div>
  );
}

function MetricDark({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <small className="text-[10px] font-bold tracking-widest uppercase text-gray-500">{label}</small>
      <b className="font-mono text-sm font-medium text-white">{value}</b>
    </div>
  );
}

function EvidenceLink({ label, href, value }: { label: string; href?: string | null; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <small className="text-[10px] font-bold tracking-widest uppercase text-gray-500">{label}</small>
      <a className="font-mono text-sm font-medium text-rose-300 hover:text-rose-200" href={href ?? undefined} target="_blank" rel="noopener noreferrer">{value}</a>
    </div>
  );
}

function ArtifactLink({ href, label }: { href: string; label: string }) {
  return (
    <a className="flex items-center justify-between p-4 rounded-2xl border border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors group" href={href} download>
      <span className="font-semibold text-gray-900 text-sm">{label}</span>
      <DownloadSimple size={18} className="text-gray-400 group-hover:text-indigo-600" />
    </a>
  );
}
