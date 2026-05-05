import Link from 'next/link';
import { DownloadSimple } from '@phosphor-icons/react/dist/ssr';
import SignatureReceipt from '@/components/product/SignatureReceipt';
import { FraudCaseRow } from '@/components/product/FraudCaseRow';
import { VerificationGrid } from '@/components/product/VerificationGrid';
import { ProofTimeline } from '@/components/product/ProofTimeline';
import { PremiumNav, PremiumShell } from '@/components/premium/PremiumUi';
import { gauntletLabel, getProofState } from '@/lib/proof/getProofState';
import { explorerAddress, explorerTx, shortHash, signatureValue } from '@/lib/proof/links';
import { getWorldClassReadiness } from '@/lib/readiness/phases6to10';
import { getYearOneAudit } from '@/lib/readiness/yearOneAudit';
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
  const yearOne = getYearOneAudit(proof, validation, readiness);

  return (
    <PremiumShell className="proof-center-page">
      <PremiumNav />
      <section className="proof-center">
        <aside className="proof-sidebar" aria-label="Proof sections">
          <span className="proof-logo">VS</span>
          {['Receipt', 'Gauntlet', 'Verifier', 'Validation', 'Readiness', 'Year One', 'Program', 'Artifacts', 'Limitations'].map((item) => (
            <a key={item} href={`#${item.toLowerCase().replaceAll(' ', '-')}`}>{item}</a>
          ))}
        </aside>
        <main className="proof-workspace">
          <div className="proof-top">
            <div>
              <span className="proof-live">{proof.statusLabel}</span>
              <h1>Proof Center</h1>
              <p>One receipt, three signatures, exact-once settlement, and a machine-readable fraud gauntlet.</p>
            </div>
            <a className="proof-download" href="/proofs/devnet-causal-commerce.json" download><DownloadSimple size={16} /> Download proof JSON</a>
          </div>

          <section className="proof-summary-grid" aria-label="Proof summary">
            <span><small>Receipt</small><b>{shortHash(manifest.pdas?.causalReceipt)}</b></span>
            <span><small>Program</small><b>{shortHash(proof.programId)}</b></span>
            <span><small>Cluster</small><b>{proof.cluster}</b></span>
            <span><small>Fraud gauntlet</small><b>{gauntletLabel(proof.gauntlet)}</b></span>
            <span><small>Source hash</small><b>{programMatches ? 'Matched' : 'Review'}</b></span>
          </section>

          <section id="receipt" className="proof-panel split-panel">
            <div>
              <span className="section-kicker">Receipt</span>
              <h2>Verified visit receipt</h2>
              <p>The customer view stays simple. Click the receipt to flip into the technical back side.</p>
              <ProofTimeline proof={proof} />
            </div>
            <SignatureReceipt proof={proof} compact />
          </section>

          <section id="gauntlet" className="proof-panel">
            <div className="proof-panel-header">
              <div>
                <span className="section-kicker">Fraud Gauntlet</span>
                <h2>{gauntletLabel(proof.gauntlet)} attacks blocked</h2>
              </div>
              <Link href="/proofs/fraud-gauntlet.json" className="proof-download">Open JSON</Link>
            </div>
            <div className="fraud-table">
              {gauntletCases.slice(0, 16).map((item) => <FraudCaseRow item={item} key={item.id} />)}
            </div>
          </section>

          <section id="verifier" className="proof-panel">
            <span className="section-kicker">Verifier</span>
            <h2>Account checks, not green paint.</h2>
            <VerificationGrid proof={proof} />
          </section>

          <section id="validation" className="proof-panel">
            <div className="proof-panel-header">
              <div>
                <span className="section-kicker">Merchant validation</span>
                <h2>{validation.tractionClaimAllowed ? 'Traction evidence claimable.' : 'Technical proof only. Traction not claimed.'}</h2>
                <p>{validation.safeSubmissionWording}</p>
              </div>
              <Link href="/proofs/merchant-validation-kit.json" className="proof-download">Open kit</Link>
            </div>
            <div className="validation-grid" aria-label="Merchant validation summary">
              <span><small>Technical proof</small><b>{validation.technicalProofVerified ? 'Verified' : 'Review'}</b></span>
              <span><small>Traction claim</small><b>{validation.tractionClaimAllowed ? 'Allowed' : 'Not claimed'}</b></span>
              <span><small>Required evidence</small><b>{validation.evidenceSummary.requiredVerifiedSlots}/{validation.evidenceSummary.requiredSlots}</b></span>
              <span><small>Evidence slots</small><b>{validation.evidenceSummary.filledSlots}/{validation.evidenceSummary.totalSlots}</b></span>
            </div>
            <div className="validation-slot-list">
              {validation.evidenceSlots.map((slot) => (
                <article key={slot.id} data-status={slot.status}>
                  <span>{slot.requiredForClaimingTraction ? 'Required' : 'Optional'}</span>
                  <strong>{slot.id}</strong>
                  <small>{slot.status}</small>
                  <p>{slot.prompt}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="readiness" className="proof-panel">
            <div className="proof-panel-header">
              <div>
                <span className="section-kicker">phases 6-10</span>
                <h2>World-class readiness gate: {readiness.overallStatus.replaceAll('_', ' ')}.</h2>
                <p>
                  This turns the next five phases into an inspectable operating contract:
                  economics, security, pilot ops, demo narrative, and final judge claims.
                </p>
              </div>
              <Link href="/api/agent/readiness" className="proof-download">Open API</Link>
            </div>
            <div className="readiness-score">
              <span><small>Readiness score</small><b>{readiness.score}/100</b></span>
              <span><small>Submit to judges</small><b>{readiness.finalGate.submitToJudges ? 'Yes' : 'No'}</b></span>
              <span><small>Claim traction</small><b>{readiness.finalGate.claimLiveTraction ? 'Allowed' : 'No'}</b></span>
              <span><small>Mainnet eligible</small><b>{readiness.security.mainnetEligible ? 'Yes' : 'No'}</b></span>
            </div>
            <div className="readiness-phases">
              {readiness.phases.map((phase) => (
                <article key={phase.phase} data-status={phase.status}>
                  <span>phase {phase.phase}</span>
                  <strong>{phase.title}</strong>
                  <small>{phase.status}</small>
                  <p>{phase.objective}</p>
                  {phase.blockers.length > 0 ? <em>{phase.blockers[0]}</em> : null}
                </article>
              ))}
            </div>
          </section>

          <section id="year-one" className="proof-panel">
            <div className="proof-panel-header">
              <div>
                <span className="section-kicker">phases 1-12 audit</span>
                <h2>{yearOne.allCodeExecutableWorkComplete ? 'All executable work is complete.' : 'Execution still has code blockers.'}</h2>
                <p>
                  This final audit accounts for every phase. Personal founder work stays separate:
                  merchant permission, demo video, dependency-advisory decisions, and live pitch delivery.
                </p>
              </div>
              <Link href="/api/agent/year-one" className="proof-download">Open audit API</Link>
            </div>
            <div className="year-one-grid">
              {yearOne.phases.map((phase) => (
                <article key={phase.phase} data-status={phase.status}>
                  <span>phase {phase.phase}</span>
                  <strong>{phase.title}</strong>
                  <small>{phase.qualityBar.replaceAll('_', ' ')}</small>
                </article>
              ))}
            </div>
            <div className="year-one-actions">
              <strong>Personal actions still required</strong>
              {yearOne.finalPersonalActions.slice(0, 4).map((action) => <p key={action}>{action}</p>)}
            </div>
          </section>

          <section id="program" className="proof-panel proof-mono-grid">
            <div><small>Program ID</small><a href={explorerAddress(proof.programId, proof.cluster) ?? undefined}>{proof.programId}</a></div>
            <div><small>record_causal_receipt</small><a href={explorerTx(recordSig, proof.cluster) ?? undefined}>{shortHash(recordSig)}</a></div>
            <div><small>settle_receipt_reward</small><a href={explorerTx(settleSig, proof.cluster) ?? undefined}>{shortHash(settleSig)}</a></div>
            <div><small>Intent manifest hash</small><b>{shortHash(manifest.hashes?.intentManifestHash, 12, 10)}</b></div>
            <div><small>Lineage proof hash</small><b>{shortHash(manifest.intentManifest?.lineageProofHash ?? manifest.pdas?.lineageProofHash, 12, 10)}</b></div>
            <div><small>Program ID consistency</small><b>{programMatches ? 'matched' : 'review'}</b></div>
          </section>

          <section id="artifacts" className="proof-panel artifact-grid">
            <a href="/proofs/devnet-causal-commerce.json" download>POC-1 manifest</a>
            <a href="/proofs/devnet-causal-commerce-verifier.json" download>Verifier output</a>
            <a href="/proofs/fraud-gauntlet.json" download>Fraud gauntlet</a>
            <a href="/proofs/frontier-readiness.json" download>Readiness</a>
          </section>

          <section id="limitations" className="proof-panel">
            <span className="section-kicker">Limitations</span>
            <h2>Honest scope</h2>
            <p>{manifest.limitation ?? 'Devnet POC-1 proof. External audit, capped mainnet controls, and production operations are required before real-value deployment.'}</p>
          </section>
        </main>
      </section>
    </PremiumShell>
  );
}
