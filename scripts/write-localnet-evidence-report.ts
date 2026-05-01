import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

type Manifest = {
  rpcUrl: string;
  programId: string;
  wallet: string;
  walletSource: string;
  inputs: {
    orgId: string;
    campaignId: string;
    receiptId: string;
    rewardPerVisit: string;
    fundAmount: string;
    replayCheck: boolean;
    closeCheck?: boolean;
  };
  pdas: {
    merchantConfig: string;
    growthCampaign: string;
    merchantRewardAccount: string;
    rewardEscrow: string;
    rewardVault: string;
    causalReceipt: string;
    nullifierRecord: string;
    settlementRecord: string;
  };
  signatures: Record<string, unknown>;
  replayChecks: Array<{ label: string; rejected: boolean; message: string }>;
  tokenBalances: {
    before: Record<string, string>;
    after: Record<string, string>;
    afterClose?: Record<string, string> | null;
  };
  limitation: string;
};

type Verifier = {
  ok: boolean;
  failures: string[];
  receipt: { status: unknown; rewardAmount: string; settledAmount: string };
  settlementRecord: { referrerAmount: string; visitorAmount: string };
  tokenBalances?: Record<string, string>;
};

function argValue(args: string[], name: string) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function usage() {
  return `
Usage:
  npm run localnet:evidence-report
  npm run localnet:evidence-report -- --manifest tmp/localnet-causal-commerce.json --verifier tmp/localnet-causal-commerce-verifier.json
`;
}

function readJson<T>(filePath: string): T {
  const resolved = path.resolve(filePath);
  if (!existsSync(resolved)) {
    throw new Error(`Required input not found at ${resolved}. Run npm run localnet:smoke first.`);
  }
  return JSON.parse(readFileSync(resolved, 'utf8')) as T;
}

function inlineJson(value: unknown) {
  return JSON.stringify(value);
}

function buildReport(manifest: Manifest, verifier: Verifier) {
  return `# Localnet Evidence Report

This is the judge-facing localnet evidence packet for the current Causal Commerce proof path.

## Verdict

- Verifier result: ${verifier.ok ? 'PASS' : 'FAIL'}
- Verifier failures: ${verifier.failures.length ? verifier.failures.join('; ') : 'none'}
- Replay checks: ${manifest.replayChecks.every((check) => check.rejected) ? 'PASS' : 'FAIL'}

## Inputs

| Field | Value |
|---|---|
| RPC | \`${manifest.rpcUrl}\` |
| Program | \`${manifest.programId}\` |
| Wallet | \`${manifest.wallet}\` |
| Wallet source | \`${manifest.walletSource}\` |
| Org id | \`${manifest.inputs.orgId}\` |
| Campaign id | \`${manifest.inputs.campaignId}\` |
| Receipt id | \`${manifest.inputs.receiptId}\` |
| Reward per visit | \`${manifest.inputs.rewardPerVisit}\` |
| Fund amount | \`${manifest.inputs.fundAmount}\` |

## Proof Accounts

| Account | Address |
|---|---|
| Merchant config | \`${manifest.pdas.merchantConfig}\` |
| Growth campaign | \`${manifest.pdas.growthCampaign}\` |
| Merchant reward account | \`${manifest.pdas.merchantRewardAccount}\` |
| Reward escrow | \`${manifest.pdas.rewardEscrow}\` |
| Reward vault | \`${manifest.pdas.rewardVault}\` |
| Causal receipt | \`${manifest.pdas.causalReceipt}\` |
| Nullifier record | \`${manifest.pdas.nullifierRecord}\` |
| Settlement record | \`${manifest.pdas.settlementRecord}\` |

## Settlement

- Receipt status: \`${inlineJson(verifier.receipt.status)}\`
- Receipt reward amount: \`${verifier.receipt.rewardAmount}\`
- Receipt settled amount: \`${verifier.receipt.settledAmount}\`
- Referrer amount: \`${verifier.settlementRecord.referrerAmount}\`
- Visitor amount: \`${verifier.settlementRecord.visitorAmount}\`

## SPL Token Custody

| Account | Before | After settlement | After close |
|---|---:|---:|---:|
| Merchant reward account | \`${manifest.tokenBalances.before.merchantRewardAccount}\` | \`${manifest.tokenBalances.after.merchantRewardAccount}\` | \`${manifest.tokenBalances.afterClose?.merchantRewardAccount ?? 'not run'}\` |
| Reward vault | \`${manifest.tokenBalances.before.rewardVault}\` | \`${manifest.tokenBalances.after.rewardVault}\` | \`${manifest.tokenBalances.afterClose?.rewardVault ?? 'not run'}\` |
| Referrer reward account | \`${manifest.tokenBalances.before.referrerRewardAccount}\` | \`${manifest.tokenBalances.after.referrerRewardAccount}\` | \`${manifest.tokenBalances.afterClose?.referrerRewardAccount ?? 'not run'}\` |
| Visitor reward account | \`${manifest.tokenBalances.before.visitorRewardAccount}\` | \`${manifest.tokenBalances.after.visitorRewardAccount}\` | \`${manifest.tokenBalances.afterClose?.visitorRewardAccount ?? 'not run'}\` |

Verifier token balances:

- Reward vault: \`${verifier.tokenBalances?.rewardVault ?? 'not checked'}\`
- Merchant reward account: \`${verifier.tokenBalances?.merchantRewardAccount ?? 'not checked'}\`
- Referrer reward account: \`${verifier.tokenBalances?.referrerRewardAccount ?? 'not checked'}\`
- Visitor reward account: \`${verifier.tokenBalances?.visitorRewardAccount ?? 'not checked'}\`

## Replay Results

${manifest.replayChecks.map((check) => `- ${check.label}: ${check.rejected ? 'rejected' : 'not rejected'} (${check.message})`).join('\n')}

## Known Limit

${manifest.limitation}
`;
}

function writeOutput(outputPath: string, value: string) {
  const resolved = path.resolve(outputPath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  writeFileSync(resolved, value);
  return resolved;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(usage());
    return;
  }

  const manifestPath = argValue(args, '--manifest') ?? path.join('tmp', 'localnet-causal-commerce.json');
  const verifierPath = argValue(args, '--verifier') ?? path.join('tmp', 'localnet-causal-commerce-verifier.json');
  const outputPath = argValue(args, '--output') ?? path.join('docs', 'localnet-evidence-report.md');
  const resolved = writeOutput(outputPath, buildReport(readJson<Manifest>(manifestPath), readJson<Verifier>(verifierPath)));
  console.log(JSON.stringify({ ok: true, manifestPath, verifierPath, outputPath: resolved }, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
