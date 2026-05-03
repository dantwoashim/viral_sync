import { PublicKey } from '@solana/web3.js';
import { timingSafeEqual } from 'crypto';

export type ReceiptVerificationStatus = 'verified' | 'pending' | 'failed' | 'not_found';

export const VIRAL_SYNC_PROGRAM_ID = 'AeKT1B58Qi9rBtrtnMe11o4eXbVwHweKxGFNS5X3Vv46';
export const SEEDS = {
  merchantConfig: 'causal_merchant',
  growthCampaign: 'growth_campaign',
  rewardEscrow: 'reward_escrow',
  receipt: 'causal_receipt',
  nullifier: 'campaign_nullifier',
  settlement: 'settlement',
} as const;

export interface ReceiptVerification {
  ok: boolean;
  status: ReceiptVerificationStatus;
  receiptId: string;
  receiptPda?: string;
  settlementStatus?: string;
  txSignature?: string;
  compressedProof?: {
    root: string;
    leaf: string;
    leafIndex: number;
    treeId: string;
    siblings: string[];
  };
  reason?: string;
}

export interface CausalGraphPayload {
  nodes: Array<{ id: string; label: string; kind: string; privateLabel?: boolean }>;
  edges: Array<{ source: string; target: string; label: string }>;
}

export interface InviteAction {
  label: string;
  href: string;
  type: 'post';
}

export interface ClaimAction {
  label: string;
  href: string;
  type: 'transaction' | 'post';
}

export function verifyReceipt(payload: ReceiptVerification): boolean {
  return payload.ok &&
    payload.status === 'verified' &&
    Boolean(payload.receiptPda) &&
    Boolean(payload.txSignature) &&
    payload.settlementStatus === 'settled';
}

export async function fetchGraph(baseUrl: string, fetcher: typeof fetch = fetch): Promise<CausalGraphPayload> {
  const response = await fetcher(new URL('/api/launch/causal-graph', baseUrl));
  if (!response.ok) {
    throw new Error(`Graph fetch failed: ${response.status}`);
  }
  return response.json() as Promise<CausalGraphPayload>;
}

export async function fetchCausalGraph(baseUrl: string, fetcher: typeof fetch = fetch): Promise<CausalGraphPayload> {
  return fetchGraph(baseUrl, fetcher);
}

export function buildInviteAction(baseUrl: string, token: string): InviteAction {
  return {
    label: 'Claim Viral Sync offer',
    href: new URL(`/offer/${encodeURIComponent(token)}`, baseUrl).toString(),
    type: 'post',
  };
}

export function buildClaimAction(baseUrl: string, token: string): ClaimAction {
  return {
    label: 'Claim Causal Commerce reward',
    href: new URL(`/offer/${encodeURIComponent(token)}/claim`, baseUrl).toString(),
    type: 'post',
  };
}

function bytes32(hex: string, label: string) {
  const normalized = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (!/^[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error(`${label} must be a 32-byte hex string.`);
  }
  return Buffer.from(normalized, 'hex');
}

function pda(seeds: Buffer[], programId = VIRAL_SYNC_PROGRAM_ID) {
  const [address, bump] = PublicKey.findProgramAddressSync(
    seeds,
    new PublicKey(programId),
  );
  return { address: address.toBase58(), bump };
}

export function deriveMerchantConfigPda(params: {
  merchantAuthority: string;
  orgIdHashHex: string;
  programId?: string;
}) {
  return pda([
    Buffer.from(SEEDS.merchantConfig),
    new PublicKey(params.merchantAuthority).toBuffer(),
    bytes32(params.orgIdHashHex, 'orgIdHashHex'),
  ], params.programId);
}

export function deriveGrowthCampaignPda(params: {
  merchantConfig: string;
  campaignIdHashHex: string;
  programId?: string;
}) {
  return pda([
    Buffer.from(SEEDS.growthCampaign),
    new PublicKey(params.merchantConfig).toBuffer(),
    bytes32(params.campaignIdHashHex, 'campaignIdHashHex'),
  ], params.programId);
}

export function deriveRewardEscrowPda(params: {
  growthCampaign: string;
  rewardMint: string;
  programId?: string;
}) {
  return pda([
    Buffer.from(SEEDS.rewardEscrow),
    new PublicKey(params.growthCampaign).toBuffer(),
    new PublicKey(params.rewardMint).toBuffer(),
  ], params.programId);
}

export function deriveReceiptPda(params: {
  growthCampaign: string;
  receiptIdHashHex: string;
  programId?: string;
}) {
  return pda([
    Buffer.from(SEEDS.receipt),
    new PublicKey(params.growthCampaign).toBuffer(),
    bytes32(params.receiptIdHashHex, 'receiptIdHashHex'),
  ], params.programId);
}

export function deriveSettlementPda(params: {
  receiptPda: string;
  programId?: string;
}) {
  return pda([
    Buffer.from(SEEDS.settlement),
    new PublicKey(params.receiptPda).toBuffer(),
  ], params.programId);
}

export function deriveReceiptSeed(campaignId: string, receiptIdHash: string) {
  return ['causal_receipt', campaignId, receiptIdHash] as const;
}

export function deriveCampaignPdaSeed(merchantConfig: string, campaignIdHash: string) {
  return ['growth_campaign', merchantConfig, campaignIdHash] as const;
}

export function deriveNullifierSeed(campaign: string, nullifierHash: string) {
  return ['campaign_nullifier', campaign, nullifierHash] as const;
}

export function isValidWebhookSignature(params: { payload: string; signature: string; expectedSignature: string }) {
  const signature = Buffer.from(params.signature);
  const expected = Buffer.from(params.expectedSignature);
  return signature.length > 0 && signature.length === expected.length && timingSafeEqual(signature, expected);
}
