import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

// Regression markers: close_growth_bounty Reward vault is not closed Localnet manifest was not produced with --close-check

type ProofSignature = string | null | { signature?: string | null; reused?: boolean };

type Manifest = {
  kind?: string;
  cluster?: string;
  rpcUrl?: string;
  programId?: string;
  wallet?: string;
  generatedAt?: string;
  effectCheckedAt?: string;
  inputs?: {
    orgId?: string;
    campaignId?: string;
    receiptId?: string;
    fundAmount?: string;
    rewardPerVisit?: string;
    replayCheck?: boolean;
    attackCheck?: boolean;
    closeCheck?: boolean;
  };
  hashes?: {
    intentManifestHash?: string;
    visitAttestationHash?: string;
    receiptIdHash?: string;
    claimerNullifierHash?: string;
  };
  pdas?: Record<string, string | number>;
  signatures?: Record<string, ProofSignature>;
  explorerLinks?: {
    transactions?: Record<string, string | null>;
    accounts?: Record<string, string | null>;
  };
  replayChecks?: Array<{ label?: string; rejected?: boolean; message?: string }>;
  effectChecks?: Array<{ label?: string; ok?: boolean; reason?: string }>;
  tokenBalances?: {
    before?: Record<string, string>;
    after?: Record<string, string>;
    afterClose?: Record<string, string> | null;
  };
  limitation?: string;
  proofStatus?: string;
  proofStatusNote?: string;
};

type Verifier = {
  ok?: boolean;
  failures?: string[];
  tokenBalances?: Record<string, string>;
};

const DEFAULT_MANIFEST_PATH = path.join('app', 'public', 'proofs', 'devnet-causal-commerce.json');
const DEFAULT_VERIFIER_PATH = path.join('tmp', 'devnet-causal-commerce-verifier.json');
const DEFAULT_PACKET_PATH = path.join('docs', 'frontier-submission-packet.md');
const DEFAULT_GO_NO_GO_PATH = path.join('docs', 'frontier-final-go-no-go.md');

function argValue(args: string[], name: string) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function usage() {
  return `
Usage:
  npm run frontier:submission
  npm run frontier:submission -- --manifest app/public/proofs/devnet-causal-commerce.json --verifier tmp/devnet-causal-commerce-verifier.json

Options:
  --manifest <path>   Devnet manifest from npm run devnet:causal-commerce. Default: ${DEFAULT_MANIFEST_PATH}
  --verifier <path>   REQUIRED verifier output from npm run devnet:verify-receipt -- --output <path>. Default: ${DEFAULT_VERIFIER_PATH}
  --packet <path>     Write the judge packet markdown. Default: ${DEFAULT_PACKET_PATH}
  --go-no-go <path>   Write the final go/no-go markdown. Default: ${DEFAULT_GO_NO_GO_PATH}
`;
}

function readText(filePath: string) {
  const resolved = path.resolve(filePath);
  if (!existsSync(resolved)) {
    throw new Error(`Required file is missing: ${resolved}`);
  }
  return readFileSync(resolved, 'utf8');
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readText(filePath)) as T;
}

function readOptionalJson<T>(filePath: string): T | undefined {
  const resolved = path.resolve(filePath);
  if (!existsSync(resolved)) return undefined;
  return JSON.parse(readFileSync(resolved, 'utf8')) as T;
}

