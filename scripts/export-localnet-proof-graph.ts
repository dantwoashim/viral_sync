import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

type Manifest = {
  programId: string;
  wallet: string;
  inputs: {
    orgId: string;
    campaignId: string;
    receiptId: string;
    rewardPerVisit: string;
    fundAmount: string;
  };
  hashes: {
    inviteHash: string;
    claimerNullifierHash: string;
    visitAttestationHash: string;
  };
  pdas: {
    merchantConfig: string;
    growthCampaign: string;
    rewardMint: string;
    merchantRewardAccount: string;
    rewardEscrow: string;
    rewardVault: string;
    causalReceipt: string;
    nullifierRecord: string;
    settlementRecord: string;
  };
  signatures: {
    mintRewardTokens: string;
    registerMerchant: { signature: string | null; reused: boolean };
    createGrowthCampaign: { signature: string | null; reused: boolean };
    fundGrowthBounty: string;
    recordCausalReceipt: string;
    settleReceiptReward: string;
    closeGrowthBounty: string | null;
  };
  replayChecks: Array<{ label: string; rejected: boolean; message: string }>;
  tokenBalances: {
    before: Record<string, string>;
    after: Record<string, string>;
    afterClose?: Record<string, string> | null;
  };
};

function argValue(args: string[], name: string) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function usage() {
  return `
Usage:
  npm run localnet:proof-graph
  npm run localnet:proof-graph -- --manifest tmp/localnet-causal-commerce.json --output docs/localnet-proof-graph.md
`;
}

function readManifest(filePath: string) {
  const resolved = path.resolve(filePath);
  if (!existsSync(resolved)) {
    throw new Error(`Manifest not found at ${resolved}. Run npm run localnet:smoke first.`);
  }
  return JSON.parse(readFileSync(resolved, 'utf8')) as Manifest;
}

function short(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

function buildMermaid(manifest: Manifest) {
  return `flowchart LR
  merchant["Merchant Authority\\n${short(manifest.wallet)}"]
  config["Causal Merchant Config\\n${short(manifest.pdas.merchantConfig)}"]
  campaign["Growth Bounty\\n${short(manifest.pdas.growthCampaign)}"]
  escrow["Reward Escrow State\\n${short(manifest.pdas.rewardEscrow)}"]
  vault["SPL Reward Vault\\n${short(manifest.pdas.rewardVault)}"]
  referrerToken["Referrer Token Account\\n${manifest.tokenBalances.after.referrerRewardAccount} units"]
  visitorToken["Visitor Token Account\\n${manifest.tokenBalances.after.visitorRewardAccount} units"]
  reclaimedToken["Merchant Reclaimed Tokens\\n${manifest.tokenBalances.afterClose?.merchantRewardAccount ?? 'close not run'} units"]
  invite["Causal Invite\\n${manifest.hashes.inviteHash.slice(0, 12)}..."]
  nullifier["Campaign Nullifier\\n${short(manifest.pdas.nullifierRecord)}"]
  visit["Dual-Attested Visit\\n${manifest.hashes.visitAttestationHash.slice(0, 12)}..."]
  receipt["Causal Receipt\\n${short(manifest.pdas.causalReceipt)}"]
  settlement["Settlement Record\\n${short(manifest.pdas.settlementRecord)}"]

  merchant -->|"register_merchant"| config
  config -->|"create_growth_campaign"| campaign
  campaign -->|"fund_growth_bounty ${manifest.inputs.fundAmount}"| escrow
  escrow -->|"vault authority"| vault
  invite -->|"claim uniqueness"| nullifier
  visit -->|"record_causal_receipt"| receipt
  campaign --> receipt
  escrow --> receipt
  receipt -->|"settle_receipt_reward ${manifest.inputs.rewardPerVisit}"| settlement
  vault -->|"80%"| referrerToken
  vault -->|"20%"| visitorToken
  vault -->|"close_growth_bounty reclaim"| reclaimedToken
`;
}

function buildMarkdown(manifest: Manifest) {
  const mermaid = buildMermaid(manifest);
  return `# Localnet Proof Graph

Generated from \`tmp/localnet-causal-commerce.json\`.

\`\`\`mermaid
${mermaid}
\`\`\`

## Accounts

| Object | Address |
|---|---|
| Program | \`${manifest.programId}\` |
| Merchant config | \`${manifest.pdas.merchantConfig}\` |
| Growth bounty | \`${manifest.pdas.growthCampaign}\` |
| Reward mint | \`${manifest.pdas.rewardMint}\` |
| Merchant reward account | \`${manifest.pdas.merchantRewardAccount}\` |
| Reward escrow | \`${manifest.pdas.rewardEscrow}\` |
| Reward vault | \`${manifest.pdas.rewardVault}\` |
| Causal receipt | \`${manifest.pdas.causalReceipt}\` |
| Nullifier record | \`${manifest.pdas.nullifierRecord}\` |
| Settlement record | \`${manifest.pdas.settlementRecord}\` |

## Transactions

| Step | Signature |
|---|---|
| Register merchant | \`${manifest.signatures.registerMerchant.signature ?? 'reused existing account'}\` |
| Create Growth Bounty | \`${manifest.signatures.createGrowthCampaign.signature ?? 'reused existing account'}\` |
| Mint reward tokens | \`${manifest.signatures.mintRewardTokens}\` |
| Fund bounty state | \`${manifest.signatures.fundGrowthBounty}\` |
| Record Causal Receipt | \`${manifest.signatures.recordCausalReceipt}\` |
| Settle reward | \`${manifest.signatures.settleReceiptReward}\` |
| Close bounty and vault | \`${manifest.signatures.closeGrowthBounty ?? 'not run'}\` |

## Replay Checks

${manifest.replayChecks.map((check) => `- ${check.label}: ${check.rejected ? 'rejected' : 'not rejected'} (${check.message})`).join('\n')}

## Token Balances

| Account | Before | After settlement | After close |
|---|---:|---:|---:|
| Merchant reward account | \`${manifest.tokenBalances.before.merchantRewardAccount}\` | \`${manifest.tokenBalances.after.merchantRewardAccount}\` | \`${manifest.tokenBalances.afterClose?.merchantRewardAccount ?? 'not run'}\` |
| Reward vault | \`${manifest.tokenBalances.before.rewardVault}\` | \`${manifest.tokenBalances.after.rewardVault}\` | \`${manifest.tokenBalances.afterClose?.rewardVault ?? 'not run'}\` |
| Referrer reward account | \`${manifest.tokenBalances.before.referrerRewardAccount}\` | \`${manifest.tokenBalances.after.referrerRewardAccount}\` | \`${manifest.tokenBalances.afterClose?.referrerRewardAccount ?? 'not run'}\` |
| Visitor reward account | \`${manifest.tokenBalances.before.visitorRewardAccount}\` | \`${manifest.tokenBalances.after.visitorRewardAccount}\` | \`${manifest.tokenBalances.afterClose?.visitorRewardAccount ?? 'not run'}\` |
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
  const outputPath = argValue(args, '--output') ?? path.join('docs', 'localnet-proof-graph.md');
  const manifest = readManifest(manifestPath);
  const resolved = writeOutput(outputPath, buildMarkdown(manifest));
  console.log(JSON.stringify({ ok: true, manifestPath, outputPath: resolved }, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
