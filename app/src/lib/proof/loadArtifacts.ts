import { existsSync, readFileSync } from 'fs';
import path from 'path';
import type { FraudGauntlet, ProgramIdConsistency, ProofManifest, VerifierArtifact } from './types';

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

export function loadProofManifest() {
  return loadJsonArtifact<ProofManifest>(proofCandidates('devnet-causal-commerce.json'), {});
}

export function loadVerifierArtifact() {
  return loadJsonArtifact<VerifierArtifact>(tmpCandidates('devnet-causal-commerce-verifier.json'), {});
}

export function loadFraudGauntlet() {
  return loadJsonArtifact<FraudGauntlet>(proofCandidates('fraud-gauntlet.json'), {});
}

export function loadProgramIdConsistency() {
  return loadJsonArtifact<ProgramIdConsistency>(proofCandidates('program-id-consistency.json'), {});
}
