import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { getProofState, gauntletLabel } from '../proof/getProofState';
import { signatureValue } from '../proof/links';
import { loadProofSidecar } from '../proof/loadArtifacts';
import type { ProductLoopCampaign, ProductLoopCheck, TerminalConfirmation, VisitPassPacket } from './types';

type OrderbookCampaign = {
  slug?: string;
  title?: string;
  merchantAlias?: string;
  category?: string;
  status?: string;
  proofBacked?: boolean;
  publicPath?: string;
  proofLevel?: string;
  attestationModel?: string;
  bounty?: {
    rewardUnits?: string;
    maxRedemptions?: number;
    settledUnits?: string;
    vaultRemainingUnits?: string;
  };
  verification?: Record<string, boolean>;
};

type Orderbook = { campaigns?: OrderbookCampaign[] };
type PassMode = 'demo_replay' | 'pilot_server_issued' | 'on_chain_claim_pass';
type StoredPass = {
  passId: string;
  nonce: string;
  slug: string;
  token: string;
  passCode: string;
  passMac: string;
  expiresAt: number;
  campaignSlug: string;
  terminalDevicePda: string;
  merchantAlias: string;
  consumed: boolean;
  mode: PassMode;
};

const DEFAULT_PASS_TTL_MS = 15 * 60_000;
const passStore = new Map<string, StoredPass>();

function loadOrderbook(): Orderbook {
  return loadProofSidecar<Orderbook>('conversion-orderbook.json', { campaigns: [] });
}

function formatUnits(raw: unknown, symbol = 'devnet units', decimals = 0) {
  if (raw == null || raw === 'future') return 'Pending';
  const value = Number(raw);
  if (!Number.isFinite(value)) return 'Pending';
  return `${(value / 10 ** decimals).toFixed(2)} ${symbol}`;
}

function hashText(value: string, length = 12) {
  return createHash('sha256').update(value).digest('hex').slice(0, length);
}

function humanCode(value: string) {
  const raw = hashText(value, 8).toUpperCase();
  return `VS-${raw.slice(0, 4)}-${raw.slice(4)}`;
}

function allowDemoPassFallback() {
  return process.env.NODE_ENV !== 'production' || process.env.VIRAL_SYNC_ALLOW_DEMO_PASS_FALLBACK === 'true';
}

function passSigningKey() {
  const configured = process.env.PRODUCT_LOOP_PASS_SECRET;
  if (configured && configured.length >= 32) return configured;
  if (!allowDemoPassFallback()) {
    throw new Error('PRODUCT_LOOP_PASS_SECRET is required for production pass signing.');
  }
  // Demo-only fallback: this keeps the devnet proof replay usable without presenting public artifact data as a production secret.
  const proof = getProofState();
  return [
    proof.manifest.programSourceHash,
    proof.manifest.pdas?.causalReceipt,
    proof.manifest.hashes?.receiptIdHash,
  ].filter(Boolean).join(':') || 'viral-sync-development-pass-key';
}

function passMac(passSeed: string) {
  return createHmac('sha256', passSigningKey()).update(passSeed).digest('hex');
}

function constantTimeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function randomNonce(seed: string) {
  return createHash('sha256')
    .update(seed)
    .update(':')
    .update(Date.now().toString())
    .update(':')
    .update(randomBytes(32))
    .digest('hex')
    .slice(0, 24);
}

