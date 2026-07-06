import { PublicKey } from '@solana/web3.js';
import { createHash, timingSafeEqual } from 'crypto';

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
  convictionSignal: 'conviction_signal',
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

export function deriveConvictionSignalPda(params: {
  growthCampaign: string;
  participantAuthority: string;
  signalHashHex: string;
  programId?: string;
}) {
  return pda([
    Buffer.from(SEEDS.convictionSignal),
    new PublicKey(params.growthCampaign).toBuffer(),
    new PublicKey(params.participantAuthority).toBuffer(),
    bytes32(params.signalHashHex, 'signalHashHex'),
  ], params.programId);
}

export function buildConvictionSignalHash(params: {
  marketSlug: string;
  question: string;
  choice: 'repair_likely' | 'repair_delayed' | 'abstain';
  participantCommitmentHex: string;
}) {
  return createHash('sha256')
    .update(params.marketSlug)
    .update(':')
    .update(params.question)
    .update(':')
    .update(params.choice)
    .update(':')
    .update(params.participantCommitmentHex)
    .digest('hex');
}

function u16Le(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0 || value > 65_535) {
    throw new Error(`${label} must fit in u16.`);
  }
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value, 0);
  return buffer;
}

function anchorDiscriminator(name: string) {
  return createHash('sha256').update(`global:${name}`).digest().subarray(0, 8);
}

