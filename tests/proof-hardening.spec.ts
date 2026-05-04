import { expect } from 'chai';
import { canonicalArtifactHash, readJson, computeProofHashes } from '../scripts/proof-artifact-utils';
import { expectedErrorMatched, expectedPatternsFor } from '../scripts/fraud-error-matching';
import { isPublicDemoRoute } from '../app/src/lib/demo-mode';
import { gauntletLabel } from '../app/src/lib/proof/getProofState';

describe('proof hardening regressions', () => {
  it('binds the published manifest to current source, IDL, generator, and verifier', () => {
    const manifest = readJson<Record<string, unknown>>('app/public/proofs/devnet-causal-commerce.json');
    const current = computeProofHashes();

    expect(manifest.programSourceHash).to.equal(current.programSourceHash);
    expect(manifest.idlHash).to.equal(current.idlHash);
    expect(manifest.proofGeneratorHash).to.equal(current.proofGeneratorHash);
    expect(manifest.verifierHash).to.equal(current.verifierHash);
  });

  it('does not let generic custom program errors satisfy specific expected errors', () => {
    expect(expectedErrorMatched('Error Code: InvalidClaimPass', expectedPatternsFor('InvalidVisitorAuthority'))).to.equal(false);
    expect(expectedErrorMatched('Error Code: InvalidClaimPass', expectedPatternsFor('InvalidClaimPass'))).to.equal(true);
    expect(expectedErrorMatched('custom program error: 0x178f', expectedPatternsFor('InvalidVisitorAuthority'))).to.equal(false);
  });

  it('keeps public proof artifacts and well-known metadata reachable while hiding old surfaces', () => {
    expect(isPublicDemoRoute('/proofs/fraud-gauntlet.json')).to.equal(true);
    expect(isPublicDemoRoute('/proofs/devnet-causal-commerce.json')).to.equal(true);
    expect(isPublicDemoRoute('/proofs/devnet-causal-commerce-verifier.json')).to.equal(true);
    expect(isPublicDemoRoute('/proofs/proof-feed.json')).to.equal(true);
    expect(isPublicDemoRoute('/.well-known/blink.json')).to.equal(true);
    expect(isPublicDemoRoute('/icon.png')).to.equal(true);
    expect(isPublicDemoRoute('/admin')).to.equal(false);
    expect(isPublicDemoRoute('/frontier')).to.equal(false);
  });

  it('does not default missing gauntlet data to a false 16/16 success label', () => {
    expect(gauntletLabel({})).to.equal('Pending');
  });

  it('keeps canonical artifact hashes self-consistent after stamping', () => {
    for (const file of [
      'app/public/proofs/devnet-causal-commerce.json',
      'app/public/proofs/devnet-causal-commerce-verifier.json',
      'app/public/proofs/fraud-gauntlet.json',
      'app/public/proofs/proof-feed.json',
    ]) {
      const artifact = readJson<Record<string, unknown>>(file);
      expect(artifact.artifactHash, file).to.equal(canonicalArtifactHash(artifact));
    }
  });

  it('uses canonical verifier hashes that are not self-referential raw file hashes', () => {
    const current = computeProofHashes();
    const manifest = readJson<Record<string, unknown>>('app/public/proofs/devnet-causal-commerce.json');
    const published = readJson<Record<string, unknown>>('app/public/proofs/devnet-causal-commerce-verifier.json');

    expect(manifest.publishedVerifierHash).to.equal(current.publishedVerifierHash);
    expect(published.publishedVerifierHash).to.equal(current.publishedVerifierHash);
  });
});
