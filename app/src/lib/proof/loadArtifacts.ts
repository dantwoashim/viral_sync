import { existsSync, readFileSync } from 'fs';
import path from 'path';
import campaignLinksArtifact from '../../../public/proofs/campaign-links.json';
import conversionOrderbookArtifact from '../../../public/proofs/conversion-orderbook.json';
import devnetCausalCommerceVerifierArtifact from '../../../public/proofs/devnet-causal-commerce-verifier.json';
import devnetCausalCommerceArtifact from '../../../public/proofs/devnet-causal-commerce.json';
import fraudGauntletArtifact from '../../../public/proofs/fraud-gauntlet.json';
import frontierReadinessArtifact from '../../../public/proofs/frontier-readiness.json';
import invariantMatrixArtifact from '../../../public/proofs/invariant-matrix.json';
import merchantPassportArtifact from '../../../public/proofs/merchant-passport.json';
import merchantValidationKitArtifact from '../../../public/proofs/merchant-validation-kit.json';
import programIdConsistencyArtifact from '../../../public/proofs/program-id-consistency.json';
import proofFeedArtifact from '../../../public/proofs/proof-feed.json';
import type { FraudGauntlet, FrontierReadiness, ProgramIdConsistency, ProofManifest, VerifierArtifact } from './types';

const bundledArtifacts: Record<string, unknown> = {
  'campaign-links.json': campaignLinksArtifact,
  'conversion-orderbook.json': conversionOrderbookArtifact,
  'devnet-causal-commerce-verifier.json': devnetCausalCommerceVerifierArtifact,
  'devnet-causal-commerce.json': devnetCausalCommerceArtifact,
  'fraud-gauntlet.json': fraudGauntletArtifact,
  'frontier-readiness.json': frontierReadinessArtifact,
  'invariant-matrix.json': invariantMatrixArtifact,
  'merchant-passport.json': merchantPassportArtifact,
  'merchant-validation-kit.json': merchantValidationKitArtifact,
  'program-id-consistency.json': programIdConsistencyArtifact,
  'proof-feed.json': proofFeedArtifact,
};

function proofCandidates(file: string) {
  return [
    path.join(/* turbopackIgnore: true */ process.cwd(), 'public', 'proofs', file),
    path.join(/* turbopackIgnore: true */ process.cwd(), 'app', 'public', 'proofs', file),
  ];
}

function tmpCandidates(file: string) {
  return [
    ...proofCandidates(file),
    path.join(/* turbopackIgnore: true */ process.cwd(), 'tmp', file),
    path.join(/* turbopackIgnore: true */ process.cwd(), '..', 'tmp', file),
  ];
}

export function loadJsonArtifact<T>(candidates: string[], fallback: T): T {
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    try {
      return JSON.parse(readFileSync(candidate, 'utf8')) as T;
    } catch {
      // Keep walking so packaged and local paths both work.
    }
  }
  return fallback;
}

function bundledArtifact<T>(file: string, fallback: T): T {
  return (bundledArtifacts[file] as T | undefined) ?? fallback;
}

export function loadProofManifest() {
  const file = 'devnet-causal-commerce.json';
  return loadJsonArtifact<ProofManifest>(proofCandidates(file), bundledArtifact<ProofManifest>(file, {}));
}

export function loadVerifierArtifact() {
  const file = 'devnet-causal-commerce-verifier.json';
  return loadJsonArtifact<VerifierArtifact>(tmpCandidates(file), bundledArtifact<VerifierArtifact>(file, {}));
}

export function loadFraudGauntlet() {
  const file = 'fraud-gauntlet.json';
  return loadJsonArtifact<FraudGauntlet>(proofCandidates(file), bundledArtifact<FraudGauntlet>(file, {}));
}

export function loadProgramIdConsistency() {
  const file = 'program-id-consistency.json';
  return loadJsonArtifact<ProgramIdConsistency>(proofCandidates(file), bundledArtifact<ProgramIdConsistency>(file, {}));
}

export function loadFrontierReadiness() {
  const file = 'frontier-readiness.json';
  return loadJsonArtifact<FrontierReadiness>(proofCandidates(file), bundledArtifact<FrontierReadiness>(file, {}));
}

export function loadProofSidecar<T>(file: string, fallback: T) {
  return loadJsonArtifact<T>(proofCandidates(file), bundledArtifact<T>(file, fallback));
}
