import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

type LocalnetManifest = {
  cluster?: string;
  programId?: string;
  merchant?: string;
  campaign?: string;
  receipt?: string;
  vault?: string;
  pdas?: Record<string, string | number>;
  signatures?: Record<string, string | { signature?: string; reused?: boolean }>;
  checks?: Record<string, unknown>;
  replayChecks?: Array<{ rejected?: boolean }>;
  tokenBalances?: {
    afterClose?: {
      rewardVault?: string;
    };
  };
};

export type LocalnetProofSummary = {
  available: boolean;
  cluster: string;
  programId: string;
  merchant: string;
  campaign: string;
  receipt: string;
  vault: string;
  settlementSignature: string;
  receiptSignature: string;
  replayRejected: boolean;
  vaultClosed: boolean;
  manifestPath: string | null;
};

const missing = 'Awaiting localnet evidence';

function short(value?: string) {
  if (!value || value === missing) return missing;
  if (value.length <= 18) return value;
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

function manifestCandidates() {
  return [
    path.join(process.cwd(), 'tmp', 'localnet-causal-commerce.json'),
    path.join(process.cwd(), '..', 'tmp', 'localnet-causal-commerce.json'),
  ];
}

function signature(value: string | { signature?: string; reused?: boolean } | undefined) {
  return typeof value === 'string' ? value : value?.signature;
}

export function readLocalnetProofSummary(): LocalnetProofSummary {
  const manifestPath = manifestCandidates().find((candidate) => existsSync(candidate));

  if (!manifestPath) {
    return {
      available: false,
      cluster: 'localnet',
      programId: missing,
      merchant: missing,
      campaign: missing,
      receipt: missing,
      vault: missing,
      settlementSignature: missing,
      receiptSignature: missing,
      replayRejected: false,
      vaultClosed: false,
      manifestPath: null,
    };
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as LocalnetManifest;

  return {
    available: true,
    cluster: manifest.cluster ?? 'localnet',
    programId: short(manifest.programId),
    merchant: short(manifest.merchant ?? String(manifest.pdas?.merchantConfig ?? '')),
    campaign: short(manifest.campaign ?? String(manifest.pdas?.growthCampaign ?? '')),
    receipt: short(manifest.receipt ?? String(manifest.pdas?.causalReceipt ?? '')),
    vault: short(manifest.vault ?? String(manifest.pdas?.rewardVault ?? '')),
    settlementSignature: short(signature(manifest.signatures?.settleReceiptReward)),
    receiptSignature: short(signature(manifest.signatures?.recordCausalReceipt)),
    replayRejected:
      manifest.checks?.duplicateReceiptRejected === true ||
      manifest.replayChecks?.some((check) => check.rejected === true) === true,
    vaultClosed:
      manifest.checks?.vaultClosedAfterReclaim === true ||
      manifest.tokenBalances?.afterClose?.rewardVault === 'closed',
    manifestPath,
  };
}
