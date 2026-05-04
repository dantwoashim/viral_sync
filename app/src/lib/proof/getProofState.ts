import { loadFraudGauntlet, loadFrontierReadiness, loadProgramIdConsistency, loadProofManifest, loadVerifierArtifact } from './loadArtifacts';
import type { NormalizedReceiptProof, ProofHealth, ProofManifest, VerifierArtifact, FraudGauntlet, FrontierReadiness } from './types';

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
  return total >= 16 &&
    blocked === total &&
    gauntlet.summary?.missing === 0 &&
    gauntlet.summary?.failed === 0 &&
    gauntlet.cases?.every((item) =>
    item.observed === 'rejected' &&
    item.expectedErrorMatched === true &&
    item.accountsMutationVerified === true &&
    item.accountsMutated === false &&
    (item.failureKind === 'program_rejection' || item.failureKind === 'intent_validator_rejection') &&
    item.proofSource !== 'mock_final_fixture'
  ) === true;
}

function proofHealth(manifest: ProofManifest, verifier: VerifierArtifact, gauntlet: FraudGauntlet, readiness: FrontierReadiness): ProofHealth {
  if (!manifest.programId || !manifest.pdas?.causalReceipt) return 'missing';
  if (hasMockMarker(manifest) || hasMockMarker(verifier) || hasMockMarker(gauntlet)) return 'mock';
  if (/needs|stale|unsafe|no-go/i.test(String(manifest.proofStatus ?? ''))) return 'stale';
  if (/fail|error/i.test(String(manifest.proofStatus ?? ''))) return 'failed';
  if (manifest.proofStatus !== 'verified') return 'pending';
  if (readiness.status !== 'GO' || readiness.hashesVerified !== true) return 'pending';
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

function formatReward(raw: string | number | undefined, symbol = 'tokens', decimals = 0) {
  if (raw == null) return 'Pending';
  const value = Number(raw);
  if (!Number.isFinite(value)) return 'Pending';
  return `${(value / 10 ** decimals).toFixed(2)} ${symbol}`;
}

export function gauntletLabel(gauntlet: FraudGauntlet) {
  const blocked = gauntlet.summary?.blocked;
  const total = gauntlet.summary?.totalCases;
  if (typeof blocked !== 'number' || typeof total !== 'number') return 'Pending';
  return `${blocked}/${total}`;
}

export function getProofState(): NormalizedReceiptProof {
  const manifest = loadProofManifest();
  const verifier = loadVerifierArtifact();
  const gauntlet = loadFraudGauntlet();
  const programIdConsistency = loadProgramIdConsistency();
  const readiness = loadFrontierReadiness();
  const health = proofHealth(manifest, verifier, gauntlet, readiness);

  return {
    health,
    statusLabel: statusLabel(health),
    receiptId: manifest.inputs?.receiptId ?? String(manifest.pdas?.causalReceipt ?? 'latest'),
    merchantName: manifest.inputs?.merchantAlias ?? manifest.intentManifest?.merchantAlias ?? 'Verified merchant',
    cluster: manifest.cluster ?? 'devnet',
    programId: manifest.programId ?? 'missing',
    proofLevel: manifest.proofLevel ?? manifest.targetProofLevel ?? 'missing',
    attestationModel: manifest.attestationModel ?? manifest.targetAttestationModel ?? 'missing',
    rewardAmountLabel: formatReward(
      manifest.inputs?.rewardPerVisit ?? manifest.intentManifest?.rewardAmount,
      manifest.rewardMintSymbol ?? 'devnet reward units',
      manifest.rewardMintDecimals ?? 0
    ),
    manifest,
    verifier,
    gauntlet,
    programIdConsistency,
    readiness,
  };
}
