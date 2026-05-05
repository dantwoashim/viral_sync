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
  terminalDevice: 'terminal_device',
  claimPass: 'claim_pass',
} as const;

const ZERO_HASH = '0'.repeat(64);

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

type AgentReceiptContext = {
  receipt?: {
    id?: string;
    pda?: string;
    merchantName?: string;
    programId?: string;
    status?: string;
  };
  verifier?: {
    flags?: Record<string, boolean>;
  };
  lineage?: {
    childLineageProof?: {
      parentReceipt?: string;
      childReceipt?: string;
      childClaimPass?: string;
    } | null;
  };
};

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
  const response = await fetcher(new URL('/api/agent/receipt/latest', baseUrl));
  if (!response.ok) {
    throw new Error(`Receipt graph fetch failed: ${response.status}`);
  }
  const context = await response.json() as AgentReceiptContext;
  const receipt = context.receipt ?? {};
  const nodes: CausalGraphPayload['nodes'] = [];
  const edges: CausalGraphPayload['edges'] = [];

  if (receipt.programId) nodes.push({ id: receipt.programId, label: 'Viral Sync program', kind: 'program' });
  if (receipt.merchantName) nodes.push({ id: `merchant:${receipt.merchantName}`, label: receipt.merchantName, kind: 'merchant' });
  if (receipt.pda) nodes.push({ id: receipt.pda, label: receipt.id ?? 'Verified receipt', kind: 'receipt' });

  if (receipt.programId && receipt.pda) edges.push({ source: receipt.programId, target: receipt.pda, label: 'settles' });
  if (receipt.merchantName && receipt.pda) edges.push({ source: `merchant:${receipt.merchantName}`, target: receipt.pda, label: 'issued' });

  const child = context.lineage?.childLineageProof;
  if (child?.parentReceipt && child.childReceipt) {
    nodes.push({ id: child.parentReceipt, label: 'Parent receipt', kind: 'receipt' });
    nodes.push({ id: child.childReceipt, label: 'Child receipt', kind: 'receipt' });
    edges.push({ source: child.parentReceipt, target: child.childReceipt, label: 'refers' });
  }

  for (const [flag, ok] of Object.entries(context.verifier?.flags ?? {})) {
    const id = `check:${flag}`;
    nodes.push({ id, label: `${flag}: ${ok ? 'passed' : 'pending'}`, kind: 'check' });
    if (receipt.pda) edges.push({ source: receipt.pda, target: id, label: 'verified by' });
  }

  return { nodes, edges };
}

export async function fetchCausalGraph(baseUrl: string, fetcher: typeof fetch = fetch): Promise<CausalGraphPayload> {
  return fetchGraph(baseUrl, fetcher);
}

export function buildInviteAction(baseUrl: string, token: string): InviteAction {
  return {
    label: 'Claim Viral Sync offer',
    href: new URL(`/claim/${encodeURIComponent(token)}`, baseUrl).toString(),
    type: 'post',
  };
}

