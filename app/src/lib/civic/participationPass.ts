import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import type {
  CivicMarket,
  CivicParticipationPass,
  CivicPassVerification,
  CivicReplayProof,
  CivicReceiptReference,
  ConvictionCreditAllocation,
} from './types';
import { getCivicMarket } from './civicMarket';
import { buildCivicConvictionSignal } from './convictionSignal';

type PassPayload = {
  v: 2;
  typ: 'civic_participation_pass';
  marketSlug: string;
  actionLabel: string;
  participantLabel: string;
  participantCommitment: string;
  passId: string;
  issuedAt: string;
  expiresAt: string;
  nonce: string;
  verifierStation: string;
  forecastCredits: ConvictionCreditAllocation;
  settlement: {
    dependsOnForecast: false;
    releaseCondition: string;
  };
  receipt: CivicReceiptReference;
};

const DEFAULT_TTL_MS = 20 * 60_000;

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString('base64url');
}

function fromBase64url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function signingKey() {
  const configured = process.env.CIVIC_PASS_SECRET;
  if (configured && configured.length >= 32) return configured;
  if (process.env.CIVIC_PASS_REQUIRE_SECRET === 'true') {
    throw new Error('CIVIC_PASS_SECRET must be at least 32 characters when CIVIC_PASS_REQUIRE_SECRET=true.');
  }
  return 'phase-2-devnet-civic-pass:' + [
    process.env.NEXT_PUBLIC_APP_URL ?? 'local',
    'counter-attested-receipt',
    'specified-not-production',
  ].join(':');
}

function signPayload(encodedPayload: string) {
  return createHmac('sha256', signingKey()).update(encodedPayload).digest('base64url');
}

function secureEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function passTtlMs() {
  const configured = Number(process.env.CIVIC_PASS_TTL_MS ?? DEFAULT_TTL_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_TTL_MS;
}

function participantCommitment(label: string, market: CivicMarket) {
  return createHash('sha256')
    .update(market.slug)
    .update(':')
    .update(label.trim().toLowerCase() || 'anonymous participant')
    .update(':')
    .update(market.evidence.receiptPda)
    .digest('hex');
}

function receiptReference(market: CivicMarket): CivicReceiptReference {
  return {
    receiptId: market.evidence.receiptId,
    receiptPda: market.evidence.receiptPda,
    nullifierPda: market.evidence.nullifierPda,
    settlementPda: market.evidence.settlementPda,
    recordTx: market.evidence.recordTx,
    settleTx: market.evidence.settleTx,
  };
}

function allocation(): ConvictionCreditAllocation {
  return {
    repairLikely: 62,
    repairDelayed: 38,
    transferable: false,
    cashValue: '0',
  };
}

function payloadToPass(payload: PassPayload, passToken: string, market: CivicMarket): CivicParticipationPass {
  return {
    ok: true,
    type: 'civic_participation_pass',
    version: 2,
    status: 'issued',
    marketSlug: payload.marketSlug,
    actionLabel: payload.actionLabel,
    participantLabel: payload.participantLabel,
    participantCommitment: payload.participantCommitment,
    passId: payload.passId,
    passToken,
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
    nonce: payload.nonce,
    verifierStation: payload.verifierStation,
    verifierPath: `/verify/${encodeURIComponent(payload.marketSlug)}?pass=${encodeURIComponent(passToken)}`,
    receiptPath: `/receipt/${encodeURIComponent(payload.receipt.receiptId)}?mode=civic`,
    replayProofPath: `/api/civic/replay-proof?pass=${encodeURIComponent(passToken)}`,
    forecastCredits: payload.forecastCredits,
    convictionSignal: buildCivicConvictionSignal(market, {
      participantLabel: payload.participantLabel,
      choice: payload.forecastCredits.repairLikely >= payload.forecastCredits.repairDelayed ? 'repair_likely' : 'repair_delayed',
      creditsCommitted: Math.max(payload.forecastCredits.repairLikely, payload.forecastCredits.repairDelayed),
      confidenceBps: Math.max(payload.forecastCredits.repairLikely, payload.forecastCredits.repairDelayed) * 100,
    }),
    settlement: payload.settlement,
    receipt: payload.receipt,
    boundary: market.proofBoundary,
  };
}

export function issueCivicParticipationPass(market: CivicMarket, participantLabel = 'anonymous participant'): CivicParticipationPass {
  const issuedAtMs = Date.now();
  const issuedAt = new Date(issuedAtMs).toISOString();
  const expiresAt = new Date(issuedAtMs + passTtlMs()).toISOString();
  const commitment = participantCommitment(participantLabel, market);
  const nonce = randomBytes(24).toString('hex');
  const passId = `civic_${createHash('sha256').update(`${market.slug}:${commitment}:${nonce}`).digest('hex').slice(0, 18)}`;
  const payload: PassPayload = {
    v: 2,
    typ: 'civic_participation_pass',
    marketSlug: market.slug,
    actionLabel: market.sponsorPool.actionRewardLabel,
    participantLabel: participantLabel.trim() || 'anonymous participant',
    participantCommitment: commitment,
    passId,
    issuedAt,
    expiresAt,
    nonce,
    verifierStation: 'ward12-field-verifier-devnet',
    forecastCredits: allocation(),
    settlement: {
      dependsOnForecast: false,
      releaseCondition: market.sponsorPool.releaseRule,
    },
    receipt: receiptReference(market),
  };
  const encodedPayload = base64url(stableJson(payload));
  const signature = signPayload(encodedPayload);
  return payloadToPass(payload, `${encodedPayload}.${signature}`, market);
}

function parsePassToken(passToken: string): { payload: PassPayload; encodedPayload: string; signature: string } | null {
  const [encodedPayload, signature] = passToken.split('.');
  if (!encodedPayload || !signature) return null;
  try {
    const payload = JSON.parse(fromBase64url(encodedPayload)) as PassPayload;
    return { payload, encodedPayload, signature };
  } catch {
    return null;
  }
}

export function verifyCivicParticipationPass(passToken: string, expectedMarketSlug?: string): CivicPassVerification {
  const parsed = parsePassToken(passToken);
  if (!parsed) return { ok: false, status: 'rejected', reason: 'pass_token_malformed' };
  const expectedSignature = signPayload(parsed.encodedPayload);
  if (!secureEqual(parsed.signature, expectedSignature)) {
    return { ok: false, status: 'rejected', reason: 'pass_signature_invalid' };
  }
  const { payload } = parsed;
  const market = getCivicMarket(payload.marketSlug);
  if (!market) return { ok: false, status: 'rejected', reason: 'civic_market_not_found' };
  if (expectedMarketSlug && payload.marketSlug !== expectedMarketSlug) {
    return { ok: false, status: 'rejected', reason: 'pass_market_mismatch' };
  }
  if (payload.typ !== 'civic_participation_pass' || payload.v !== 2) {
    return { ok: false, status: 'rejected', reason: 'pass_version_unsupported' };
  }
  if (Date.parse(payload.expiresAt) <= Date.now()) {
    return { ok: false, status: 'rejected', reason: 'pass_expired' };
  }
  if (payload.forecastCredits.transferable !== false || payload.forecastCredits.cashValue !== '0') {
    return { ok: false, status: 'rejected', reason: 'forecast_credit_boundary_invalid' };
  }
  if (payload.settlement.dependsOnForecast !== false) {
    return { ok: false, status: 'rejected', reason: 'settlement_forecast_coupling_rejected' };
  }
  if (
    payload.receipt.receiptPda !== market.evidence.receiptPda ||
    payload.receipt.nullifierPda !== market.evidence.nullifierPda ||
    payload.receipt.settlementPda !== market.evidence.settlementPda
  ) {
    return { ok: false, status: 'rejected', reason: 'receipt_binding_mismatch' };
  }

  return {
    ok: true,
    status: 'verified',
    reason: 'stateless_signature_and_receipt_binding_verified',
    marketSlug: payload.marketSlug,
    passId: payload.passId,
    participantCommitment: payload.participantCommitment,
    receiptPath: `/receipt/${encodeURIComponent(payload.receipt.receiptId)}?mode=civic`,
    ledgerPath: '/ledger',
    replayProofPath: `/api/civic/replay-proof?pass=${encodeURIComponent(passToken)}`,
    receipt: payload.receipt,
    forecastCredits: payload.forecastCredits,
    settlement: payload.settlement,
  };
}

export function buildReplayRejectionProof(passToken: string): CivicReplayProof | CivicPassVerification {
  const verification = verifyCivicParticipationPass(passToken);
  if (!verification.ok) return verification;
  const market = getCivicMarket(verification.marketSlug ?? '');
  if (!market) return { ok: false, status: 'rejected', reason: 'civic_market_not_found' };
  return {
    ok: true,
    status: 'replay_rejected',
    reason: 'published_nullifier_and_negative_path_artifact_reject_duplicate_settlement',
    marketSlug: market.slug,
    passId: verification.passId,
    nullifierPda: market.evidence.nullifierPda,
    sourceArtifact: '/proofs/civic-fraud-gauntlet.json',
    negativePathCases: market.evidence.gauntletLabel,
    settlementDependsOnForecast: false,
  };
}
