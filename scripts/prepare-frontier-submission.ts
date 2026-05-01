import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

type Manifest = {
  kind?: string;
  rpcUrl?: string;
  programId?: string;
  wallet?: string;
  inputs?: {
    orgId?: string;
    campaignId?: string;
    receiptId?: string;
    fundAmount?: string;
    rewardPerVisit?: string;
    replayCheck?: boolean;
    closeCheck?: boolean;
  };
  pdas?: Record<string, string | number>;
  signatures?: Record<string, unknown>;
  replayChecks?: Array<{ label?: string; rejected?: boolean; message?: string }>;
  tokenBalances?: {
    before?: Record<string, string>;
    after?: Record<string, string>;
    afterClose?: Record<string, string> | null;
  };
  limitation?: string;
};

type Verifier = {
  ok?: boolean;
  failures?: string[];
  tokenBalances?: Record<string, string>;
};

const DEFAULT_MANIFEST_PATH = path.join('tmp', 'localnet-causal-commerce.json');
const DEFAULT_VERIFIER_PATH = path.join('tmp', 'localnet-causal-commerce-verifier.json');
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
  npm run frontier:submission -- --manifest tmp/localnet-causal-commerce.json --verifier tmp/localnet-causal-commerce-verifier.json

Options:
  --manifest <path>   Manifest from npm run localnet:smoke. Default: ${DEFAULT_MANIFEST_PATH}
  --verifier <path>   Verifier output from npm run localnet:smoke. Default: ${DEFAULT_VERIFIER_PATH}
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

