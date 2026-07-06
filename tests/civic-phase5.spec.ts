import { expect } from 'chai';
import { readFileSync } from 'fs';
import path from 'path';
import { getFeaturedCivicMarket } from '../app/src/lib/civic/civicMarket';
import { buildCivicConvictionSignal, deriveCivicConvictionSignalPda, verifyCivicConvictionSignalToken } from '../app/src/lib/civic/convictionSignal';
import {
  buildCommitConvictionSignalInstructionData,
  buildConvictionSignalHash,
  deriveConvictionSignalPda,
  verifyCivicReceiptArtifacts,
  type CivicReceiptVerificationArtifacts,
} from '../sdk/src';

const proofDir = path.join(process.cwd(), 'app', 'public', 'proofs');

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(path.join(proofDir, file), 'utf8')) as T;
}

describe('civic phase 5 conviction signal', () => {
  it('implements the on-chain ConvictionSignal account and commit instruction', () => {
    const program = readFileSync('programs/viral_sync/src/lib.rs', 'utf8');
    const instruction = readFileSync('programs/viral_sync/src/instructions/conviction_signal.rs', 'utf8');
    const state = readFileSync('programs/viral_sync/src/state/conviction_signal.rs', 'utf8');
    const settlement = readFileSync('programs/viral_sync/src/instructions/causal_commerce.rs', 'utf8');

    expect(program).to.include('pub fn commit_conviction_signal');
    expect(state).to.include('pub struct ConvictionSignal');
    expect(state).to.include('MAX_CREDITS_PER_SIGNAL: u16 = 100');
    expect(instruction).to.include('ConvictionSignal::SEED_PREFIX');
    expect(instruction).to.include('participant_authority.key().as_ref()');
    expect(instruction).to.include('signal_hash.as_ref()');
    expect(instruction).to.include('ConvictionCreditCapExceeded');
    expect(instruction).to.include('signal.non_transferable = true');
    expect(instruction).to.include('signal.settlement_dependent = false');
    expect(settlement).not.to.include('ConvictionSignal');
  });

  it('creates a signed app-layer artifact with duplicate-prevention PDA and no transfer path', () => {
    process.env.CIVIC_CONVICTION_SECRET = 'phase-five-test-secret-that-is-long-enough';
    const market = getFeaturedCivicMarket();
    const signal = buildCivicConvictionSignal(market, {
      participantLabel: 'Ward 12 resident',
      choice: 'repair_likely',
      creditsCommitted: 62,
      confidenceBps: 6200,
    });
    const pda = deriveCivicConvictionSignalPda({
      growthCampaign: signal.growthCampaign,
      participantAuthority: signal.participantAuthority,
      signalHash: signal.signalHash,
    });
    const verified = verifyCivicConvictionSignalToken(signal.artifactToken);

    expect(signal.type).to.equal('civic_conviction_signal');
    expect(signal.creditCap).to.equal(100);
    expect(signal.creditsCommitted).to.equal(62);
    expect(signal.duplicatePrevention.method).to.equal('conviction_signal_pda_init');
    expect(signal.convictionSignalPda).to.equal(pda.address);
    expect(signal.transfer.transferable).to.equal(false);
    expect(signal.transfer.tokenMint).to.equal(null);
    expect(signal.transfer.cashValue).to.equal('0');
    expect(signal.settlement.dependsOnConviction).to.equal(false);
    expect(signal.settlement.dependsOnReceipt).to.equal(true);
    expect(verified.ok).to.equal(true);
  });

  it('rejects app-layer conviction credit overflow before a signal can be signed', () => {
    const market = getFeaturedCivicMarket();
    expect(() => buildCivicConvictionSignal(market, { creditsCommitted: 101 })).to.throw('conviction_credit_cap_exceeded');
  });

  it('publishes a machine-checkable phase 5 artifact', () => {
    const artifact = readJson<{
      generatedForPhase: string;
      instruction: { name: string; account: string; implementedInProgramSource: boolean };
      pda: { seedPrefix: string; growthCampaign: string; participantAuthority: string; signalHash: string; address: string };
      creditPolicy: { maxCreditsPerSignal: number; sampleCreditsCommitted: number; transferable: boolean; tokenMint: null; cashValue: string };
      settlementIndependence: { dependsOnConviction: boolean; dependsOnForecast: boolean; dependsOnReceipt: boolean };
    }>('civic-conviction-signal.json');
    const derived = deriveConvictionSignalPda({
      growthCampaign: artifact.pda.growthCampaign,
      participantAuthority: artifact.pda.participantAuthority,
      signalHashHex: artifact.pda.signalHash,
    });

    expect(artifact.generatedForPhase).to.equal('phase-5');
    expect(artifact.instruction.name).to.equal('commit_conviction_signal');
    expect(artifact.instruction.account).to.equal('ConvictionSignal');
    expect(artifact.instruction.implementedInProgramSource).to.equal(true);
    expect(artifact.pda.seedPrefix).to.equal('conviction_signal');
    expect(artifact.pda.address).to.equal(derived.address);
    expect(artifact.creditPolicy.maxCreditsPerSignal).to.equal(100);
    expect(artifact.creditPolicy.sampleCreditsCommitted).to.be.lessThanOrEqual(100);
    expect(artifact.creditPolicy.transferable).to.equal(false);
    expect(artifact.creditPolicy.tokenMint).to.equal(null);
    expect(artifact.creditPolicy.cashValue).to.equal('0');
    expect(artifact.settlementIndependence.dependsOnConviction).to.equal(false);
    expect(artifact.settlementIndependence.dependsOnForecast).to.equal(false);
    expect(artifact.settlementIndependence.dependsOnReceipt).to.equal(true);
  });

  it('extends SDK verification without weakening existing civic receipt checks', () => {
    const bundle: CivicReceiptVerificationArtifacts = {
      market: readJson('civic-market-ward12-water-repair.json'),
      receipt: readJson('civic-receipt-latest.json'),
      ledger: readJson('civic-ledger.json'),
      verifier: readJson('civic-verifier.json'),
      sidecar: readJson('civic-proof-sidecar.json'),
      conviction: readJson('civic-conviction-signal.json'),
    };
    const participantCommitment = 'a'.repeat(64);
    const signalHash = buildConvictionSignalHash({
      marketSlug: 'ward12-water-repair',
      question: 'Will repair complete?',
      choice: 'repair_likely',
      participantCommitmentHex: participantCommitment,
    });
    const data = buildCommitConvictionSignalInstructionData({
      signalHashHex: signalHash,
      participantCommitmentHex: participantCommitment,
      choice: 'repair_likely',
      creditsCommitted: 62,
      confidenceBps: 6200,
    });
    const result = verifyCivicReceiptArtifacts(bundle);

    expect(data.length).to.equal(8 + 32 + 32 + 1 + 2 + 2);
    expect(result.ok, result.failures.join(', ')).to.equal(true);
    expect(result.checks.convictionSettlementIndependent).to.equal(true);
    expect(result.checks.convictionNoTransferPath).to.equal(true);
  });
});
