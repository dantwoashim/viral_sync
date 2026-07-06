import { createHash } from 'crypto';
import { existsSync, readFileSync, statSync } from 'fs';
import path from 'path';

const root = process.cwd();
const proofDir = path.join(root, 'app', 'public', 'proofs');

const required = [
  'civic-market-ward12-water-repair.json',
  'civic-ledger.json',
  'civic-receipt-latest.json',
  'civic-verifier.json',
  'civic-fraud-gauntlet.json',
  'civic-readiness.json',
  'civic-proof-sidecar.json',
  'civic-conviction-signal.json',
  'janamat-compatibility.json',
  'zk-identity-adapter.json',
];

function readJson(file) {
  const absolute = path.join(proofDir, file);
  if (!existsSync(absolute)) throw new Error(`${file} missing`);
  if (statSync(absolute).size === 0) throw new Error(`${file} is empty`);
  return JSON.parse(readFileSync(absolute, 'utf8'));
}

function sha256(file) {
  return createHash('sha256').update(readFileSync(path.join(proofDir, file))).digest('hex');
}

const failures = [];
const json = new Map();

for (const file of required) {
  try {
    json.set(file, readJson(file));
  } catch (error) {
    failures.push({ file, reason: error instanceof Error ? error.message : String(error) });
  }
}

if (failures.length === 0) {
  const market = json.get('civic-market-ward12-water-repair.json');
  const ledger = json.get('civic-ledger.json');
  const receipt = json.get('civic-receipt-latest.json');
  const readiness = json.get('civic-readiness.json');
  const sidecar = json.get('civic-proof-sidecar.json');
  const janamat = json.get('janamat-compatibility.json');
  const identity = json.get('zk-identity-adapter.json');
  const verifier = json.get('civic-verifier.json');
  const conviction = json.get('civic-conviction-signal.json');
  const civicSidecars = required.filter((file) => file.startsWith('civic-') || file === 'janamat-compatibility.json' || file === 'zk-identity-adapter.json');

  const checks = [
    ['market slug', market.slug === 'ward12-water-repair'],
    ['non-wager market flag', market.marketDesign?.nonWager === true],
    ['forecast uses no real money', market.marketDesign?.forecastUsesRealMoney === false],
    ['forecast token has no payout claim', market.marketDesign?.forecastTokenHasPayoutClaim === false],
    ['forecast credits non-transferable', market.marketDesign?.forecastCredits?.transferable === false],
    ['forecast credits no cash value', market.marketDesign?.forecastCredits?.cashValue === '0'],
    ['settlement not forecast dependent', market.marketDesign?.settlement?.dependsOnForecast === false],
    ['settlement receipt dependent', market.marketDesign?.settlement?.dependsOnReceipt === true],
    ['official feed not claimed', market.sourceDataset?.officialFeedIntegrated === false],
    ['janamat not claimed live', market.sourceDataset?.janamatIntegrated === false],
    ['devnet program id present', typeof market.devnetEvidence?.programId === 'string' && market.devnetEvidence.programId.length > 30],
    ['receipt pda present', typeof market.devnetEvidence?.receiptPda === 'string' && market.devnetEvidence.receiptPda.length > 30],
    ['record tx real', typeof market.devnetEvidence?.recordTx === 'string' && !market.devnetEvidence.recordTx.startsWith('demo')],
    ['settle tx real', typeof market.devnetEvidence?.settleTx === 'string' && !market.devnetEvidence.settleTx.startsWith('demo')],
    ['ledger has receipt event', ledger.entries?.some((entry) => entry.id === 'receipt-recorded' && entry.status === 'verified_devnet')],
    ['receipt adapter uses same pda', receipt.receiptPda === market.devnetEvidence.receiptPda],
    ['receipt adapter keeps forecast decoupled', receipt.settlement?.dependsOnForecast === false],
    ['ledger keeps forecast decoupled', ledger.settlement?.dependsOnForecast === false],
    ['readiness scoped', readiness.overallStatus === 'phase_three_complete_not_production_ready'],
    ['sidecar phase scoped', sidecar.generatedForPhase === 'phase-3'],
    ['sidecar has independent verifier command', sidecar.verificationCommand === 'npm run civic:verify-receipt'],
    ['sidecar says no mutation', sidecar.independentVerification?.mutatesArtifacts === false],
    ['sidecar janamat boundary honest', sidecar.compatibility?.janamat?.status === 'specified_not_integrated'],
    ['sidecar identity boundary honest', sidecar.compatibility?.zkIdentity?.status === 'specified_not_integrated'],
    ['janamat boundary honest', janamat.status === 'specified_not_integrated'],
    ['identity boundary honest', identity.status === 'specified_not_integrated'],
    ['verifier includes missing identity check', verifier.checks?.some((check) => check.id === 'private-identity-adapter' && check.status === 'not_integrated')],
    ['verifier includes stateless pass gate', verifier.checks?.some((check) => check.id === 'stateless-pass-api' && check.status === 'pass')],
    ['verifier includes independent receipt verifier', verifier.checks?.some((check) => check.id === 'independent-receipt-verifier' && check.status === 'pass')],
    ['verifier includes sdk civic wrappers', verifier.checks?.some((check) => check.id === 'sdk-civic-wrappers' && check.status === 'pass')],
    ['conviction phase 5 scoped', conviction.generatedForPhase === 'phase-5'],
    ['conviction instruction named', conviction.instruction?.name === 'commit_conviction_signal'],
    ['conviction account named', conviction.instruction?.account === 'ConvictionSignal'],
    ['conviction duplicate prevention', conviction.pda?.seedPrefix === 'conviction_signal' && typeof conviction.pda?.address === 'string'],
    ['conviction credit cap', conviction.creditPolicy?.maxCreditsPerSignal === 100 && conviction.creditPolicy?.sampleCreditsCommitted <= 100],
    ['conviction non-transferable', conviction.creditPolicy?.transferable === false && conviction.creditPolicy?.tokenMint === null && conviction.creditPolicy?.cashValue === '0'],
    ['conviction settlement independent', conviction.settlementIndependence?.dependsOnConviction === false && conviction.settlementIndependence?.dependsOnReceipt === true],
  ];

  for (const [name, ok] of checks) {
    if (!ok) failures.push({ file: 'civic artifacts', reason: `${name} failed` });
  }

  const hashChecks = [
    ['devnet-causal-commerce.json', market.devnetEvidence?.sourceManifestSha256],
    ['devnet-causal-commerce-verifier.json', market.devnetEvidence?.sourceVerifierSha256],
    ['fraud-gauntlet.json', market.devnetEvidence?.sourceGauntletSha256],
    ['proof-feed.json', ledger.sourceFeedSha256],
    ['frontier-readiness.json', readiness.sourceReadinessSha256],
  ];

  for (const [file, expected] of hashChecks) {
    const actual = sha256(file);
    if (actual !== expected) {
      failures.push({ file, reason: `hash mismatch: expected ${expected}, got ${actual}` });
    }
  }

  for (const sidecarFile of civicSidecars) {
    const artifact = json.get(sidecarFile);
    for (const [file] of hashChecks) {
      if (artifact.sourceArtifactHashes?.[file] !== sha256(file)) {
        failures.push({ file: sidecarFile, reason: `missing or stale sourceArtifactHashes.${file}` });
      }
    }
  }
}

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, files: required, failures: [] }, null, 2));