function writeOutput(filePath: string, value: string) {
  const resolved = path.resolve(filePath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  writeFileSync(resolved, value);
  return resolved;
}

function hasInstruction(idlText: string, instruction: string) {
  return idlText.includes(`"name": "${instruction}"`);
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
  if (checks.length === 0) {
    return 'missing';
  }
  return checks.every((check) => check.rejected) ? 'PASS' : 'FAIL';
}

function buildPacket(params: {
  manifest: Manifest;
  verifier: Verifier;
  generatedAt: string;
}) {
  const { manifest, verifier, generatedAt } = params;
  return `# Frontier Submission Packet

Generated: ${generatedAt}

## One-Sentence Pitch

Viral Sync is the Causal Receipt protocol for Solana: merchants fund rewards, customers share signed invites, staff confirm real visits, and the resulting proof can be verified and composed by anyone.

## Winning Proof Path

1. Merchant registers a Causal Commerce config.
2. Merchant creates and funds a Growth Bounty.
3. The program records a Causal Receipt with a campaign-scoped nullifier.
4. The program settles exactly once from the SPL reward vault.
5. The merchant closes the bounty, reclaims unused funds, and closes the vault account.
6. The verifier independently checks receipt, settlement, nullifier, token balances, and replay rejection.

## Localnet Evidence

| Field | Value |
|---|---|
| Program | \`${manifest.programId ?? 'missing'}\` |
| RPC | \`${manifest.rpcUrl ?? 'missing'}\` |
| Wallet | \`${manifest.wallet ?? 'missing'}\` |
| Campaign | \`${manifest.pdas?.growthCampaign ?? 'missing'}\` |
| Reward escrow | \`${manifest.pdas?.rewardEscrow ?? 'missing'}\` |
| Reward vault | \`${manifest.pdas?.rewardVault ?? 'missing'}\` |
| Causal receipt | \`${manifest.pdas?.causalReceipt ?? 'missing'}\` |
| Settlement record | \`${manifest.pdas?.settlementRecord ?? 'missing'}\` |
| Verifier | ${verifier.ok ? 'PASS' : 'FAIL'} |
| Replay checks | ${replayVerdict(manifest)} |

## SPL Custody Ledger

| Account | Before | After settlement | After close |
|---|---:|---:|---:|
| Merchant reward account | \`${tokenBalance(manifest, 'before', 'merchantRewardAccount')}\` | \`${tokenBalance(manifest, 'after', 'merchantRewardAccount')}\` | \`${tokenBalance(manifest, 'afterClose', 'merchantRewardAccount')}\` |
| Reward vault | \`${tokenBalance(manifest, 'before', 'rewardVault')}\` | \`${tokenBalance(manifest, 'after', 'rewardVault')}\` | \`${tokenBalance(manifest, 'afterClose', 'rewardVault')}\` |
| Referrer reward account | \`${tokenBalance(manifest, 'before', 'referrerRewardAccount')}\` | \`${tokenBalance(manifest, 'after', 'referrerRewardAccount')}\` | \`${tokenBalance(manifest, 'afterClose', 'referrerRewardAccount')}\` |
| Visitor reward account | \`${tokenBalance(manifest, 'before', 'visitorRewardAccount')}\` | \`${tokenBalance(manifest, 'after', 'visitorRewardAccount')}\` | \`${tokenBalance(manifest, 'afterClose', 'visitorRewardAccount')}\` |

## Commands For Judges

\`\`\`bash
npm ci
npm run verify
npm run build:program
npm run localnet:smoke
npm run localnet:proof-graph
npm run localnet:evidence-report
npm run frontier:submission
\`\`\`

## Hosted App Relayer Surface

- Policy: \`GET /api/launch/relayer/policy\`
- Causal Commerce intent builder: \`GET|POST /api/launch/relayer/causal-commerce\`
- Sponsored transaction simulator: \`POST /api/launch/relayer/sponsor\`

## Judge Assets

- \`docs/winner-scope.md\`
- \`docs/golden-demo-path.md\`
- \`docs/localnet-proof-graph.md\`
- \`docs/localnet-evidence-report.md\`
- \`docs/week-40-52-completion.md\`
- \`docs/frontier-final-go-no-go.md\`

## Honest Limitations

${manifest.limitation ?? 'Localnet/devnet pilot only. Mainnet funds require external audit, funded relayer operations, and production incident coverage.'}
`;
}

function buildGoNoGo(params: { manifest: Manifest; verifier: Verifier; generatedAt: string; failures: string[] }) {
  const { manifest, verifier, generatedAt, failures } = params;
  const go = failures.length === 0;
  return `# Frontier Final Go/No-Go

Generated: ${generatedAt}

## Decision

${go ? 'GO: submit this build for Frontier judging.' : 'NO-GO: fix the blockers below before submission.'}

## Gate Results

| Gate | Result |
|---|---|
| Program IDL includes Causal Commerce lifecycle | ${go ? 'PASS' : 'CHECK LOG'} |
| Localnet verifier | ${verifier.ok ? 'PASS' : 'FAIL'} |
| Replay rejection | ${replayVerdict(manifest)} |
| Vault close | ${tokenBalance(manifest, 'afterClose', 'rewardVault') === 'closed' ? 'PASS' : 'FAIL'} |
| Hosted relayer endpoint | ${existsSync(path.resolve('app/src/app/api/launch/relayer/causal-commerce/route.ts')) ? 'PASS' : 'FAIL'} |
| Judge docs | ${failures.some((failure) => failure.includes('docs/')) ? 'FAIL' : 'PASS'} |

## Blockers

${failures.length ? failures.map((failure) => `- ${failure}`).join('\n') : '- none'}

## Submission Stance

Lead with localnet proof, not broad product surface area. The winning story is the verified-visit primitive: funded SPL custody, Causal Receipt, exact-once settlement, replay rejection, and vault reclaim.
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
    'docs/winner-scope.md',
    'docs/golden-demo-path.md',
    'docs/winning-demo.md',
    'docs/year-plan-audit.md',
    'docs/protocol-invariants.md',
    'docs/security-model.md',
    'docs/composability.md',
    'docs/localnet-proof-graph.md',
    'docs/localnet-evidence-report.md',
    'docs/week-30-40-completion.md',
    'docs/week-40-52-completion.md',
    'app/src/app/api/launch/relayer/causal-commerce/route.ts',
    'target/idl/viral_sync.json',
    manifestPath,
    verifierPath,
  ].forEach((filePath) => requireFile(filePath, failures));

  const manifest = failures.some((failure) => failure.includes(manifestPath))
    ? {}
    : readJson<Manifest>(manifestPath);
  const verifier = failures.some((failure) => failure.includes(verifierPath))
    ? {}
    : readJson<Verifier>(verifierPath);

  if (existsSync(path.resolve('target/idl/viral_sync.json'))) {
    const idl = readText('target/idl/viral_sync.json');
    [
      'register_merchant',
      'create_growth_campaign',
      'fund_growth_bounty',
      'record_causal_receipt',
      'settle_receipt_reward',
      'close_growth_bounty',
    ].forEach((instruction) => {
      if (!hasInstruction(idl, instruction)) {
        failures.push(`IDL is missing instruction ${instruction}`);
      }
    });
  }

  if (!verifier.ok) {
    failures.push(`Verifier is not passing: ${(verifier.failures ?? ['unknown failure']).join('; ')}`);
  }
  if (replayVerdict(manifest) !== 'PASS') {
    failures.push('Replay checks are not all rejected');
  }
  if (tokenBalance(manifest, 'afterClose', 'rewardVault') !== 'closed') {
    failures.push('Reward vault is not closed after close_growth_bounty');
  }
  if (manifest.inputs?.closeCheck !== true) {
    failures.push('Localnet manifest was not produced with --close-check');
  }

  if (existsSync(path.resolve('README.md'))) {
    const readme = readText('README.md');
    requireText('README', readme, 'Week 40-52', failures);
    requireText('README', readme, 'frontier:submission', failures);
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