function passTtlMs() {
  const configured = Number(process.env.PRODUCT_LOOP_PASS_TTL_MS ?? DEFAULT_PASS_TTL_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_PASS_TTL_MS;
}

function expiresAtIso(now = Date.now()) {
  return new Date(now + passTtlMs()).toISOString();
}

function storePass(pass: StoredPass) {
  passStore.set(pass.passId, pass);
}

function findStoredPass(passId: string | undefined, slug: string, token: string) {
  if (passId && passStore.has(passId)) return passStore.get(passId) ?? null;
  for (const pass of passStore.values()) {
    if (pass.slug === slug && pass.token === token && !pass.consumed) return pass;
  }
  return null;
}

export function resetProductLoopPassStoreForTests() {
  passStore.clear();
}

export function productLoopCampaigns(): ProductLoopCampaign[] {
  const proof = getProofState();
  const manifest = proof.manifest;
  const verifier = proof.verifier;
  const orderbook = loadOrderbook();
  const symbol = manifest.rewardMintSymbol ?? 'devnet units';
  const decimals = manifest.rewardMintDecimals ?? 0;
  const settlement = verifier.settlementRecord ?? {};
  const proofBackedSlug = orderbook.campaigns?.find((item) => item.proofBacked)?.slug;

  return (orderbook.campaigns ?? []).map((campaign) => {
    const proofBacked = campaign.proofBacked === true;
    const slug = campaign.slug ?? 'campaign';
    const receiptPath = proofBacked ? `/receipt/${encodeURIComponent(proof.receiptId)}` : '/receipt/latest';
    const rewardUnits = proofBacked ? manifest.inputs?.rewardPerVisit : campaign.bounty?.rewardUnits;
    const remaining = proofBacked
      ? ((manifest as { tokenBalances?: { afterSettlement?: { rewardVault?: string } } }).tokenBalances?.afterSettlement?.rewardVault ?? campaign.bounty?.vaultRemainingUnits)
      : campaign.bounty?.vaultRemainingUnits;

    return {
      slug,
      title: campaign.title ?? 'Proof-backed conversion campaign',
      merchantAlias: campaign.merchantAlias ?? proof.merchantName,
      category: campaign.category ?? 'conversion',
      status: campaign.status ?? (proofBacked ? proof.health : 'vision_only'),
      proofBacked,
      proofLevel: campaign.proofLevel ?? proof.proofLevel,
      attestationModel: campaign.attestationModel ?? proof.attestationModel,
      rewardLabel: formatUnits(rewardUnits, symbol, decimals),
      visitorRewardLabel: formatUnits(settlement.visitorAmount ?? rewardUnits, symbol, decimals),
      routerRewardLabel: formatUnits(settlement.referrerAmount ?? rewardUnits, symbol, decimals),
      protocolFeeLabel: formatUnits(settlement.protocolFee, symbol, decimals),
      rewardPoolRemainingLabel: formatUnits(remaining, symbol, decimals),
      maxRedemptions: campaign.bounty?.maxRedemptions ?? manifest.inputs?.maxRedemptions ?? null,
      settledCount: Number((manifest.accounts?.growthCampaign as { totalRecorded?: number } | undefined)?.totalRecorded ?? (proofBacked ? 1 : 0)),
      publicPath: campaign.publicPath ?? `/campaign/${slug}`,
      claimPath: `/claim/${encodeURIComponent(slug)}`,
      receiptPath,
      proofPath: '/proof',
      actionApiPath: `/api/actions/campaign/${encodeURIComponent(slug)}`,
      receiptPda: String(manifest.pdas?.causalReceipt ?? ''),
      claimPassPda: String(manifest.pdas?.claimPass ?? ''),
      terminalDevicePda: String(manifest.pdas?.terminalDevice ?? ''),
      recordTx: signatureValue(manifest.signatures?.recordCausalReceipt),
      settleTx: signatureValue(manifest.signatures?.settleReceiptReward),
      expiresAt: manifest.intentManifest?.expiresAt ?? null,
    };
  }).sort((a, b) => Number(b.slug === proofBackedSlug) - Number(a.slug === proofBackedSlug));
}

export function findProductLoopCampaign(slug: string) {
  return productLoopCampaigns().find((campaign) => campaign.slug === slug);
}

export function defaultProductLoopCampaign() {
  return productLoopCampaigns().find((campaign) => campaign.proofBacked) ?? productLoopCampaigns()[0] ?? null;
}

function proofChecks(campaign: ProductLoopCampaign): ProductLoopCheck[] {
  const proof = getProofState();
  return [
    {
      label: 'Campaign is proof-backed',
      ok: campaign.proofBacked,
      source: 'proof_manifest',
      detail: campaign.proofBacked ? 'Campaign points to the current POC-1 receipt artifact.' : 'Campaign is a vision lane, not a final proof lane.',
    },
    {
      label: 'Terminal enrolled',
      ok: proof.verifier.terminalVerified === true,
      source: 'verifier_artifact',
      detail: campaign.terminalDevicePda || 'Terminal PDA missing.',
    },
    {
      label: 'Visitor wallet signed',
      ok: proof.verifier.visitorVerified === true,
      source: 'verifier_artifact',
      detail: String(proof.manifest.pdas?.visitorAuthority ?? proof.manifest.intentManifest?.visitorAuthority ?? 'visitor authority verified by artifact'),
    },
    {
      label: 'Replay blocked',
      ok: proof.verifier.nullifierVerified === true,
      source: 'verifier_artifact',
      detail: `Nullifier ${proof.manifest.pdas?.nullifierRecord ?? 'missing'} recorded.`,
    },
    {
      label: 'Negative-path suite passed',
      ok: proof.health === 'verified',
      source: 'fraud_gauntlet',
      detail: `${gauntletLabel(proof.gauntlet)} invalid flows rejected with strict error matching.`,
    },
  ];
}

export function createVisitPassPacket(slug: string, token = slug): VisitPassPacket | null {
  const campaign = findProductLoopCampaign(slug);
  if (!campaign || !campaign.proofBacked) return null;
  const nonce = randomNonce(`${campaign.slug}:${token}:${campaign.claimPassPda}:${campaign.receiptPda}`);
  const expiresAt = expiresAtIso();
  const mode: PassMode = process.env.VIRAL_SYNC_PILOT_PASS_MODE === 'true' ? 'pilot_server_issued' : 'demo_replay';
  const passSeed = `${campaign.slug}:${token}:${campaign.claimPassPda}:${campaign.receiptPda}:${campaign.terminalDevicePda}:${nonce}:${expiresAt}`;
  const passCode = humanCode(passSeed);
  const mac = passMac(passSeed);
  const passId = `pass_${hashText(passSeed, 18)}`;
  const qrPayload = JSON.stringify({
    type: 'viral_sync_visit_pass',
    version: 1,
    campaign: campaign.slug,
    token,
    passId,
    nonce,
    passCode,
    passMac: mac,
    terminalDevicePda: campaign.terminalDevicePda,
    merchantAlias: campaign.merchantAlias,
    claimPassPda: campaign.claimPassPda,
    receiptPda: campaign.receiptPda,
    expiresAt,
  });
  storePass({
    passId,
    nonce,
    slug: campaign.slug,
    token,
    passCode,
    passMac: mac,
    expiresAt: new Date(expiresAt).getTime(),
    campaignSlug: campaign.slug,
    terminalDevicePda: campaign.terminalDevicePda,
    merchantAlias: campaign.merchantAlias,
    consumed: false,
    mode,
  });

  return {
    ok: true,
    type: 'viral_sync_visit_pass',
    status: 'issued',
    campaign,
    token,
    passId,
    nonce,
    mode,
    passCode,
    passMac: mac,
    qrPayload,
    issuedAt: new Date().toISOString(),
    expiresAt,
    checks: proofChecks(campaign),
  };
}

export function expectedPassCodeForCampaign(slug: string) {
  const pass = createVisitPassPacket(slug, slug);
  return pass?.passCode ?? '';
}

export function confirmVisitPass(input: { slug?: string; passCode?: string; passMac?: string; token?: string; passId?: string; nonce?: string; terminalDevicePda?: string; merchantAlias?: string; nowMs?: number }): TerminalConfirmation {
  const campaign = input.slug ? findProductLoopCampaign(input.slug) : defaultProductLoopCampaign();
  const emptyCampaign = campaign ?? {
    slug: 'missing',
    title: 'Unknown campaign',
    merchantAlias: 'Unknown merchant',
    category: 'unknown',
    status: 'missing',
    proofBacked: false,
    proofLevel: 'missing',
    attestationModel: 'missing',
    rewardLabel: 'Pending',
    visitorRewardLabel: 'Pending',
    routerRewardLabel: 'Pending',
    protocolFeeLabel: 'Pending',
    rewardPoolRemainingLabel: 'Pending',
    maxRedemptions: null,
    settledCount: 0,
    publicPath: '/campaign/missing',
    claimPath: '/claim/missing',
    receiptPath: '/receipt/latest',
    proofPath: '/proof',
    actionApiPath: '/api/actions/campaign/missing',
    receiptPda: '',
    claimPassPda: '',
    terminalDevicePda: '',
    recordTx: null,
    settleTx: null,
    expiresAt: null,
  };
  const token = input.token ?? emptyCampaign.slug;
  const normalizedInput = String(input.passCode ?? '').trim().toUpperCase();
  const suppliedMac = String(input.passMac ?? '').trim().toLowerCase();
  const stored = campaign ? findStoredPass(input.passId, campaign.slug, token) : null;
  const now = input.nowMs ?? Date.now();
  const storedMac = stored?.passMac ?? '';
  const storedCode = stored?.passCode ?? '';
  const lifecycleOk = Boolean(stored) && stored?.consumed === false && now <= (stored?.expiresAt ?? 0);
  const campaignBound = Boolean(stored) && stored?.campaignSlug === emptyCampaign.slug && stored?.slug === emptyCampaign.slug;
  const nonceBound = Boolean(stored) && (!input.nonce || stored?.nonce === input.nonce);
  const terminalBound = Boolean(stored) && (!input.terminalDevicePda || stored?.terminalDevicePda === input.terminalDevicePda);
  const merchantBound = Boolean(stored) && (!input.merchantAlias || stored?.merchantAlias === input.merchantAlias);
  const checks: ProductLoopCheck[] = [
    {
      label: 'Pass is active and unused',
      ok: lifecycleOk,
      source: 'pass_lifecycle',
      detail: lifecycleOk ? 'Pass is active for this confirmation.' : 'Invalid or expired pass.',
    },
    {
      label: 'Pass is bound to campaign',
      ok: campaignBound,
      source: 'pass_lifecycle',
      detail: campaignBound ? 'Pass campaign binding matched.' : 'Invalid or expired pass.',
    },
    {
      label: 'Pass nonce matches issued packet',
      ok: nonceBound,
      source: 'pass_lifecycle',
      detail: nonceBound ? 'Pass nonce matched.' : 'Invalid or expired pass.',
    },
    {
      label: 'Pass is bound to terminal',
      ok: terminalBound,
      source: 'pass_lifecycle',
      detail: terminalBound ? 'Terminal binding matched.' : 'Invalid or expired pass.',
    },
    {
      label: 'Pass is bound to merchant',
      ok: merchantBound,
      source: 'pass_lifecycle',
      detail: merchantBound ? 'Merchant binding matched.' : 'Invalid or expired pass.',
    },
    {
      label: 'Pass code matches claim pass',
      ok: normalizedInput.length > 0 && normalizedInput === storedCode,
      source: 'terminal_request',
      detail: normalizedInput.length > 0 && normalizedInput === storedCode ? 'Pass code matched.' : 'Invalid or expired pass.',
    },
    {
      label: 'Pass packet signature matches',
      ok: suppliedMac.length > 0 && storedMac.length > 0 && constantTimeEqual(suppliedMac, storedMac),
      source: 'terminal_request',
      detail: suppliedMac.length > 0 ? 'Pass packet MAC verified by server.' : 'Pass packet MAC missing.',
    },
    ...proofChecks(emptyCampaign),
  ];
  const verified = checks.every((check) => check.ok);
  if (verified && stored) {
    stored.consumed = true;
    passStore.set(stored.passId, stored);
  }

  return {
    ok: verified,
    type: 'viral_sync_terminal_confirmation',
    status: verified ? 'verified' : 'rejected',
    reason: verified
      ? 'Terminal confirmation matched the proof-backed pass and current POC-1 artifact.'
      : 'Invalid or expired pass.',
    passCode: verified ? normalizedInput : '',
    passId: stored?.passId,
    mode: stored?.mode,
    campaign: emptyCampaign,
    receiptPath: emptyCampaign.receiptPath,
    receiptPda: emptyCampaign.receiptPda,
    recordTx: emptyCampaign.recordTx,
    settleTx: emptyCampaign.settleTx,
    checks,
  };
}
