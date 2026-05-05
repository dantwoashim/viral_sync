import { createHash, createHmac, timingSafeEqual } from 'crypto';
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

function passSigningKey() {
  const configured = process.env.PRODUCT_LOOP_PASS_SECRET;
  if (configured && configured.length >= 32) return configured;
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
      label: 'Fraud gauntlet passed',
      ok: proof.health === 'verified',
      source: 'fraud_gauntlet',
      detail: `${gauntletLabel(proof.gauntlet)} strict fraud cases blocked.`,
    },
  ];
}

export function createVisitPassPacket(slug: string, token = slug): VisitPassPacket | null {
  const campaign = findProductLoopCampaign(slug);
  if (!campaign || !campaign.proofBacked) return null;
  const passSeed = `${campaign.slug}:${token}:${campaign.claimPassPda}:${campaign.receiptPda}`;
  const passCode = humanCode(passSeed);
  const mac = passMac(passSeed);
  const passId = `pass_${hashText(passSeed, 18)}`;
  const qrPayload = JSON.stringify({
    type: 'viral_sync_visit_pass',
    version: 1,
    campaign: campaign.slug,
    token,
    passCode,
    passMac: mac,
    claimPassPda: campaign.claimPassPda,
    receiptPda: campaign.receiptPda,
  });

  return {
    ok: true,
    type: 'viral_sync_visit_pass',
    status: 'issued',
    campaign,
    token,
    passId,
    passCode,
    passMac: mac,
    qrPayload,
    issuedAt: new Date().toISOString(),
    expiresAt: campaign.expiresAt,
    checks: proofChecks(campaign),
  };
}

export function expectedPassCodeForCampaign(slug: string) {
  const pass = createVisitPassPacket(slug, slug);
  return pass?.passCode ?? '';
}

export function confirmVisitPass(input: { slug?: string; passCode?: string; passMac?: string; token?: string }): TerminalConfirmation {
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
  const pass = campaign ? createVisitPassPacket(campaign.slug, token) : null;
  const normalizedInput = String(input.passCode ?? '').trim().toUpperCase();
  const expected = pass?.passCode ?? '';
  const suppliedMac = String(input.passMac ?? '').trim().toLowerCase();
  const expectedMac = pass?.passMac ?? '';
  const checks: ProductLoopCheck[] = [
    {
      label: 'Pass code matches claim pass',
      ok: normalizedInput.length > 0 && normalizedInput === expected,
      source: 'terminal_request',
      detail: expected ? `Expected ${expected}` : 'No proof-backed campaign is available.',
    },
    {
      label: 'Pass packet signature matches',
      ok: suppliedMac.length > 0 && expectedMac.length > 0 && constantTimeEqual(suppliedMac, expectedMac),
      source: 'terminal_request',
      detail: suppliedMac.length > 0 ? 'Pass packet MAC verified by server.' : 'Pass packet MAC missing.',
    },
    ...proofChecks(emptyCampaign),
  ];
  const verified = checks.every((check) => check.ok);

  return {
    ok: verified,
    type: 'viral_sync_terminal_confirmation',
    status: verified ? 'verified' : 'rejected',
    reason: verified
      ? 'Terminal confirmation matched the proof-backed pass and current POC-1 artifact.'
      : 'Pass could not be matched to the active proof-backed campaign.',
    passCode: normalizedInput,
    campaign: emptyCampaign,
    receiptPath: emptyCampaign.receiptPath,
    receiptPda: emptyCampaign.receiptPda,
    recordTx: emptyCampaign.recordTx,
    settleTx: emptyCampaign.settleTx,
    checks,
  };
}
