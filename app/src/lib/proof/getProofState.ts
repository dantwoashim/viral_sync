import { loadFraudGauntlet, loadProgramIdConsistency, loadProofManifest, loadVerifierArtifact } from './loadArtifacts';
import type { NormalizedReceiptProof, ProofHealth, ProofManifest, VerifierArtifact, FraudGauntlet } from './types';

function hasMockMarker(value: unknown): boolean {
  if (typeof value === 'string') return /mock final fixture|mockFinal|mock-final|mock_final_fixture|fixture/i.test(value);
  if (!value || typeof value !== 'object') return false;
  return Object.values(value as Record<string, unknown>).some(hasMockMarker);
}

function allVerifierFlags(verifier: VerifierArtifact) {
  return verifier.ok === true &&
    verifier.terminalVerified === true &&
    verifier.visitorVerified === true &&
    verifier.lineageVerified === true &&
    verifier.settlementVerified === true &&
    verifier.nullifierVerified === true;
}

function gauntletVerified(gauntlet: FraudGauntlet) {
  const total = gauntlet.summary?.totalCases ?? gauntlet.cases?.length ?? 0;
  const blocked = gauntlet.summary?.blocked ?? gauntlet.cases?.filter((item) => item.observed === 'rejected').length ?? 0;
  return total >= 16 && blocked === total && gauntlet.cases?.every((item) =>
    item.observed === 'rejected' &&
    item.expectedErrorMatched === true &&
    item.accountsMutationVerified === true &&
    item.proofSource !== 'mock_final_fixture'
  ) === true;
}

function proofHealth(manifest: ProofManifest, verifier: VerifierArtifact, gauntlet: FraudGauntlet): ProofHealth {
  if (!manifest.programId || !manifest.pdas?.causalReceipt) return 'missing';
  if (hasMockMarker(manifest) || hasMockMarker(verifier) || hasMockMarker(gauntlet)) return 'mock';
  if (/needs|stale|unsafe|no-go/i.test(String(manifest.proofStatus ?? ''))) return 'stale';
  if (/fail|error/i.test(String(manifest.proofStatus ?? ''))) return 'failed';
  if (manifest.proofStatus !== 'verified') return 'pending';
  if (!allVerifierFlags(verifier) || !gauntletVerified(gauntlet)) return 'pending';
  return 'verified';
}

function statusLabel(health: ProofHealth) {
  if (health === 'verified') return 'Verified';
  if (health === 'stale') return 'Needs regeneration';
  if (health === 'mock') return 'Mock artifact blocked';
  if (health === 'missing') return 'Proof missing';
  if (health === 'failed') return 'Failed';
  return 'Pending verification';
}

export function getProofState(): NormalizedReceiptProof {
  const manifest = loadProofManifest();
  const verifier = loadVerifierArtifact();
  const gauntlet = loadFraudGauntlet();
  const programIdConsistency = loadProgramIdConsistency();
  const health = proofHealth(manifest, verifier, gauntlet);

  return {
    health,
    statusLabel: statusLabel(health),
    receiptId: manifest.inputs?.receiptId ?? String(manifest.pdas?.causalReceipt ?? 'latest'),
    merchantName: 'Thamel Brew',
    cluster: manifest.cluster ?? 'devnet',
    programId: manifest.programId ?? 'missing',
    proofLevel: manifest.proofLevel ?? manifest.targetProofLevel ?? 'merchant_terminal_visitor_signed',
    rewardAmountLabel: `${manifest.intentManifest?.rewardAmount ?? manifest.inputs?.rewardPerVisit ?? '0'} units`,
    manifest,
    verifier,
    gauntlet,
    programIdConsistency,
  };
}
