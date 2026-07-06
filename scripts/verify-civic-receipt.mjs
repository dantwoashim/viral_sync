import { createHash } from 'crypto';
import { existsSync, readFileSync, statSync } from 'fs';
import path from 'path';
import process from 'process';

const root = process.cwd();

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const proofDir = path.resolve(root, argValue('--proof-dir', path.join('app', 'public', 'proofs')));
const marketFile = argValue('--market', 'civic-market-ward12-water-repair.json');
const receiptFile = argValue('--receipt', 'civic-receipt-latest.json');
const ledgerFile = argValue('--ledger', 'civic-ledger.json');
const verifierFile = argValue('--verifier', 'civic-verifier.json');
const sidecarFile = argValue('--sidecar', 'civic-proof-sidecar.json');

function readJson(file) {
  const absolute = path.join(proofDir, file);
  if (!existsSync(absolute)) throw new Error(`${file} missing`);
  if (statSync(absolute).size === 0) throw new Error(`${file} is empty`);
  return JSON.parse(readFileSync(absolute, 'utf8'));
}

function sha256(file) {
  return createHash('sha256').update(readFileSync(path.join(proofDir, file))).digest('hex');
}

function nested(value, pathExpression) {
  return pathExpression.split('.').reduce((current, key) => current?.[key], value);
}

function signatureValue(value) {
  if (!value) return null;
  return typeof value === 'string' ? value : value.signature ?? null;
}

const failures = [];
const checks = {};

function check(id, ok, detail) {
  checks[id] = Boolean(ok);
  if (!ok) failures.push({ id, detail });
}

let market;
let receipt;
let ledger;
let verifier;
let sidecar;
let manifest;
let publishedVerifier;
let gauntlet;

try {
  market = readJson(marketFile);
  receipt = readJson(receiptFile);
  ledger = readJson(ledgerFile);
  verifier = readJson(verifierFile);
  sidecar = readJson(sidecarFile);
  manifest = readJson('devnet-causal-commerce.json');
  publishedVerifier = readJson('devnet-causal-commerce-verifier.json');
  gauntlet = readJson('fraud-gauntlet.json');
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    verifier: 'verify-civic-receipt',
    failures: [{ id: 'artifact-load', detail: error instanceof Error ? error.message : String(error) }],
  }, null, 2));
  process.exit(1);
}

const sourceHashes = sidecar.sourceArtifactHashes ?? {};
const originalArtifacts = sidecar.originalArtifacts ?? [];
const byFile = new Map(originalArtifacts.map((artifact) => [artifact.file, artifact.sha256]));

for (const file of [
  'devnet-causal-commerce.json',
  'devnet-causal-commerce-verifier.json',
  'fraud-gauntlet.json',
  'proof-feed.json',
  'frontier-readiness.json',
]) {
  const actual = sha256(file);
  const expected = sourceHashes[file] ?? byFile.get(file);
  check(`source-hash:${file}`, actual === expected, `expected ${expected}, got ${actual}`);
}

check('sidecar-phase-3', sidecar.generatedForPhase === 'phase-3', 'sidecar must be generated for Phase 3');
check('market-slug', market.slug === 'ward12-water-repair', 'unexpected civic market slug');
check('market-non-wager', market.marketDesign?.nonWager === true, 'market must be explicitly non-wager');
check('forecast-no-real-money', market.marketDesign?.forecastUsesRealMoney === false, 'forecast cannot use real money');
check('forecast-no-payout-claim', market.marketDesign?.forecastTokenHasPayoutClaim === false, 'forecast cannot carry payout claim');
check('forecast-credit-non-transferable', market.marketDesign?.forecastCredits?.transferable === false, 'forecast credits must be non-transferable');
check('forecast-credit-zero-cash', market.marketDesign?.forecastCredits?.cashValue === '0', 'forecast credits must have zero cash value');
check('settlement-not-forecast-dependent', market.marketDesign?.settlement?.dependsOnForecast === false, 'settlement cannot depend on forecast result');
check('settlement-receipt-dependent', market.marketDesign?.settlement?.dependsOnReceipt === true, 'settlement must depend on receipt');

