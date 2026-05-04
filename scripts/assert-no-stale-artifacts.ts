import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { computeProofHashes } from './proof-artifact-utils';

type Failure = { file: string; path: string; reason: string; value?: unknown };

const finalJsonArtifacts = new Set([
  'app/public/proofs/devnet-causal-commerce.json',
  'app/public/proofs/devnet-causal-commerce-verifier.json',
  'app/public/proofs/fraud-gauntlet.json',
  'app/public/proofs/merchant-passport.json',
  'app/public/proofs/conversion-orderbook.json',
  'app/public/proofs/campaign-links.json',
  'app/public/proofs/proof-feed.json',
  'app/public/proofs/merchant-validation-kit.json',
  'app/public/proofs/frontier-readiness.json',
  'app/public/proofs/program-id-consistency.json',
  'tmp/devnet-causal-commerce-verifier.json',
  'dist/auditor-packet/app/public/proofs/devnet-causal-commerce.json',
  'dist/auditor-packet/app/public/proofs/devnet-causal-commerce-verifier.json',
  'dist/auditor-packet/app/public/proofs/fraud-gauntlet.json',
  'dist/auditor-packet/app/public/proofs/merchant-passport.json',
  'dist/auditor-packet/app/public/proofs/conversion-orderbook.json',
  'dist/auditor-packet/app/public/proofs/campaign-links.json',
  'dist/auditor-packet/app/public/proofs/proof-feed.json',
  'dist/auditor-packet/app/public/proofs/merchant-validation-kit.json',
  'dist/auditor-packet/app/public/proofs/frontier-readiness.json',
  'dist/auditor-packet/app/public/proofs/program-id-consistency.json',
  'dist/auditor-packet/tmp/devnet-causal-commerce-verifier.json',
]);

const finalMarkdownFiles = new Set([
  'docs/frontier-final-go-no-go.md',
  'docs/frontier-submission-packet.md',
  'docs/frontier-final-run-readiness.md',
  'dist/auditor-packet/docs/frontier-final-go-no-go.md',
  'dist/auditor-packet/docs/frontier-submission-packet.md',
  'dist/auditor-packet/docs/frontier-final-run-readiness.md',
]);

const finalTextFiles = new Set([
  'dist/final-command-transcript.txt',
  'dist/auditor-packet/dist/final-command-transcript.txt',
]);

const failures: Failure[] = [];
const badStatus = /needs[-_\s]?regeneration|needs[-_\s]?final[-_\s]?proof|stale|unsafe|no-go|ready_for_final_proof_run/i;
const localPath = /(C:\\Users|D:\\|\/home\/|\.config\/solana\/id\.json|PRIVATE_KEY|SECRET|NEXTAUTH|API_KEY|RPC_TOKEN)/i;
const allowMockFinal = process.env.ALLOW_MOCK_FINAL === '1';
const mockMarker = /mock final fixture|mockFinal|mock-final|mock_final_fixture|fixture/i;
const currentProofHashes = computeProofHashes();

