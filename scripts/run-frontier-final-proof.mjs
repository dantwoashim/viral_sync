import { spawnSync } from 'child_process';

const runId =
  process.env.FRONTIER_RUN_ID ??
  new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

const orgId = process.env.FRONTIER_ORG_ID ?? `outcome-settlement-devnet-${runId}`;
const campaignId = process.env.FRONTIER_CAMPAIGN_ID ?? `verified-outcome-thamel-brew-${runId}`;
const receiptId = process.env.FRONTIER_RECEIPT_ID ?? `receipt-counter-attested-outcome-${runId}`;

const args = [
  'ts-node',
  'scripts/run-causal-commerce-localnet.ts',
  '--rpc',
  process.env.FRONTIER_RPC_URL ?? 'https://api.devnet.solana.com',
  '--airdrop-sol',
  '0',
  '--replay-check',
  '--attack-check',
  '--org',
  orgId,
  '--campaign',
  campaignId,
  '--receipt',
  receiptId,
  '--output',
  'app/public/proofs/devnet-causal-commerce.json',
];

const result = spawnSync('npx', args, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
