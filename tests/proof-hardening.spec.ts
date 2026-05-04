import fs from 'fs';
import { expect } from 'chai';
import { canonicalArtifactHash, readJson, computeProofHashes } from '../scripts/proof-artifact-utils';
import { expectedErrorMatched, expectedPatternsFor } from '../scripts/fraud-error-matching';
import { isPublicDemoRoute } from '../app/src/lib/demo-mode';
import { gauntletLabel } from '../app/src/lib/proof/getProofState';
import { confirmVisitPass, createVisitPassPacket } from '../app/src/lib/product-loop/productLoop';

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

  it('wires the customer and terminal surfaces to product-loop APIs instead of static timers', () => {
    const claim = fs.readFileSync('app/src/app/claim/[token]/page.tsx', 'utf8');
    const claimClient = fs.readFileSync('app/src/components/product/ProductClaimFlow.tsx', 'utf8');
    const terminal = fs.readFileSync('app/src/components/product/MerchantTerminalFlow.tsx', 'utf8');

    expect(claim).to.include('ProductClaimFlow');
    expect(claimClient).to.include('/api/product-loop/claim-pass');
    expect(terminal).to.include('/api/product-loop/terminal/confirm');
    expect(terminal).not.to.include('setTimeout');
    expect(terminal).not.to.include('NEXT_PUBLIC_TERMINAL_DEMO');
  });

  it('creates a proof-backed pass packet and rejects mismatched terminal codes', () => {
    const slug = 'thamel-brew-counter-attested-visits';
    const pass = createVisitPassPacket(slug, slug);
    expect(pass?.ok).to.equal(true);
    expect(pass?.passCode).to.match(/^VS-[0-9A-F]{4}-[0-9A-F]{4}$/);

    const accepted = confirmVisitPass({ slug, token: slug, passCode: pass?.passCode });
    expect(accepted.ok).to.equal(true);
    expect(accepted.status).to.equal('verified');
    expect(accepted.checks.every((check) => check.ok)).to.equal(true);

    const rejected = confirmVisitPass({ slug, token: slug, passCode: 'VS-USED-PASS' });
    expect(rejected.ok).to.equal(false);
    expect(rejected.status).to.equal('rejected');
  });

  it('keeps phase 2 protocol hardening wired into the on-chain surface', () => {
    const program = fs.readFileSync('programs/viral_sync/src/instructions/causal_commerce.rs', 'utf8');
    const lib = fs.readFileSync('programs/viral_sync/src/lib.rs', 'utf8');
    const errors = fs.readFileSync('programs/viral_sync/src/errors.rs', 'utf8');

    expect(program).to.include('set_terminal_device_status');
    expect(lib).to.include('pub fn set_terminal_device_status');
    expect(program).to.include('InvalidLineageProof');
    expect(program).to.include('claim_pass.depth == 1');
    expect(program).to.include('parent_receipt_id_hash == [0; 32]');
    expect(program).to.include('claim_pass.referrer_receipt != Pubkey::default()');
    expect(errors).to.include('InvalidLineageProof');
  });
});
