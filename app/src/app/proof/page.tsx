import Link from 'next/link';
import { DownloadSimple, ShieldCheck, LockKey, FileCode, Checks, Bug, Trophy, Robot, ShieldWarning, ArrowRight } from '@phosphor-icons/react/dist/ssr';
import SignatureReceipt from '@/components/product/SignatureReceipt';
import { FraudCaseRow } from '@/components/product/FraudCaseRow';
import { VerificationGrid } from '@/components/product/VerificationGrid';
import { ProofTimeline } from '@/components/product/ProofTimeline';
import { PremiumNav, PremiumShell } from '@/components/premium/PremiumUi';
import { gauntletLabel, getProofState } from '@/lib/proof/getProofState';
import { explorerAddress, explorerTx, shortHash, signatureValue } from '@/lib/proof/links';
import { getWorldClassReadiness } from '@/lib/readiness/operatingReadiness';
import { getExecutionAudit } from '@/lib/readiness/executionAudit';
import { getMerchantValidationState } from '@/lib/traction/merchantValidation';

export default function ProofCenterPage() {
  const proof = getProofState();
  const manifest = proof.manifest;
  const gauntletCases = proof.gauntlet.cases ?? manifest.attackEvidence ?? [];
  const recordSig = signatureValue(manifest.signatures?.recordCausalReceipt);
  const settleSig = signatureValue(manifest.signatures?.settleReceiptReward);
  const programMatches = proof.programIdConsistency.programIdConsistency?.matches === true;
  const validation = getMerchantValidationState(proof);
  const readiness = getWorldClassReadiness(proof, validation);
  const executionAudit = getExecutionAudit(proof, validation, readiness);

  const sections = [
    { id: 'receipt', label: 'Receipt Proof', icon: FileCode },
    { id: 'gauntlet', label: 'Fraud Gauntlet', icon: Bug },
    { id: 'verifier', label: 'On-chain Verifier', icon: Checks },
    { id: 'validation', label: 'Merchant Validation', icon: Trophy },
    { id: 'readiness', label: 'Operating Readiness', icon: Robot },
    { id: 'execution-audit', label: 'Execution Audit', icon: ShieldCheck },
    { id: 'program', label: 'Program Identity', icon: LockKey },
    { id: 'artifacts', label: 'Artifact Downloads', icon: DownloadSimple },
    { id: 'limitations', label: 'Limitations', icon: ShieldWarning },
  ];

  return (
    <PremiumShell className="bg-gray-50">
      <PremiumNav />
      {/* Background decorations */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-500/5 blur-[120px] rounded-full translate-x-1/3 -translate-y-1/3" />
        <div className="absolute top-[40vh] left-0 w-[600px] h-[600px] bg-emerald-500/5 blur-[120px] rounded-full -translate-x-1/3" />
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-32 relative z-10 grid lg:grid-cols-[280px_1fr] gap-12 lg:gap-16 items-start">
        {/* Sticky Sidebar */}
        <aside className="hidden lg:flex flex-col sticky top-32 gap-6" aria-label="Proof sections">
          <div className="flex items-center gap-3 px-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center font-bold tracking-tighter text-lg shadow-sm">VS</div>
            <div className="flex flex-col">
              <span className="font-bold text-gray-900 leading-tight">Developer Proof</span>
              <span className="text-xs font-semibold uppercase tracking-widest text-indigo-600 leading-tight">{proof.statusLabel}</span>
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

        {/* Main Content Workspace */}
        <main className="flex flex-col gap-12 lg:gap-16 max-w-4xl min-w-0">
          {/* Header */}
          <div className="flex flex-col gap-8 md:flex-row md:items-end justify-between border-b border-gray-200 pb-12">
            <div className="flex flex-col gap-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-bold uppercase tracking-widest text-gray-600 shadow-sm w-fit">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> {proof.statusLabel} Proof
              </span>
              <h1 className="text-4xl lg:text-6xl font-bold tracking-tight text-gray-900 font-serif">Proof Center</h1>
              <p className="text-xl text-gray-500 leading-relaxed font-medium max-w-2xl">
                One receipt, three signatures, exact-once settlement, and a machine-readable fraud gauntlet.
              </p>
            </div>
            <a
              className="inline-flex shrink-0 items-center gap-2 h-12 px-6 rounded-full bg-white border border-gray-200 text-gray-900 font-semibold shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all text-sm"
              href="/proofs/devnet-causal-commerce.json"
              download
            >
              <DownloadSimple size={18} weight="bold" /> Download JSON
            </a>
          </div>

          {/* Key Metrics Summary */}
          <section className="grid grid-cols-2 md:grid-cols-5 gap-px bg-gray-200 border border-gray-200 rounded-[24px] overflow-hidden" aria-label="Proof summary">
            <div className="flex flex-col gap-1 p-5 bg-white">
              <small className="text-[10px] font-bold tracking-widest uppercase text-gray-500">Receipt PDA</small>
              <b className="text-sm font-mono text-gray-900 truncate">{shortHash(manifest.pdas?.causalReceipt)}</b>
            </div>
            <div className="flex flex-col gap-1 p-5 bg-white">
              <small className="text-[10px] font-bold tracking-widest uppercase text-gray-500">Program ID</small>
              <b className="text-sm font-mono text-gray-900 truncate">{shortHash(proof.programId)}</b>
            </div>
            <div className="flex flex-col gap-1 p-5 bg-white">
              <small className="text-[10px] font-bold tracking-widest uppercase text-gray-500">Cluster</small>
              <b className="text-sm font-semibold text-indigo-600">{proof.cluster}</b>
            </div>
            <div className="flex flex-col gap-1 p-5 bg-white">
              <small className="text-[10px] font-bold tracking-widest uppercase text-gray-500">Fraud Gauntlet</small>
              <b className="text-sm font-semibold text-emerald-600">{gauntletLabel(proof.gauntlet)}</b>
            </div>
            <div className="flex flex-col gap-1 p-5 bg-white">
              <small className="text-[10px] font-bold tracking-widest uppercase text-gray-500">Source Hash</small>
              <b className={`text-sm font-semibold ${programMatches ? 'text-emerald-600' : 'text-rose-600'}`}>{programMatches ? 'Matched' : 'Review'}</b>
            </div>
          </section>

          {/* 1. Receipt Proof */}
          <section id="receipt" className="flex flex-col bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden scroll-mt-32">
            <div className="grid md:grid-cols-[1fr_300px] gap-8 p-8 lg:p-12">
              <div className="flex flex-col gap-6">
                <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-indigo-600">
                  <FileCode size={16} /> Receipt Verification
                </span>
                <h2 className="text-3xl font-bold tracking-tight text-gray-900">Verified visit receipt</h2>
                <p className="text-gray-500 font-medium leading-relaxed mb-6">
                  The cryptographically sound timeline. The frontend is simple, but the backend mandates exactly this sequence. Click the receipt to flip to the technical backside.
                </p>
                <div className="mt-auto">
                  <ProofTimeline proof={proof} />
                </div>
              </div>
              <div className="flex justify-center items-center bg-gray-50 rounded-3xl p-6 border border-gray-100">
                <SignatureReceipt proof={proof} compact />
              </div>
            </div>
          </section>

          {/* 2. Gauntlet */}
          <section id="gauntlet" className="flex flex-col bg-[#0a0a0a] text-white rounded-[32px] border border-white/5 shadow-xl overflow-hidden scroll-mt-32">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 lg:p-12 border-b border-white/5">
              <div className="flex flex-col gap-2">
                <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-emerald-400">
                  <Bug size={16} /> Fraud Gauntlet
                </span>
                <h2 className="text-3xl font-bold tracking-tight">{gauntletLabel(proof.gauntlet)} attacks blocked</h2>
              </div>
              <Link href="/proofs/fraud-gauntlet.json" className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-[#111] border border-white/10 text-white text-sm font-bold hover:bg-[#1a1a1a] transition-colors shrink-0">Open JSON <ArrowRight size={14} /></Link>
            </div>
            <div className="flex flex-col p-4">
              {gauntletCases.slice(0, 16).map((item) => <FraudCaseRow item={item} key={item.id} />)}
            </div>
          </section>

          {/* 3. Verifier */}
          <section id="verifier" className="flex flex-col bg-[#0a0a0a] text-white rounded-[32px] border border-white/5 shadow-xl overflow-hidden scroll-mt-32 p-8 lg:p-12">
            <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-indigo-400 mb-2">
              <Checks size={16} /> On-chain Verifier
            </span>
            <h2 className="text-3xl font-bold tracking-tight mb-8">Account checks, not green paint.</h2>
            <VerificationGrid proof={proof} />
          </section>

          {/* 4. Merchant Validation */}
          <section id="validation" className="flex flex-col bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden scroll-mt-32">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 p-8 lg:p-12 border-b border-gray-100">
              <div className="flex flex-col gap-4">
                <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-indigo-600">
                  <Trophy size={16} /> Merchant Validation Status
                </span>
                <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                  {validation.tractionClaimAllowed ? 'Traction evidence claimable.' : 'Technical proof only. Traction not claimed.'}
                </h2>
                <p className="text-gray-500 font-medium max-w-xl">{validation.safeSubmissionWording}</p>
              </div>
              <Link href="/proofs/merchant-validation-kit.json" className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-gray-100 text-gray-900 text-sm font-bold hover:bg-gray-200 transition-colors shrink-0">Open Kit <ArrowRight size={14} /></Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-gray-100 border-b border-gray-100">
              <div className="p-6 bg-white flex flex-col gap-1.5"><small className="text-[10px] font-bold tracking-widest uppercase text-gray-500">Technical proof</small><b className={`text-lg font-bold ${validation.technicalProofVerified ? 'text-emerald-600' : 'text-gray-900'}`}>{validation.technicalProofVerified ? 'Verified' : 'Review'}</b></div>
              <div className="p-6 bg-white flex flex-col gap-1.5"><small className="text-[10px] font-bold tracking-widest uppercase text-gray-500">Traction claim</small><b className={`text-lg font-bold ${validation.tractionClaimAllowed ? 'text-emerald-600' : 'text-gray-900'}`}>{validation.tractionClaimAllowed ? 'Allowed' : 'Not claimed'}</b></div>
              <div className="p-6 bg-white flex flex-col gap-1.5"><small className="text-[10px] font-bold tracking-widest uppercase text-gray-500">Required evidence</small><b className="text-lg font-bold text-gray-900">{validation.evidenceSummary.requiredVerifiedSlots}/{validation.evidenceSummary.requiredSlots}</b></div>
              <div className="p-6 bg-white flex flex-col gap-1.5"><small className="text-[10px] font-bold tracking-widest uppercase text-gray-500">Evidence slots</small><b className="text-lg font-bold text-gray-900">{validation.evidenceSummary.filledSlots}/{validation.evidenceSummary.totalSlots}</b></div>
            </div>
            <div className="flex flex-col p-6 lg:p-8 gap-4 bg-gray-50/50">
              {validation.evidenceSlots.map((slot) => (
                <article key={slot.id} className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col sm:flex-row gap-4 justify-between transition-shadow hover:shadow-sm" data-status={slot.status}>
                  <div className="flex flex-col gap-2 max-w-xl">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${slot.status === 'verified' ? 'bg-emerald-100 text-emerald-700' : slot.status === 'provided' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>{slot.status}</span>
                      <strong className="text-gray-900 font-bold">{slot.id}</strong>
                      <span className="text-gray-400 text-xs font-semibold">{slot.requiredForClaimingTraction ? 'Required' : 'Optional'}</span>
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed font-medium">{slot.prompt}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* 5. Readiness */}
          <section id="readiness" className="flex flex-col bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden scroll-mt-32">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 p-8 lg:p-12 border-b border-gray-100 bg-indigo-900 text-white">
              <div className="flex flex-col gap-6">
                <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-indigo-300">
                  <Robot size={16} /> Operating Readiness
                </span>
                <h2 className="text-3xl lg:text-4xl font-bold tracking-tight font-serif text-white">
                  World-class readiness gate: {readiness.overallStatus.replaceAll('_', ' ')}.
                </h2>
                <p className="text-indigo-200 font-medium max-w-2xl leading-relaxed">
                  This turns the operating system into an inspectable contract: economics, security, pilot ops, demo narrative, and final judge claims.
                </p>
                <div className="flex flex-wrap gap-4 mt-2">
                  <span className="bg-white/10 border border-white/20 px-4 py-2 rounded-xl flex flex-col gap-1"><small className="text-[10px] font-bold tracking-widest text-indigo-300 uppercase">Score</small><b className="text-xl font-bold">{readiness.score}/100</b></span>
                  <span className="bg-white/10 border border-white/20 px-4 py-2 rounded-xl flex flex-col gap-1"><small className="text-[10px] font-bold tracking-widest text-indigo-300 uppercase">Submit to judges</small><b className="text-xl font-bold">{readiness.finalGate.submitToJudges ? 'Yes' : 'No'}</b></span>
                  <span className="bg-white/10 border border-white/20 px-4 py-2 rounded-xl flex flex-col gap-1"><small className="text-[10px] font-bold tracking-widest text-indigo-300 uppercase">Live traction</small><b className="text-xl font-bold">{readiness.finalGate.claimLiveTraction ? 'Allowed' : 'No'}</b></span>
                </div>
              </div>
              <Link href="/api/agent/readiness" className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-white/10 text-white border border-white/20 text-sm font-bold hover:bg-white/20 transition-colors shrink-0">Open API <ArrowRight size={14} /></Link>
            </div>

            <div className="grid sm:grid-cols-2 p-6 lg:p-8 gap-4 bg-gray-50/50">
              {readiness.workstreams.map((workstream) => (
                <article key={workstream.phase} className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col gap-3 transition-shadow hover:shadow-sm" data-status={workstream.status}>
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <span className="text-xs font-bold text-gray-400 tracking-widest uppercase">{workstream.phase.replaceAll('_', ' ')}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${workstream.status === 'ready' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{workstream.status}</span>
                  </div>
                  <strong className="text-gray-900 font-bold">{workstream.title}</strong>
                  <p className="text-sm text-gray-500 leading-relaxed font-medium">{workstream.objective}</p>
                  {workstream.blockers.length > 0 ? <em className="text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-lg not-italic mt-2 flex items-start gap-2"><LockKey size={14} className="shrink-0 mt-0.5" /> {workstream.blockers[0]}</em> : null}
                </article>
              ))}
            </div>
          </section>

          {/* 6. Execution Audit */}
          <section id="execution-audit" className="flex flex-col bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden scroll-mt-32">
            <div className="flex flex-col gap-6 p-8 lg:p-12 border-b border-gray-100">
              <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-indigo-600">
                <ShieldCheck size={16} /> Execution Audit
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 border-l-4 border-indigo-500 pl-4 py-1">
                {executionAudit.allCodeExecutableWorkComplete ? 'All executable work is complete.' : 'Execution still has code blockers.'}
              </h2>
              <p className="text-gray-500 font-medium max-w-2xl leading-relaxed">
                This final audit accounts for each product and proof phase. Personal founder work stays separate: merchant permission, demo video, dependency-advisory decisions, and live pitch delivery.
              </p>
              <div className="flex gap-4 items-center">
                <Link href="/api/agent/execution-audit" className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-gray-100 text-gray-900 text-sm font-bold hover:bg-gray-200 transition-colors">Audit JSON <ArrowRight size={14} /></Link>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-100 border-b border-gray-100">
              {executionAudit.phases.map((phase) => (
                <article key={phase.phase} className="bg-white p-5 flex flex-col gap-2">
                  <span className="text-xs font-bold text-gray-400 tracking-widest uppercase">{phase.phase.replaceAll('_', ' ')}</span>
                  <strong className="text-sm font-bold text-gray-900 leading-tight">{phase.title}</strong>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded w-fit ${phase.status === 'complete' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{phase.status}</span>
                </article>
              ))}
            </div>

            <div className="p-8 lg:p-12 flex flex-col gap-5 bg-rose-50/30">
              <strong className="text-sm font-bold tracking-widest uppercase text-gray-900 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-rose-500" /> Personal actions still required
              </strong>
              <ul className="flex flex-col gap-3">
                {executionAudit.finalPersonalActions.slice(0, 4).map((action) => (
                  <li key={action} className="text-gray-600 font-medium text-sm border-b border-gray-200/50 pb-3 last:border-0 last:pb-0">{action}</li>
                ))}
              </ul>
            </div>
          </section>

          {/* 7. Program ID */}
          <section id="program" className="flex flex-col bg-[#0a0a0a] text-white rounded-[32px] border border-white/5 shadow-xl overflow-hidden scroll-mt-32">
            <div className="flex flex-col p-8 lg:p-12 gap-6 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHBvbHlnb24gcG9pbnRzPSIwLDAgMTAsMTAgMjAsMCIgZmlsbD0iIzFmMjkyNyIgb3BhY2l0eT0iMC41Ii8+PC9zdmc+')] bg-repeat">
               <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-indigo-400">
                <LockKey size={16} /> Program Identity
              </span>
              <div className="grid gap-6 mt-2">
                <div className="flex flex-col gap-1.5"><small className="text-[10px] font-bold tracking-widest uppercase text-gray-500">Program ID</small><a className="font-mono text-sm font-medium text-white hover:text-indigo-400 break-all transition-colors" href={explorerAddress(proof.programId, proof.cluster) ?? undefined} target="_blank" rel="noopener noreferrer">{proof.programId}</a></div>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-1.5"><small className="text-[10px] font-bold tracking-widest uppercase text-gray-500">record_causal_receipt</small><a className="font-mono text-sm font-medium text-rose-300 hover:text-rose-200" href={explorerTx(recordSig, proof.cluster) ?? undefined} target="_blank" rel="noopener noreferrer">{shortHash(recordSig)}</a></div>
                  <div className="flex flex-col gap-1.5"><small className="text-[10px] font-bold tracking-widest uppercase text-gray-500">settle_receipt_reward</small><a className="font-mono text-sm font-medium text-rose-300 hover:text-rose-200" href={explorerTx(settleSig, proof.cluster) ?? undefined} target="_blank" rel="noopener noreferrer">{shortHash(settleSig)}</a></div>
                  <div className="flex flex-col gap-1.5"><small className="text-[10px] font-bold tracking-widest uppercase text-gray-500">Intent manifest hash</small><b className="font-mono text-sm font-medium text-white">{shortHash(manifest.hashes?.intentManifestHash, 12, 10)}</b></div>
                  <div className="flex flex-col gap-1.5"><small className="text-[10px] font-bold tracking-widest uppercase text-gray-500">Lineage proof hash</small><b className="font-mono text-sm font-medium text-white">{shortHash(manifest.intentManifest?.lineageProofHash ?? manifest.pdas?.lineageProofHash, 12, 10)}</b></div>
                  <div className="flex flex-col gap-1.5"><small className="text-[10px] font-bold tracking-widest uppercase text-gray-500">Program ID consistency</small><b className={`text-sm font-bold uppercase tracking-wider ${programMatches ? 'text-emerald-400' : 'text-rose-400'}`}>{programMatches ? 'matched' : 'review'}</b></div>
                </div>
              </div>
            </div>
          </section>

          {/* 8. Artifacts */}
          <section id="artifacts" className="flex flex-col bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden scroll-mt-32 p-8 lg:p-12">
            <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-indigo-600 mb-6">
              <DownloadSimple size={16} /> Artifact Downloads
            </span>
            <div className="grid sm:grid-cols-2 gap-4">
              <a className="flex items-center justify-between p-4 rounded-2xl border border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors group" href="/proofs/devnet-causal-commerce.json" download>
                <span className="font-semibold text-gray-900 text-sm">POC-1 manifest</span>
                <DownloadSimple size={18} className="text-gray-400 group-hover:text-indigo-600" />
              </a>
              <a className="flex items-center justify-between p-4 rounded-2xl border border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors group" href="/proofs/devnet-causal-commerce-verifier.json" download>
                <span className="font-semibold text-gray-900 text-sm">Verifier output</span>
                <DownloadSimple size={18} className="text-gray-400 group-hover:text-indigo-600" />
              </a>
              <a className="flex items-center justify-between p-4 rounded-2xl border border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors group" href="/proofs/fraud-gauntlet.json" download>
                <span className="font-semibold text-gray-900 text-sm">Fraud gauntlet</span>
                <DownloadSimple size={18} className="text-gray-400 group-hover:text-indigo-600" />
              </a>
              <a className="flex items-center justify-between p-4 rounded-2xl border border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors group" href="/proofs/frontier-readiness.json" download>
                <span className="font-semibold text-gray-900 text-sm">Readiness report</span>
                <DownloadSimple size={18} className="text-gray-400 group-hover:text-indigo-600" />
              </a>
            </div>
          </section>

          {/* 9. Limitations */}
          <section id="limitations" className="flex flex-col bg-rose-50/50 rounded-[32px] border border-rose-100 shadow-sm overflow-hidden scroll-mt-32 p-8 lg:p-12 mb-20 text-center items-center">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-100 text-rose-600 mb-6">
              <ShieldWarning size={24} weight="duotone" />
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-4">Honest scope limitations.</h2>
            <p className="text-gray-600 font-medium max-w-xl leading-relaxed">
              {manifest.limitation ?? 'Devnet POC-1 proof. External audit, capped mainnet controls, and production operations are required before real-value deployment.'}
            </p>
          </section>

        </main>
      </div>
    </PremiumShell>
  );
}