check('receipt-market-match', receipt.market === market.slug, 'receipt market must match market slug');
check('receipt-source-hash-match', receipt.sourceManifestSha256 === sha256('devnet-causal-commerce.json'), 'receipt manifest hash mismatch');
check('receipt-pda-match-market', receipt.receiptPda === market.devnetEvidence?.receiptPda, 'receipt PDA mismatch with market artifact');
check('receipt-pda-match-manifest', receipt.receiptPda === manifest.pdas?.causalReceipt, 'receipt PDA mismatch with original manifest');
check('nullifier-match-manifest', receipt.nullifierPda === manifest.pdas?.nullifierRecord, 'nullifier PDA mismatch with original manifest');
check('settlement-match-manifest', receipt.settlementRecord === manifest.pdas?.settlementRecord, 'settlement PDA mismatch with original manifest');
check('record-tx-match-manifest', market.devnetEvidence?.recordTx === signatureValue(manifest.signatures?.recordCausalReceipt), 'record tx mismatch');
check('settle-tx-match-manifest', market.devnetEvidence?.settleTx === signatureValue(manifest.signatures?.settleReceiptReward), 'settle tx mismatch');

check('published-verifier-ok', publishedVerifier.ok === true, 'published verifier must be ok');
check('terminal-verified', publishedVerifier.terminalVerified === true, 'terminal verification missing');
check('visitor-verified', publishedVerifier.visitorVerified === true, 'visitor verification missing');
check('nullifier-verified', publishedVerifier.nullifierVerified === true, 'nullifier verification missing');
check('settlement-verified', publishedVerifier.settlementVerified === true, 'settlement verification missing');
check('verifier-source-hash-match', verifier.sourceVerifierSha256 === sha256('devnet-causal-commerce-verifier.json'), 'civic verifier source hash mismatch');

const rejectedCases = (gauntlet.cases ?? []).filter((item) =>
  item.observed === 'rejected' &&
  item.expected === 'rejected' &&
  item.expectedErrorMatched === true &&
  item.accountsMutationVerified === true &&
  item.accountsMutated === false
);
check('negative-path-count', rejectedCases.length >= 19, `expected at least 19 rejected negative paths, got ${rejectedCases.length}`);
check('ledger-receipt-entry', (ledger.entries ?? []).some((entry) => entry.id === 'receipt-recorded' && entry.status === 'verified_devnet'), 'ledger missing receipt entry');
check('ledger-settlement-entry', (ledger.entries ?? []).some((entry) => entry.id === 'reward-settled' && entry.status === 'verified_devnet'), 'ledger missing settlement entry');
check('ledger-source-hash-match', ledger.sourceFeedSha256 === sha256('proof-feed.json'), 'ledger proof-feed hash mismatch');

check('janamat-specified-not-integrated', sidecar.compatibility?.janamat?.status === 'specified_not_integrated', 'Janamat must not be claimed integrated');
check('zk-identity-specified-not-integrated', sidecar.compatibility?.zkIdentity?.status === 'specified_not_integrated', 'zk identity must not be claimed integrated');
check('official-feed-not-integrated', market.sourceDataset?.officialFeedIntegrated === false, 'official civic feed must not be claimed live');
check('janamat-not-integrated', market.sourceDataset?.janamatIntegrated === false, 'Janamat must not be claimed live');

const result = {
  ok: failures.length === 0,
  verifier: 'verify-civic-receipt',
  phase: 'phase-3',
  proofDir,
  receipt: {
    market: receipt.market,
    receiptPda: receipt.receiptPda,
    nullifierPda: receipt.nullifierPda,
    settlementRecord: receipt.settlementRecord,
    recordTx: market.devnetEvidence?.recordTx,
    settleTx: market.devnetEvidence?.settleTx,
  },
  sourceArtifactHashes: sourceHashes,
  checks,
  failures,
  independentVerification: {
    command: `node scripts/verify-civic-receipt.mjs --receipt ${receiptFile}`,
    requiresNetwork: false,
    mutatesArtifacts: false,
  },
  compatibilityClaims: {
    janamat: sidecar.compatibility?.janamat?.status,
    zkIdentity: sidecar.compatibility?.zkIdentity?.status,
  },
};

console.log(JSON.stringify(result, null, 2));

if (!result.ok) process.exit(1);