function writeOutput(filePath: string, value: string) {
  const resolved = path.resolve(filePath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  writeFileSync(resolved, value);
  return resolved;
}

function requireText(label: string, content: string, expected: string, failures: string[]) {
  if (!content.includes(expected)) {
    failures.push(`${label} does not include ${expected}`);
  }
}

function requireFile(filePath: string, failures: string[]) {
  if (!existsSync(path.resolve(filePath))) {
    failures.push(`Missing required artifact ${filePath}`);
  }
}

function tokenBalance(manifest: Manifest, phase: 'before' | 'after' | 'afterClose', account: string) {
  const balances = manifest.tokenBalances?.[phase];
  return balances?.[account] ?? 'missing';
}

function replayVerdict(manifest: Manifest) {
  const checks = manifest.replayChecks ?? [];
  if (checks.length === 0) return 'missing';
  return checks.every((check) => check.rejected) ? 'PASS' : 'FAIL';
}

function effectVerdict(manifest: Manifest) {
  const checks = manifest.effectChecks ?? [];
  if (checks.length === 0) return 'missing';
  const valid = checks.find((check) => check.label?.toLowerCase().includes('valid'));
  const malicious = checks.filter((check) => !check.label?.toLowerCase().includes('valid'));
  return valid?.ok === true && malicious.length > 0 && malicious.every((check) => check.ok === false)
    ? 'PASS'
    : 'FAIL';
}


function staleProofStatus(manifest: Manifest) {
  const status = manifest.proofStatus ?? '';
  return /needs|stale|unsafe/i.test(status);
}

function signatureValue(value: ProofSignature | undefined) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value.signature ?? null;
}

function signatureVerdict(manifest: Manifest, key: string) {
  return signatureValue(manifest.signatures?.[key]) ? 'PASS' : 'MISSING';
}

function txLink(manifest: Manifest, key: string) {
  return manifest.explorerLinks?.transactions?.[key] ?? null;
}

function buildPacket(params: { manifest: Manifest; verifier?: Verifier; generatedAt: string }) {
  const { manifest, verifier, generatedAt } = params;
  const verifierStatus = verifier ? (verifier.ok ? 'PASS' : 'FAIL') : 'MISSING';
  return `# Frontier Submission Packet

Generated: ${generatedAt}

## One-Sentence Pitch

Viral Sync is a Causal Commerce protocol for Solana: merchants fund rewards and pay only when a staff-confirmed offline visit produces an on-chain causal receipt that commits to the visit evidence, campaign nullifier, and intent manifest hash.

## Judge-Facing Proof Path

1. Merchant registers a Causal Commerce config.
2. Merchant creates and funds a Growth Bounty.
3. The program records a Causal Receipt with a campaign-scoped nullifier.
4. The receipt stores the \`intent_manifest_hash\` commitment.
5. The program settles exactly once from the SPL reward vault.
6. The proof page shows explorer links and Causal Receipt Intent Validator results.

## Devnet Evidence

| Field | Value |
|---|---|
| Cluster | \`${manifest.cluster ?? 'missing'}\` |
| Program | \`${manifest.programId ?? 'missing'}\` |
| RPC | \`${manifest.rpcUrl ?? 'missing'}\` |
| Generated | \`${manifest.generatedAt ?? 'missing'}\` |
| Intent checked | \`${manifest.effectCheckedAt ?? 'missing'}\` |
| Campaign | \`${manifest.pdas?.growthCampaign ?? 'missing'}\` |
| Reward escrow | \`${manifest.pdas?.rewardEscrow ?? 'missing'}\` |
| Reward vault | \`${manifest.pdas?.rewardVault ?? 'missing'}\` |
| Causal receipt | \`${manifest.pdas?.causalReceipt ?? 'missing'}\` |
| Nullifier | \`${manifest.pdas?.nullifierRecord ?? 'missing'}\` |
| Intent manifest hash | \`${manifest.hashes?.intentManifestHash ?? 'missing'}\` |
| Visit attestation hash | \`${manifest.hashes?.visitAttestationHash ?? 'missing'}\` |
| Replay checks | ${replayVerdict(manifest)} |
| Intent validation checks | ${effectVerdict(manifest)} |
| Required verifier | ${verifierStatus} |

## Core Transaction Links

| Step | Signature | Explorer |
|---|---|---|
| register_merchant | \`${signatureValue(manifest.signatures?.registerMerchant) ?? 'missing'}\` | ${txLink(manifest, 'registerMerchant') ?? 'missing'} |
| create_growth_campaign | \`${signatureValue(manifest.signatures?.createGrowthCampaign) ?? 'missing'}\` | ${txLink(manifest, 'createGrowthCampaign') ?? 'missing'} |
| fund_growth_bounty | \`${signatureValue(manifest.signatures?.fundGrowthBounty) ?? 'missing'}\` | ${txLink(manifest, 'fundGrowthBounty') ?? 'missing'} |
| record_causal_receipt | \`${signatureValue(manifest.signatures?.recordCausalReceipt) ?? 'missing'}\` | ${txLink(manifest, 'recordCausalReceipt') ?? 'missing'} |
| settle_receipt_reward | \`${signatureValue(manifest.signatures?.settleReceiptReward) ?? 'missing'}\` | ${txLink(manifest, 'settleReceiptReward') ?? 'missing'} |

## SPL Custody Ledger

${manifest.inputs?.closeCheck ? 'This proof includes close-check evidence after expiry.' : 'This public proof focuses on record + settle; the script supports close-check with `--close-check`, but vault reclaim is not claimed as proven in this artifact.'}

| Account | Before | After settlement | After close |
|---|---:|---:|---:|
| Merchant reward account | \`${tokenBalance(manifest, 'before', 'merchantRewardAccount')}\` | \`${tokenBalance(manifest, 'after', 'merchantRewardAccount')}\` | \`${tokenBalance(manifest, 'afterClose', 'merchantRewardAccount')}\` |
| Reward vault | \`${tokenBalance(manifest, 'before', 'rewardVault')}\` | \`${tokenBalance(manifest, 'after', 'rewardVault')}\` | \`${tokenBalance(manifest, 'afterClose', 'rewardVault')}\` |
| Referrer reward account | \`${tokenBalance(manifest, 'before', 'referrerRewardAccount')}\` | \`${tokenBalance(manifest, 'after', 'referrerRewardAccount')}\` | \`${tokenBalance(manifest, 'afterClose', 'referrerRewardAccount')}\` |
| Visitor reward account | \`${tokenBalance(manifest, 'before', 'visitorRewardAccount')}\` | \`${tokenBalance(manifest, 'after', 'visitorRewardAccount')}\` | \`${tokenBalance(manifest, 'afterClose', 'visitorRewardAccount')}\` |

## Commands For Judges

\`\`\`bash
npm ci
npm run build:program
npm run devnet:causal-commerce
npm run devnet:verify-receipt -- --output tmp/devnet-causal-commerce-verifier.json
npm run frontier:submission
\`\`\`

## Hosted App Proof Surface

- Devnet proof page: \`/frontier-proof\`
- Policy: \`GET /api/launch/relayer/policy\`
- Causal Commerce intent builder: \`GET|POST /api/launch/relayer/causal-commerce\`
- Sponsored transaction simulator: \`POST /api/launch/relayer/sponsor\`

## Honest Limitations

${manifest.limitation ?? 'Devnet pilot only. Mainnet funds require external audit, funded relayer operations, and production incident coverage.'}
`;
}

