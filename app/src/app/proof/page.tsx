import Link from 'next/link';
import { DownloadSimple } from '@phosphor-icons/react/dist/ssr';
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

  return (
    <PremiumShell className="proof-center-page">
      <PremiumNav />
      <section className="proof-center">
        <aside className="proof-sidebar" aria-label="Proof sections">
          <span className="proof-logo">VS</span>
          {['Receipt', 'Gauntlet', 'Verifier', 'Program', 'Artifacts', 'Limitations'].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`}>{item}</a>
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