export function buildCommitConvictionSignalInstructionData(params: {
  signalHashHex: string;
  participantCommitmentHex: string;
  choice: 'repair_likely' | 'repair_delayed' | 'abstain';
  creditsCommitted: number;
  confidenceBps: number;
}) {
  const choiceIndex = params.choice === 'repair_delayed' ? 1 : params.choice === 'abstain' ? 2 : 0;
  return Buffer.concat([
    anchorDiscriminator('commit_conviction_signal'),
    bytes32(params.signalHashHex, 'signalHashHex'),
    bytes32(params.participantCommitmentHex, 'participantCommitmentHex'),
    Buffer.from([choiceIndex]),
    u16Le(params.creditsCommitted, 'creditsCommitted'),
    u16Le(params.confidenceBps, 'confidenceBps'),
  ]);
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

export function buildBeneficiaryIntentManifestHash(params: {
  receiptIdHashHex: string;
  referrerBeneficiary: string;
  visitorBeneficiary: string;
  rewardAmount: string | number;
  rewardMint: string;
  referrerSplitBps: number;
}) {
  const payload = JSON.stringify({
    version: 2,
    receiptIdHashHex: params.receiptIdHashHex,
    referrerBeneficiary: params.referrerBeneficiary,
    visitorBeneficiary: params.visitorBeneficiary,
    rewardAmount: String(params.rewardAmount),
    rewardMint: params.rewardMint,
    referrerSplitBps: params.referrerSplitBps,
  });
  return createHash('sha256').update(payload).digest('hex');
}

function signatureBytes(value: string) {
  const normalized = value.trim();
  return /^[0-9a-fA-F]+$/.test(normalized) && normalized.length % 2 === 0
    ? Buffer.from(normalized, 'hex')
    : Buffer.from(normalized);
}

export function isValidWebhookSignature(params: { payload: string; signature: string; expectedSignature: string }) {
  const signature = signatureBytes(params.signature);
  const expected = signatureBytes(params.expectedSignature);
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
    'claim-pass-depth-exceeds-max-depth',
    'duplicate-nullifier',
    'root-parent-lineage-mismatch',
    'child-parent-receipt-hash-mismatch',
    'inflated-reward-amount',
    'inflated-split-bps',
    'wrong-reward-mint',
    'wrong-reward-vault',
    'settlement-replay',
    'paused-terminal-device',
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

export const CIVIC_WARD12_MARKET_SLUG = 'ward12-water-repair';

export type CivicSourceArtifactHashes = Record<string, string>;

export type CivicMarketArtifact = {
  type?: string;
  generatedForPhase?: string;
  slug?: string;
  sourceArtifactHashes?: CivicSourceArtifactHashes;
  sourceDataset?: {
    officialFeedIntegrated?: boolean;
    janamatIntegrated?: boolean;
  };
  marketDesign?: {
    nonWager?: boolean;
    forecastUsesRealMoney?: boolean;
    forecastTokenHasPayoutClaim?: boolean;
    forecastCredits?: {
      transferable?: boolean;
      cashValue?: string;
    };
    settlement?: {
      dependsOnForecast?: boolean;
      dependsOnReceipt?: boolean;
    };
  };
  devnetEvidence?: {
    programId?: string;
    growthCampaignPda?: string;
    receiptPda?: string;
    nullifierPda?: string;
    settlementRecord?: string;
    recordTx?: string;
    settleTx?: string;
    sourceManifestSha256?: string;
    sourceVerifierSha256?: string;
    sourceGauntletSha256?: string;
    negativePathCasesRejected?: number;
  };
};

export type CivicConvictionSignalArtifact = {
  type?: string;
  generatedForPhase?: string;
  market?: string;
  instruction?: {
    name?: string;
    account?: string;
    implementedInProgramSource?: boolean;
    deployedInCurrentDevnetProof?: boolean;
  };
  pda?: {
    seedPrefix?: string;
    growthCampaign?: string;
    participantAuthority?: string;
    signalHash?: string;
    address?: string;
    duplicatePrevention?: string;
  };
  creditPolicy?: {
    maxCreditsPerSignal?: number;
    sampleCreditsCommitted?: number;
    transferable?: boolean;
    tokenMint?: string | null;
    cashValue?: string;
  };
  settlementIndependence?: {
    dependsOnConviction?: boolean;
    dependsOnForecast?: boolean;
    dependsOnReceipt?: boolean;
  };
  sourceArtifactHashes?: CivicSourceArtifactHashes;
};

export type CivicReceiptArtifact = {
  type?: string;
  generatedForPhase?: string;
  market?: string;
  sourceArtifactHashes?: CivicSourceArtifactHashes;
  sourceManifestSha256?: string;
  receiptPda?: string;
  nullifierPda?: string;
  settlementRecord?: string;
  forecastCredits?: {
    transferable?: boolean;
    cashValue?: string;
  };
  settlement?: {
    dependsOnForecast?: boolean;
    dependsOnReceipt?: boolean;
  };
};

export type CivicLedgerArtifact = {
  type?: string;
  generatedForPhase?: string;
  market?: string;
  sourceArtifactHashes?: CivicSourceArtifactHashes;
  sourceFeedSha256?: string;
  entries?: Array<{
    id?: string;
    status?: string;
    signature?: string;
    object?: string;
  }>;
  settlement?: {
    dependsOnForecast?: boolean;
    dependsOnReceipt?: boolean;
  };
};

export type CivicVerifierArtifact = {
  type?: string;
  generatedForPhase?: string;
  market?: string;
  sourceArtifactHashes?: CivicSourceArtifactHashes;
  sourceVerifierSha256?: string;
  checks?: Array<{
    id?: string;
    status?: string;
    source?: string;
  }>;
};

export type CivicProofSidecarArtifact = {
  type?: string;
  generatedForPhase?: string;
  market?: string;
  verificationCommand?: string;
  sourceArtifactHashes?: CivicSourceArtifactHashes;
  originalArtifacts?: Array<{
    file?: string;
    sha256?: string;
    role?: string;
  }>;
  receiptBinding?: {
    receiptPda?: string;
    nullifierPda?: string;
    settlementRecord?: string;
    recordTx?: string;
    settleTx?: string;
  };
  nonWagerBoundary?: {
    forecastUsesRealMoney?: boolean;
    forecastTokenHasPayoutClaim?: boolean;
    forecastCreditsTransferable?: boolean;
    forecastCreditsCashValue?: string;
    settlementDependsOnForecast?: boolean;
    settlementDependsOnReceipt?: boolean;
  };
  compatibility?: {
    janamat?: { status?: string; artifact?: string };
    zkIdentity?: { status?: string; artifact?: string };
  };
};

export type CivicReceiptVerificationArtifacts = {
  market: CivicMarketArtifact;
  receipt: CivicReceiptArtifact;
  ledger: CivicLedgerArtifact;
  verifier: CivicVerifierArtifact;
  sidecar: CivicProofSidecarArtifact;
  conviction?: CivicConvictionSignalArtifact;
};

export type CivicReceiptVerificationResult = {
  ok: boolean;
  checks: Record<string, boolean>;
  failures: string[];
};

function civicUrl(baseUrl: string, path: string) {
  return new URL(path, baseUrl).toString();
}

async function fetchCivicJson<T>(baseUrl: string, path: string, fetcher: typeof fetch = fetch): Promise<T> {
  const response = await fetcher(civicUrl(baseUrl, path));
  if (!response.ok) throw new Error(`Civic artifact fetch failed for ${path}: ${response.status}`);
  return response.json() as Promise<T>;
}

export async function fetchCivicMarketArtifact(
  baseUrl: string,
  slug = CIVIC_WARD12_MARKET_SLUG,
  fetcher: typeof fetch = fetch,
): Promise<CivicMarketArtifact> {
  return fetchCivicJson(baseUrl, `/proofs/civic-market-${encodeURIComponent(slug)}.json`, fetcher);
}

export async function fetchCivicReceiptArtifact(
  baseUrl: string,
  fetcher: typeof fetch = fetch,
): Promise<CivicReceiptArtifact> {
  return fetchCivicJson(baseUrl, '/proofs/civic-receipt-latest.json', fetcher);
}

export async function fetchCivicLedgerArtifact(
  baseUrl: string,
  fetcher: typeof fetch = fetch,
): Promise<CivicLedgerArtifact> {
  return fetchCivicJson(baseUrl, '/proofs/civic-ledger.json', fetcher);
}

export async function fetchCivicVerifierArtifact(
  baseUrl: string,
  fetcher: typeof fetch = fetch,
): Promise<CivicVerifierArtifact> {
  return fetchCivicJson(baseUrl, '/proofs/civic-verifier.json', fetcher);
}

export async function fetchCivicProofSidecar(
  baseUrl: string,
  fetcher: typeof fetch = fetch,
): Promise<CivicProofSidecarArtifact> {
  return fetchCivicJson(baseUrl, '/proofs/civic-proof-sidecar.json', fetcher);
}

export async function fetchCivicConvictionSignalArtifact(
  baseUrl: string,
  fetcher: typeof fetch = fetch,
): Promise<CivicConvictionSignalArtifact> {
  return fetchCivicJson(baseUrl, '/proofs/civic-conviction-signal.json', fetcher);
}

export async function fetchCivicReceiptVerificationBundle(
  baseUrl: string,
  fetcher: typeof fetch = fetch,
): Promise<CivicReceiptVerificationArtifacts> {
  const [market, receipt, ledger, verifier, sidecar, conviction] = await Promise.all([
    fetchCivicMarketArtifact(baseUrl, CIVIC_WARD12_MARKET_SLUG, fetcher),
    fetchCivicReceiptArtifact(baseUrl, fetcher),
    fetchCivicLedgerArtifact(baseUrl, fetcher),
    fetchCivicVerifierArtifact(baseUrl, fetcher),
    fetchCivicProofSidecar(baseUrl, fetcher),
    fetchCivicConvictionSignalArtifact(baseUrl, fetcher),
  ]);
  return { market, receipt, ledger, verifier, sidecar, conviction };
}

export function verifyCivicReceiptArtifacts(artifacts: CivicReceiptVerificationArtifacts): CivicReceiptVerificationResult {
  const checks: Record<string, boolean> = {
    marketSlug: artifacts.market.slug === CIVIC_WARD12_MARKET_SLUG,
    marketPhase3: artifacts.market.generatedForPhase === 'phase-3',
    receiptPhase3: artifacts.receipt.generatedForPhase === 'phase-3',
    sidecarPhase3: artifacts.sidecar.generatedForPhase === 'phase-3',
    receiptMarketMatch: artifacts.receipt.market === artifacts.market.slug,
    sidecarMarketMatch: artifacts.sidecar.market === artifacts.market.slug,
    nonWager: artifacts.market.marketDesign?.nonWager === true,
    forecastNoRealMoney: artifacts.market.marketDesign?.forecastUsesRealMoney === false,
    forecastNoPayoutClaim: artifacts.market.marketDesign?.forecastTokenHasPayoutClaim === false,
    forecastCreditsNonTransferable: artifacts.market.marketDesign?.forecastCredits?.transferable === false,
    forecastCreditsNoCashValue: artifacts.market.marketDesign?.forecastCredits?.cashValue === '0',
    settlementNotForecastDependent: artifacts.market.marketDesign?.settlement?.dependsOnForecast === false,
    settlementReceiptDependent: artifacts.market.marketDesign?.settlement?.dependsOnReceipt === true,
    receiptPdaBound: artifacts.receipt.receiptPda === artifacts.market.devnetEvidence?.receiptPda &&
      artifacts.receipt.receiptPda === artifacts.sidecar.receiptBinding?.receiptPda,
    nullifierBound: artifacts.receipt.nullifierPda === artifacts.market.devnetEvidence?.nullifierPda &&
      artifacts.receipt.nullifierPda === artifacts.sidecar.receiptBinding?.nullifierPda,
    settlementBound: artifacts.receipt.settlementRecord === artifacts.market.devnetEvidence?.settlementRecord &&
      artifacts.receipt.settlementRecord === artifacts.sidecar.receiptBinding?.settlementRecord,
    recordTxBound: artifacts.market.devnetEvidence?.recordTx === artifacts.sidecar.receiptBinding?.recordTx,
    settleTxBound: artifacts.market.devnetEvidence?.settleTx === artifacts.sidecar.receiptBinding?.settleTx,
    ledgerHasReceipt: artifacts.ledger.entries?.some((entry) => entry.id === 'receipt-recorded' && entry.status === 'verified_devnet') === true,
    ledgerHasSettlement: artifacts.ledger.entries?.some((entry) => entry.id === 'reward-settled' && entry.status === 'verified_devnet') === true,
    janamatSpecifiedNotIntegrated: artifacts.sidecar.compatibility?.janamat?.status === 'specified_not_integrated',
    zkIdentitySpecifiedNotIntegrated: artifacts.sidecar.compatibility?.zkIdentity?.status === 'specified_not_integrated',
    officialFeedNotIntegrated: artifacts.market.sourceDataset?.officialFeedIntegrated === false,
    janamatNotIntegrated: artifacts.market.sourceDataset?.janamatIntegrated === false,
    independentVerifierPublished: artifacts.sidecar.verificationCommand === 'npm run civic:verify-receipt',
    sdkWrapperPublished: artifacts.verifier.checks?.some((check) => check.id === 'sdk-civic-wrappers' && check.status === 'pass') === true,
  };

  if (artifacts.conviction) {
    checks.convictionPhase5 = artifacts.conviction.generatedForPhase === 'phase-5';
    checks.convictionInstruction = artifacts.conviction.instruction?.name === 'commit_conviction_signal' &&
      artifacts.conviction.instruction?.account === 'ConvictionSignal';
    checks.convictionDuplicatePda = artifacts.conviction.pda?.seedPrefix === SEEDS.convictionSignal &&
      typeof artifacts.conviction.pda?.address === 'string';
    checks.convictionCreditCap = artifacts.conviction.creditPolicy?.maxCreditsPerSignal === 100 &&
      typeof artifacts.conviction.creditPolicy?.sampleCreditsCommitted === 'number' &&
      artifacts.conviction.creditPolicy.sampleCreditsCommitted <= 100;
    checks.convictionNoTransferPath = artifacts.conviction.creditPolicy?.transferable === false &&
      artifacts.conviction.creditPolicy?.tokenMint === null &&
      artifacts.conviction.creditPolicy?.cashValue === '0';
    checks.convictionSettlementIndependent = artifacts.conviction.settlementIndependence?.dependsOnConviction === false &&
      artifacts.conviction.settlementIndependence?.dependsOnForecast === false &&
      artifacts.conviction.settlementIndependence?.dependsOnReceipt === true;
  }

  const expectedHashes = artifacts.sidecar.sourceArtifactHashes ?? {};
  for (const artifact of [artifacts.market, artifacts.receipt, artifacts.ledger, artifacts.verifier]) {
    for (const [file, hash] of Object.entries(expectedHashes)) {
      checks[`${artifact.type ?? 'artifact'}:${file}:hashBound`] = artifact.sourceArtifactHashes?.[file] === hash;
    }
  }

  const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([key]) => key);
  return { ok: failures.length === 0, checks, failures };
}

export async function verifyCivicReceiptFromBaseUrl(
  baseUrl: string,
  fetcher: typeof fetch = fetch,
): Promise<CivicReceiptVerificationResult> {
  return verifyCivicReceiptArtifacts(await fetchCivicReceiptVerificationBundle(baseUrl, fetcher));
}

export function hashCivicSourceArtifact(content: string | Buffer | Uint8Array): string {
  return createHash('sha256').update(content).digest('hex');
}

export function buildCivicReceiptVerificationCommand(options: {
  receipt?: string;
  proofDir?: string;
} = {}) {
  const args = ['node scripts/verify-civic-receipt.mjs'];
  if (options.receipt) args.push(`--receipt ${options.receipt}`);
  if (options.proofDir) args.push(`--proof-dir ${options.proofDir}`);
  return args.join(' ');
}
