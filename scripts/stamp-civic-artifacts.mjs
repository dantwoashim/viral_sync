import { createHash } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

const root = process.cwd();
const proofDir = path.join(root, 'app', 'public', 'proofs');

const sourceFiles = [
  'devnet-causal-commerce.json',
  'devnet-causal-commerce-verifier.json',
  'fraud-gauntlet.json',
  'proof-feed.json',
  'frontier-readiness.json',
];

const civicFiles = [
  'civic-market-ward12-water-repair.json',
  'civic-ledger.json',
  'civic-receipt-latest.json',
  'civic-verifier.json',
  'civic-fraud-gauntlet.json',
  'civic-readiness.json',
  'civic-proof-sidecar.json',
  'janamat-compatibility.json',
  'zk-identity-adapter.json',
];

function filePath(file) {
  return path.join(proofDir, file);
}

function sha256File(file) {
  return createHash('sha256').update(readFileSync(filePath(file))).digest('hex');
}

function readJson(file) {
  return JSON.parse(readFileSync(filePath(file), 'utf8'));
}

function writeJson(file, value) {
  writeFileSync(filePath(file), `${JSON.stringify(value, null, 2)}\n`);
}

const hashes = Object.fromEntries(sourceFiles.map((file) => [file, sha256File(file)]));
const manifest = readJson('devnet-causal-commerce.json');

for (const file of civicFiles) {
  if (!existsSync(filePath(file))) throw new Error(`missing civic artifact ${file}`);
  const artifact = readJson(file);
  artifact.sourceArtifactHashes = { ...hashes };

  if (file === 'civic-market-ward12-water-repair.json') {
    artifact.devnetEvidence = artifact.devnetEvidence ?? {};
    artifact.devnetEvidence.sourceManifestSha256 = hashes['devnet-causal-commerce.json'];
    artifact.devnetEvidence.sourceVerifierSha256 = hashes['devnet-causal-commerce-verifier.json'];
    artifact.devnetEvidence.sourceGauntletSha256 = hashes['fraud-gauntlet.json'];
    artifact.devnetEvidence.growthCampaignPda = manifest.pdas?.growthCampaign;
    for (const key of ['programSourceHash', 'idlHash', 'proofGeneratorHash', 'verifierHash', 'rawVerifierHash', 'publishedVerifierHash']) {
      if (manifest[key]) artifact[key] = manifest[key];
    }
  }

  if (file === 'civic-receipt-latest.json') {
    artifact.sourceManifestSha256 = hashes['devnet-causal-commerce.json'];
  }

  if (file === 'civic-ledger.json') {
    artifact.sourceFeedSha256 = hashes['proof-feed.json'];
  }

  if (file === 'civic-verifier.json') {
    artifact.sourceVerifierSha256 = hashes['devnet-causal-commerce-verifier.json'];
  }

  if (file === 'civic-readiness.json') {
    artifact.sourceReadinessSha256 = hashes['frontier-readiness.json'];
  }

  if (file === 'civic-proof-sidecar.json') {
    artifact.originalArtifacts = (artifact.originalArtifacts ?? []).map((item) => ({
      ...item,
      sha256: item.file && hashes[item.file] ? hashes[item.file] : item.sha256,
    }));
  }

  writeJson(file, artifact);
}

console.log(JSON.stringify({ ok: true, stamped: civicFiles.length, sourceArtifactHashes: hashes }, null, 2));