export function buildClaimAction(baseUrl: string, token: string): ClaimAction {
  return {
    label: 'Claim Causal Commerce reward',
    href: new URL(`/claim/${encodeURIComponent(token)}`, baseUrl).toString(),
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

export function deriveTerminalDevicePda(params: {
  merchantConfig: string;
  terminalAuthority: string;
  programId?: string;
}) {
  return pda([
    Buffer.from(SEEDS.terminalDevice),
    new PublicKey(params.merchantConfig).toBuffer(),
    new PublicKey(params.terminalAuthority).toBuffer(),
  ], params.programId);
}

export function deriveClaimPassPda(params: {
  growthCampaign: string;
  visitorAuthority: string;
  claimHashHex: string;
  programId?: string;
}) {
  return pda([
    Buffer.from(SEEDS.claimPass),
    new PublicKey(params.growthCampaign).toBuffer(),
    new PublicKey(params.visitorAuthority).toBuffer(),
    bytes32(params.claimHashHex, 'claimHashHex'),
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

export function deriveNullifierPda(params: {
  growthCampaign: string;
  nullifierHashHex: string;
  programId?: string;
}) {
  return pda([
    Buffer.from(SEEDS.nullifier),
    new PublicKey(params.growthCampaign).toBuffer(),
    bytes32(params.nullifierHashHex, 'nullifierHashHex'),
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

export type Poc1ReceiptArtifact = {
  version?: string;
  network?: 'solana' | string;
  cluster?: string;
  programId?: string;
  campaign?: string;
  merchant?: string;
  terminalDevice?: string;
  terminalAuthority?: string;
  visitorAuthority?: string;
  claimPass?: string;
  receipt?: string;
  nullifier?: string;
  settlement?: string;
  intentManifestHash?: string;
  visitAttestationHash?: string;
  lineageProofHash?: string;
  rewardMint?: string;
  rewardAmount?: string;
  proofLevel?: string;
  settlementVerified?: boolean;
  nullifierVerified?: boolean;
  terminalVerified?: boolean;
  visitorVerified?: boolean;
  lineageVerified?: boolean;
};

export type Poc1Verification = {
  ok: boolean;
  checks: Record<string, boolean>;
  failures: string[];
};

function hasValue(value: unknown) {
  return typeof value === 'string' && value.length > 0;
}

export function verifyPoc1ReceiptArtifact(receipt: Poc1ReceiptArtifact): Poc1Verification {
  const checks = {
    versionPresent: receipt.version === 'POC-1' || receipt.version === undefined,
    networkSolana: receipt.network === 'solana' || receipt.network === undefined,
    programPresent: hasValue(receipt.programId),
    campaignPresent: hasValue(receipt.campaign),
    terminalPresent: hasValue(receipt.terminalDevice) && hasValue(receipt.terminalAuthority),
    visitorPresent: hasValue(receipt.visitorAuthority),
    claimPassPresent: hasValue(receipt.claimPass),
    receiptPresent: hasValue(receipt.receipt),
    nullifierPresent: hasValue(receipt.nullifier),
    settlementPresent: hasValue(receipt.settlement),
    intentManifestPresent: hasValue(receipt.intentManifestHash) && receipt.intentManifestHash !== ZERO_HASH,
    visitAttestationPresent: hasValue(receipt.visitAttestationHash) && receipt.visitAttestationHash !== ZERO_HASH,
    lineagePresent: hasValue(receipt.lineageProofHash) && receipt.lineageProofHash !== ZERO_HASH,
    rewardPresent: hasValue(receipt.rewardMint) && hasValue(receipt.rewardAmount),
    proofLevelSupported: receipt.proofLevel === 'merchant_terminal_visitor_signed' || receipt.proofLevel === 'counter_attested',
    terminalVerified: receipt.terminalVerified === true,
    visitorVerified: receipt.visitorVerified === true,
    lineageVerified: receipt.lineageVerified === true,
    settlementVerified: receipt.settlementVerified === true,
    nullifierVerified: receipt.nullifierVerified === true,
  };
  const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([key]) => key);
  return { ok: failures.length === 0, checks, failures };
}

export type FraudGauntletCase = {
  id: string;
  observed?: string;
  expected?: string;
  expectedErrorMatched?: boolean;
  accountsMutationVerified?: boolean;
  accountsMutated?: boolean;
  proofSource?: string;
};

export type FraudGauntletArtifact = {
  cases?: FraudGauntletCase[];
};

export function verifyFraudGauntlet(gauntlet: FraudGauntletArtifact): Poc1Verification {
  const required = [
    'merchant-only-receipt',
    'wrong-terminal-signer',
    'different-merchant-terminal',
    'terminal-account-signer-mismatch',
    'visitor-signer-mismatch',
    'visitor-beneficiary-mismatch',
    'claim-pass-reused',
    'claim-pass-campaign-mismatch',
    'claim-pass-depth-exceeded',
    'duplicate-nullifier',
    'inflated-reward-amount',
    'inflated-split-bps',
    'wrong-reward-mint',
    'wrong-reward-vault',
    'settlement-replay',
    'paused-or-expired-campaign',
  ];
  const cases = gauntlet.cases ?? [];
  const byId = new Map(cases.map((item) => [item.id, item]));
  const checks: Record<string, boolean> = {};

  for (const id of required) {
    const item = byId.get(id);
    checks[`${id}:present`] = Boolean(item);
    checks[`${id}:rejected`] = item?.observed === 'rejected' && item?.expected === 'rejected';
    checks[`${id}:errorMatched`] = item?.expectedErrorMatched === true;
    checks[`${id}:mutationChecked`] = item?.accountsMutationVerified === true && item?.accountsMutated === false;
    checks[`${id}:notMock`] = item?.proofSource !== 'mock_final_fixture';
  }

  const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([key]) => key);
  return { ok: failures.length === 0, checks, failures };
}
