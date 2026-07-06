import fs from 'fs';
import { expect } from 'chai';
import { getFeaturedCivicMarket } from '../app/src/lib/civic/civicMarket';
import {
  buildReplayRejectionProof,
  issueCivicParticipationPass,
  verifyCivicParticipationPass,
} from '../app/src/lib/civic/participationPass';

describe('civic phase 2 MVP', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    for (const key of Object.keys(process.env)) delete process.env[key];
    Object.assign(process.env, originalEnv);
  });

  it('issues a stateless signed participation pass without an in-memory store', () => {
    process.env.CIVIC_PASS_SECRET = 'phase-two-test-secret-that-is-long-enough';
    const market = getFeaturedCivicMarket();
    const pass = issueCivicParticipationPass(market, 'Ward 12 resident');
    const verification = verifyCivicParticipationPass(pass.passToken, market.slug);
    const source = fs.readFileSync('app/src/lib/civic/participationPass.ts', 'utf8');

    expect(pass.type).to.equal('civic_participation_pass');
    expect(pass.version).to.equal(2);
    expect(pass.passToken).to.include('.');
    expect(verification.ok).to.equal(true);
    expect(verification.reason).to.equal('stateless_signature_and_receipt_binding_verified');
    expect(source).not.to.include('new Map');
    expect(source).not.to.include('passStore');
  });

  it('rejects tampered participation pass tokens', () => {
    process.env.CIVIC_PASS_SECRET = 'phase-two-test-secret-that-is-long-enough';
    const market = getFeaturedCivicMarket();
    const pass = issueCivicParticipationPass(market, 'Ward 12 resident');
    const tampered = `${pass.passToken.slice(0, -2)}aa`;
    const verification = verifyCivicParticipationPass(tampered, market.slug);

    expect(verification.ok).to.equal(false);
    expect(verification.status).to.equal('rejected');
    expect(verification.reason).to.equal('pass_signature_invalid');
  });

  it('keeps forecast credits non-transferable and disconnected from settlement', () => {
    process.env.CIVIC_PASS_SECRET = 'phase-two-test-secret-that-is-long-enough';
    const market = getFeaturedCivicMarket();
    const pass = issueCivicParticipationPass(market, 'Ward 12 resident');
    const marketArtifact = JSON.parse(fs.readFileSync('app/public/proofs/civic-market-ward12-water-repair.json', 'utf8'));

    expect(pass.forecastCredits.transferable).to.equal(false);
    expect(pass.forecastCredits.cashValue).to.equal('0');
    expect(pass.settlement.dependsOnForecast).to.equal(false);
    expect(marketArtifact.marketDesign.forecastCredits.transferable).to.equal(false);
    expect(marketArtifact.marketDesign.forecastCredits.cashValue).to.equal('0');
    expect(marketArtifact.marketDesign.settlement.dependsOnForecast).to.equal(false);
  });

  it('builds replay rejection proof from signed pass and published nullifier evidence', () => {
    process.env.CIVIC_PASS_SECRET = 'phase-two-test-secret-that-is-long-enough';
    const market = getFeaturedCivicMarket();
    const pass = issueCivicParticipationPass(market, 'Ward 12 resident');
    const replay = buildReplayRejectionProof(pass.passToken);

    expect(replay.ok).to.equal(true);
    if (replay.ok) {
      expect(replay.status).to.equal('replay_rejected');
      expect(replay.nullifierPda).to.equal(market.evidence.nullifierPda);
      expect(replay.negativePathCases).to.equal(market.evidence.gauntletLabel);
      expect(replay.settlementDependsOnForecast).to.equal(false);
    }
  });
});
