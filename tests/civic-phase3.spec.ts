import { expect } from 'chai';
import { execFileSync } from 'child_process';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';
import {
  buildCivicReceiptVerificationCommand,
  CIVIC_WARD12_MARKET_SLUG,
  hashCivicSourceArtifact,
  verifyCivicReceiptArtifacts,
  type CivicReceiptVerificationArtifacts,
} from '../sdk/src';

const proofDir = path.join(process.cwd(), 'app', 'public', 'proofs');

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(path.join(proofDir, file), 'utf8')) as T;
}

function sha256(file: string) {
  return createHash('sha256').update(readFileSync(path.join(proofDir, file))).digest('hex');
}

function civicBundle(): CivicReceiptVerificationArtifacts {
  return {
    market: readJson('civic-market-ward12-water-repair.json'),
    receipt: readJson('civic-receipt-latest.json'),
    ledger: readJson('civic-ledger.json'),
    verifier: readJson('civic-verifier.json'),
    sidecar: readJson('civic-proof-sidecar.json'),
  };
}

describe('civic phase 3 proof layer', () => {
  it('publishes a machine-verifiable sidecar without mutating source proof hashes', () => {
    const bundle = civicBundle();
    expect(bundle.sidecar.generatedForPhase).to.equal('phase-3');
    expect(bundle.sidecar.market).to.equal(CIVIC_WARD12_MARKET_SLUG);
    expect(bundle.sidecar.verificationCommand).to.equal('npm run civic:verify-receipt');

    for (const [file, expected] of Object.entries(bundle.sidecar.sourceArtifactHashes ?? {})) {
      expect(sha256(file)).to.equal(expected);
    }
  });

  it('verifies the civic receipt bundle through SDK wrappers', () => {
    const result = verifyCivicReceiptArtifacts(civicBundle());
    expect(result.ok, result.failures.join(', ')).to.equal(true);
    expect(result.checks.forecastNoPayoutClaim).to.equal(true);
    expect(result.checks.settlementNotForecastDependent).to.equal(true);
    expect(result.checks.janamatSpecifiedNotIntegrated).to.equal(true);
    expect(result.checks.zkIdentitySpecifiedNotIntegrated).to.equal(true);
  });

  it('runs the independent civic receipt verifier command', () => {
    const output = execFileSync('node', ['scripts/verify-civic-receipt.mjs'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const result = JSON.parse(output) as { ok: boolean; failures: unknown[]; phase: string };
    expect(result.ok).to.equal(true);
    expect(result.failures).to.deep.equal([]);
    expect(result.phase).to.equal('phase-3');
  });

  it('keeps compatibility claims specified but not integrated', () => {
    const janamat = readJson<{ status: string; claimSafety: string }>('janamat-compatibility.json');
    const identity = readJson<{ status: string; claimSafety: string }>('zk-identity-adapter.json');
    expect(janamat.status).to.equal('specified_not_integrated');
    expect(identity.status).to.equal('specified_not_integrated');
    expect(janamat.claimSafety).to.contain('not evidence');
    expect(identity.claimSafety).to.contain('not a live');
  });

  it('exports deterministic civic verification helpers', () => {
    const command = buildCivicReceiptVerificationCommand({ receipt: 'civic-receipt-latest.json' });
    expect(command).to.equal('node scripts/verify-civic-receipt.mjs --receipt civic-receipt-latest.json');
    expect(hashCivicSourceArtifact(readFileSync(path.join(proofDir, 'devnet-causal-commerce.json')))).to.equal(
      sha256('devnet-causal-commerce.json'),
    );
  });
});