function normalize(filePath: string) { return filePath.replace(/\\/g, '/').replace(/^\.\//, ''); }
function fail(file: string, at: string, reason: string, value?: unknown) { failures.push({ file, path: at, reason, value }); }
function exists(file: string) { return existsSync(path.resolve(file)); }
function read(file: string) { return readFileSync(path.resolve(file), 'utf8'); }
function isObj(value: unknown): value is Record<string, unknown> { return Boolean(value && typeof value === 'object' && !Array.isArray(value)); }

function scanJsonValue(file: string, value: unknown, at = '$') {
  if (typeof value === 'string') {
    if (localPath.test(value)) fail(file, at, 'final artifact leaks local path or secret-like value', value);
    if (!allowMockFinal && mockMarker.test(value)) fail(file, at, 'mock/fixture marker is not allowed in real final artifact', value);
    return;
  }
  if (Array.isArray(value)) { value.forEach((child, index) => scanJsonValue(file, child, `${at}[${index}]`)); return; }
  if (!isObj(value)) return;
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${at}.${key}`;
    if (['proofStatus','validationStatus','readinessStatus','status','decision'].includes(key) && typeof child === 'string' && badStatus.test(child)) {
      fail(file, childPath, 'final status field contains unsafe/pre-final state', child);
    }
    if ((key === 'proofLevel' || key === 'attestationModel') && !child) fail(file, childPath, `${key} must be present`, child);
    scanJsonValue(file, child, childPath);
  }
}

function scanJsonFile(file: string) {
  if (!finalJsonArtifacts.has(file)) return;
  if (!exists(file)) { fail(file, '$', 'required final artifact missing'); return; }
  let artifact: unknown;
  try { artifact = JSON.parse(read(file)); } catch (error) { fail(file, '$', 'invalid JSON', error instanceof Error ? error.message : String(error)); return; }
  scanJsonValue(file, artifact);
  const obj = isObj(artifact) ? artifact : {};
  if (file.endsWith('frontier-readiness.json') && obj.status !== 'GO') fail(file, '$.status', 'frontier readiness must be GO in final artifact', obj.status);
  if (file.endsWith('program-id-consistency.json') && obj.ok !== true) fail(file, '$.ok', 'program ID consistency must pass in final artifact', obj.ok);
  if (file.endsWith('proof-feed.json')) {
    const entries = Array.isArray(obj.entries) ? obj.entries : [];
    entries.forEach((entry, index) => { if (!isObj(entry) || entry.status !== 'verified') fail(file, `$.entries[${index}].status`, 'proof feed entry must be verified', isObj(entry) ? entry.status : entry); });
  }
  if (file.endsWith('fraud-gauntlet.json')) {
    const summary = isObj(obj.summary) ? obj.summary : {};
    const cases = Array.isArray(obj.cases) ? obj.cases : [];
    const total = Number(summary.totalCases ?? cases.length);
    if (total < 16) fail(file, '$.summary.totalCases', 'fraud gauntlet must include at least 16 cases', total);
    if (Number(summary.blocked) !== total) fail(file, '$.summary.blocked', 'blocked must equal total cases', summary.blocked);
    if (Number(summary.missing) !== 0) fail(file, '$.summary.missing', 'missing must be zero', summary.missing);
    if (Number(summary.failed) !== 0) fail(file, '$.summary.failed', 'failed must be zero', summary.failed);
    cases.forEach((item, index) => {
      if (!isObj(item)) return fail(file, `$.cases[${index}]`, 'fraud case must be object', item);
      for (const [key, expected] of Object.entries({ observed: 'rejected', expected: 'rejected', expectedErrorMatched: true, accountsMutated: false, accountsMutationVerified: true })) {
        if (item[key] !== expected) fail(file, `$.cases[${index}].${key}`, `fraud case ${key} must equal ${String(expected)}`, item[key]);
      }
      if (item.failureKind !== 'program_rejection' && item.failureKind !== 'intent_validator_rejection') {
        fail(file, `$.cases[${index}].failureKind`, 'fraud case must be a program or intent-validator rejection', item.failureKind);
      }
      const allowedRealProofSources = ['devnet_transaction_execution', 'localnet_transaction_execution', 'intent_validator_check'];
      const allowedMockProofSources = [...allowedRealProofSources, 'mock_final_fixture'];
      const allowedProofSources = allowMockFinal ? allowedMockProofSources : allowedRealProofSources;
      if (!allowedProofSources.includes(String(item.proofSource ?? ''))) {
        fail(file, `$.cases[${index}].proofSource`, 'fraud case proofSource must be exact', item.proofSource);
      }
    });
  }
  if (file.endsWith('devnet-causal-commerce.json')) {
    for (const key of ['programSourceHash', 'proofGeneratorHash', 'verifierHash'] as const) {
      if (obj[key] !== currentProofHashes[key]) {
        fail(file, `$.${key}`, `${key} does not match current repository state`, {
          artifact: obj[key],
          current: currentProofHashes[key],
        });
      }
    }
    if (!currentProofHashes.idlHash) {
      fail(file, '$.idlHash', 'canonical idl/viral_sync.json is required for final idlHash verification');
    } else if (obj.idlHash !== currentProofHashes.idlHash) {
      fail(file, '$.idlHash', 'idlHash does not match current repository state', {
        artifact: obj.idlHash,
        current: currentProofHashes.idlHash,
      });
    }
  }
  if (file.endsWith('devnet-causal-commerce.json') || file.endsWith('devnet-causal-commerce-verifier.json')) {
    for (const key of ['terminalVerified','visitorVerified','lineageVerified','settlementVerified','nullifierVerified']) {
      if ((obj as Record<string, unknown>)[key] !== true) fail(file, `$.${key}`, 'final verification flag must be true', (obj as Record<string, unknown>)[key]);
    }
  }
  if (file.endsWith('merchant-passport.json')) {
    const facts = isObj(obj.verifiedFacts) ? obj.verifiedFacts as Record<string, unknown> : {};
    for (const key of ['terminalVerified','visitorVerified','lineageVerified','settlementVerified','verifierOk','rewardSettled','nullifierRecorded']) {
      if (facts[key] !== true) fail(file, `$.verifiedFacts.${key}`, 'passport verified fact must be true', facts[key]);
    }
  }
  if (file.endsWith('conversion-orderbook.json')) {
    const campaigns = Array.isArray(obj.campaigns) ? obj.campaigns : [];
    const proofBacked = campaigns.find((campaign) => isObj(campaign) && campaign.proofBacked === true) as Record<string, unknown> | undefined;
    if (!proofBacked) fail(file, '$.campaigns', 'orderbook must contain a proof-backed campaign');
    const verification = isObj(proofBacked?.verification) ? proofBacked?.verification as Record<string, unknown> : {};
    for (const key of ['terminalVerified','visitorVerified','lineageVerified','settlementVerified']) {
      if (verification[key] !== true) fail(file, `$.campaigns[proofBacked].verification.${key}`, 'proof-backed campaign verification flag must be true', verification[key]);
    }
  }
  if (file.endsWith('campaign-links.json')) {
    const links = Array.isArray(obj.links) ? obj.links : [];
    const proofBacked = links.find((link) => isObj(link) && link.proofBacked === true) as Record<string, unknown> | undefined;
    if (!proofBacked) fail(file, '$.links', 'campaign links must contain a proof-backed link');
    for (const key of ['terminalVerified','visitorVerified','lineageVerified','settlementVerified']) {
      if (proofBacked?.[key] !== true) fail(file, `$.links[proofBacked].${key}`, 'proof-backed link verification flag must be true', proofBacked?.[key]);
    }
  }
}

function scanTextFile(file: string) {
  if (!finalTextFiles.has(file)) return;
  if (!exists(file)) { fail(file, '$', 'required final transcript missing'); return; }
  const text = read(file);
  if (text.includes('\u0000')) fail(file, '$', 'transcript must be UTF-8 text, not UTF-16/null-byte encoded');
  if (localPath.test(text)) fail(file, '$', 'final transcript leaks local path or secret-like value');
  if (!allowMockFinal && mockMarker.test(text)) fail(file, '$', 'mock fixture marker is not allowed in real final transcript');
  if (badStatus.test(text)) fail(file, '$', 'final transcript contains unsafe/pre-final status text');
}

function scanMarkdownFile(file: string) {
  if (!finalMarkdownFiles.has(file)) return;
  if (!exists(file)) { fail(file, '$', 'required final markdown missing'); return; }
  const text = read(file);
  const patterns = [
    { pattern: /^NO-GO:/m, reason: 'explicit NO-GO decision' },
    { pattern: /Decision\s*\n\s*NO-GO/i, reason: 'NO-GO decision block' },
    { pattern: /Status:\s*\*\*(BLOCKED|READY_FOR_FINAL_PROOF_RUN|NO-GO)\*\*/i, reason: 'final readiness doc is not GO' },
    { pattern: /proofStatus[^\n]*(needs[-_\s]?regeneration|stale|unsafe)/i, reason: 'stale proofStatus in final doc' },
  ];
  for (const { pattern, reason } of patterns) if (pattern.test(text)) fail(file, '$', reason, pattern.toString());
  if (localPath.test(text)) fail(file, '$', 'final markdown leaks local path or secret-like value');
  if (!allowMockFinal && /mock final fixture|mockFinal/i.test(text)) fail(file, '$', 'mock fixture marker is not allowed in real final markdown');
}

for (const file of [...finalJsonArtifacts].map(normalize)) scanJsonFile(file);
for (const file of [...finalMarkdownFiles].map(normalize)) scanMarkdownFile(file);
for (const file of [...finalTextFiles].map(normalize)) scanTextFile(file);

const result = { ok: failures.length === 0, scannedMode: allowMockFinal ? 'mock-final-artifact-assertion' : 'explicit-final-artifact-assertion', jsonArtifacts: [...finalJsonArtifacts].sort(), markdownArtifacts: [...finalMarkdownFiles].sort(), failures };
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
