import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { PublicKey } from '@solana/web3.js';
import type { CivicConvictionSignalCommitment, CivicMarket, ConvictionChoice } from './types';

const PROGRAM_ID = new PublicKey('AeKT1B58Qi9rBtrtnMe11o4eXbVwHweKxGFNS5X3Vv46');
const CREDIT_CAP = 100;
const DEFAULT_PARTICIPANT_AUTHORITY = '11111111111111111111111111111111';

type ConvictionPayload = Omit<CivicConvictionSignalCommitment, 'ok' | 'artifactToken'> & {
  typ: 'civic_conviction_signal';
};

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

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString('base64url');
}

function fromBase64url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signingKey() {
  const configured = process.env.CIVIC_CONVICTION_SECRET;
  if (configured && configured.length >= 32) return configured;
  if (process.env.CIVIC_CONVICTION_REQUIRE_SECRET === 'true') {
    throw new Error('CIVIC_CONVICTION_SECRET must be at least 32 characters when CIVIC_CONVICTION_REQUIRE_SECRET=true.');
  }
  return 'phase-5-civic-conviction-signal:' + [
    process.env.NEXT_PUBLIC_APP_URL ?? 'local',
    'non-transferable',
    'settlement-independent',
  ].join(':');
}

function sign(encodedPayload: string) {
  return createHmac('sha256', signingKey()).update(encodedPayload).digest('base64url');
}

function secureEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function sha256Hex(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function hashToBytes(hex: string) {
  return Buffer.from(hex, 'hex');
}

function normalizeChoice(choice: unknown): ConvictionChoice {
  return choice === 'repair_delayed' || choice === 'abstain' ? choice : 'repair_likely';
}

function normalizeCredits(value: unknown) {
  const credits = Number(value ?? 62);
  if (!Number.isInteger(credits) || credits < 1 || credits > CREDIT_CAP) {
    throw new Error('conviction_credit_cap_exceeded');
  }
  return credits;
}

function normalizeConfidence(value: unknown) {
  const confidence = Number(value ?? 6200);
  if (!Number.isInteger(confidence) || confidence < 0 || confidence > 10_000) {
    throw new Error('conviction_confidence_out_of_range');
  }
  return confidence;
}

export function deriveCivicConvictionSignalPda(params: {
  growthCampaign: string;
  participantAuthority?: string;
  signalHash: string;
}) {
  const participant = new PublicKey(params.participantAuthority ?? DEFAULT_PARTICIPANT_AUTHORITY);
  const [address, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('conviction_signal'),
      new PublicKey(params.growthCampaign).toBuffer(),
      participant.toBuffer(),
      hashToBytes(params.signalHash),
    ],
    PROGRAM_ID,
  );
  return { address: address.toBase58(), bump };
}

export function buildCivicConvictionSignal(
  market: CivicMarket,
  options: {
    participantLabel?: string;
    participantAuthority?: string;
    choice?: ConvictionChoice;
    creditsCommitted?: number;
    confidenceBps?: number;
  } = {},
): CivicConvictionSignalCommitment {
  const choice = normalizeChoice(options.choice);
  const creditsCommitted = normalizeCredits(options.creditsCommitted);
  const confidenceBps = normalizeConfidence(options.confidenceBps);
  const participantLabel = options.participantLabel?.trim() || 'anonymous participant';
  const participantAuthority = options.participantAuthority || DEFAULT_PARTICIPANT_AUTHORITY;
  const participantCommitment = sha256Hex(`${market.slug}:${participantLabel.toLowerCase()}:${market.evidence.receiptPda}`);
  const signalHash = sha256Hex(`${market.slug}:${market.question}:${choice}:${participantCommitment}`);
  const pda = deriveCivicConvictionSignalPda({
    growthCampaign: market.evidence.growthCampaignPda,
    participantAuthority,
    signalHash,
  });
  const payload: ConvictionPayload = {
    typ: 'civic_conviction_signal',
    type: 'civic_conviction_signal',
    version: 1,
    status: 'signed_app_artifact',
    marketSlug: market.slug,
    choice,
    creditsCommitted,
    creditCap: CREDIT_CAP,
    confidenceBps,
    signalHash,
    participantCommitment,
    participantAuthority,
    growthCampaign: market.evidence.growthCampaignPda,
    convictionSignalPda: pda.address,
    convictionSignalBump: pda.bump,
    duplicatePrevention: {
      method: 'conviction_signal_pda_init',
      seedPrefix: 'conviction_signal',
      scope: 'one_signal_per_campaign_participant_and_signal_hash',
    },
    transfer: {
      transferable: false,
      tokenMint: null,
      cashValue: '0',
    },
    settlement: {
      dependsOnConviction: false,
      dependsOnForecast: false,
      dependsOnReceipt: true,
      releaseCondition: market.sponsorPool.releaseRule,
    },
    onChainInstruction: {
      name: 'commit_conviction_signal',
      implemented: true,
      deployedInCurrentDevnetProof: false,
    },
    signedAt: new Date().toISOString(),
  };
  const encodedPayload = base64url(stableJson(payload));
  return { ok: true, ...payload, artifactToken: `${encodedPayload}.${sign(encodedPayload)}` };
}

export function verifyCivicConvictionSignalToken(artifactToken: string) {
  const [encodedPayload, signature] = artifactToken.split('.');
  if (!encodedPayload || !signature) return { ok: false, reason: 'conviction_token_malformed' };
  const expected = sign(encodedPayload);
  if (!secureEqual(signature, expected)) return { ok: false, reason: 'conviction_signature_invalid' };
  const payload = JSON.parse(fromBase64url(encodedPayload)) as ConvictionPayload;
  const pda = deriveCivicConvictionSignalPda({
    growthCampaign: payload.growthCampaign,
    participantAuthority: payload.participantAuthority,
    signalHash: payload.signalHash,
  });
  const ok =
    payload.typ === 'civic_conviction_signal' &&
    payload.type === 'civic_conviction_signal' &&
    payload.creditsCommitted > 0 &&
    payload.creditsCommitted <= CREDIT_CAP &&
    payload.creditCap === CREDIT_CAP &&
    payload.transfer.transferable === false &&
    payload.transfer.cashValue === '0' &&
    payload.transfer.tokenMint === null &&
    payload.settlement.dependsOnConviction === false &&
    payload.settlement.dependsOnForecast === false &&
    payload.settlement.dependsOnReceipt === true &&
    payload.duplicatePrevention.method === 'conviction_signal_pda_init' &&
    payload.convictionSignalPda === pda.address &&
    payload.convictionSignalBump === pda.bump;

  return ok
    ? { ok: true, reason: 'signed_conviction_signal_verified', payload }
    : { ok: false, reason: 'conviction_boundary_invalid' };
}
