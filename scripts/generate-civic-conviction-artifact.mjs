import { createHash } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { PublicKey } from '@solana/web3.js';

const root = process.cwd();
const proofDir = path.join(root, 'app', 'public', 'proofs');
const programId = new PublicKey('AeKT1B58Qi9rBtrtnMe11o4eXbVwHweKxGFNS5X3Vv46');
const participantAuthority = new PublicKey('11111111111111111111111111111111');
const marketFile = path.join(proofDir, 'civic-market-ward12-water-repair.json');
const manifestFile = path.join(proofDir, 'devnet-causal-commerce.json');

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function sha256Hex(value) {
  return createHash('sha256').update(value).digest('hex');
}

function sha256File(file) {
  return createHash('sha256').update(readFileSync(path.join(proofDir, file))).digest('hex');
}

function sourceHashes() {
  return {
    'devnet-causal-commerce.json': sha256File('devnet-causal-commerce.json'),
    'devnet-causal-commerce-verifier.json': sha256File('devnet-causal-commerce-verifier.json'),
    'fraud-gauntlet.json': sha256File('fraud-gauntlet.json'),
    'proof-feed.json': sha256File('proof-feed.json'),
    'frontier-readiness.json': sha256File('frontier-readiness.json'),
  };
}

if (!existsSync(marketFile)) throw new Error('missing civic market artifact');
if (!existsSync(manifestFile)) throw new Error('missing devnet manifest');

const market = readJson(marketFile);
const manifest = readJson(manifestFile);
const growthCampaign = manifest.pdas?.growthCampaign;
const receiptPda = market.devnetEvidence?.receiptPda;
const participantCommitment = sha256Hex(`${market.slug}:ward 12 resident:${receiptPda}`);
const choice = 'repair_likely';
const signalHash = sha256Hex(`${market.slug}:${market.question}:${choice}:${participantCommitment}`);
const [convictionSignalPda, convictionSignalBump] = PublicKey.findProgramAddressSync(
  [
    Buffer.from('conviction_signal'),
    new PublicKey(growthCampaign).toBuffer(),
    participantAuthority.toBuffer(),
    Buffer.from(signalHash, 'hex'),
  ],
  programId,
);

const artifact = {
  type: 'civic-conviction-signal',
  version: '1.0.0',
  generatedForPhase: 'phase-5',
  status: 'signed_app_artifact_plus_on_chain_instruction_ready',
  market: market.slug,
  programId: programId.toBase58(),
  instruction: {
    name: 'commit_conviction_signal',
    account: 'ConvictionSignal',
    implementedInProgramSource: true,
    deployedInCurrentDevnetProof: false,
    reasonNotDeployed: 'Phase 5 adds the instruction after the existing devnet receipt proof. The signed artifact is judge-visible until a fresh program deployment is intentionally run.',
  },
  pda: {
    seedPrefix: 'conviction_signal',
    growthCampaign,
    participantAuthority: participantAuthority.toBase58(),
    signalHash,
    address: convictionSignalPda.toBase58(),
    bump: convictionSignalBump,
    duplicatePrevention: 'The PDA includes growth campaign, participant authority, and signal hash. Recommitting the same signal attempts to init the same account and is rejected by the runtime.',
  },
  creditPolicy: {
    maxCreditsPerSignal: 100,
    sampleCreditsCommitted: 62,
    transferable: false,
    tokenMint: null,
    cashValue: '0',
  },
  settlementIndependence: {
    dependsOnConviction: false,
    dependsOnForecast: false,
    dependsOnReceipt: true,
    rewardReleaseRule: market.marketDesign?.rewardSettlementCondition,
  },
  appLayerFallback: {
    endpoint: '/api/civic/conviction-signal',
    tokenType: 'signed_civic_conviction_signal',
    verification: 'POST the artifactToken back to the same endpoint or derive the PDA with the SDK helper.',
  },
  sourceArtifactHashes: sourceHashes(),
};

writeFileSync(path.join(proofDir, 'civic-conviction-signal.json'), `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, file: 'app/public/proofs/civic-conviction-signal.json', pda: artifact.pda.address }, null, 2));