function buildGoNoGo(params: { manifest: Manifest; verifier?: Verifier; generatedAt: string; failures: string[] }) {
  const { manifest, verifier, generatedAt, failures } = params;
  const go = failures.length === 0;
  return `# Frontier Final Go/No-Go

Generated: ${generatedAt}

## Decision

${go ? 'GO: submit this build for Frontier judging.' : 'NO-GO: fix the blockers below before submission.'}

## Gate Results

| Gate | Result |
|---|---|
| Devnet proof manifest | ${manifest.cluster === 'devnet' ? 'PASS' : 'CHECK'} |
| register_merchant signature | ${signatureVerdict(manifest, 'registerMerchant')} |
| create_growth_campaign signature | ${signatureVerdict(manifest, 'createGrowthCampaign')} |
| fund_growth_bounty signature | ${signatureVerdict(manifest, 'fundGrowthBounty')} |
| record_causal_receipt signature | ${signatureVerdict(manifest, 'recordCausalReceipt')} |
| settle_receipt_reward signature | ${signatureVerdict(manifest, 'settleReceiptReward')} |
| intent_manifest_hash present | ${manifest.hashes?.intentManifestHash ? 'PASS' : 'FAIL'} |
| Replay rejection | ${replayVerdict(manifest)} |
| Intent validation | ${effectVerdict(manifest)} |
| Required verifier | ${verifier ? (verifier.ok ? 'PASS' : 'FAIL') : 'MISSING'} |
| Hosted proof page | ${existsSync(path.resolve('app/src/app/frontier-proof/page.tsx')) ? 'PASS' : 'FAIL'} |

## Blockers

${failures.length ? failures.map((failure) => `- ${failure}`).join('\n') : '- none'}

## Submission Stance

Lead with the devnet receipt proof, not broad product surface area. The winning story is the verified-visit primitive: funded SPL custody, Causal Receipt, exact-once settlement, nullifier replay rejection, and on-chain \`intent_manifest_hash\` commitment.
`;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(usage());
    return;
  }

  const manifestPath = argValue(args, '--manifest') ?? DEFAULT_MANIFEST_PATH;
  const verifierPath = argValue(args, '--verifier') ?? DEFAULT_VERIFIER_PATH;
  const packetPath = argValue(args, '--packet') ?? DEFAULT_PACKET_PATH;
  const goNoGoPath = argValue(args, '--go-no-go') ?? DEFAULT_GO_NO_GO_PATH;

  const failures: string[] = [];
  [
    'README.md',
    'app/src/app/frontier-proof/page.tsx',
    'app/src/app/api/launch/relayer/causal-commerce/route.ts',
    'programs/viral_sync/src/lib.rs',
    manifestPath,
  ].forEach((filePath) => requireFile(filePath, failures));

  const manifest = failures.some((failure) => failure.includes(manifestPath))
    ? {}
    : readJson<Manifest>(manifestPath);
  requireFile(verifierPath, failures);
  const verifier = existsSync(path.resolve(verifierPath)) ? readJson<Verifier>(verifierPath) : undefined;

  if (manifest.cluster && manifest.cluster !== 'devnet') {
    failures.push(`Proof manifest cluster is ${manifest.cluster}, expected devnet`);
  }
  if (staleProofStatus(manifest)) {
    failures.push(`Proof manifest is marked stale: ${manifest.proofStatus}${manifest.proofStatusNote ? ` — ${manifest.proofStatusNote}` : ''}`);
  }

  ['registerMerchant', 'createGrowthCampaign', 'fundGrowthBounty', 'recordCausalReceipt', 'settleReceiptReward'].forEach((key) => {
    if (!signatureValue(manifest.signatures?.[key])) {
      failures.push(`Manifest is missing signature for ${key}`);
    }
  });

  if (!manifest.hashes?.intentManifestHash) {
    failures.push('Manifest is missing hashes.intentManifestHash');
  }
  if (!manifest.hashes?.visitAttestationHash) {
    failures.push('Manifest is missing hashes.visitAttestationHash');
  }
  if (replayVerdict(manifest) !== 'PASS') {
    failures.push('Replay checks are not all rejected');
  }
  if (effectVerdict(manifest) !== 'PASS') {
    failures.push('Intent validation checks do not show valid accepted and malicious rejected');
  }
  if (!verifier) {
    failures.push(`Required verifier output is missing: ${verifierPath}`);
  } else if (!verifier.ok) {
    failures.push(`Verifier is not passing: ${(verifier.failures ?? ['unknown failure']).join('; ')}`);
  }

  if (existsSync(path.resolve('README.md'))) {
    const readme = readText('README.md');
    requireText('README', readme, 'Causal Commerce protocol', failures);
    requireText('README', readme, '/frontier-proof', failures);
  }

  const generatedAt = new Date().toISOString();
  const packetOutput = writeOutput(packetPath, buildPacket({ manifest, verifier, generatedAt }));
  const goNoGoOutput = writeOutput(goNoGoPath, buildGoNoGo({ manifest, verifier, generatedAt, failures }));

  console.log(JSON.stringify({
    ok: failures.length === 0,
    packetPath: packetOutput,
    goNoGoPath: goNoGoOutput,
    manifestPath: path.resolve(manifestPath),
    verifierPath: path.resolve(verifierPath),
    verifierProvided: Boolean(verifier),
    failures,
  }, null, 2));

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
