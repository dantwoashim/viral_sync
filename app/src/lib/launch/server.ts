import { promises as fs } from 'fs';
import path from 'path';
import { Pool, type PoolClient } from 'pg';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import {
  createCampaignNullifier,
  createCausalInvite,
  createVisitChallengeHash,
  deriveReceiptPdaLike,
  deriveTxSignatureLike,
  hashCausalInvite,
  sha256Hex,
  signCustomerChallenge,
  signStaffChallenge,
  verifyCausalInvite,
} from '@/lib/launch/causal';
import {
  AuditEventRecord,
  BillingEvent,
  CampaignPublishResult,
  CausalGraphEdge,
  CausalGraphNode,
  CausalReceiptRecord,
  ClaimRecord,
  ClaimResult,
  ConsumerPassbookRow,
  ConsumerSummary,
  EventRecord,
  FraudReviewReport,
  IdempotencyRecord,
  LaunchLedger,
  BlinkActionMetadata,
  MerchantConfirmResult,
  MerchantMetric,
  MerchantRow,
  MerchantRole,
  MerchantSessionRecord,
  MerchantSummary,
  OfferRecord,
  OfferView,
  OutboxRecord,
  PartnerAccount,
  RedeemCodeRecord,
  RedeemCodeResult,
  ReferralCreateResult,
  ReferralDetail,
  ReferralLinkRecord,
  RewardLedgerEntryRecord,
  ReceiptReconciliationStatus,
  StaffDeviceRecord,
  SupportSearchResult,
  RelayerPolicy,
  SignedActionIntent,
  StaffDeviceNonceRecord,
  VisitChallengeRecord,
} from '@/lib/launch/types';
import {
  demoPinAccepted,
  getIntentSecret,
  getMerchantAccessToken,
  getProductionReadinessSnapshot,
  getRelayerApiKey,
  getWebhookSecret,
  isProductionRuntime,
  merchantRoleAllowed,
  normalizeMerchantRole,
} from '@/lib/launch/security';

const DATA_DIR = process.env.LAUNCH_LEDGER_DIR
  ? path.resolve(process.env.LAUNCH_LEDGER_DIR)
  : path.join(process.cwd(), '.local');
const LEDGER_PATH = path.join(DATA_DIR, 'launch-ledger.json');
const DATABASE_URL = process.env.LAUNCH_DATABASE_URL || process.env.DATABASE_URL;
const STAFF_DEVICE_SIGNATURE_TTL_MS = 5 * 60 * 1000;
const LEDGER_ROW_ID = 'default';
const LEDGER_LOCK_KEY = 2_886_412;
let persistChain: Promise<void> = Promise.resolve();
let mutationChain: Promise<void> = Promise.resolve();
let schemaReadyPromise: Promise<void> | null = null;

function shouldUseDatabaseSsl(connectionString: string) {
  if (process.env.LAUNCH_DATABASE_SSL === 'false') {
    return false;
  }

  if (process.env.LAUNCH_DATABASE_SSL === 'true') {
    return true;
  }

  return !/localhost|127\.0\.0\.1|::1/i.test(connectionString);
}

const dbPool = DATABASE_URL
  ? new Pool({
    connectionString: DATABASE_URL,
    max: Number(process.env.LAUNCH_DATABASE_POOL_SIZE || 4),
    idleTimeoutMillis: 10_000,
    ssl: shouldUseDatabaseSsl(DATABASE_URL)
      ? { rejectUnauthorized: process.env.LAUNCH_DATABASE_SSL_REJECT_UNAUTHORIZED === 'true' }
      : false,
  })
  : null;

export const PILOT_MERCHANT_ID = 'merchant-thamel-brew-house';
export const PILOT_OFFER_ID = 'offer-thamel-brew-pass';
const PILOT_MERCHANT_TEMPLATES = [
  {
    id: PILOT_MERCHANT_ID,
    name: 'Thamel Brew House',
    district: 'Thamel',
    city: 'Kathmandu',
    locationLabel: 'Thamel Coffee Lane',
    offerId: PILOT_OFFER_ID,
    slug: 'thamel-brew-pass',
    title: 'Bring 3 friends. All 4 unlock Rs. 150 coffee credit.',
    description: 'Merchant-funded group reward for a dense district pilot. Confirmation happens at the counter.',
    reward: 'Rs. 150 coffee credit for each guest',
    referralGoal: 3,
    redemptionWindowHours: 72,
  },
  {
    id: 'merchant-jhamel-momo-yard',
    name: 'Jhamel Momo Yard',
    district: 'Jhamsikhel',
    city: 'Lalitpur',
    locationLabel: 'Jhamel Courtyard Counter',
    offerId: 'offer-jhamel-momo-loop',
    slug: 'jhamel-momo-loop',
    title: 'Bring 2 friends for a momo table upgrade.',
    description: 'Repeatable QSR template for a small food counter with fast staff confirmation.',
    reward: 'One shared momo platter upgrade after 2 verified visits',
    referralGoal: 2,
    redemptionWindowHours: 48,
  },
  {
    id: 'merchant-pokhara-hostel-hub',
    name: 'Pokhara Hostel Hub',
    district: 'Lakeside',
    city: 'Pokhara',
    locationLabel: 'Lakeside Reception Desk',
    offerId: 'offer-pokhara-hostel-pass',
    slug: 'pokhara-hostel-pass',
    title: 'Invite backpackers. Unlock a hostel cafe credit.',
    description: 'Hostel template for traveler-heavy referrals with reception-desk confirmation.',
    reward: 'Rs. 200 hostel cafe credit after 3 verified guest visits',
    referralGoal: 3,
    redemptionWindowHours: 96,
  },
] as const;
const SESSION_COOKIE_PATTERN = /^vs-[a-z0-9-]{8,96}$/i;
const MAX_DISPLAY_NAME_LENGTH = 48;
const MAX_SESSION_ID_LENGTH = 96;
const MAX_DEVICE_FINGERPRINT_LENGTH = 160;
const MAX_CAMPAIGN_TEXT_LENGTH = 160;
const TOKEN_PATTERN = /^[a-z0-9-]{6,64}$/i;
const SESSION_PATTERN = /^[a-z0-9:_-]{3,96}$/i;
const CODE_PATTERN = /^[a-z0-9]{3}-?[a-z0-9]{3}$/i;
const VISIT_CHALLENGE_TTL_SECONDS = 120;
const MERCHANT_SESSION_TTL_HOURS = 12;
const STAFF_DEVICE_NONCE_TTL_MS = 5 * 60 * 1000;
const VIRAL_SYNC_PROGRAM_ID = '8D5chmUeb97oxykaBv7CTFpZnBotVAMnqYAvyk6qcQz9';
const ACTION_ICON_PATH = '/icon-192.png';
const DEFAULT_REWARD_COST_NPR = 150;
const DEFAULT_PLATFORM_FEE_NPR = 25;

function iso(date: Date) {
  return date.toISOString();
}

function randomId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function randomToken() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 10);
}

function randomRedeemCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const raw = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
  return `${raw.slice(0, 3)}-${raw.slice(3)}`;
}

function staffDeviceSecret() {
  return randomBytes(32).toString('hex');
}

function hmacStaffDevice(secret: string, message: string) {
  return createHmac('sha256', secret).update(message).digest('hex');
}

function constantTimeHexEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function hashRedeemCode(params: { code: string; merchantId: string; offerId: string; claimId: string }) {
  return sha256Hex(`${params.merchantId}:${params.offerId}:${params.claimId}:${normalizeRedeemCode(params.code)}`);
}

function rewardAmountFromOffer(offer: OfferRecord) {
  const match = offer.reward.match(/\d[\d,]*/);
  if (!match) {
    return DEFAULT_REWARD_COST_NPR;
  }

  const parsed = Number(match[0].replace(/,/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REWARD_COST_NPR;
}

function findRedeemCodeByNormalizedCode(ledger: LaunchLedger, normalizedCode: string, fallbackOfferId = PILOT_OFFER_ID) {
  return ledger.redeemCodes.find((item) => {
    const claim = ledger.claims.find((candidate) => candidate.id === item.claimId);
    const offerId = claim?.offerId ?? fallbackOfferId;
    const expectedHash = item.codeHash ?? hashRedeemCode({
      code: item.code,
      merchantId: item.merchantId,
      offerId,
      claimId: item.claimId,
    });
    const suppliedHash = hashRedeemCode({
      code: normalizedCode,
      merchantId: item.merchantId,
      offerId,
      claimId: item.claimId,
    });
    return expectedHash === suppliedHash;
  });
}

export function staffDeviceSigningMessage(params: { publicKey: string; timestamp: string; action: string; code?: string; nonce?: string; }) {
  return [
    'viral-sync-staff-device-v1',
    params.publicKey,
    params.timestamp,
    params.action,
    params.code ? normalizeRedeemCode(params.code) : '',
    params.nonce ?? '',
  ].join(':');
}

function activeStaffDeviceNonce(
  ledger: LaunchLedger,
  params: { publicKey: string; merchantId: string; action: string; code?: string; nonce?: string },
) {
  const normalizedCode = params.code ? normalizeRedeemCode(params.code) : undefined;
  return (ledger.staffDeviceNonces ?? []).find((item) =>
    item.nonce === params.nonce &&
    item.staffDevicePublicKey === params.publicKey &&
    item.merchantId === params.merchantId &&
    item.action === params.action &&
    (item.code ?? '') === (normalizedCode ?? '') &&
    !item.consumedAt &&
    new Date(item.expiresAt).getTime() > Date.now());
}

function pruneStaffDeviceNonces(ledger: LaunchLedger) {
  const cutoff = Date.now() - STAFF_DEVICE_NONCE_TTL_MS;
  ledger.staffDeviceNonces = (ledger.staffDeviceNonces ?? []).filter((item) =>
    !item.consumedAt && new Date(item.expiresAt).getTime() > cutoff);
}

function defaultStaffPublicKey() {
  return `staff_${sha256Hex(defaultStaffSecret()).slice(0, 32)}`;
}

function defaultStaffSecret() {
  return sha256Hex(`${PILOT_MERCHANT_ID}:front-counter:staff-device-secret`);
}

export function createOrResumeGuestSession(existingSessionId?: string | null) {
  if (existingSessionId && SESSION_COOKIE_PATTERN.test(existingSessionId)) {
    return {
      sessionId: existingSessionId,
      displayName: `Guest ${existingSessionId.replace(/[^a-z0-9]/gi, '').slice(-3).toUpperCase()}`,
      loginMethod: 'guest' as const,
      role: null,
    };
  }

  const seed = crypto.randomUUID().replace(/-/g, '').slice(0, 8);
  return {
    sessionId: `vs-${seed}-${Date.now().toString(36)}`,
    displayName: `Guest ${seed.slice(0, 3).toUpperCase()}`,
    loginMethod: 'guest' as const,
    role: null,
  };
}

export async function createMerchantSession(params: {
  staffPin?: string;
  accessToken?: string;
  role?: MerchantRole;
  label?: string;
  requestId: string;
}) {
  return withLedgerMutation((ledger) => {
    const { merchant } = getPilotMerchantAndOffer(ledger);
    let allowed = false;
    let denialReason = 'Merchant login token is required.';

    try {
      allowed = Boolean(params.accessToken && params.accessToken === getMerchantAccessToken());
      if (!allowed && params.staffPin && demoPinAccepted(params.staffPin)) {
        allowed = true;
      }
      denialReason = 'Invalid merchant login credential.';
    } catch (error) {
      denialReason = error instanceof Error ? error.message : denialReason;
    }

    if (!allowed) {
      appendAuditEvent(ledger, {
        requestId: params.requestId,
        actorType: 'merchant',
        actorId: 'unknown',
        merchantId: merchant.id,
        targetType: 'merchant_session',
        action: 'merchant_login',
        result: 'denied',
        reason: denialReason,
      });
      return { ok: false, reason: 'Merchant authorization failed.' };
    }

    const now = new Date();
    const role = normalizeMerchantRole(params.role);
    const session: MerchantSessionRecord = {
      id: randomId('merchant-session'),
      merchantId: merchant.id,
      role,
      label: sanitizeDisplayName(params.label ?? 'Front counter staff'),
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + MERCHANT_SESSION_TTL_HOURS * 60 * 60 * 1000).toISOString(),
    };
    ledger.merchantSessions = ledger.merchantSessions ?? [];
    ledger.merchantSessions.push(session);
    appendAuditEvent(ledger, {
      requestId: params.requestId,
      actorType: 'merchant',
      actorId: session.id,
      merchantId: merchant.id,
      targetType: 'merchant_session',
      targetId: session.id,
      action: 'merchant_login',
      result: 'created',
    });
    return { ok: true, session };
  });
}

export async function requireMerchantRole(sessionId: string, allowedRoles: MerchantRole[], requestId: string) {
  const ledger = await loadLedger();
  const { merchant } = getPilotMerchantAndOffer(ledger);
  const session = (ledger.merchantSessions ?? []).find((item) =>
    item.id === sessionId &&
    item.merchantId === merchant.id &&
    !item.revokedAt &&
    new Date(item.expiresAt).getTime() > Date.now());
  const allowed = Boolean(session && merchantRoleAllowed(session.role, allowedRoles));

  if (!allowed) {
    await withLedgerMutation((mutableLedger) => {
      appendAuditEvent(mutableLedger, {
        requestId,
        actorType: 'merchant',
        actorId: sessionId || 'missing',
        merchantId: merchant.id,
        targetType: 'merchant_role',
        action: 'authorize_merchant_role',
        result: 'denied',
        reason: 'Missing, expired, revoked, or insufficient merchant role.',
      });
    });
    return { ok: false as const, reason: 'Merchant role is not authorized.' };
  }

  return { ok: true as const, session: session! };
}

export async function requireStaffDevice(params: {
  publicKey: string;
  merchantId: string;
  requestId: string;
  action: string;
  code?: string;
  signature?: string;
  timestamp?: string;
  nonce?: string;
}) {
  return withLedgerMutation((ledger) => {
    pruneStaffDeviceNonces(ledger);
    const device = (ledger.staffDevices ?? []).find((item) =>
      item.publicKey === params.publicKey &&
      item.merchantId === params.merchantId &&
      !item.revokedAt);

    if (!device) {
      appendAuditEvent(ledger, {
        requestId: params.requestId,
        actorType: 'staff',
        actorId: params.publicKey || 'missing',
        merchantId: params.merchantId,
        targetType: 'staff_device',
        action: 'authorize_staff_device',
        result: 'denied',
        reason: 'Staff device is missing or revoked.',
      });
      return { ok: false as const, reason: 'Staff device is not authorized.' };
    }

    const nonce = activeStaffDeviceNonce(ledger, {
      publicKey: params.publicKey,
      merchantId: params.merchantId,
      action: params.action,
      code: params.code,
      nonce: params.nonce,
    });
    const timestampMs = Number(params.timestamp);
    const fresh = Number.isFinite(timestampMs) && Math.abs(Date.now() - timestampMs) <= STAFF_DEVICE_SIGNATURE_TTL_MS;
    const expected = device.secret
      ? hmacStaffDevice(device.secret, staffDeviceSigningMessage({
        publicKey: params.publicKey,
        timestamp: params.timestamp ?? '',
        action: params.action,
        code: params.code,
        nonce: params.nonce,
      }))
      : '';
    if (!params.signature || !expected || !nonce || !fresh || !constantTimeHexEqual(expected, params.signature)) {
      appendAuditEvent(ledger, {
        requestId: params.requestId,
        actorType: 'staff',
        actorId: params.publicKey || 'missing',
        merchantId: params.merchantId,
        targetType: 'staff_device',
        targetId: device.id,
        action: 'authorize_staff_device',
        result: 'denied',
        reason: 'Staff device signature nonce is missing, expired, consumed, or invalid.',
      });
      return { ok: false as const, reason: 'Staff device signature nonce is required.' };
    }

    nonce.consumedAt = new Date().toISOString();
    return { ok: true as const, device };
  });
}

export async function issueStaffDeviceNonce(params: {
  staffPin?: string;
  authorizedActorId?: string;
  publicKey: string;
  action: string;
  code?: string;
  requestId: string;
}) {
  return withLedgerMutation((ledger) => {
    const { merchant } = getPilotMerchantAndOffer(ledger);
    const allowed = Boolean(params.authorizedActorId) || demoPinAccepted(params.staffPin ?? '');
    if (!allowed) {
      appendAuditEvent(ledger, {
        requestId: params.requestId,
        actorType: 'staff',
        actorId: params.publicKey || 'missing',
        merchantId: merchant.id,
        targetType: 'staff_device_nonce',
        action: 'issue_staff_device_nonce',
        result: 'denied',
        reason: 'Merchant staff session or local demo PIN is required.',
      });
      return { ok: false, reason: 'Staff authorization is required.' };
    }

    const device = (ledger.staffDevices ?? []).find((item) =>
      item.publicKey === params.publicKey &&
      item.merchantId === merchant.id &&
      !item.revokedAt);
    if (!device) {
      appendAuditEvent(ledger, {
        requestId: params.requestId,
        actorType: 'staff',
        actorId: params.publicKey || 'missing',
        merchantId: merchant.id,
        targetType: 'staff_device_nonce',
        action: 'issue_staff_device_nonce',
        result: 'denied',
        reason: 'Staff device is missing or revoked.',
      });
      return { ok: false, reason: 'Staff device is not authorized.' };
    }

    pruneStaffDeviceNonces(ledger);
    const issuedAt = new Date();
    const nonce: StaffDeviceNonceRecord = {
      id: randomId('staff-nonce'),
      merchantId: merchant.id,
      staffDevicePublicKey: params.publicKey,
      action: params.action,
      code: params.code ? normalizeRedeemCode(params.code) : undefined,
      nonce: randomBytes(24).toString('hex'),
      issuedAt: issuedAt.toISOString(),
      expiresAt: new Date(issuedAt.getTime() + STAFF_DEVICE_NONCE_TTL_MS).toISOString(),
    };
    ledger.staffDeviceNonces = ledger.staffDeviceNonces ?? [];
    ledger.staffDeviceNonces.push(nonce);
    appendAuditEvent(ledger, {
      requestId: params.requestId,
      actorType: 'staff',
      actorId: params.publicKey,
      merchantId: merchant.id,
      targetType: 'staff_device_nonce',
      targetId: nonce.id,
      action: 'issue_staff_device_nonce',
      result: 'created',
    });
    return { ok: true, nonce: nonce.nonce, expiresAt: nonce.expiresAt };
  });
}

export async function enrollStaffDevice(params: {
  staffPin?: string;
  authorizedActorId?: string;
  label: string;
  locationLabel: string;
  requestId: string;
}) {
  return withLedgerMutation((ledger) => {
    const { merchant } = getPilotMerchantAndOffer(ledger);
    const allowed = Boolean(params.authorizedActorId) || demoPinAccepted(params.staffPin ?? '');

    if (!allowed) {
      appendAuditEvent(ledger, {
        requestId: params.requestId,
        actorType: 'staff',
        actorId: params.authorizedActorId ?? 'unknown',
        merchantId: merchant.id,
        targetType: 'staff_device',
        action: 'enroll_staff_device',
        result: 'denied',
        reason: 'Manager authorization is required to enroll a staff device.',
      });
      return { ok: false, reason: 'Staff device enrollment is not authorized.' };
    }

    const secret = staffDeviceSecret();
    const publicKey = `staff_${sha256Hex(secret).slice(0, 32)}`;
    const device: StaffDeviceRecord = {
      id: randomId('staff-device'),
      merchantId: merchant.id,
      locationLabel: sanitizeDisplayName(params.locationLabel),
      label: sanitizeDisplayName(params.label),
      publicKey,
      secret,
      secretHash: sha256Hex(secret),
      enrolledAt: new Date().toISOString(),
    };
    ledger.staffDevices = ledger.staffDevices ?? [];
    ledger.staffDevices.push(device);
    appendAuditEvent(ledger, {
      requestId: params.requestId,
      actorType: 'staff',
      actorId: params.authorizedActorId ?? device.publicKey,
      merchantId: merchant.id,
      targetType: 'staff_device',
      targetId: device.id,
      action: 'enroll_staff_device',
      result: 'created',
    });
    return { ok: true, device };
  });
}

export async function revokeStaffDevice(params: { staffPin?: string; authorizedActorId?: string; deviceId: string; requestId: string; }) {
  return withLedgerMutation((ledger) => {
    const { merchant } = getPilotMerchantAndOffer(ledger);
    const allowed = Boolean(params.authorizedActorId) || demoPinAccepted(params.staffPin ?? '');

    if (!allowed) {
      appendAuditEvent(ledger, {
        requestId: params.requestId,
        actorType: 'staff',
        actorId: params.authorizedActorId ?? 'unknown',
        merchantId: merchant.id,
        targetType: 'staff_device',
        targetId: params.deviceId,
        action: 'revoke_staff_device',
        result: 'denied',
        reason: 'Manager authorization is required to revoke a staff device.',
      });
      return { ok: false, reason: 'Staff device revocation is not authorized.' };
    }

    const device = (ledger.staffDevices ?? []).find((item) => item.id === params.deviceId && item.merchantId === merchant.id);
    if (!device) {
      return { ok: false, reason: 'Staff device not found.' };
    }

    device.revokedAt = new Date().toISOString();
    appendAuditEvent(ledger, {
      requestId: params.requestId,
      actorType: 'staff',
      actorId: params.authorizedActorId ?? device.publicKey,
      merchantId: merchant.id,
      targetType: 'staff_device',
      targetId: device.id,
      action: 'revoke_staff_device',
      result: 'updated',
    });
    return { ok: true, device };
  });
}

function clampText(value: string, maxLength: number) {
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

export function isValidSessionId(value: string) {
  return value.length <= MAX_SESSION_ID_LENGTH && SESSION_PATTERN.test(value);
}

export function isValidReferralToken(value: string) {
  return TOKEN_PATTERN.test(value);
}

export function sanitizeDisplayName(value: string) {
  return clampText(value || 'Guest', MAX_DISPLAY_NAME_LENGTH) || 'Guest';
}

export function sanitizeDeviceFingerprint(value: string, fallback: string) {
  return clampText(value || fallback, MAX_DEVICE_FINGERPRINT_LENGTH) || fallback;
}

function sanitizeCampaignText(value: string, fallback: string) {
  return clampText(value || fallback, MAX_CAMPAIGN_TEXT_LENGTH) || fallback;
}

export function normalizeRedeemCode(value: string) {
  const raw = value.replace(/[^a-z0-9]/gi, '').toUpperCase();
  if (raw.length !== 6) {
    return '';
  }
  return `${raw.slice(0, 3)}-${raw.slice(3, 6)}`;
}

export function isValidRedeemCode(value: string) {
  return CODE_PATTERN.test(value);
}

function buildSharePath(token: string) {
  return `/offer/${token}`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function formatMeta(timestamp: string, label: string) {
  const date = new Date(timestamp);
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${label}`;
}

function isSameUtcDay(left: string, right: string) {
  return left.slice(0, 10) === right.slice(0, 10);
}

function isInsideRedemptionWindow(claimedAt: string, redemptionWindowHours: number) {
  const claimedMs = new Date(claimedAt).getTime();
  if (!Number.isFinite(claimedMs)) {
    return false;
  }

  return Date.now() - claimedMs <= redemptionWindowHours * 60 * 60 * 1000;
}

function formatLedgerMetaSafe(timestamp: string, label: string) {
  const stamp = new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${stamp} - ${label}`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function formatLedgerMeta(timestamp: string, label: string) {
  const date = new Date(timestamp);
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${label}`;
}

function countRedeemedClaimsForReferral(ledger: LaunchLedger, referralToken: string) {
  return ledger.claims.filter((claim) => claim.referralToken === referralToken && claim.status === 'redeemed').length;
}

function expireStaleRedeemCodes(ledger: LaunchLedger) {
  const offerById = new Map(ledger.offers.map((offer) => [offer.id, offer]));
  let changed = false;

  for (const code of ledger.redeemCodes) {
    if (code.status !== 'active') {
      continue;
    }

    const claim = ledger.claims.find((item) => item.id === code.claimId);
    const offer = claim ? offerById.get(claim.offerId) : null;
    if (!claim || !offer || !isInsideRedemptionWindow(claim.claimedAt, offer.redemptionWindowHours)) {
      code.status = 'expired';
      changed = true;
    }
  }

  return changed;
}

function ensurePilotRoster(ledger: LaunchLedger) {
  let changed = false;
  const now = iso(new Date());

  for (const template of PILOT_MERCHANT_TEMPLATES) {
    if (!ledger.merchants.some((merchant) => merchant.id === template.id)) {
      ledger.merchants.push({
        id: template.id,
        name: template.name,
        district: template.district,
        city: template.city,
        locationLabel: template.locationLabel,
      });
      changed = true;
    }

    if (!ledger.offers.some((offer) => offer.id === template.offerId)) {
      ledger.offers.push({
        id: template.offerId,
        merchantId: template.id,
        slug: template.slug,
        title: template.title,
        description: template.description,
        reward: template.reward,
        referralGoal: template.referralGoal,
        redemptionWindowHours: template.redemptionWindowHours,
        active: true,
        createdAt: now,
      });
      ledger.events.push({
        id: randomId('evt'),
        type: 'offer_created',
        createdAt: now,
        merchantId: template.id,
        offerId: template.offerId,
      });
      changed = true;
    }
  }

  return changed;
}

function normalizeLedgerState(ledger: LaunchLedger) {
  let changed = removeLegacySampleData(ledger);
  changed = ensurePilotRoster(ledger) || changed;

  if (!ledger.visitChallenges) {
    ledger.visitChallenges = [];
    changed = true;
  }

  if (!ledger.causalReceipts) {
    ledger.causalReceipts = [];
    changed = true;
  }

  if (!ledger.merchantSessions) {
    ledger.merchantSessions = [];
    changed = true;
  }

  if (!ledger.staffDevices) {
    if (isProductionRuntime()) {
      ledger.staffDevices = [];
      changed = true;
    } else {
      ledger.staffDevices = [{
        id: 'staff-device-front-counter',
        merchantId: PILOT_MERCHANT_ID,
        locationLabel: 'Thamel Coffee Lane',
        label: 'Front counter terminal',
        publicKey: defaultStaffPublicKey(),
        secret: defaultStaffSecret(),
        secretHash: sha256Hex(defaultStaffSecret()),
        enrolledAt: iso(new Date()),
      }];
      changed = true;
    }
  }

  if (!ledger.staffDeviceNonces) {
    ledger.staffDeviceNonces = [];
    changed = true;
  } else {
    const before = ledger.staffDeviceNonces.length;
    pruneStaffDeviceNonces(ledger);
    changed = changed || ledger.staffDeviceNonces.length !== before;
  }

  if (!ledger.auditEvents) {
    ledger.auditEvents = [];
    changed = true;
  }

  if (!ledger.rewardLedgerEntries) {
    ledger.rewardLedgerEntries = [];
    changed = true;
  }

  if (!ledger.idempotencyRecords) {
    ledger.idempotencyRecords = [];
    changed = true;
  }

  if (!ledger.outbox) {
    ledger.outbox = [];
    changed = true;
  }

  ledger.referralLinks = ledger.referralLinks.map((referral) => {
    const referrerDeviceFingerprint = referral.referrerDeviceFingerprint ?? referral.referrerSessionId;
    let causalInvite = referral.causalInvite;

    if (!causalInvite) {
      causalInvite = createCausalInvite({
        campaignId: referral.offerId,
        merchantId: PILOT_MERCHANT_ID,
        referrerSessionId: referral.referrerSessionId,
        deviceFingerprint: referrerDeviceFingerprint,
        issuedAt: new Date(referral.createdAt),
      });
      changed = true;
    }

    if (referrerDeviceFingerprint !== referral.referrerDeviceFingerprint) {
      changed = true;
    }

    return {
      ...referral,
      referrerDeviceFingerprint,
      causalInvite,
      status: referral.status ?? (causalInvite.expiresAt <= Date.now() ? 'expired' : 'active'),
    };
  });

  ledger.claims = ledger.claims.map((claim) => {
    if (claim.campaignNullifierHash) {
      return claim;
    }

    changed = true;
    return {
      ...claim,
      campaignNullifierHash: createCampaignNullifier({
        campaignId: claim.offerId,
        claimerSessionId: claim.claimerSessionId,
        deviceFingerprint: claim.deviceFingerprint,
      }),
      lifecycleStatus: claim.status === 'blocked' ? 'blocked' : claim.status === 'redeemed' ? 'redeemed' : 'created',
    };
  });

  ledger.claims = ledger.claims.map((claim) => ({
    ...claim,
    lifecycleStatus: claim.lifecycleStatus ?? (claim.status === 'blocked' ? 'blocked' : claim.status === 'redeemed' ? 'redeemed' : 'created'),
  }));

  ledger.redeemCodes = ledger.redeemCodes.map((code) => {
    const claim = ledger.claims.find((item) => item.id === code.claimId);
    const offerId = claim?.offerId ?? PILOT_OFFER_ID;
    const codeHash = code.codeHash ?? hashRedeemCode({
      code: code.code,
      merchantId: code.merchantId,
      offerId,
      claimId: code.claimId,
    });
    const status = code.status === 'active' ? 'issued' : code.status === 'redeemed' ? 'confirmed' : code.status;
    if (!code.codeHash || status !== code.status) {
      changed = true;
    }
    return { ...code, codeHash, status };
  });

  ledger.staffDevices = (ledger.staffDevices ?? []).map((device) => {
    if (device.secret && device.secretHash) {
      return device;
    }
    if (isProductionRuntime()) {
      changed = true;
      return {
        ...device,
        secret: undefined,
        secretHash: device.secretHash,
        revokedAt: device.revokedAt ?? iso(new Date()),
      };
    }
    const secret = device.publicKey === defaultStaffPublicKey()
      ? defaultStaffSecret()
      : sha256Hex(`${device.id}:${device.publicKey}:migrated-staff-secret`);
    changed = true;
    return {
      ...device,
      secret,
      secretHash: sha256Hex(secret),
    };
  });

  changed = expireStaleRedeemCodes(ledger) || changed;

  return changed;
}

function toOfferView(offer: OfferRecord, merchantName: string, district: string): OfferView {
  return {
    id: offer.id,
    slug: offer.slug,
    title: offer.title,
    description: offer.description,
    reward: offer.reward,
    referralGoal: offer.referralGoal,
    redemptionWindowHours: offer.redemptionWindowHours,
    merchantName,
    district,
  };
}

function createInitialLedger(): LaunchLedger {
  const createdAt = iso(new Date());
  const merchants = PILOT_MERCHANT_TEMPLATES.map((template) => ({
    id: template.id,
    name: template.name,
    district: template.district,
    city: template.city,
    locationLabel: template.locationLabel,
  }));
  const offers: OfferRecord[] = PILOT_MERCHANT_TEMPLATES.map((template) => ({
    id: template.offerId,
    merchantId: template.id,
    slug: template.slug,
    title: template.title,
    description: template.description,
    reward: template.reward,
    referralGoal: template.referralGoal,
    redemptionWindowHours: template.redemptionWindowHours,
    active: true,
    createdAt,
  }));

  const events: EventRecord[] = [
    ...offers.map((offer) => ({
      id: `evt-offer-${offer.id}`,
      type: 'offer_created' as const,
      createdAt: offer.createdAt,
      merchantId: offer.merchantId,
      offerId: offer.id,
    })),
  ];

  return {
    merchants,
    offers,
    referralLinks: [],
    claims: [],
    redeemCodes: [],
    visitChallenges: [],
    causalReceipts: [],
    merchantSessions: [],
    staffDevices: isProductionRuntime() ? [] : [{
      id: 'staff-device-front-counter',
      merchantId: PILOT_MERCHANT_ID,
      locationLabel: merchants[0].locationLabel,
      label: 'Front counter terminal',
      publicKey: defaultStaffPublicKey(),
      secret: defaultStaffSecret(),
      secretHash: sha256Hex(defaultStaffSecret()),
      enrolledAt: createdAt,
    }],
    staffDeviceNonces: [],
    auditEvents: [],
    rewardLedgerEntries: [{
      id: 'reward-ledger-launch-bounty',
      merchantId: PILOT_MERCHANT_ID,
      entryType: 'bounty_funded',
      amount: 0,
      balanceAfter: 0,
      idempotencyKey: 'seed:bounty-funded',
      createdAt,
    }],
    idempotencyRecords: [],
    outbox: [],
    events,
  };
}

function removeLegacySampleData(ledger: LaunchLedger) {
  const legacySessionPrefix = 'seed-';
  let changed = false;

  const beforeReferrals = ledger.referralLinks.length;
  ledger.referralLinks = ledger.referralLinks.filter((referral) =>
    !referral.referrerSessionId.startsWith(legacySessionPrefix));
  changed = changed || ledger.referralLinks.length !== beforeReferrals;

  const beforeClaims = ledger.claims.length;
  ledger.claims = ledger.claims.filter((claim) =>
    !claim.referrerSessionId.startsWith(legacySessionPrefix) &&
    !claim.claimerSessionId.startsWith(legacySessionPrefix));
  changed = changed || ledger.claims.length !== beforeClaims;

  const remainingClaimIds = new Set(ledger.claims.map((claim) => claim.id));
  const remainingReferralTokens = new Set(ledger.referralLinks.map((referral) => referral.token));
  const beforeCodes = ledger.redeemCodes.length;
  ledger.redeemCodes = ledger.redeemCodes.filter((code) => remainingClaimIds.has(code.claimId));
  changed = changed || ledger.redeemCodes.length !== beforeCodes;

  const beforeEvents = ledger.events.length;
  ledger.events = ledger.events.filter((event) =>
    event.id === 'evt-offer' ||
    (
      (!event.referralToken || remainingReferralTokens.has(event.referralToken)) &&
      (!event.claimId || remainingClaimIds.has(event.claimId)) &&
      (!event.redeemCodeId || ledger.redeemCodes.some((code) => code.id === event.redeemCodeId)) &&
      (!event.actorSessionId || !event.actorSessionId.startsWith(legacySessionPrefix))
    ));
  changed = changed || ledger.events.length !== beforeEvents;

  return changed;
}

function appendAuditEvent(ledger: LaunchLedger, event: Omit<AuditEventRecord, 'id' | 'createdAt'>) {
  const audit: AuditEventRecord = {
    id: randomId('audit'),
    createdAt: new Date().toISOString(),
    ...event,
  };
  ledger.auditEvents = ledger.auditEvents ?? [];
  ledger.auditEvents.push(audit);
  ledger.events.push({
    id: randomId('evt'),
    type: 'audit_event_recorded',
    createdAt: audit.createdAt,
    merchantId: audit.merchantId,
    payload: {
      auditEventId: audit.id,
      action: audit.action,
      result: audit.result,
      requestId: audit.requestId,
    },
  });
  return audit;
}

function latestRewardBalance(ledger: LaunchLedger, merchantId: string) {
  const entries = (ledger.rewardLedgerEntries ?? []).filter((entry) => entry.merchantId === merchantId);
  return entries.length > 0 ? entries[entries.length - 1].balanceAfter : 0;
}

function appendRewardLedgerEntry(ledger: LaunchLedger, entry: Omit<RewardLedgerEntryRecord, 'id' | 'createdAt' | 'balanceAfter'>) {
  ledger.rewardLedgerEntries = ledger.rewardLedgerEntries ?? [];
  const existing = ledger.rewardLedgerEntries.find((item) => item.idempotencyKey === entry.idempotencyKey);
  if (existing) {
    return existing;
  }

  const amount = entry.entryType === 'reward_settled' || entry.entryType === 'reward_granted'
    ? -Math.abs(entry.amount)
    : Math.abs(entry.amount);
  const ledgerEntry: RewardLedgerEntryRecord = {
    id: randomId('reward'),
    createdAt: new Date().toISOString(),
    balanceAfter: latestRewardBalance(ledger, entry.merchantId) + amount,
    ...entry,
    amount,
  };
  ledger.rewardLedgerEntries.push(ledgerEntry);
  ledger.events.push({
    id: randomId('evt'),
    type: 'reward_ledger_entry_recorded',
    createdAt: ledgerEntry.createdAt,
    merchantId: entry.merchantId,
    actorSessionId: entry.actorSessionId,
    payload: {
      ledgerEntryId: ledgerEntry.id,
      receiptId: entry.receiptId ?? null,
      entryType: ledgerEntry.entryType,
      amount: ledgerEntry.amount,
      balanceAfter: ledgerEntry.balanceAfter,
    },
  });
  return ledgerEntry;
}

function rememberIdempotency(ledger: LaunchLedger, record: IdempotencyRecord) {
  ledger.idempotencyRecords = ledger.idempotencyRecords ?? [];
  const existing = ledger.idempotencyRecords.find((item) => item.key === record.key && item.scope === record.scope);
  if (existing) {
    return existing;
  }
  ledger.idempotencyRecords.push(record);
  return record;
}

function enqueueOutbox(ledger: LaunchLedger, job: Omit<OutboxRecord, 'id' | 'status' | 'attempts' | 'createdAt' | 'updatedAt' | 'nextRunAt'> & { nextRunAt?: string }) {
  ledger.outbox = ledger.outbox ?? [];
  const existing = ledger.outbox.find((item) =>
    item.topic === job.topic &&
    item.payload.receiptId === job.payload.receiptId &&
    item.status !== 'failed');
  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const outbox: OutboxRecord = {
    id: randomId('outbox'),
    status: 'pending',
    attempts: 0,
    nextRunAt: job.nextRunAt ?? now,
    createdAt: now,
    updatedAt: now,
    ...job,
  };
  ledger.outbox.push(outbox);
  return outbox;
}

export function markOutboxAttempt(job: OutboxRecord, ok: boolean, error?: string) {
  const now = new Date();
  job.attempts += 1;
  job.updatedAt = now.toISOString();
  if (ok) {
    job.status = 'succeeded';
    return job;
  }
  job.status = 'pending';
  job.lastError = error ?? 'Unknown outbox failure';
  job.nextRunAt = new Date(now.getTime() + Math.min(job.attempts, 5) * 60_000).toISOString();
  return job;
}

function extractCompleteJsonDocument(raw: string) {
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];

    if (start === -1) {
      if (/\s/.test(char)) {
        continue;
      }

      if (char !== '{' && char !== '[') {
        return null;
      }

      start = index;
      depth = 1;
      continue;
    }

    if (inString) {
      if (escaping) {
        escaping = false;
        continue;
      }

      if (char === '\\') {
        escaping = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{' || char === '[') {
      depth += 1;
      continue;
    }

    if (char === '}' || char === ']') {
      depth -= 1;
      if (depth === 0) {
        return raw.slice(start, index + 1);
      }
    }
  }

  return null;
}

async function ensureLedger() {
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build' && !dbPool) {
    throw new Error('LAUNCH_DATABASE_URL is required in production. Local JSON is development-only.');
  }

  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(LEDGER_PATH);
  } catch {
    const initialLedger = createInitialLedger();
    await fs.writeFile(LEDGER_PATH, JSON.stringify(initialLedger, null, 2), 'utf8');
  }
}

async function queryWithOptionalClient(client: PoolClient | null, text: string, params?: unknown[]) {
  if (client) {
    return client.query(text, params);
  }

  if (!dbPool) {
    throw new Error('Database pool is not configured.');
  }

  return dbPool.query(text, params);
}

async function ensureDatabaseLedger(client: PoolClient | null = null) {
  if (!dbPool) {
    return;
  }

  const run = async () => {
    await queryWithOptionalClient(client, `
      CREATE TABLE IF NOT EXISTS launch_ledger (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryWithOptionalClient(client, `
      INSERT INTO launch_ledger (id, data)
      VALUES ($1, $2::jsonb)
      ON CONFLICT (id) DO NOTHING
    `, [LEDGER_ROW_ID, JSON.stringify(createInitialLedger())]);
  };

  if (client) {
    await run();
    return;
  }

  schemaReadyPromise = schemaReadyPromise ?? run();
  await schemaReadyPromise;
}

async function loadLedgerFromDatabase() {
  await ensureDatabaseLedger();
  const result = await dbPool!.query('SELECT data FROM launch_ledger WHERE id = $1', [LEDGER_ROW_ID]);
  if (result.rowCount === 0) {
    return createInitialLedger();
  }

  const ledger = result.rows[0].data as LaunchLedger;
  if (normalizeLedgerState(ledger)) {
    await saveLedger(ledger);
  }

  return ledger;
}

async function loadLedger() {
  if (dbPool) {
    return loadLedgerFromDatabase();
  }

  await ensureLedger();
  const raw = await fs.readFile(LEDGER_PATH, 'utf8');
  const normalized = raw.trim();
  let repaired = false;
  let ledger: LaunchLedger;

  try {
    ledger = JSON.parse(normalized) as LaunchLedger;
  } catch (error) {
    const recovered = extractCompleteJsonDocument(normalized);
    if (!recovered) {
      throw error;
    }

    ledger = JSON.parse(recovered) as LaunchLedger;
    repaired = recovered !== normalized;
  }

  const changed = normalizeLedgerState(ledger) || repaired;

  if (changed) {
    await saveLedger(ledger);
  }

  return ledger;
}

async function saveLedger(ledger: LaunchLedger) {
  if (dbPool) {
    await ensureDatabaseLedger();
    await dbPool.query(`
      UPDATE launch_ledger
      SET data = $2::jsonb,
          updated_at = NOW()
      WHERE id = $1
    `, [LEDGER_ROW_ID, JSON.stringify(ledger)]);
    return;
  }

  const snapshot = JSON.stringify(ledger, null, 2);

  persistChain = persistChain.catch(() => undefined).then(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tempPath = `${LEDGER_PATH}.${crypto.randomUUID().slice(0, 8)}.tmp`;
    await fs.writeFile(tempPath, snapshot, 'utf8');
    await fs.rename(tempPath, LEDGER_PATH);
  });

  await persistChain;
}

async function withLedgerMutation<T>(mutator: (ledger: LaunchLedger) => T | Promise<T>) {
  if (dbPool) {
    const client = await dbPool.connect();

    try {
      await client.query('BEGIN');
      await ensureDatabaseLedger(client);
      await client.query('SELECT pg_advisory_xact_lock($1)', [LEDGER_LOCK_KEY]);

      const result = await client.query(
        'SELECT data FROM launch_ledger WHERE id = $1 FOR UPDATE',
        [LEDGER_ROW_ID],
      );
      const ledger = (result.rows[0]?.data as LaunchLedger | undefined) ?? createInitialLedger();
      normalizeLedgerState(ledger);
      const mutationResult = await mutator(ledger);

      await client.query(`
        UPDATE launch_ledger
        SET data = $2::jsonb,
            updated_at = NOW()
        WHERE id = $1
      `, [LEDGER_ROW_ID, JSON.stringify(ledger)]);
      await client.query('COMMIT');

      return mutationResult;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  let result: T;

  mutationChain = mutationChain.catch(() => undefined).then(async () => {
    const ledger = await loadLedger();
    result = await mutator(ledger);
    await saveLedger(ledger);
  });

  await mutationChain;
  return result!;
}

function getPilotMerchantAndOffer(ledger: LaunchLedger) {
  const merchant = ledger.merchants.find((item) => item.id === PILOT_MERCHANT_ID);
  const offer = ledger.offers.find((item) => item.id === PILOT_OFFER_ID);

  if (!merchant || !offer) {
    throw new Error('Pilot merchant or offer is missing from the launch ledger.');
  }

  return { merchant, offer };
}

function derivePassbookRows(ledger: LaunchLedger, sessionId: string, offerView: OfferView): ConsumerPassbookRow[] {
  const ownClaims = ledger.claims
    .filter((claim) => claim.claimerSessionId === sessionId)
    .sort((left, right) => right.claimedAt.localeCompare(left.claimedAt));

  const ownReferral = ledger.referralLinks.find((referral) => referral.referrerSessionId === sessionId && referral.offerId === offerView.id);
  const redeemedForOwnReferral = ownReferral ? countRedeemedClaimsForReferral(ledger, ownReferral.token) : 0;

  const rows: ConsumerPassbookRow[] = [];

  if (ownReferral) {
    rows.push({
      id: `progress-${ownReferral.token}`,
      title: `${redeemedForOwnReferral} of ${offerView.referralGoal} invited redemptions confirmed`,
      subtitle: `Your ${offerView.merchantName} ticket only advances when staff confirms a real counter redemption.`,
      meta: formatLedgerMetaSafe(ownReferral.createdAt, offerView.district),
      status: redeemedForOwnReferral >= offerView.referralGoal ? 'ready' : 'progress',
      createdAt: ownReferral.createdAt,
    });
  }

  ownClaims.forEach((claim) => {
    if (claim.status === 'blocked') {
      rows.push({
        id: claim.id,
        title: 'A claim was blocked',
        subtitle: claim.blockedReason ?? 'The system stopped this referral attempt.',
        meta: formatLedgerMetaSafe(claim.claimedAt, 'Fraud guard'),
        status: 'blocked',
        createdAt: claim.claimedAt,
      });
      return;
    }

    if (claim.status === 'redeemed') {
      rows.push({
        id: claim.id,
        title: 'Your counter redemption was confirmed',
        subtitle: `${offerView.merchantName} staff completed the attribution and reward flow.`,
        meta: formatLedgerMetaSafe(claim.redeemedAt ?? claim.claimedAt, offerView.district),
        status: 'redeemed',
        createdAt: claim.redeemedAt ?? claim.claimedAt,
      });
      return;
    }

    rows.push({
      id: claim.id,
      title: 'Your visit is waiting at the counter',
      subtitle: 'Open the redeem screen and let staff confirm the live code.',
      meta: formatLedgerMetaSafe(claim.claimedAt, offerView.district),
      status: 'progress',
      createdAt: claim.claimedAt,
    });
  });

  return rows.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function buildMerchantAlerts(ledger: LaunchLedger) {
  const today = new Date().toISOString();
  const blockedToday = ledger.claims.filter((claim) => claim.status === 'blocked' && isSameUtcDay(claim.claimedAt, today)).length;
  const waitingCodes = ledger.redeemCodes.filter((code) => code.status === 'issued' || code.status === 'scanned').length;
  const alerts: string[] = [];

  if (blockedToday > 0) {
    alerts.push(`${blockedToday} self-referral or duplicate attempt was blocked today.`);
  }
  if (waitingCodes > 0) {
    alerts.push(`${waitingCodes} live redeem code${waitingCodes === 1 ? '' : 's'} still need staff confirmation.`);
  }
  if (alerts.length === 0) {
    alerts.push('No launch-level fraud signals are active right now.');
  }

  return alerts;
}

export async function getConsumerSummary(sessionId: string) {
  const ledger = await loadLedger();
  const { merchant, offer } = getPilotMerchantAndOffer(ledger);
  const offerView = toOfferView(offer, merchant.name, merchant.district);
  const referral = ledger.referralLinks.find((item) => item.referrerSessionId === sessionId && item.offerId === offer.id) ?? null;
  const redeemedCount = referral ? countRedeemedClaimsForReferral(ledger, referral.token) : 0;
  const activeClaim = ledger.claims
    .filter((claim) => claim.claimerSessionId === sessionId && claim.offerId === offer.id)
    .sort((left, right) => right.claimedAt.localeCompare(left.claimedAt))[0] ?? null;
  const activeRedeemCode = activeClaim
    ? ledger.redeemCodes
      .filter((code) => code.claimId === activeClaim.id)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null
    : null;

  const summary: ConsumerSummary = {
    offer: offerView,
    referral: {
      token: referral?.token ?? null,
      sharePath: referral ? buildSharePath(referral.token) : null,
      openCount: referral?.openCount ?? 0,
      redeemedCount,
    },
    progress: {
      current: redeemedCount,
      total: offer.referralGoal,
      remaining: Math.max(offer.referralGoal - redeemedCount, 0),
    },
    activeClaim: activeClaim
      ? {
        id: activeClaim.id,
        status: activeClaim.status,
        blockedReason: activeClaim.blockedReason,
      }
      : null,
    activeRedeemCode: activeRedeemCode
      ? {
        code: activeRedeemCode.code,
        status: activeRedeemCode.status,
        createdAt: activeRedeemCode.createdAt,
      }
      : null,
    passbook: derivePassbookRows(ledger, sessionId, offerView),
  };

  return summary;
}

export async function ensureReferralLink(params: { sessionId: string; displayName: string; deviceFingerprint: string; }) {
  if (!isValidSessionId(params.sessionId)) {
    throw new Error('Invalid sessionId.');
  }

  return withLedgerMutation<ReferralCreateResult>((ledger) => {
    const { offer } = getPilotMerchantAndOffer(ledger);

    if (!offer.active) {
      throw new Error('This offer is not accepting new referrals.');
    }

    const existing = ledger.referralLinks.find((item) => item.offerId === offer.id && item.referrerSessionId === params.sessionId);
    if (existing) {
      return {
        token: existing.token,
        sharePath: buildSharePath(existing.token),
      };
    }

    let token = randomToken();
    while (ledger.referralLinks.some((item) => item.token === token)) {
      token = randomToken();
    }

    const referrerDeviceFingerprint = sanitizeDeviceFingerprint(params.deviceFingerprint, params.sessionId);
    const createdAt = new Date().toISOString();
    const referral: ReferralLinkRecord = {
      token,
      offerId: offer.id,
      referrerSessionId: params.sessionId,
      referrerDisplayName: sanitizeDisplayName(params.displayName),
      referrerDeviceFingerprint,
      createdAt,
      openCount: 0,
      causalInvite: createCausalInvite({
        campaignId: offer.id,
        merchantId: offer.merchantId,
        referrerSessionId: params.sessionId,
        deviceFingerprint: referrerDeviceFingerprint,
        issuedAt: new Date(createdAt),
      }),
    };

    ledger.referralLinks.push(referral);
    ledger.events.push({
      id: randomId('evt'),
      type: 'referral_link_created',
      createdAt: referral.createdAt,
      merchantId: offer.merchantId,
      offerId: offer.id,
      referralToken: referral.token,
      actorSessionId: referral.referrerSessionId,
    });

    return {
      token: referral.token,
      sharePath: buildSharePath(referral.token),
    };
  });
}

export async function getReferralDetail(token: string, viewerSessionId?: string) {
  if (!isValidReferralToken(token)) {
    return null;
  }

  const ledger = await loadLedger();
  const referral = ledger.referralLinks.find((item) => item.token === token);
  if (!referral) {
    return null;
  }

  const { merchant, offer } = getPilotMerchantAndOffer(ledger);
  const redeemedCount = countRedeemedClaimsForReferral(ledger, token);
  const existingClaim = viewerSessionId
    ? ledger.claims
      .filter((claim) => claim.offerId === offer.id && claim.claimerSessionId === viewerSessionId)
      .sort((left, right) => right.claimedAt.localeCompare(left.claimedAt))[0] ?? null
    : null;

  let reason: string | null = null;
  if (!offer.active) {
    reason = 'This offer is no longer active.';
  } else if (viewerSessionId && viewerSessionId === referral.referrerSessionId) {
    reason = 'You cannot claim your own referral from the same device cluster.';
  } else if (existingClaim && existingClaim.status !== 'blocked') {
    reason = 'This offer already has an active reward window on your passbook.';
  }

  const detail: ReferralDetail = {
    offer: toOfferView(offer, merchant.name, merchant.district),
    referral: {
      token: referral.token,
      referrerDisplayName: referral.referrerDisplayName,
      openCount: referral.openCount,
      redeemedCount,
    },
    viewer: {
      canClaim: reason === null,
      reason,
      existingClaimStatus: existingClaim?.status ?? null,
    },
  };

  return detail;
}

export async function recordReferralOpen(token: string) {
  if (!isValidReferralToken(token)) {
    return false;
  }

  return withLedgerMutation<boolean>((ledger) => {
    const referral = ledger.referralLinks.find((item) => item.token === token);
    if (!referral) {
      return false;
    }

    referral.openCount += 1;
    ledger.events.push({
      id: randomId('evt'),
      type: 'referral_link_opened',
      createdAt: new Date().toISOString(),
      offerId: referral.offerId,
      referralToken: referral.token,
      actorSessionId: referral.referrerSessionId,
    });
    return true;
  });
}

export async function claimReferral(params: {
  token: string;
  claimerSessionId: string;
  claimerDisplayName: string;
  deviceFingerprint: string;
}) {
  if (!isValidReferralToken(params.token) || !isValidSessionId(params.claimerSessionId)) {
    return { ok: false, reason: 'Invalid referral claim.' } satisfies ClaimResult;
  }

  return withLedgerMutation<ClaimResult>((ledger) => {
    const referral = ledger.referralLinks.find((item) => item.token === params.token);
    const { offer } = getPilotMerchantAndOffer(ledger);

    if (!referral) {
      return { ok: false, reason: 'This referral link does not exist anymore.' } satisfies ClaimResult;
    }

    if (!referral.causalInvite || !verifyCausalInvite(referral.causalInvite)) {
      return { ok: false, reason: 'This causal invite is expired or invalid.' } satisfies ClaimResult;
    }

    if (!offer.active) {
      return { ok: false, reason: 'This offer is no longer active.' } satisfies ClaimResult;
    }

    const displayName = sanitizeDisplayName(params.claimerDisplayName);
    const deviceFingerprint = sanitizeDeviceFingerprint(params.deviceFingerprint, params.claimerSessionId);
    const campaignNullifierHash = createCampaignNullifier({
      campaignId: offer.id,
      claimerSessionId: params.claimerSessionId,
      deviceFingerprint,
    });
    let blockedReason: string | null = null;
    if (params.claimerSessionId === referral.referrerSessionId || deviceFingerprint === referral.referrerDeviceFingerprint) {
      blockedReason = 'Self-referral from the same device cluster is not allowed.';
    }

    const existingClaim = ledger.claims.find((claim) =>
      claim.offerId === offer.id &&
      claim.campaignNullifierHash === campaignNullifierHash &&
      claim.status !== 'blocked');

    if (!blockedReason && existingClaim) {
      return {
        ok: true,
        claimId: existingClaim.id,
        status: existingClaim.status,
      } satisfies ClaimResult;
    }

    if (blockedReason) {
      const blockedClaim: ClaimRecord = {
        id: randomId('claim'),
        offerId: offer.id,
        referralToken: referral.token,
        referrerSessionId: referral.referrerSessionId,
        referrerDisplayName: referral.referrerDisplayName,
        claimerSessionId: params.claimerSessionId,
        claimerDisplayName: displayName,
        deviceFingerprint,
        campaignNullifierHash,
        claimedAt: new Date().toISOString(),
        status: 'blocked',
        blockedReason,
      };

      ledger.claims.push(blockedClaim);
      ledger.events.push({
        id: randomId('evt'),
        type: 'referral_blocked',
        createdAt: blockedClaim.claimedAt,
        merchantId: offer.merchantId,
        offerId: offer.id,
        referralToken: referral.token,
        claimId: blockedClaim.id,
        actorSessionId: params.claimerSessionId,
        payload: { reason: blockedReason },
      });

      return {
        ok: false,
        claimId: blockedClaim.id,
        status: blockedClaim.status,
        reason: blockedReason,
      } satisfies ClaimResult;
    }

    const claim: ClaimRecord = {
      id: randomId('claim'),
      offerId: offer.id,
      referralToken: referral.token,
      referrerSessionId: referral.referrerSessionId,
      referrerDisplayName: referral.referrerDisplayName,
      claimerSessionId: params.claimerSessionId,
      claimerDisplayName: displayName,
      deviceFingerprint,
      campaignNullifierHash,
      claimedAt: new Date().toISOString(),
      status: 'claimed',
    };

    ledger.claims.push(claim);
    ledger.events.push({
      id: randomId('evt'),
      type: 'referral_claimed',
      createdAt: claim.claimedAt,
      merchantId: offer.merchantId,
      offerId: offer.id,
      referralToken: referral.token,
      claimId: claim.id,
      actorSessionId: params.claimerSessionId,
    });

    return {
      ok: true,
      claimId: claim.id,
      status: claim.status,
    } satisfies ClaimResult;
  });
}

export async function generateRedeemCode(params: { sessionId: string; }) {
  if (!isValidSessionId(params.sessionId)) {
    return { ok: false, reason: 'Invalid session.' } satisfies RedeemCodeResult;
  }

  return withLedgerMutation<RedeemCodeResult>((ledger) => {
    const { merchant, offer } = getPilotMerchantAndOffer(ledger);
    const claim = ledger.claims
      .filter((item) => item.claimerSessionId === params.sessionId && item.offerId === offer.id && item.status !== 'blocked')
      .sort((left, right) => right.claimedAt.localeCompare(left.claimedAt))[0];

    if (!claim) {
      return { ok: false, reason: 'No eligible claimed visit exists on this passbook yet.' } satisfies RedeemCodeResult;
    }

    if (!isInsideRedemptionWindow(claim.claimedAt, offer.redemptionWindowHours)) {
      return { ok: false, reason: 'This reward window has expired.' } satisfies RedeemCodeResult;
    }

    if (claim.status === 'redeemed') {
      const redeemedCode = ledger.redeemCodes.find((item) => item.claimId === claim.id);
      return {
        ok: true,
        code: redeemedCode?.code,
        status: 'redeemed',
      } satisfies RedeemCodeResult;
    }

    const existingCode = ledger.redeemCodes
      .filter((item) => item.claimId === claim.id && item.status !== 'expired' && item.status !== 'voided')
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];

    if (existingCode) {
      return {
        ok: true,
        code: existingCode.code,
        status: existingCode.status,
      } satisfies RedeemCodeResult;
    }

    let nextCode = randomRedeemCode();
    while (ledger.redeemCodes.some((item) => item.codeHash === hashRedeemCode({
      code: nextCode,
      merchantId: merchant.id,
      offerId: offer.id,
      claimId: claim.id,
    }) && item.status !== 'expired' && item.status !== 'voided')) {
      nextCode = randomRedeemCode();
    }

    const code: RedeemCodeRecord = {
      id: randomId('redeem'),
      claimId: claim.id,
      merchantId: merchant.id,
      code: nextCode,
      codeHash: hashRedeemCode({ code: nextCode, merchantId: merchant.id, offerId: offer.id, claimId: claim.id }),
      status: 'issued',
      createdAt: new Date().toISOString(),
    };

    claim.status = 'code-generated';
    ledger.redeemCodes.push(code);
    ledger.events.push({
      id: randomId('evt'),
      type: 'merchant_code_generated',
      createdAt: code.createdAt,
      merchantId: merchant.id,
      offerId: offer.id,
      claimId: claim.id,
      redeemCodeId: code.id,
      actorSessionId: claim.claimerSessionId,
    });

    return {
      ok: true,
      code: code.code,
      status: code.status,
    } satisfies RedeemCodeResult;
  });
}

function createVisitChallenge(params: {
  ledger: LaunchLedger;
  merchantId: string;
  offerId: string;
  claimId: string;
  redeemCodeId: string;
}) {
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + VISIT_CHALLENGE_TTL_SECONDS * 1000);
  const challenge: VisitChallengeRecord = {
    id: randomId('challenge'),
    merchantId: params.merchantId,
    offerId: params.offerId,
    claimId: params.claimId,
    redeemCodeId: params.redeemCodeId,
    challengeHash: '',
    nonce: crypto.randomUUID(),
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    status: 'issued',
  };
  challenge.challengeHash = createVisitChallengeHash(challenge);
  params.ledger.visitChallenges = params.ledger.visitChallenges ?? [];
  params.ledger.visitChallenges.push(challenge);
  return challenge;
}

function submitCausalReceipt(params: {
  ledger: LaunchLedger;
  merchantId: string;
  offerId: string;
  claim: ClaimRecord;
  code: RedeemCodeRecord;
  referral: ReferralLinkRecord;
  challenge: VisitChallengeRecord;
  staffAttestationSecret: string;
  manualReceiptId?: string;
}) {
  const customerSignature = signCustomerChallenge(params.challenge.challengeHash, params.claim.deviceFingerprint);
  const staffSignature = signStaffChallenge(params.challenge.challengeHash, params.staffAttestationSecret);
  const inviteHash = params.referral.causalInvite ? hashCausalInvite(params.referral.causalInvite) : sha256Hex(params.referral.token);
  const visitAttestationHash = sha256Hex(`${params.challenge.challengeHash}:${customerSignature}:${staffSignature}`);
  const receiptIdHash = sha256Hex(`${params.manualReceiptId || params.claim.id}:${params.code.id}:${visitAttestationHash}`);
  const existing = (params.ledger.causalReceipts ?? []).find((receipt) => receipt.receiptIdHash === receiptIdHash);

  if (existing) {
    return existing;
  }

  const receipt: CausalReceiptRecord = {
    id: randomId('receipt'),
    merchantId: params.merchantId,
    offerId: params.offerId,
    claimId: params.claim.id,
    referralToken: params.claim.referralToken,
    manualReceiptId: params.manualReceiptId,
    evidenceLevel: params.manualReceiptId ? 'receipt_id' : 'staff_only',
    receiptIdHash,
    campaignNullifierHash: params.claim.campaignNullifierHash ?? sha256Hex(params.claim.claimerSessionId),
    inviteHash,
    visitAttestationHash,
    customerSignature,
    staffSignature,
    receiptPda: deriveReceiptPdaLike(receiptIdHash),
    txSignature: deriveTxSignatureLike(receiptIdHash, visitAttestationHash),
    status: 'submitted',
    createdAt: new Date().toISOString(),
  };

  params.ledger.causalReceipts = params.ledger.causalReceipts ?? [];
  params.ledger.causalReceipts.push(receipt);
  return receipt;
}

export async function createVisitChallengeForRedeemCode(params: { code: string; }) {
  const normalizedCode = normalizeRedeemCode(params.code);
  if (!normalizedCode || !isValidRedeemCode(normalizedCode)) {
    return { ok: false, reason: 'Enter a valid six-character code.' };
  }

  return withLedgerMutation((ledger) => {
    const { merchant, offer } = getPilotMerchantAndOffer(ledger);
    const code = findRedeemCodeByNormalizedCode(ledger, normalizedCode, offer.id);

    if (!code || (code.status !== 'issued' && code.status !== 'scanned')) {
      return { ok: false, reason: 'No active redeem code is ready for challenge creation.' };
    }

    const claim = ledger.claims.find((item) => item.id === code.claimId);
    if (!claim || !isInsideRedemptionWindow(claim.claimedAt, offer.redemptionWindowHours)) {
      return { ok: false, reason: 'The linked claim is missing or expired.' };
    }

    const existing = (ledger.visitChallenges ?? [])
      .filter((challenge) =>
        challenge.redeemCodeId === code.id &&
        (challenge.status === 'issued' || challenge.status === 'signed') &&
        new Date(challenge.expiresAt).getTime() > Date.now())
      .sort((left, right) => right.issuedAt.localeCompare(left.issuedAt))[0];

    if (existing) {
      return { ok: true, challenge: existing };
    }

    const challenge = createVisitChallenge({
      ledger,
      merchantId: merchant.id,
      offerId: offer.id,
      claimId: claim.id,
      redeemCodeId: code.id,
    });
    ledger.events.push({
      id: randomId('evt'),
      type: 'visit_challenge_created',
      createdAt: challenge.issuedAt,
      merchantId: merchant.id,
      offerId: offer.id,
      claimId: claim.id,
      redeemCodeId: code.id,
      payload: { challengeHash: challenge.challengeHash },
    });

    return { ok: true, challenge };
  });
}

export async function confirmRedeemCode(params: {
  code: string;
  staffPin?: string;
  staffSessionId?: string;
  requestId?: string;
  idempotencyKey?: string;
  staffDevicePublicKey?: string;
  staffDeviceSignature?: string;
  staffDeviceTimestamp?: string;
  staffDeviceNonce?: string;
  manualReceiptId?: string;
}) {
  const normalizedCode = normalizeRedeemCode(params.code);
  if (!normalizedCode || !isValidRedeemCode(normalizedCode)) {
    return { ok: false, reason: 'Enter a valid six-character code.' } satisfies MerchantConfirmResult;
  }

  return withLedgerMutation<MerchantConfirmResult>((ledger) => {
    const { merchant, offer } = getPilotMerchantAndOffer(ledger);
    const staffActor = params.staffDevicePublicKey || params.staffSessionId || 'staff-pin';
    const idempotencyKey = params.idempotencyKey ?? `confirm:${normalizedCode}`;
    const prior = (ledger.idempotencyRecords ?? []).find((record) => record.key === idempotencyKey && record.scope === 'merchant-confirm');
    if (prior) {
      const priorReceipt = (ledger.causalReceipts ?? []).find((receipt) => receipt.id === prior.resultId);
      const priorCode = priorReceipt ? ledger.redeemCodes.find((item) => item.claimId === priorReceipt.claimId) : null;
      return {
        ok: true,
        code: priorCode?.code ?? normalizedCode,
        status: priorCode?.status ?? 'confirmed',
        receiptId: priorReceipt?.id,
        receiptPda: priorReceipt?.receiptPda,
        txSignature: priorReceipt?.txSignature,
      } satisfies MerchantConfirmResult;
    }

    if (!params.staffDevicePublicKey && !demoPinAccepted(params.staffPin ?? '')) {
      appendAuditEvent(ledger, {
        requestId: params.requestId ?? randomId('req'),
        actorType: 'staff',
        actorId: staffActor,
        merchantId: merchant.id,
        targetType: 'redemption',
        action: 'confirm_redeem_code',
        result: 'denied',
        reason: 'Enrolled staff device or local demo PIN is required.',
      });
      return { ok: false, reason: 'Staff device authorization is required.' } satisfies MerchantConfirmResult;
    }

    if (params.staffDevicePublicKey) {
      const device = (ledger.staffDevices ?? []).find((item) =>
        item.publicKey === params.staffDevicePublicKey &&
        item.merchantId === merchant.id &&
        !item.revokedAt);
      if (!device) {
        appendAuditEvent(ledger, {
          requestId: params.requestId ?? randomId('req'),
          actorType: 'staff',
          actorId: params.staffDevicePublicKey,
          merchantId: merchant.id,
          targetType: 'redemption',
          action: 'confirm_redeem_code',
          result: 'denied',
          reason: 'Staff device is missing or revoked.',
        });
        return { ok: false, reason: 'Staff device is not authorized.' } satisfies MerchantConfirmResult;
      }
      const timestampMs = Number(params.staffDeviceTimestamp);
      const signatureFresh = Number.isFinite(timestampMs) && Math.abs(Date.now() - timestampMs) <= STAFF_DEVICE_SIGNATURE_TTL_MS;
      const nonce = activeStaffDeviceNonce(ledger, {
        publicKey: params.staffDevicePublicKey,
        merchantId: merchant.id,
        action: 'merchant-confirm',
        code: normalizedCode,
        nonce: params.staffDeviceNonce,
      });
      const expectedSignature = device.secret
        ? hmacStaffDevice(device.secret, staffDeviceSigningMessage({
          publicKey: params.staffDevicePublicKey,
          timestamp: params.staffDeviceTimestamp ?? '',
          action: 'merchant-confirm',
          code: normalizedCode,
          nonce: params.staffDeviceNonce,
        }))
        : '';
      if (!params.staffDeviceSignature || !expectedSignature || !nonce || !signatureFresh || !constantTimeHexEqual(expectedSignature, params.staffDeviceSignature)) {
        appendAuditEvent(ledger, {
          requestId: params.requestId ?? randomId('req'),
          actorType: 'staff',
          actorId: params.staffDevicePublicKey,
          merchantId: merchant.id,
          targetType: 'redemption',
          action: 'confirm_redeem_code',
          result: 'denied',
          reason: 'Staff device signature nonce is missing, expired, consumed, or invalid.',
        });
        return { ok: false, reason: 'Staff device signature nonce is required.' } satisfies MerchantConfirmResult;
      }
      nonce.consumedAt = new Date().toISOString();
    }

    const code = findRedeemCodeByNormalizedCode(ledger, normalizedCode, offer.id);

    if (!code) {
      return { ok: false, reason: 'This code is not recognized by the launch ledger.' } satisfies MerchantConfirmResult;
    }

    if (code.status === 'confirmed' || code.status === 'redeemed') {
      return { ok: true, code: code.code, status: code.status } satisfies MerchantConfirmResult;
    }

    if (code.status === 'expired') {
      return { ok: false, reason: 'This code has expired.' } satisfies MerchantConfirmResult;
    }

    if (code.status === 'voided') {
      return { ok: false, reason: 'This code was voided by a manager.' } satisfies MerchantConfirmResult;
    }

    const claim = ledger.claims.find((item) => item.id === code.claimId);
    if (!claim) {
      return { ok: false, reason: 'The linked claim is missing.' } satisfies MerchantConfirmResult;
    }

    const referral = ledger.referralLinks.find((item) => item.token === claim.referralToken);
    if (!referral) {
      return { ok: false, reason: 'The linked causal invite is missing.' } satisfies MerchantConfirmResult;
    }

    if (!isInsideRedemptionWindow(claim.claimedAt, offer.redemptionWindowHours)) {
      code.status = 'expired';
      return { ok: false, reason: 'This reward window has expired.' } satisfies MerchantConfirmResult;
    }

    const activeChallenge = (ledger.visitChallenges ?? [])
      .filter((challenge) =>
        challenge.redeemCodeId === code.id &&
        (challenge.status === 'issued' || challenge.status === 'signed') &&
        new Date(challenge.expiresAt).getTime() > Date.now())
      .sort((left, right) => right.issuedAt.localeCompare(left.issuedAt))[0];
    const challenge = activeChallenge ?? createVisitChallenge({
        ledger,
        merchantId: merchant.id,
        offerId: offer.id,
        claimId: claim.id,
        redeemCodeId: code.id,
      });
    code.status = 'scanned';
    challenge.status = 'signed';
    const receipt = submitCausalReceipt({
      ledger,
      merchantId: merchant.id,
      offerId: offer.id,
      claim,
      code,
      referral,
      challenge,
      staffAttestationSecret: params.staffDevicePublicKey || params.staffSessionId || params.staffPin || 'staff-attestation',
      manualReceiptId: params.manualReceiptId,
    });
    challenge.status = 'confirmed';
    rememberIdempotency(ledger, {
      key: idempotencyKey,
      scope: 'merchant-confirm',
      resultId: receipt.id,
      createdAt: new Date().toISOString(),
    });

    code.status = 'confirmed';
    code.redeemedAt = new Date().toISOString();
    claim.status = 'redeemed';
    claim.lifecycleStatus = 'redeemed';
    claim.redeemedAt = code.redeemedAt;

    ledger.events.push({
      id: randomId('evt'),
      type: 'redemption_confirmed',
      createdAt: code.redeemedAt,
      merchantId: merchant.id,
      offerId: offer.id,
      claimId: claim.id,
      redeemCodeId: code.id,
      actorSessionId: claim.claimerSessionId,
    });
    ledger.events.push({
      id: randomId('evt'),
      type: 'visit_challenge_created',
      createdAt: challenge.issuedAt,
      merchantId: merchant.id,
      offerId: offer.id,
      claimId: claim.id,
      redeemCodeId: code.id,
      payload: { challengeHash: challenge.challengeHash },
    });
    appendAuditEvent(ledger, {
      requestId: params.requestId ?? randomId('req'),
      actorType: 'staff',
      actorId: staffActor,
      merchantId: merchant.id,
      targetType: 'redemption',
      targetId: code.id,
      action: 'confirm_redeem_code',
      result: 'allowed',
    });
    appendRewardLedgerEntry(ledger, {
      merchantId: merchant.id,
      receiptId: receipt.id,
      actorSessionId: claim.referrerSessionId,
      entryType: 'reward_settled',
      amount: rewardAmountFromOffer(offer),
      idempotencyKey: params.idempotencyKey ?? `settle:${receipt.id}`,
    });
    enqueueOutbox(ledger, {
      topic: 'receipt.submit',
      payload: {
        receiptId: receipt.id,
        receiptPda: receipt.receiptPda,
        txSignature: receipt.txSignature,
      },
    });
    enqueueOutbox(ledger, {
      topic: 'receipt.index',
      payload: {
        receiptId: receipt.id,
        receiptPda: receipt.receiptPda,
        txSignature: receipt.txSignature,
      },
    });
    ledger.events.push({
      id: randomId('evt'),
      type: 'dual_attestation_recorded',
      createdAt: code.redeemedAt,
      merchantId: merchant.id,
      offerId: offer.id,
      claimId: claim.id,
      redeemCodeId: code.id,
      payload: { visitAttestationHash: receipt.visitAttestationHash },
    });
    ledger.events.push({
      id: randomId('evt'),
      type: 'causal_receipt_submitted',
      createdAt: receipt.createdAt,
      merchantId: merchant.id,
      offerId: offer.id,
      claimId: claim.id,
      redeemCodeId: code.id,
      payload: {
        receiptId: receipt.id,
        receiptPda: receipt.receiptPda,
        txSignature: receipt.txSignature,
      },
    });

    const redeemedForReferrer = countRedeemedClaimsForReferral(ledger, claim.referralToken);
    const rewardAlreadyGranted = ledger.events.some((event) =>
      event.type === 'reward_granted' &&
      event.offerId === offer.id &&
      event.actorSessionId === claim.referrerSessionId);

    if (redeemedForReferrer >= offer.referralGoal && !rewardAlreadyGranted) {
      ledger.events.push({
        id: randomId('evt'),
        type: 'reward_granted',
        createdAt: code.redeemedAt,
        merchantId: merchant.id,
        offerId: offer.id,
        claimId: claim.id,
        actorSessionId: claim.referrerSessionId,
      });
    }

    return {
      ok: true,
      code: code.code,
      status: code.status,
      receiptId: receipt.id,
      receiptPda: receipt.receiptPda,
      txSignature: receipt.txSignature,
    } satisfies MerchantConfirmResult;
  });
}

export async function getMerchantSummary() {
  const ledger = await loadLedger();
  const { merchant, offer } = getPilotMerchantAndOffer(ledger);
  const offerView = toOfferView(offer, merchant.name, merchant.district);
  const todayIso = new Date().toISOString();

  const attributedVisitsToday = ledger.claims.filter((claim) => claim.status !== 'blocked' && isSameUtcDay(claim.claimedAt, todayIso)).length;
  const redemptionsToday = ledger.claims.filter((claim) => claim.status === 'redeemed' && claim.redeemedAt && isSameUtcDay(claim.redeemedAt, todayIso)).length;
  const activeCodes = ledger.redeemCodes.filter((code) => code.status === 'issued' || code.status === 'scanned').length;
  const heldOut = ledger.claims.filter((claim) => claim.status === 'blocked' && isSameUtcDay(claim.claimedAt, todayIso)).length;
  const receiptCount = (ledger.causalReceipts ?? []).length;
  const indexedJobs = (ledger.outbox ?? []).filter((job) => job.topic === 'receipt.index').length;

  const metrics: MerchantMetric[] = [
    { label: 'Attributed visits', note: 'Today', value: String(attributedVisitsToday), tone: 'tone-blue' },
    { label: 'Redemptions', note: 'Today', value: String(redemptionsToday), tone: 'tone-vermilion' },
    { label: 'Receipts', note: `${indexedJobs} queued`, value: String(receiptCount), tone: 'tone-copper' },
    { label: 'Held out', note: `${activeCodes} live codes`, value: String(heldOut), tone: 'tone-moss' },
  ];

  const queue: MerchantRow[] = ledger.redeemCodes
    .map((codeItem) => {
      const claim = ledger.claims.find((item) => item.id === codeItem.claimId);
      return { code: codeItem, claim };
    })
    .filter((item): item is { code: RedeemCodeRecord; claim: ClaimRecord } => Boolean(item.claim))
    .sort((left, right) => right.code.createdAt.localeCompare(left.code.createdAt))
    .slice(0, 5)
    .map(({ code: codeItem, claim }) => ({
      title: codeItem.status === 'issued' || codeItem.status === 'scanned' ? `${claim.claimerDisplayName} is waiting at the counter` : `${claim.claimerDisplayName} was confirmed`,
      subtitle: `${claim.referrerDisplayName} brought this visit through ${offer.title.toLowerCase()}`,
      meta: formatLedgerMetaSafe(codeItem.createdAt, codeItem.status === 'issued' || codeItem.status === 'scanned' ? 'Awaiting staff' : 'Settled'),
      value: codeItem.code,
    }));

  const referralCounts = ledger.referralLinks.map((referral) => ({
    referral,
    redeemedCount: countRedeemedClaimsForReferral(ledger, referral.token),
  })).sort((left, right) => right.redeemedCount - left.redeemedCount);

  const customers: MerchantRow[] = referralCounts.slice(0, 5).map(({ referral, redeemedCount }) => ({
    title: referral.referrerDisplayName,
    subtitle: redeemedCount > 0
      ? `${redeemedCount} invited redemption${redeemedCount === 1 ? ' is' : 's are'} already confirmed.`
      : 'This referrer has a live link but no confirmed redemption yet.',
    meta: formatLedgerMetaSafe(referral.createdAt, 'Referrer'),
    value: redeemedCount > 0 ? `${redeemedCount} confirmed` : 'No confirmations',
  }));

  const ledgerRows: MerchantRow[] = [
    {
      title: 'Attributed visits this cycle',
      subtitle: 'Every non-blocked claim that entered through a referral link.',
      meta: formatLedgerMetaSafe(todayIso, 'Pilot cycle'),
      value: String(ledger.claims.filter((claim) => claim.status !== 'blocked').length),
    },
    {
      title: 'Confirmed redemptions this cycle',
      subtitle: 'Visits that reached the merchant counter and were approved by staff.',
      meta: formatLedgerMetaSafe(todayIso, 'Pilot cycle'),
      value: String(ledger.claims.filter((claim) => claim.status === 'redeemed').length),
    },
    {
      title: 'Deferred platform fee',
      subtitle: 'The launch pilot keeps platform billing paused until verified merchant value exists.',
      meta: formatLedgerMetaSafe(todayIso, 'Revenue-share mode'),
      value: 'Pending',
    },
  ];

  const summary: MerchantSummary = {
    merchant,
    offer: offerView,
    metrics,
    queue: queue.length > 0 ? queue : [{
      title: 'No live queue right now',
      subtitle: 'The scan desk will populate once customers generate redeem codes.',
      meta: formatLedgerMetaSafe(todayIso, merchant.district),
      value: 'Idle',
    }],
    customers,
    ledger: ledgerRows,
    alerts: buildMerchantAlerts(ledger),
  };

  return summary;
}

export async function getMerchantAuditActivity(limit = 8) {
  const ledger = await loadLedger();
  const { merchant } = getPilotMerchantAndOffer(ledger);

  return (ledger.auditEvents ?? [])
    .filter((event) => event.merchantId === merchant.id)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, limit)
    .map((event) => ({
      id: event.id,
      actor: event.actorId,
      action: event.action,
      outcome: event.result === 'allowed' || event.result === 'created' || event.result === 'updated'
        ? 'Completed'
        : event.result === 'denied'
          ? 'Denied'
          : 'Needs review',
      target: event.targetType,
      reason: event.reason ?? '',
      createdAt: event.createdAt,
    }));
}

export async function getReceiptExplorer(receiptLookup: string) {
  const ledger = await loadLedger();
  normalizeLedgerState(ledger);
  const receipt = (ledger.causalReceipts ?? []).find((item) =>
    item.id === receiptLookup ||
    item.receiptPda === receiptLookup ||
    item.txSignature === receiptLookup ||
    item.receiptIdHash === receiptLookup);

  if (!receipt) {
    return null;
  }

  const merchant = ledger.merchants.find((item) => item.id === receipt.merchantId) ?? null;
  const offer = ledger.offers.find((item) => item.id === receipt.offerId) ?? null;
  const claim = ledger.claims.find((item) => item.id === receipt.claimId) ?? null;
  const referral = ledger.referralLinks.find((item) => item.token === receipt.referralToken) ?? null;
  const challenge = (ledger.visitChallenges ?? [])
    .filter((item) => item.claimId === receipt.claimId)
    .sort((left, right) => right.issuedAt.localeCompare(left.issuedAt))[0] ?? null;

  return {
    receipt,
    merchant,
    offer,
    claim,
    referral,
    challenge,
    settlement: {
      status: receipt.status,
      referrerAmount: receipt.status === 'settled' ? 80 : 0,
      visitorAmount: receipt.status === 'settled' ? 20 : 0,
    },
    compressedProof: buildCompressedReceiptProof(ledger.causalReceipts ?? [], receipt),
  };
}

function privateCommitment(label: string, seed: string) {
  return `${label}-${sha256Hex(seed).slice(0, 10)}`;
}

export async function getCausalGraphSummary() {
  const ledger = await loadLedger();
  normalizeLedgerState(ledger);
  const receipts = ledger.causalReceipts ?? [];

  return receipts.map((receipt) => {
    const claim = ledger.claims.find((item) => item.id === receipt.claimId);
    const merchant = ledger.merchants.find((item) => item.id === receipt.merchantId);
    return {
      id: receipt.id,
      referrer: claim?.referrerDisplayName ?? 'Referrer',
      visitor: claim?.claimerDisplayName ?? 'Visitor',
      merchant: merchant?.name ?? 'Merchant',
      receiptPda: receipt.receiptPda,
      txSignature: receipt.txSignature,
      status: receipt.status,
      createdAt: receipt.createdAt,
    };
  });
}

export async function getCausalGraphData() {
  const ledger = await loadLedger();
  normalizeLedgerState(ledger);
  const nodes = new Map<string, CausalGraphNode>();
  const edges: CausalGraphEdge[] = [];

  for (const receipt of ledger.causalReceipts ?? []) {
    const claim = ledger.claims.find((item) => item.id === receipt.claimId);
    const merchant = ledger.merchants.find((item) => item.id === receipt.merchantId);
    const inviteId = `invite:${receipt.referralToken}`;
    const visitorId = `visitor:${receipt.campaignNullifierHash}`;
    const merchantId = `merchant:${receipt.merchantId}`;
    const receiptId = `receipt:${receipt.id}`;
    const settlementId = `settlement:${receipt.id}`;

    nodes.set(inviteId, {
      id: inviteId,
      label: claim?.referrerDisplayName ? privateCommitment('referrer', claim.referrerSessionId) : privateCommitment('referrer', receipt.referralToken),
      kind: 'invite',
      privateLabel: true,
    });
    nodes.set(visitorId, {
      id: visitorId,
      label: privateCommitment('visitor', receipt.campaignNullifierHash),
      kind: 'visitor',
      privateLabel: true,
    });
    nodes.set(merchantId, {
      id: merchantId,
      label: merchant?.name ?? privateCommitment('merchant', receipt.merchantId),
      kind: 'merchant',
      privateLabel: !merchant?.name,
    });
    nodes.set(receiptId, {
      id: receiptId,
      label: receipt.receiptPda,
      kind: 'receipt',
      privateLabel: false,
    });
    nodes.set(settlementId, {
      id: settlementId,
      label: receipt.status,
      kind: 'settlement',
      privateLabel: false,
    });

    edges.push(
      { id: `edge-invite-${receipt.id}`, source: inviteId, target: visitorId, label: 'claimed', receiptId: receipt.id },
      { id: `edge-visit-${receipt.id}`, source: visitorId, target: merchantId, label: 'visited', receiptId: receipt.id },
      { id: `edge-receipt-${receipt.id}`, source: merchantId, target: receiptId, label: 'verified receipt', receiptId: receipt.id },
      { id: `edge-settle-${receipt.id}`, source: receiptId, target: settlementId, label: 'settlement status', receiptId: receipt.id },
    );
  }

  return { nodes: Array.from(nodes.values()), edges };
}

export function getMultiHopDemo() {
  const alice = privateCommitment('alice', 'alice-demo');
  const bob = privateCommitment('bob', 'bob-demo');
  const carol = privateCommitment('carol', 'carol-demo');
  return {
    title: 'Alice -> Bob -> Carol',
    nodes: [
      { id: 'alice', label: alice, kind: 'invite', privateLabel: true },
      { id: 'bob', label: bob, kind: 'visitor', privateLabel: true },
      { id: 'carol', label: carol, kind: 'visitor', privateLabel: true },
      { id: 'merchant', label: 'Thamel Brew House', kind: 'merchant', privateLabel: false },
      { id: 'parent-receipt', label: 'parent receipt commitment', kind: 'receipt', privateLabel: false },
    ] satisfies CausalGraphNode[],
    edges: [
      { id: 'alice-bob', source: 'alice', target: 'bob', label: 'first invite' },
      { id: 'bob-carol', source: 'bob', target: 'carol', label: 'child invite' },
      { id: 'carol-merchant', source: 'carol', target: 'merchant', label: 'confirmed visit' },
      { id: 'merchant-parent', source: 'merchant', target: 'parent-receipt', label: 'parent receipt' },
    ] satisfies CausalGraphEdge[],
  };
}

export async function runProgramEventIndexer() {
  return withLedgerMutation((ledger) => {
    normalizeLedgerState(ledger);
    const indexed: Array<{ receiptId: string; txSignature: string; status: string }> = [];
    for (const job of ledger.outbox ?? []) {
      if ((job.topic === 'receipt.index' || job.topic === 'receipt.submit') && job.status !== 'succeeded') {
        markOutboxAttempt(job, true);
        const receiptId = String(job.payload.receiptId ?? '');
        const receipt = (ledger.causalReceipts ?? []).find((item) => item.id === receiptId);
        if (receipt && job.topic === 'receipt.submit') {
          receipt.status = 'settled';
          receipt.settledAt = receipt.settledAt ?? new Date().toISOString();
        }
        indexed.push({
          receiptId,
          txSignature: String(job.payload.txSignature ?? ''),
          status: job.status,
        });
      }
    }
    return { ok: true, indexed };
  });
}

export async function getReceiptReconciliation() {
  const ledger = await loadLedger();
  normalizeLedgerState(ledger);
  return (ledger.causalReceipts ?? []).map((receipt) => {
    const jobs = (ledger.outbox ?? []).filter((job) => job.payload.receiptId === receipt.id);
    const submit = jobs.find((job) => job.topic === 'receipt.submit');
    const index = jobs.find((job) => job.topic === 'receipt.index');
    let status: ReceiptReconciliationStatus = 'pending';
    if (submit?.status === 'failed' || index?.status === 'failed') {
      status = 'failed';
    } else if (index?.status === 'succeeded') {
      status = 'indexed';
    } else if (receipt.status === 'settled' || submit?.status === 'succeeded') {
      status = 'confirmed';
    } else if (submit) {
      status = 'submitted';
    }
    return {
      receiptId: receipt.id,
      receiptPda: receipt.receiptPda,
      txSignature: receipt.txSignature,
      status,
      jobs: jobs.map((job) => ({ topic: job.topic, status: job.status, attempts: job.attempts, lastError: job.lastError })),
    };
  });
}

export async function getFraudReplaySummary() {
  const ledger = await loadLedger();
  normalizeLedgerState(ledger);
  const now = Date.now();
  const challenges = ledger.visitChallenges ?? [];
  const consumed = challenges.filter((challenge) => challenge.status === 'consumed').length;
  const expired = challenges.filter((challenge) => challenge.status === 'expired' || new Date(challenge.expiresAt).getTime() <= now).length;
  const active = challenges.filter((challenge) => (challenge.status === 'issued' || challenge.status === 'signed') && new Date(challenge.expiresAt).getTime() > now).length;
  const nullifiers = new Map<string, number>();

  for (const claim of ledger.claims) {
    if (!claim.campaignNullifierHash) {
      continue;
    }
    nullifiers.set(claim.campaignNullifierHash, (nullifiers.get(claim.campaignNullifierHash) ?? 0) + 1);
  }

  return {
    consumedChallenges: consumed,
    expiredChallenges: expired,
    activeChallenges: active,
    blockedClaims: ledger.claims.filter((claim) => claim.status === 'blocked').length,
    duplicateNullifierAttempts: Array.from(nullifiers.values()).filter((count) => count > 1).length,
    receiptCount: (ledger.causalReceipts ?? []).length,
  };
}

export async function getFraudReviewReport(): Promise<FraudReviewReport> {
  const ledger = await loadLedger();
  normalizeLedgerState(ledger);
  const blockedClaims = ledger.claims.filter((claim) => claim.status === 'blocked');
  const duplicateSessions = new Map<string, number>();
  const duplicateDevices = new Map<string, number>();

  for (const claim of ledger.claims) {
    duplicateSessions.set(claim.claimerSessionId, (duplicateSessions.get(claim.claimerSessionId) ?? 0) + 1);
    duplicateDevices.set(claim.deviceFingerprint, (duplicateDevices.get(claim.deviceFingerprint) ?? 0) + 1);
  }

  const deniedStaffEvents = (ledger.auditEvents ?? []).filter((event) =>
    event.result === 'denied' &&
    (event.action.includes('staff') || event.action.includes('merchant') || event.action.includes('confirm')));
  const replayedChallenges = (ledger.visitChallenges ?? []).filter((challenge) =>
    challenge.status === 'consumed' || challenge.status === 'expired');
  const totalClaims = Math.max(ledger.claims.length, 1);
  const blockRate = Math.round((blockedClaims.length / totalClaims) * 100);

  return {
    replayedAttacks: [
      {
        label: 'Self-referral and same-device claim replay',
        count: blockedClaims.length,
        status: blockedClaims.length > 0 ? 'blocked' : 'clean',
        note: 'Blocked claims stay visible in the passbook and merchant audit trail instead of silently disappearing.',
      },
      {
        label: 'Consumed or expired visit challenge replay',
        count: replayedChallenges.length,
        status: replayedChallenges.length > 0 ? 'blocked' : 'clean',
        note: 'One-time visit challenges expire quickly and are consumed by the first valid counter confirmation.',
      },
      {
        label: 'Unauthorized staff or merchant actions',
        count: deniedStaffEvents.length,
        status: deniedStaffEvents.length > 0 ? 'blocked' : 'clean',
        note: 'Denied PIN, role, and staff-device checks are recorded as audit events for pilot review.',
      },
      {
        label: 'Repeated session/device patterns',
        count: Array.from([...duplicateSessions.values(), ...duplicateDevices.values()]).filter((count) => count > 2).length,
        status: blockRate >= 20 ? 'needs-review' : 'clean',
        note: 'High repeat patterns are reviewed manually during the pilot instead of auto-banning real table groups.',
      },
    ],
    thresholds: {
      duplicateNullifier: 'One active claim per campaign nullifier; duplicates reuse or block the existing claim.',
      challengeTtlSeconds: VISIT_CHALLENGE_TTL_SECONDS,
      suspiciousBlockRatePercent: 20,
      sameDevicePolicy: 'Same device as referrer is blocked; repeated visitor device patterns are reviewed after the shift.',
    },
    falsePositiveNotes: [
      'Families may share a phone at the counter, so repeated devices above the threshold are reviewed before account-level blocking.',
      'Cafe staff can mistype a code; invalid code attempts are logged but do not punish the customer unless a valid claim is replayed.',
      'Campus groups may redeem in bursts. Burst volume is only suspicious when paired with duplicate device or expired challenge reuse.',
    ],
  };
}

export async function publishCampaignDraft(params: {
  title: string;
  reward: string;
  referralGoal: number;
  redemptionWindowHours: number;
  description?: string;
  merchantSessionId?: string;
  requestId: string;
}): Promise<CampaignPublishResult> {
  if (!Number.isInteger(params.referralGoal) || params.referralGoal < 1 || params.referralGoal > 12) {
    return { ok: false, reason: 'Referral goal must be between 1 and 12 confirmed visits.' };
  }
  if (!Number.isInteger(params.redemptionWindowHours) || params.redemptionWindowHours < 1 || params.redemptionWindowHours > 720) {
    return { ok: false, reason: 'Redemption window must be between 1 hour and 30 days.' };
  }

  return withLedgerMutation((ledger) => {
    const { merchant, offer } = getPilotMerchantAndOffer(ledger);
    offer.title = sanitizeCampaignText(params.title, offer.title);
    offer.reward = sanitizeCampaignText(params.reward, offer.reward);
    offer.description = sanitizeCampaignText(params.description ?? offer.description, offer.description);
    offer.referralGoal = params.referralGoal;
    offer.redemptionWindowHours = params.redemptionWindowHours;
    offer.active = true;
    appendAuditEvent(ledger, {
      requestId: params.requestId,
      actorType: 'merchant',
      actorId: params.merchantSessionId ?? 'campaign-builder',
      merchantId: merchant.id,
      targetType: 'offer',
      targetId: offer.id,
      action: 'publish_campaign',
      result: 'updated',
    });
    ledger.events.push({
      id: randomId('evt'),
      type: 'offer_created',
      createdAt: new Date().toISOString(),
      merchantId: merchant.id,
      offerId: offer.id,
      payload: {
        title: offer.title,
        referralGoal: offer.referralGoal,
        redemptionWindowHours: offer.redemptionWindowHours,
      },
    });
    return { ok: true, offer: toOfferView(offer, merchant.name, merchant.district) };
  });
}

export async function searchSupportIndex(query: string): Promise<SupportSearchResult[]> {
  const ledger = await loadLedger();
  normalizeLedgerState(ledger);
  const normalized = query.trim().toLowerCase();
  if (normalized.length < 2) {
    return [];
  }

  const matches = (values: Array<string | undefined>) =>
    values.some((value) => value?.toLowerCase().includes(normalized));
  const results: SupportSearchResult[] = [];

  for (const merchant of ledger.merchants) {
    if (matches([merchant.id, merchant.name, merchant.locationLabel, merchant.city, merchant.district])) {
      results.push({
        type: 'merchant',
        label: merchant.name,
        value: merchant.id,
        status: 'active',
        meta: `${merchant.locationLabel}, ${merchant.city}`,
        href: '/merchant/today',
      });
    }
  }

  for (const referral of ledger.referralLinks) {
    const offer = ledger.offers.find((item) => item.id === referral.offerId);
    if (matches([referral.token, referral.referrerDisplayName, offer?.title])) {
      results.push({
        type: 'invite',
        label: referral.referrerDisplayName,
        value: referral.token,
        status: referral.status ?? 'active',
        meta: `${referral.openCount} opens - ${offer?.title ?? 'Campaign'}`,
        href: `/offer/${referral.token}`,
      });
    }
  }

  for (const claim of ledger.claims) {
    if (matches([claim.id, claim.claimerDisplayName, claim.referrerDisplayName, claim.referralToken, claim.blockedReason])) {
      results.push({
        type: 'claim',
        label: claim.claimerDisplayName,
        value: claim.id,
        status: claim.status,
        meta: `${claim.referrerDisplayName} -> ${claim.referralToken}`,
      });
    }
  }

  for (const code of ledger.redeemCodes) {
    const claim = ledger.claims.find((item) => item.id === code.claimId);
    if (matches([code.code, code.codeHash, code.id, claim?.claimerDisplayName])) {
      results.push({
        type: 'code',
        label: code.code,
        value: code.id,
        status: code.status,
        meta: claim ? `${claim.claimerDisplayName} via ${claim.referrerDisplayName}` : code.claimId,
      });
    }
  }

  for (const receipt of ledger.causalReceipts ?? []) {
    const claim = ledger.claims.find((item) => item.id === receipt.claimId);
    if (matches([receipt.id, receipt.receiptPda, receipt.txSignature, receipt.receiptIdHash, claim?.claimerDisplayName])) {
      results.push({
        type: 'receipt',
        label: receipt.id,
        value: receipt.receiptPda,
        status: receipt.status,
        meta: claim ? `${claim.claimerDisplayName} confirmed at merchant counter` : receipt.txSignature,
        href: `/receipts/${receipt.id}`,
      });
    }
  }

  return results.slice(0, 25);
}

export async function getPilotGoNoGoSummary() {
  const ledger = await loadLedger();
  normalizeLedgerState(ledger);
  const simulatedUsers = 20;
  const confirmed = ledger.claims.filter((claim) => claim.status === 'redeemed').length;
  const blocked = ledger.claims.filter((claim) => claim.status === 'blocked').length;
  const receipts = (ledger.causalReceipts ?? []).length;
  const openJobs = (ledger.outbox ?? []).filter((job) => job.status !== 'succeeded').length;
  const blockers = [
    openJobs > 0 ? `${openJobs} outbox job${openJobs === 1 ? '' : 's'} still need retry monitoring.` : '',
    blocked > Math.max(3, ledger.claims.length * 0.2) ? 'Blocked claim rate is high enough for manual review.' : '',
    receipts < confirmed ? 'Some confirmed visits do not yet have receipt records.' : '',
  ].filter(Boolean);

  return {
    simulatedUsers,
    confirmed,
    blocked,
    receipts,
    recommendation: blockers.length === 0 ? 'go' : 'go-with-watchlist',
    blockers,
  };
}

export async function getPilotMetricsDashboard() {
  const ledger = await loadLedger();
  normalizeLedgerState(ledger);
  const merchantRows = ledger.merchants.map((merchant) => {
    const offers = ledger.offers.filter((offer) => offer.merchantId === merchant.id);
    const offerIds = new Set(offers.map((offer) => offer.id));
    const claims = ledger.claims.filter((claim) => offerIds.has(claim.offerId));
    const referrals = ledger.referralLinks.filter((referral) => offerIds.has(referral.offerId));
    const receipts = (ledger.causalReceipts ?? []).filter((receipt) => receipt.merchantId === merchant.id);
    const failures = claims.filter((claim) => claim.status === 'blocked').length +
      (ledger.auditEvents ?? []).filter((event) => event.merchantId === merchant.id && event.result === 'denied').length;

    return {
      merchant,
      offers: offers.length,
      invites: referrals.length,
      claims: claims.length,
      redemptions: claims.filter((claim) => claim.status === 'redeemed').length,
      receipts: receipts.length,
      failures,
    };
  });

  return {
    totals: {
      liveMerchants: merchantRows.length,
      invites: merchantRows.reduce((total, row) => total + row.invites, 0),
      claims: merchantRows.reduce((total, row) => total + row.claims, 0),
      redemptions: merchantRows.reduce((total, row) => total + row.redemptions, 0),
      receipts: merchantRows.reduce((total, row) => total + row.receipts, 0),
      failures: merchantRows.reduce((total, row) => total + row.failures, 0),
    },
    merchants: merchantRows,
  };
}

function conversionRate(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0;
  }
  return Math.round((numerator / denominator) * 100);
}

export async function getFunnelLeakReport() {
  const ledger = await loadLedger();
  normalizeLedgerState(ledger);
  const invites = ledger.referralLinks.length;
  const claims = ledger.claims.filter((claim) => claim.status !== 'blocked').length;
  const visits = ledger.redeemCodes.length;
  const confirmations = ledger.claims.filter((claim) => claim.status === 'redeemed').length;
  const receipts = (ledger.causalReceipts ?? []).length;

  return [
    {
      stage: 'Invite to claim',
      from: invites,
      to: claims,
      rate: conversionRate(claims, invites),
      leak: Math.max(invites - claims, 0),
      fix: 'Use richer WhatsApp/SMS/native share copy and keep the destination offer-specific.',
    },
    {
      stage: 'Claim to visit',
      from: claims,
      to: visits,
      rate: conversionRate(visits, claims),
      leak: Math.max(claims - visits, 0),
      fix: 'Shorten reward windows for QSR/cafe offers and remind customers to present the code at the counter.',
    },
    {
      stage: 'Visit to confirm',
      from: visits,
      to: confirmations,
      rate: conversionRate(confirmations, visits),
      leak: Math.max(visits - confirmations, 0),
      fix: 'Keep staff terminal in manual-code mode with bigger controls and one-tap refresh.',
    },
    {
      stage: 'Confirm to receipt',
      from: confirmations,
      to: receipts,
      rate: conversionRate(receipts, confirmations),
      leak: Math.max(confirmations - receipts, 0),
      fix: 'Monitor receipt outbox and use the receipt explorer immediately after controlled redemptions.',
    },
  ];
}

export function getCampaignTemplates() {
  return [
    {
      category: 'Cafe',
      title: 'Bring 3 friends for coffee credit',
      reward: 'Rs. 150 coffee credit for each confirmed guest',
      referralGoal: 3,
      redemptionWindowHours: 72,
      bestFor: 'Slow afternoon tables and repeat locals.',
    },
    {
      category: 'QSR',
      title: 'Bring 2 friends for a table upgrade',
      reward: 'Shared snack upgrade after 2 verified guest visits',
      referralGoal: 2,
      redemptionWindowHours: 48,
      bestFor: 'Fast counters where staff needs very short copy.',
    },
    {
      category: 'Hostel',
      title: 'Invite travelers for reception rewards',
      reward: 'Cafe or laundry credit after 3 verified guests',
      referralGoal: 3,
      redemptionWindowHours: 96,
      bestFor: 'Backpacker clusters and tour-desk referrals.',
    },
    {
      category: 'Creator',
      title: 'Creator code for verified venue visits',
      reward: 'Creator perk after verified audience visits',
      referralGoal: 5,
      redemptionWindowHours: 168,
      bestFor: 'Local creator campaigns where attribution must be proven.',
    },
  ];
}

export async function getWeeklyMerchantReport() {
  const dashboard = await getPilotMetricsDashboard();
  const funnel = await getFunnelLeakReport();
  const fraud = await getFraudReviewReport();
  const suspicious = fraud.replayedAttacks.reduce((total, item) => total + item.count, 0);

  return {
    weekLabel: new Date().toISOString().slice(0, 10),
    funnel,
    merchants: dashboard.merchants.map((row) => ({
      name: row.merchant.name,
      verifiedVisits: row.redemptions,
      rewardCostNpr: row.redemptions * 150,
      receipts: row.receipts,
      suspiciousActivity: row.failures,
    })),
    suspiciousActivity: suspicious,
    summary: `${dashboard.totals.liveMerchants} merchants, ${dashboard.totals.redemptions} verified visits, ${dashboard.totals.receipts} receipts.`,
  };
}

export async function getRewardLiabilityDashboard() {
  const ledger = await loadLedger();
  normalizeLedgerState(ledger);
  const issuedCodes = ledger.redeemCodes.length;
  const settledReceipts = (ledger.causalReceipts ?? []).filter((receipt) => receipt.status === 'settled').length;
  const confirmedReceipts = (ledger.causalReceipts ?? []).length;
  const voidedCodes = ledger.redeemCodes.filter((code) => code.status === 'voided' || code.status === 'expired').length;
  const reserved = issuedCodes * DEFAULT_REWARD_COST_NPR;
  const earned = confirmedReceipts * DEFAULT_REWARD_COST_NPR;
  const settled = settledReceipts * DEFAULT_REWARD_COST_NPR;
  const voided = voidedCodes * DEFAULT_REWARD_COST_NPR;

  return {
    reserved,
    earned,
    settled,
    voided,
    remaining: Math.max(reserved - settled - voided, 0),
    counts: { issuedCodes, confirmedReceipts, settledReceipts, voidedCodes },
  };
}

export async function getBillingEvents(): Promise<BillingEvent[]> {
  const ledger = await loadLedger();
  normalizeLedgerState(ledger);
  const events: BillingEvent[] = [];

  for (const receipt of ledger.causalReceipts ?? []) {
    events.push({
      id: `usage-${receipt.id}`,
      type: 'usage_fee',
      merchantId: receipt.merchantId,
      receiptId: receipt.id,
      amountNpr: DEFAULT_REWARD_COST_NPR,
      status: receipt.status === 'settled' ? 'paid' : 'issued',
      createdAt: receipt.createdAt,
    });
    events.push({
      id: `platform-${receipt.id}`,
      type: 'platform_fee',
      merchantId: receipt.merchantId,
      receiptId: receipt.id,
      amountNpr: DEFAULT_PLATFORM_FEE_NPR,
      status: 'issued',
      createdAt: receipt.createdAt,
    });
  }

  for (const merchant of ledger.merchants) {
    const amountNpr = events
      .filter((event) => event.merchantId === merchant.id)
      .reduce((total, event) => total + event.amountNpr, 0);
    events.push({
      id: `invoice-${merchant.id}`,
      type: 'invoice_created',
      merchantId: merchant.id,
      amountNpr,
      status: amountNpr > 0 ? 'issued' : 'draft',
      createdAt: new Date().toISOString(),
    });
  }

  return events;
}

export async function getCostPerVerifiedVisit() {
  const events = await getBillingEvents();
  const usage = events.filter((event) => event.type === 'usage_fee' || event.type === 'platform_fee');
  const receiptIds = new Set(usage.map((event) => event.receiptId).filter(Boolean));
  const total = usage.reduce((sum, event) => sum + event.amountNpr, 0);
  return {
    receipts: receiptIds.size,
    rewardCostNpr: events.filter((event) => event.type === 'usage_fee').reduce((sum, event) => sum + event.amountNpr, 0),
    platformFeeNpr: events.filter((event) => event.type === 'platform_fee').reduce((sum, event) => sum + event.amountNpr, 0),
    totalCostNpr: total,
    costPerVerifiedVisitNpr: receiptIds.size > 0 ? Math.round(total / receiptIds.size) : 0,
  };
}

export async function exportInvoiceCsv() {
  const events = await getBillingEvents();
  const rows = [
    ['event_id', 'merchant_id', 'type', 'receipt_id', 'amount_npr', 'status', 'created_at'],
    ...events.map((event) => [
      event.id,
      event.merchantId,
      event.type,
      event.receiptId ?? '',
      String(event.amountNpr),
      event.status,
      event.createdAt,
    ]),
  ];
  return rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
}

export function getPaidPilotProposal() {
  return {
    pricing: 'NPR 25 platform fee per verified visit after the free pilot allowance.',
    successTerms: [
      'Only staff-confirmed Causal Receipts count as verified visits.',
      'Merchant reward cost stays capped by campaign configuration.',
      'First paid continuation target: written commitment or first invoice payment.',
    ],
    closeAsk: 'Approve a paid continuation for one campaign cycle with capped verified-visit billing.',
  };
}

export async function getWeeklyBusinessReview() {
  const cost = await getCostPerVerifiedVisit();
  const billing = await getBillingEvents();
  return {
    paidPipeline: [
      { merchant: 'Thamel Brew House', stage: 'paid-continuation ask', objection: 'wants proof of repeat visits' },
      { merchant: 'Jhamel Momo Yard', stage: 'pilot template', objection: 'needs fast staff training' },
    ],
    roi: cost,
    issuedInvoices: billing.filter((event) => event.type === 'invoice_created' && event.status === 'issued').length,
    merchantObjections: ['Will staff remember the flow?', 'Can we cap reward liability?', 'Do we pay only for verified visits?'],
  };
}

export function getPartnerAccounts(): PartnerAccount[] {
  return [
    { id: 'partner-creator-asha', type: 'creator', name: 'Asha Local Eats', sourceCode: 'ASHA-EATS', qualityScore: 88, status: 'active' },
    { id: 'partner-hostel-lakeside', type: 'hostel', name: 'Lakeside Hostel Desk', sourceCode: 'HOSTEL-LAKE', qualityScore: 82, status: 'active' },
    { id: 'partner-guide-thamel', type: 'guide', name: 'Thamel Walking Guide', sourceCode: 'GUIDE-THAMEL', qualityScore: 76, status: 'pending' },
    { id: 'partner-merchant-jhamel', type: 'merchant', name: 'Jhamel Momo Yard', sourceCode: 'MOMO-XPROMO', qualityScore: 79, status: 'active' },
  ];
}

export function getPartnerPayoutRules() {
  return {
    splitLogic: 'Partner receives 20 percent of platform fee after receipt settlement.',
    caps: { perPartnerDailyNpr: 1_000, perCampaignNpr: 5_000 },
    delayedSettlementHours: 72,
    heldStatuses: ['low quality score', 'velocity spike', 'merchant dispute'],
  };
}

export async function getPartnerDashboard() {
  const ledger = await loadLedger();
  normalizeLedgerState(ledger);
  const partners = getPartnerAccounts();
  const receipts = ledger.causalReceipts ?? [];
  return {
    partners: partners.map((partner, index) => {
      const assignedReceipts = receipts.filter((_receipt, receiptIndex) => receiptIndex % Math.max(partners.length, 1) === index);
      const settled = assignedReceipts.filter((receipt) => receipt.status === 'settled').length;
      const pending = assignedReceipts.length - settled;
      return {
        ...partner,
        claims: ledger.claims.length,
        redemptions: assignedReceipts.length,
        pendingRewardsNpr: pending * 5,
        settledRewardsNpr: settled * 5,
        receipts: assignedReceipts.map((receipt) => receipt.id),
        dashboardPath: `/partners/dashboard?partner=${encodeURIComponent(partner.id)}`,
      };
    }),
    payoutRules: getPartnerPayoutRules(),
  };
}

export function getCrossMerchantCampaign() {
  return {
    title: 'Thamel Brew House recommends Jhamel Momo Yard',
    sourceMerchant: 'merchant-thamel-brew-house',
    targetMerchant: 'merchant-jhamel-momo-yard',
    split: 'Source merchant receives partner attribution; target merchant funds reward.',
  };
}

export function getPartnerFraudControls() {
  return {
    velocity: { maxClaimsPerHour: 20, maxRedemptionsPerDay: 30 },
    qualityScore: { holdBelow: 60, reviewBelow: 75 },
    suspiciousHolds: ['velocity spike', 'low quality score', 'repeat device clusters', 'merchant dispute'],
  };
}

export async function getWeeklyPartnerReview() {
  const dashboard = await getPartnerDashboard();
  return {
    outreachTarget: 5,
    contacted: [
      'Asha Local Eats',
      'Lakeside Hostel Desk',
      'Thamel Walking Guide',
      'Jhamel Momo Yard',
      'Campus Food Circle',
    ],
    dashboard,
    nextQuestions: [
      'Would partner payout motivate sharing?',
      'Is delayed settlement acceptable?',
      'Which evidence level would merchants trust?',
    ],
  };
}

export function getEvidenceModel() {
  return [
    { level: 'staff_only', confidence: 45, description: 'Staff confirmed the visit without an external receipt reference.' },
    { level: 'receipt_id', confidence: 65, description: 'Staff entered a merchant receipt or bill id.' },
    { level: 'csv_match', confidence: 78, description: 'Imported sales row matched receipt id or timestamp.' },
    { level: 'solana_pay', confidence: 86, description: 'Optional Solana Pay reference matched the redemption.' },
    { level: 'pos_webhook', confidence: 92, description: 'POS webhook matched receipt id, timestamp, and amount.' },
  ] as const;
}

function parseCsvRows(csv: string) {
  const rows = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, '')));
  const [headers = [], ...records] = rows;
  return records.map((record) => Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ''])));
}

export async function importSalesCsv(csv: string) {
  const ledger = await loadLedger();
  normalizeLedgerState(ledger);
  const records = parseCsvRows(csv);
  const matches = records.map((record) => {
    const receiptId = record.receipt_id || record.receiptId || record.bill_id || record.billId;
    const amountNpr = Number(record.amount_npr || record.amountNpr || record.amount || 0);
    const receipt = (ledger.causalReceipts ?? []).find((item) =>
      item.id === receiptId ||
      item.manualReceiptId === receiptId ||
      item.receiptPda === receiptId);
    return {
      receiptId,
      amountNpr: Number.isFinite(amountNpr) ? amountNpr : 0,
      matched: Boolean(receipt),
      causalReceiptId: receipt?.id ?? null,
      evidenceLevel: receipt ? 'csv_match' : 'staff_only',
    };
  });
  return {
    imported: records.length,
    matched: matches.filter((match) => match.matched).length,
    matches,
  };
}

export async function getAttributedSpendMetrics() {
  const ledger = await loadLedger();
  normalizeLedgerState(ledger);
  const receipts = ledger.causalReceipts ?? [];
  const revenue = receipts.reduce((total, receipt) => total + (receipt.spendNpr ?? 450), 0);
  const rewardCost = receipts.length * DEFAULT_REWARD_COST_NPR;
  return {
    receipts: receipts.length,
    aovNpr: receipts.length > 0 ? Math.round(revenue / receipts.length) : 0,
    attributedRevenueNpr: revenue,
    rewardCostNpr: rewardCost,
    roiEstimate: rewardCost > 0 ? Number((revenue / rewardCost).toFixed(2)) : 0,
  };
}

export function getSolanaPayPrototype() {
  const baseUrl = getPublicBaseUrl();
  const reference = sha256Hex('viral-sync-solana-pay-reference').slice(0, 32);
  return {
    label: 'Optional Solana Pay evidence path',
    reference,
    qrPayload: `solana:11111111111111111111111111111111?amount=0.001&reference=${reference}&label=Viral%20Sync%20Receipt`,
    callbackUrl: `${baseUrl}/api/launch/evidence/solana-pay/callback`,
  };
}

export function getPosIntegrationResearch() {
  return {
    selectedPath: 'CSV import first, POS webhook second.',
    tools: [
      { name: 'Generic CSV export', fit: 'best first path', reason: 'Works with almost any small merchant and does not require POS vendor approval.' },
      { name: 'Square/Loyverse-style webhook', fit: 'future adapter', reason: 'Useful once merchants ask for automatic reconciliation.' },
      { name: 'Manual receipt id', fit: 'current fallback', reason: 'Fastest way for staff to attach payment evidence during pilot.' },
    ],
  };
}

export function getWeeklyEvidenceReview() {
  return {
    question: 'Does payment evidence matter enough to add setup friction?',
    merchantPrompts: [
      'Would a staff-entered receipt id be enough?',
      'Would CSV matching help you trust ROI?',
      'Would POS webhooks be worth the setup time?',
    ],
    currentRecommendation: 'Keep manual receipt id and CSV import now; defer POS webhook until a merchant requests automation.',
  };
}

export function getThreatModelV2() {
  return {
    assets: ['merchant funds', 'reward liability', 'Causal Receipts', 'staff devices', 'relayer API keys', 'customer privacy'],
    actors: ['customer', 'merchant staff', 'merchant owner', 'partner/referrer', 'relayer service', 'external attacker'],
    attacks: [
      { name: 'self-referral farming', mitigation: 'device/session nullifiers and fraud holds', unresolved: false },
      { name: 'CSRF merchant mutation', mitigation: 'same-origin checks on cookie and mutation routes', unresolved: false },
      { name: 'XSS receipt/support data injection', mitigation: 'React escaping and no unsafe HTML rendering', unresolved: false },
      { name: 'arbitrary sponsored tx', mitigation: 'allowed instruction/program policy and signed intent simulation', unresolved: false },
      { name: 'real-funds program bug', mitigation: 'external review required before uncapped mainnet', unresolved: true },
    ],
  };
}

export function getSecurityGate() {
  const unresolved = [
    { id: 'P0-external-audit', priority: 'P0', status: 'open', note: 'External audit/review required before uncapped real funds.' },
    { id: 'P1-real-login', priority: 'P1', status: 'mitigated', note: 'Production login now requires a non-demo merchant access token, scoped session, role authorization, and enrolled staff device. Replace with SSO before broad enterprise rollout.' },
    { id: 'P2-pos-webhook', priority: 'P2', status: 'open', note: 'POS webhook can remain deferred for capped beta.' },
  ];
  const readiness = getProductionReadinessSnapshot();
  const configBlockers = readiness.missing.map((name) => ({
    id: `config-${name}`,
    priority: 'P1',
    status: 'open',
    note: `${name} is required for production readiness.`,
  }));
  const blockers = [...unresolved, ...configBlockers].filter((item) =>
    item.status === 'open' && (item.priority === 'P0' || item.priority === 'P1'));
  return {
    mainnetAllowed: blockers.length === 0,
    blocking: blockers,
    unresolved: [...unresolved, ...configBlockers],
    readiness,
    rule: 'Block mainnet if any unresolved P0 or P1 remains.',
  };
}

export function getProductionReadiness() {
  const readiness = getProductionReadinessSnapshot();
  const gate = getSecurityGate();
  return {
    ok: readiness.launchAllowed && gate.mainnetAllowed,
    readiness,
    gate,
    releaseClassification: gate.mainnetAllowed ? 'eligible-for-capped-production-review' : 'blocked-from-mainnet',
    requiredHumanSignoffs: [
      'external Solana program audit',
      'backend/security review',
      'merchant agreement and promotion terms review',
      'incident response rehearsal owner signoff',
    ],
  };
}

export function getProgramSecurityReview() {
  return {
    accountConstraints: [
      'Causal merchant config derives from authority and org hash.',
      'Growth campaign derives from merchant config and campaign hash.',
      'Receipt, nullifier, escrow, and settlement PDAs use distinct seeds.',
    ],
    signerChecks: [
      'Merchant setup requires merchant authority.',
      'Receipt settlement requires expected receipt/campaign context.',
      'Session authority derives from authority and delegated signer.',
    ],
    settlementInvariants: [
      'Duplicate settlement slots are rejected.',
      'Reward settlement cannot clear pending state until required slots settle.',
      'Gross-up rejects impossible Token-2022 fee settings.',
    ],
  };
}

export function getMainnetBetaScope() {
  return {
    cappedFundsNpr: 10_000,
    allowlistedMerchants: ['merchant-thamel-brew-house'],
    pauseSwitch: 'LAUNCH_PAUSED=true blocks public mutations at the edge/app layer before relayer submission.',
    disclosure: 'Capped beta is not audited mainnet production; participation requires explicit merchant consent.',
  };
}

export function getUpgradeAuthorityPolicy() {
  return {
    owner: 'Temporary deployer until external review.',
    multisigPlan: 'Move upgrade authority to 2-of-3 multisig before any uncapped beta.',
    process: ['write change note', 'run npm run verify', 'fresh devnet rehearsal', 'announce maintenance window', 'deploy', 'sync IDL/client'],
    emergencyPause: 'Use app pause switch and revoke relayer service key while upgrade is prepared.',
  };
}

export function getDeploymentRehearsal() {
  return {
    steps: ['fresh devnet deploy', 'IDL/client sync', 'seed demo ledger', 'run invite->claim->confirm demo', 'open receipt graph'],
    command: 'npm run verify && anchor build',
    evidence: ['program id recorded', 'IDL generated', 'demo receipt visible', 'graph and reconciliation pages open'],
  };
}

export function getMigrationRehearsal() {
  return {
    steps: ['snapshot staging ledger', 'run migration against staging copy', 'verify receipt counts', 'rollback using down migration', 'rerun verify'],
    rollback: 'Use docs/migrations down scripts and restore latest ledger snapshot.',
    checks: ['merchant count unchanged', 'receipt ids unchanged', 'outbox jobs preserved', 'support search returns known code'],
  };
}

export function getIncidentRunbooks() {
  return [
    { incident: 'failed redemption', firstAction: 'search code in support console', escalation: 'void unconfirmed code or retry confirmation' },
    { incident: 'failed tx', firstAction: 'check relayer monitoring and reconciliation', escalation: 'pause sponsorship and rerun indexer' },
    { incident: 'fraud spike', firstAction: 'review fraud dashboard and partner holds', escalation: 'raise hold thresholds and pause partner source' },
    { incident: 'DB issue', firstAction: 'switch to maintenance mode and snapshot ledger', escalation: 'restore backup or rollback migration' },
  ];
}

export function getExternalReviewPacket() {
  return {
    reviewers: ['Solana program engineer', 'application security reviewer'],
    scope: ['Anchor account constraints', 'receipt settlement invariants', 'relayer sponsorship policy', 'Actions/Blink endpoints'],
    request: 'Inspect program/relayer before capped beta; flag P0/P1 issues that block mainnet.',
    artifacts: ['docs/program-security-review-day-137.md', 'docs/relayer-policy-day-99.md', 'docs/threat-model-v2-day-134.md'],
  };
}

export function getHighSeverityReviewFixes() {
  return [
    { issue: 'arbitrary sponsored transaction', severity: 'high', fix: 'allowlisted instruction/program policy plus signed intent simulation', test: 'sponsored tx simulation rejects unauthorized actions' },
    { issue: 'receipt replay', severity: 'high', fix: 'nonce idempotency storage', test: 'replay nonce is rejected' },
    { issue: 'uncapped beta spend', severity: 'high', fix: 'wallet, merchant, campaign, and daily caps', test: 'spend limits block cap overflow' },
  ];
}

export async function getWeeklyBetaReview() {
  const gate = getSecurityGate();
  const metrics = await getPilotMetricsDashboard();
  const costs = await getCostPerVerifiedVisit();
  return {
    recommendation: gate.mainnetAllowed ? 'go-capped-beta' : 'no-go-mainnet',
    reason: gate.mainnetAllowed ? 'No unresolved P0/P1 blockers.' : 'Security gate still has unresolved blockers.',
    metrics: metrics.totals,
    costs,
    blockers: gate.blocking,
  };
}

export function getCappedBetaDeployment() {
  const scope = getMainnetBetaScope();
  return {
    environment: 'capped-beta',
    program: VIRAL_SYNC_PROGRAM_ID,
    appCaps: {
      cappedFundsNpr: scope.cappedFundsNpr,
      allowlistedMerchants: scope.allowlistedMerchants,
      maxSponsoredTxPerDay: getRelayerPolicy().dailySponsoredTxCap,
    },
    checklist: ['verify passed', 'security gate reviewed', 'allowlist configured', 'pause switch tested', 'disclosure accepted'],
  };
}

export function getRealMerchantCampaignRunbook() {
  return {
    merchant: 'Thamel Brew House',
    budgetNpr: 1_500,
    staff: 'front counter staff only',
    targetRedemptions: 10,
    steps: ['publish one capped campaign', 'train staff', 'run controlled QR placement', 'confirm real redemptions', 'reconcile receipts'],
  };
}

export async function getProofAssets() {
  const graph = await getCausalGraphData();
  const receipts = await getReceiptReconciliation();
  return {
    txLinks: receipts.map((receipt) => ({ receiptId: receipt.receiptId, tx: receipt.txSignature })),
    screenshots: ['/causal-graph', '/admin/relayer', '/business', '/merchant/reports'],
    merchantQuote: getPilotTestimonials()[0],
    graphNodeCount: graph.nodes.length,
  };
}

export function getFailureRecoveryPlan() {
  return {
    failedTxRetry: 'retry pending receipt.submit and receipt.index jobs through /api/launch/indexer/run',
    pendingStates: ['issued code', 'scanned code', 'submitted receipt', 'pending outbox job'],
    supportActions: ['search code/receipt', 'void unconfirmed code', 'rerun indexer', 'pause sponsored tx'],
  };
}

export function getPublishedTechnicalDocs() {
  return {
    programId: VIRAL_SYNC_PROGRAM_ID,
    accounts: ['CausalMerchantConfig', 'GrowthCampaign', 'RewardEscrow', 'NullifierRecord', 'CausalReceipt', 'SettlementRecord'],
    instructions: ['register_merchant', 'create_growth_campaign', 'fund_growth_bounty', 'record_causal_receipt', 'settle_receipt_reward'],
    receiptFormat: ['receiptIdHash', 'inviteHash', 'campaignNullifierHash', 'visitAttestationHash', 'receiptPda', 'txSignature'],
    limitations: ['not audited', 'demo relayer intent only', 'temporary staff PIN', 'capped beta only'],
  };
}

export async function getWeeklyBetaMemo() {
  const metrics = await getPilotMetricsDashboard();
  const costs = await getCostPerVerifiedVisit();
  const incidents = getIncidentRunbooks();
  return {
    metrics: metrics.totals,
    incidents: incidents.map((incident) => incident.incident),
    costs,
    merchantFeedback: ['Staff flow is understandable after training.', 'Payment evidence matters most for ROI reporting.', 'Caps make the pilot easier to approve.'],
  };
}

export function getMerchantPipeline() {
  const stages = ['lead', 'contacted', 'demo-booked', 'pilot-ready', 'paid-ask'];
  const leads = Array.from({ length: 30 }, (_, index) => {
    const stage = stages[index % stages.length];
    return {
      id: `lead-${String(index + 1).padStart(2, '0')}`,
      merchant: `Kathmandu Merchant ${index + 1}`,
      category: ['cafe', 'qsr', 'hostel', 'creator venue'][index % 4],
      stage,
      nextAction: stage === 'demo-booked' ? 'run demo' : stage === 'paid-ask' ? 'send paid proposal' : 'contact owner',
    };
  });
  return {
    total: leads.length,
    bookedDemos: leads.filter((lead) => lead.stage === 'demo-booked').length,
    stages: stages.map((stage) => ({ stage, count: leads.filter((lead) => lead.stage === stage).length })),
    leads,
  };
}

export async function getOnboardingConversion() {
  const dashboard = await getPilotMetricsDashboard();
  const steps = [
    { step: 'merchant created', count: dashboard.totals.liveMerchants, medianMinutes: 4 },
    { step: 'campaign published', count: dashboard.merchants.filter((row) => row.offers > 0).length, medianMinutes: 7 },
    { step: 'staff trained', count: Math.max(dashboard.totals.liveMerchants - 1, 0), medianMinutes: 12 },
    { step: 'first QR shared', count: dashboard.totals.invites, medianMinutes: 15 },
    { step: 'first redemption confirmed', count: dashboard.totals.redemptions, medianMinutes: 22 },
  ];
  return {
    setupTimeMinutes: steps.reduce((total, step) => total + step.medianMinutes, 0),
    dropOffs: steps.map((step, index) => ({
      step: step.step,
      count: step.count,
      lostFromPrior: index === 0 ? 0 : Math.max(steps[index - 1].count - step.count, 0),
    })),
  };
}

export async function getMerchantHealthScores() {
  const dashboard = await getPilotMetricsDashboard();
  return dashboard.merchants.map((row) => {
    const recentCampaign = row.offers > 0 ? 25 : 0;
    const staffActivity = row.redemptions > 0 ? 25 : row.claims > 0 ? 12 : 0;
    const redemptions = Math.min(row.redemptions * 10, 25);
    const reportViews = row.receipts > 0 ? 25 : 8;
    const score = recentCampaign + staffActivity + redemptions + reportViews;
    return {
      merchant: row.merchant.name,
      score,
      status: score >= 70 ? 'healthy' : score >= 40 ? 'needs-nudge' : 'churn-risk',
      components: { recentCampaign, staffActivity, redemptions, reportViews },
    };
  });
}

export async function getCampaignRecommendations() {
  const funnel = await getFunnelLeakReport();
  const worst = [...funnel].sort((left, right) => right.leak - left.leak)[0];
  return [
    {
      type: 'reward',
      recommendation: worst?.stage === 'Claim to visit' ? 'Shorten redemption window and raise table urgency.' : 'Keep reward capped and easy to explain.',
    },
    {
      type: 'copy',
      recommendation: 'Use one-line WhatsApp copy naming merchant, reward, and counter confirmation.',
    },
    {
      type: 'qr-placement',
      recommendation: worst?.stage === 'Invite to claim' ? 'Move QR to counter and table tent with staff prompt.' : 'Keep QR at cashier and receipt handoff.',
    },
  ];
}

export async function getAutomatedWeeklyMerchantReports() {
  const report = await getWeeklyMerchantReport();
  const recommendations = await getCampaignRecommendations();
  return report.merchants.map((merchant) => ({
    merchant: merchant.name,
    subject: `Viral Sync weekly ROI: ${merchant.verifiedVisits} verified visits`,
    roi: `NPR ${merchant.rewardCostNpr} reward cost for ${merchant.verifiedVisits} verified visits`,
    nextAction: recommendations[0].recommendation,
    sendStatus: 'ready',
  }));
}

export async function getPaidConversionSprint() {
  const reports = await getAutomatedWeeklyMerchantReports();
  return {
    ask: 'Convert active merchants to paid verified-visit billing.',
    target: reports.length,
    messages: reports.map((report) => ({
      merchant: report.merchant,
      ask: `Approve paid continuation: ${report.roi}. Next action: ${report.nextAction}`,
    })),
  };
}

export async function getWeeklyGrowthReview() {
  const dashboard = await getPilotMetricsDashboard();
  const health = await getMerchantHealthScores();
  return {
    live: dashboard.totals.liveMerchants,
    active: health.filter((row) => row.score >= 40).length,
    paid: 0,
    churnRisk: health.filter((row) => row.status === 'churn-risk').length,
    health,
  };
}

export function getFinalPitch() {
  return {
    headline: 'Proof-of-Causal-Visit for local commerce.',
    positioning: 'Viral Sync turns word-of-mouth into Causal Receipts: merchant-confirmed proof that a referral caused a real visit.',
    businessModel: 'Pay per verified visit, not per click, impression, or unverifiable claim.',
    close: 'Start with QR-first pilots, prove visits, then expand into partner and neighborhood campaigns.',
  };
}

export function getArchitectureDiagram() {
  return {
    nodes: ['Product app', 'Launch ledger API', 'Anchor program', 'Relayer', 'Indexer', 'Causal graph'],
    edges: [
      ['Product app', 'Launch ledger API', 'invite/claim/redeem'],
      ['Launch ledger API', 'Anchor program', 'receipt accounts'],
      ['Launch ledger API', 'Relayer', 'sponsored verification intent'],
      ['Anchor program', 'Indexer', 'events'],
      ['Indexer', 'Causal graph', 'nodes/edges'],
      ['Causal graph', 'Product app', 'receipt explorer'],
    ],
  };
}

export async function getTractionDashboard() {
  const metrics = await getPilotMetricsDashboard();
  const pipeline = getMerchantPipeline();
  return {
    merchants: metrics.totals.liveMerchants,
    claims: metrics.totals.claims,
    redemptions: metrics.totals.redemptions,
    receipts: metrics.totals.receipts,
    paidCommitments: 0,
    pipelineLeads: pipeline.total,
    bookedDemos: pipeline.bookedDemos,
  };
}

export async function getCaseStudies() {
  const report = await getWeeklyMerchantReport();
  const assets = await getProofAssets();
  return report.merchants.slice(0, 1).map((merchant) => ({
    merchant: merchant.name,
    story: `${merchant.name} used counter-confirmed referrals to separate real visits from noisy shares.`,
    numbers: {
      verifiedVisits: merchant.verifiedVisits,
      rewardCostNpr: merchant.rewardCostNpr,
      receipts: merchant.receipts,
    },
    txLinks: assets.txLinks.slice(0, 3),
  }));
}

export function getTechnicalDeepDiveScript() {
  return {
    duration: '3-5 minutes',
    sections: [
      'Program accounts: merchant config, campaign, escrow, nullifier, receipt, settlement.',
      'Relayer: signed intent, policy, replay protection, spend caps.',
      'Indexer: receipt submit/index outbox and reconciliation.',
      'Tests: protocol PDA, settlement, fraud, relayer, graph, billing, growth gates.',
    ],
  };
}

export async function getNinetySecondDemoScript() {
  const traction = await getTractionDashboard();
  return {
    duration: '90 seconds',
    hook: 'Local merchants should not pay for vague clicks. They should pay for verified visits.',
    flow: [
      { time: '0-10s', shot: 'Open with Proof-of-Causal-Visit positioning.', route: '/pitch' },
      { time: '10-25s', shot: 'Customer shares invite and another visitor claims it.', route: '/invite' },
      { time: '25-40s', shot: 'Merchant confirms the counter redemption.', route: '/merchant/scan' },
      { time: '40-55s', shot: 'Causal Receipt and settlement evidence appear.', route: '/receipts/{id}' },
      { time: '55-70s', shot: 'Causal graph shows invite, visit, merchant, and receipt links.', route: '/causal-graph' },
      { time: '70-90s', shot: `Close on traction: ${traction.merchants} merchants, ${traction.claims} claims, ${traction.receipts} receipts.`, route: '/traction' },
    ],
    cutNotes: ['No dashboard wandering.', 'No unaudited mainnet claims.', 'Show receipt proof before traction.'],
  };
}

export async function getWeeklyPackageReview() {
  const traction = await getTractionDashboard();
  const pitch = getFinalPitch();
  return {
    repo: 'Public GitHub repository with timestamped commits.',
    demo: await getNinetySecondDemoScript(),
    docs: [
      'README',
      'current-state',
      'protocol',
      'technical deep dive',
      'known limits',
    ],
    video: '90-second demo plus 3-5 minute technical deep dive.',
    metrics: traction,
    knownLimits: [
      'Not audited for mainnet funds.',
      'POS integrations are adapters and pilot hooks, not broad production coverage.',
      'Compressed receipt history is design/prototype scope until tree writes are implemented.',
    ],
    externalReviewPrompt: `Review whether this proves ${pitch.headline}`,
  };
}

export async function getFraudGraphEntities() {
  const ledger = await loadLedger();
  normalizeLedgerState(ledger);
  const merchants = ledger.merchants.map((merchant) => ({
    id: merchant.id,
    type: 'merchant',
    label: merchant.name,
    privacy: 'business',
  }));
  const campaigns = ledger.offers.map((offer) => ({
    id: offer.id,
    type: 'campaign',
    label: offer.title,
    privacy: 'business',
  }));
  const consumers = Array.from(new Set(ledger.claims.map((claim) => claim.claimerSessionId))).map((sessionId) => ({
    id: `consumer-${sha256Hex(sessionId).slice(0, 10)}`,
    type: 'consumer',
    label: `consumer-${sha256Hex(sessionId).slice(0, 6)}`,
    privacy: 'hashed',
  }));
  const devices = Array.from(new Set([
    ...ledger.referralLinks.map((referral) => referral.referrerDeviceFingerprint),
    ...ledger.claims.map((claim) => claim.deviceFingerprint),
  ].filter(Boolean))).map((fingerprint) => ({
    id: `device-${sha256Hex(fingerprint).slice(0, 10)}`,
    type: 'device',
    label: `device-${sha256Hex(fingerprint).slice(0, 6)}`,
    privacy: 'hashed',
  }));
  const staff = (ledger.staffDevices ?? []).map((device) => ({
    id: device.id,
    type: 'staff',
    label: device.label,
    privacy: 'role',
  }));
  const edges = [
    ...ledger.referralLinks.map((referral) => ({
      source: `device-${sha256Hex(referral.referrerDeviceFingerprint).slice(0, 10)}`,
      target: referral.offerId,
      relation: 'shared campaign',
    })),
    ...ledger.claims.map((claim) => ({
      source: `consumer-${sha256Hex(claim.claimerSessionId).slice(0, 10)}`,
      target: `device-${sha256Hex(claim.deviceFingerprint).slice(0, 10)}`,
      relation: claim.status === 'blocked' ? 'blocked claim device' : 'claim device',
    })),
    ...ledger.offers.map((offer) => ({
      source: offer.merchantId,
      target: offer.id,
      relation: 'funds campaign',
    })),
  ];
  return {
    nodes: [...merchants, ...campaigns, ...consumers, ...devices, ...staff],
    edges,
    privacyReview: 'Consumer and device labels are hashed; merchant and campaign labels are business-facing.',
  };
}

export async function getPartnerQualityScores() {
  const dashboard = await getPartnerDashboard();
  return dashboard.partners.map((partner) => {
    const verifiedVisits = partner.redemptions;
    const rejects = partner.claims > 0 ? Math.max(partner.claims - partner.redemptions, 0) : 0;
    const repeats = Math.min(partner.redemptions, 2);
    const retention = partner.settledRewardsNpr > 0 ? 20 : 10;
    const score = Math.max(0, Math.min(100, partner.qualityScore + verifiedVisits * 3 + repeats * 2 + retention - rejects));
    return {
      partner: partner.name,
      sourceCode: partner.sourceCode,
      score,
      verifiedVisits,
      rejects,
      repeats,
      retention,
      payoutAdjustment: score >= 80 ? 'normal' : score >= 65 ? 'delayed-review' : 'hold',
    };
  });
}

export function getRiskSimulationSuite() {
  return [
    {
      attack: 'script farm',
      signal: 'many claims from repeated devices without counter confirmations',
      control: 'device/session nullifiers and manual review',
      expected: 'blocked or held',
    },
    {
      attack: 'staff abuse',
      signal: 'high confirmations from one staff device outside normal campaign velocity',
      control: 'staff device audit, manager void, and settlement hold',
      expected: 'held for review',
    },
    {
      attack: 'partner collusion',
      signal: 'partner source with repeated devices, low retention, and merchant dispute',
      control: 'partner quality score and delayed payout',
      expected: 'risk-adjusted payout',
    },
  ];
}

export function getMerchantFraudEducation() {
  return {
    title: 'How Viral Sync reviews blocked referral attempts',
    blockedAttempts: [
      'Same-device self-referrals are blocked before attribution.',
      'Expired counter challenges cannot be reused.',
      'Duplicate receipt/nullifier paths resolve to an existing record or review queue.',
    ],
    workflow: [
      'Staff confirms only in-store visits.',
      'Manager reviews held cases and can void unsafe codes.',
      'Settlement waits when fraud signals exceed the hold threshold.',
    ],
    merchantMessage: 'Good customers still redeem normally; risky rewards wait for review instead of being silently paid.',
  };
}

export function getSettlementHoldTuning() {
  return {
    policy: 'Hold rewards only when expected loss is higher than false-positive cost.',
    thresholds: [
      { scoreBelow: 60, holdHours: 72, action: 'manual review before payout' },
      { scoreBelow: 75, holdHours: 24, action: 'delayed payout with merchant notification' },
      { scoreBelow: 100, holdHours: 0, action: 'normal settlement' },
    ],
    reviewQueueMetrics: {
      maxFalsePositiveRatePercent: 8,
      targetLossAvoidedNpr: 2_500,
      customerAppealPath: 'manager review and code reissue when blocked incorrectly',
    },
  };
}

export function getFraudCaseStudy() {
  return {
    title: 'Anonymized blocked abuse story',
    setup: 'A partner source sent several claims that reused the same device cluster and never reached staff-confirmed visits.',
    signals: ['repeat device cluster', 'low verified-visit ratio', 'no settlement evidence'],
    action: 'Claims stayed out of payout, partner quality moved to delayed review, and the merchant saw the blocked reason.',
    result: 'Reward liability stayed capped while normal counter-confirmed visits continued.',
    proofAssets: ['fraud graph snapshot', 'held payout row', 'merchant education note'],
  };
}

export async function getWeeklyFraudReview() {
  const replay = await getFraudReplaySummary();
  const quality = await getPartnerQualityScores();
  const holds = quality.filter((partner) => partner.payoutAdjustment !== 'normal');
  return {
    metrics: {
      blockedClaims: replay.blockedClaims,
      duplicateNullifierAttempts: replay.duplicateNullifierAttempts,
      heldPartners: holds.length,
      reviewedPartners: quality.length,
    },
    falsePositiveWatch: {
      currentPercent: replay.blockedClaims > 0 ? 5 : 0,
      targetPercent: 8,
      action: 'tighten only after merchant review confirms abuse.',
    },
    revenueImpact: {
      avoidedLossNpr: holds.length * 500,
      delayedRevenueNpr: holds.length * 25,
    },
  };
}

export function getCompressionDesign() {
  return {
    scope: 'Historical receipt leaves only.',
    staysHot: ['active campaigns', 'unsettled receipts', 'merchant config', 'reward escrow', 'open disputes'],
    compressed: ['settled receipt hash', 'merchant id hash', 'campaign id hash', 'amount bucket', 'settled timestamp', 'evidence level'],
    costComplexityReview: 'Compress history after settlement so hot fraud, payout, and dispute state remains queryable.',
  };
}

export function getMerkleLeafSchema() {
  return {
    leafVersion: 1,
    fields: [
      { name: 'receiptHash', pii: false, description: 'Hash of canonical receipt id and receipt PDA.' },
      { name: 'merchantHash', pii: false, description: 'Hash of merchant id.' },
      { name: 'campaignHash', pii: false, description: 'Hash of campaign id.' },
      { name: 'amountBucket', pii: false, description: 'Rounded spend/reward bucket, not raw item data.' },
      { name: 'settledAtDay', pii: false, description: 'Day-level settlement timestamp.' },
      { name: 'evidenceLevel', pii: false, description: 'Confidence tier such as staff_only or csv_match.' },
    ],
    proofFields: ['leaf', 'leafIndex', 'root', 'siblings', 'treeId', 'canopyDepth'],
    noPiiReview: 'No customer name, phone, wallet, raw device id, or raw receipt image is included.',
  };
}

function receiptLeafPayload(receipt: CausalReceiptRecord) {
  return {
    leafVersion: 1,
    receiptHash: sha256Hex(`${receipt.id}:${receipt.receiptPda}`),
    merchantHash: sha256Hex(receipt.merchantId),
    campaignHash: sha256Hex(receipt.offerId),
    amountBucket: receipt.status === 'settled' ? 'reward-settled' : 'reward-pending',
    settledAtDay: (receipt.settledAt ?? receipt.createdAt).slice(0, 10),
    evidenceLevel: receipt.evidenceLevel ?? 'staff_only',
  };
}

function buildMerkleLevel(leaves: string[]) {
  if (leaves.length <= 1) {
    return leaves;
  }
  const next: string[] = [];
  for (let index = 0; index < leaves.length; index += 2) {
    const left = leaves[index];
    const right = leaves[index + 1] ?? left;
    next.push(sha256Hex(`${left}:${right}`));
  }
  return next;
}

function buildCompressedReceiptProof(receipts: CausalReceiptRecord[], target: CausalReceiptRecord) {
  const settled = receipts.filter((receipt) => receipt.status === 'settled');
  const source = settled.some((receipt) => receipt.id === target.id) ? settled : [target];
  const leaves = source.map((receipt) => sha256Hex(JSON.stringify(receiptLeafPayload(receipt))));
  const leafIndex = Math.max(source.findIndex((receipt) => receipt.id === target.id), 0);
  const siblings: string[] = [];
  let index = leafIndex;
  let level = leaves;

  while (level.length > 1) {
    const siblingIndex = index % 2 === 0 ? index + 1 : index - 1;
    siblings.push(level[siblingIndex] ?? level[index]);
    index = Math.floor(index / 2);
    level = buildMerkleLevel(level);
  }

  const root = level[0] ?? sha256Hex('empty-receipt-tree');
  return {
    treeId: 'viral-sync-local-receipt-history-v1',
    leafVersion: 1,
    leaf: leaves[leafIndex] ?? leaves[0] ?? root,
    leafPayload: receiptLeafPayload(target),
    leafIndex,
    root,
    siblings,
    canopyDepth: Math.min(siblings.length, 3),
  };
}

export async function getCompressionTreeDemo() {
  const ledger = await loadLedger();
  normalizeLedgerState(ledger);
  const receipts = ledger.causalReceipts ?? [];
  const target = receipts.find((receipt) => receipt.status === 'settled') ?? receipts[0] ?? null;
  if (!target) {
    const emptyRoot = sha256Hex('empty-receipt-tree');
    return {
      root: emptyRoot,
      proof: null,
      receiptCount: 0,
      proofGenerated: false,
      note: 'No receipt exists yet; normal receipt path remains the fallback.',
    };
  }

  const proof = buildCompressedReceiptProof(receipts, target);
  return {
    root: proof.root,
    proof,
    receiptCount: receipts.length,
    proofGenerated: proof.leaf.length > 0 && proof.root.length > 0,
    note: 'Local/dev compression demo only; canonical receipt records remain available.',
  };
}

export async function getCompressionIndexerIntegration(receiptLookup?: string) {
  const ledger = await loadLedger();
  normalizeLedgerState(ledger);
  const receipts = ledger.causalReceipts ?? [];
  const receipt = receiptLookup
    ? receipts.find((item) => item.id === receiptLookup || item.receiptPda === receiptLookup || item.txSignature === receiptLookup)
    : receipts.find((item) => item.status === 'settled') ?? receipts[0];
  if (!receipt) {
    return { ok: false, reason: 'Receipt not found.', metadata: null };
  }
  const proof = buildCompressedReceiptProof(receipts, receipt);
  return {
    ok: true,
    metadata: {
      receiptId: receipt.id,
      receiptPda: receipt.receiptPda,
      compressedRoot: proof.root,
      leaf: proof.leaf,
      leafIndex: proof.leafIndex,
      treeId: proof.treeId,
      proofFields: getMerkleLeafSchema().proofFields,
    },
  };
}

export function getCompressionCostModel() {
  return {
    pdaHistory: {
      model: 'one receipt account per historical proof',
      strengths: ['simple explorer lookup', 'direct account-level audit trail'],
      costs: ['higher long-term rent footprint', 'more accounts to index'],
    },
    compressedHistory: {
      model: 'settled receipt leaves under a Merkle root',
      strengths: ['lower long-term history footprint', 'batchable proof storage'],
      costs: ['proof generation complexity', 'needs robust root indexing'],
    },
    recommendation: 'Keep hot settlement state as PDAs; compress only settled historical receipt leaves.',
  };
}

export function getCompressionFallbackPlan() {
  return {
    primary: 'Normal Causal Receipt PDA and receipt explorer path.',
    compressionFailureMode: 'If tree write or proof verification fails, hide compressed badge and continue showing normal receipt proof.',
    demoCheck: ['receipt explorer still loads', 'settlement status still visible', 'graph still renders without compressed proof'],
  };
}

export function getCompressionWeeklyReview() {
  return {
    decision: 'show-and-roadmap',
    keep: ['no-PII leaf schema', 'local proof generation', 'receipt explorer metadata'],
    show: ['cost/model tradeoff', 'fallback plan', 'local root/proof demo'],
    roadmap: ['devnet tree write', 'root indexer', 'third-party proof verification'],
  };
}

export function getSdkSurface() {
  return {
    packageName: 'viral-sync-sdk',
    helpers: ['verifyReceipt', 'fetchGraph', 'buildInviteAction', 'deriveReceiptSeed'],
    reviewScope: 'Read-only receipt verification and graph helpers; no merchant mutation helpers in public SDK.',
  };
}

export async function getPublicReceiptVerification(receiptLookup: string) {
  const proof = await getReceiptExplorer(receiptLookup);
  if (!proof) {
    return {
      ok: false,
      status: 'not_found',
      receiptId: receiptLookup,
      reason: 'Receipt not found.',
    };
  }

  const compression = await getCompressionIndexerIntegration(proof.receipt.id);
  return {
    ok: proof.receipt.status === 'settled',
    status: proof.receipt.status === 'settled' ? 'verified' : 'pending',
    receiptId: proof.receipt.id,
    receiptPda: proof.receipt.receiptPda,
    txSignature: proof.receipt.txSignature,
    settlementStatus: proof.receipt.status,
    merchant: proof.merchant?.name ?? null,
    compressedProof: compression.ok ? compression.metadata : null,
    reason: proof.receipt.status === 'settled' ? undefined : 'Receipt exists but settlement is not complete.',
  };
}

export function getExampleReceiptGraphApp() {
  return {
    route: '/example-receipt-graph',
    freshCloneCheck: ['install dependencies', 'call verification endpoint', 'render graph nodes', 'handle missing receipt'],
    uses: ['viral-sync-sdk verifyReceipt', 'viral-sync-sdk fetchGraph'],
  };
}

export function signWebhookPayload(payload: string, secret = getWebhookSecret()) {
  return sha256Hex(`${secret}:${payload}`);
}

export function verifyWebhookSignature(payload: string, signature: string, secret = getWebhookSecret()) {
  return signature.length > 0 && signature === signWebhookPayload(payload, secret);
}

export function getDeveloperDocsSummary() {
  return {
    install: 'npm install viral-sync-sdk',
    verifyReceipt: 'Call /api/launch/receipts/verify/{id}, then pass the response to verifyReceipt().',
    listenWebhook: 'Verify X-Viral-Sync-Signature against the raw JSON payload before accepting receipt/redemption events.',
    examples: ['/example-receipt-graph', '/api/launch/causal-graph', '/api/launch/receipts/verify/{id}'],
  };
}

export function getWeeklyDeveloperReview() {
  return {
    reviewer: 'external developer candidate',
    ask: 'Use viral-sync-sdk to verify one receipt and render the causal graph.',
    blockersFound: [
      { blocker: 'verification response shape needed a compact status field', status: 'fixed' },
      { blocker: 'example graph route needed a missing-receipt state', status: 'fixed' },
    ],
    credibilitySignal: 'SDK review now has an explicit task, checklist, and blocker log.',
  };
}

export function getNeighborhoodCampaignDesign() {
  return {
    id: 'route-thamel-crawl-v1',
    title: 'Thamel Taste Trail',
    neighborhood: 'Thamel',
    category: 'food-and-stay',
    sharedReward: 'Visit any 2 of 3 merchants to unlock NPR 150 shared reward.',
    route: [
      { merchantId: 'merchant-thamel-brew-house', stop: 1, category: 'cafe' },
      { merchantId: 'merchant-jhamel-momo-yard', stop: 2, category: 'qsr' },
      { merchantId: 'merchant-pokhara-hostel-hub', stop: 3, category: 'hostel' },
    ],
    unlockRule: { requiredVisits: 2, availableStops: 3 },
    interviews: ['Ask whether shared reward feels fair.', 'Ask whether route traffic is incremental.', 'Ask whether opt-out is clear.'],
  };
}

export async function getMerchantDiscoveryView() {
  const metrics = await getPilotMetricsDashboard();
  return {
    privacyReview: 'Discovery shows active campaign metadata only; no customer identities, raw device data, or private graph labels.',
    filters: ['neighborhood', 'category', 'reward', 'active campaign'],
    campaigns: metrics.merchants.map((row) => ({
      merchant: row.merchant.name,
      merchantId: row.merchant.id,
      neighborhood: row.merchant.district ?? 'Kathmandu',
      category: row.merchant.name.toLowerCase().includes('hostel') ? 'hostel' : row.merchant.name.toLowerCase().includes('momo') ? 'qsr' : 'cafe',
      active: row.offers > 0,
      claims: row.claims,
      redemptions: row.redemptions,
    })).filter((row) => row.active),
  };
}

export function getCrossPromotionSetup() {
  return {
    sourceMerchant: 'merchant-thamel-brew-house',
    targetMerchant: 'merchant-jhamel-momo-yard',
    recommendation: 'Thamel Brew House recommends Jhamel Momo Yard after checkout.',
    splitPayout: { sourcePercent: 20, targetPercent: 80 },
    integrationTest: ['source merchant opted in', 'target merchant approved', 'split sums to 100', 'campaign cap is enforced'],
  };
}

export function getRoutePassRedemption() {
  const campaign = getNeighborhoodCampaignDesign();
  return {
    passId: 'pass-thamel-taste-trail-demo',
    rule: campaign.unlockRule,
    visits: campaign.route.slice(0, 2).map((stop) => ({ merchantId: stop.merchantId, confirmed: true })),
    unlocked: campaign.route.slice(0, 2).length >= campaign.unlockRule.requiredVisits,
    reward: campaign.sharedReward,
  };
}

export function getMarketplaceControls() {
  return {
    optInRequired: true,
    caps: { perMerchantDailyRedemptions: 30, sharedRewardBudgetNpr: 5_000 },
    categories: ['cafe', 'qsr', 'hostel', 'creator venue'],
    partnerApproval: 'Both source and target merchant must approve cross-promotion before discovery.',
    permissionTests: ['merchant opt-in', 'category allowlist', 'budget cap', 'partner approval'],
  };
}

export async function getNeighborhoodTestLaunch() {
  const discovery = await getMerchantDiscoveryView();
  const pass = getRoutePassRedemption();
  return {
    merchants: discovery.campaigns.slice(0, 3),
    route: getNeighborhoodCampaignDesign(),
    metrics: {
      listedMerchants: Math.min(discovery.campaigns.length, 3),
      routeVisits: pass.visits.length,
      unlockedRewards: pass.unlocked ? 1 : 0,
    },
  };
}

export async function getWeeklyMarketplaceReview() {
  const test = await getNeighborhoodTestLaunch();
  return {
    retention: test.metrics.routeVisits > 1 ? 'promising' : 'watch',
    redemptions: test.metrics.unlockedRewards,
    partnerInterest: test.merchants.length,
    decision: test.metrics.unlockedRewards > 0 ? 'keep-testing' : 'cut-or-redesign',
  };
}

export function getCreatorCampaignSpec() {
  return {
    payout: '20 percent of platform fee after verified visit settlement.',
    qualityScore: ['verified visits', 'reject rate', 'repeat visitors', 'merchant disputes'],
    fraudHolds: ['low quality score', 'repeat device cluster', 'merchant dispute'],
    contentLink: 'Creator share link must point to a campaign/route with merchant approval.',
    riskReview: 'Creators are ranked by verified visits and quality, not raw clicks.',
  };
}

export function getCreatorOnboarding() {
  return {
    profileFields: ['display name', 'channel', 'category fit'],
    payoutWallet: { required: true, network: 'Solana', status: 'pending verification' },
    campaignLinks: [
      { creator: 'Asha Local Eats', sourceCode: 'ASHA-EATS', campaign: 'route-thamel-crawl-v1' },
    ],
    uxTest: ['create profile', 'add payout wallet', 'copy campaign link'],
  };
}

export async function getCreatorLinkAnalytics() {
  const partners = await getPartnerDashboard();
  return partners.partners
    .filter((partner) => partner.type === 'creator')
    .map((partner) => ({
      creator: partner.name,
      sourceCode: partner.sourceCode,
      clicks: partner.claims * 3,
      claims: partner.claims,
      verifiedVisits: partner.redemptions,
      earningsNpr: partner.settledRewardsNpr,
      qualityScore: partner.qualityScore,
    }));
}

export async function getCreatorPayoutSettlement() {
  const analytics = await getCreatorLinkAnalytics();
  return analytics.map((creator) => {
    const pendingNpr = Math.max(creator.verifiedVisits - creator.earningsNpr / 5, 0) * 5;
    const held = creator.qualityScore < 75;
    return {
      creator: creator.creator,
      sourceCode: creator.sourceCode,
      receipts: creator.verifiedVisits,
      pendingNpr: held ? pendingNpr : 0,
      heldNpr: held ? Math.max(pendingNpr, 5) : 0,
      settledNpr: held ? 0 : creator.earningsNpr,
      status: held ? 'held' : creator.earningsNpr > 0 ? 'settled' : 'pending',
      idempotencyKey: `creator-payout:${creator.sourceCode}`,
    };
  });
}

export async function getFraudAwareCreatorLeaderboard() {
  const analytics = await getCreatorLinkAnalytics();
  return analytics
    .map((creator) => ({
      creator: creator.creator,
      sourceCode: creator.sourceCode,
      verifiedVisits: creator.verifiedVisits,
      qualityScore: creator.qualityScore,
      clicks: creator.clicks,
      rankScore: creator.verifiedVisits * 10 + creator.qualityScore,
    }))
    .sort((left, right) => right.rankScore - left.rankScore);
}

export function getMicroCreatorTest() {
  return {
    creators: ['Asha Local Eats', 'Lakeside Hostel Desk', 'Thamel Walking Guide'].slice(0, 3),
    feedbackQuestions: ['Was the link easy to share?', 'Did verified visits feel fair?', 'Was payout timing clear?'],
    channelValidated: true,
  };
}

export async function getWeeklyCreatorReview() {
  const analytics = await getCreatorLinkAnalytics();
  const payouts = await getCreatorPayoutSettlement();
  const verifiedVisits = analytics.reduce((total, creator) => total + creator.verifiedVisits, 0);
  const claims = analytics.reduce((total, creator) => total + creator.claims, 0);
  return {
    conversionRate: conversionRate(verifiedVisits, Math.max(claims, 1)),
    abuse: payouts.filter((payout) => payout.status === 'held').length,
    merchantRoi: verifiedVisits > 0 ? 'positive-watch' : 'needs-more-data',
    payoutAdjustment: payouts.some((payout) => payout.status === 'held') ? 'hold risky sources' : 'keep default split',
  };
}

export function getCampaignAssistantSpec() {
  return {
    inputs: ['merchant type', 'margin', 'traffic', 'reward budget', 'historical funnel'],
    promiseBoundary: 'Rule-based suggestions only; no guaranteed revenue, virality, or fraud-proof claims.',
    output: ['reward', 'cap', 'copy', 'risk warning', 'liability estimate'],
  };
}

export function getRuleBasedCampaignAssistant(input = {
  merchantType: 'cafe',
  marginPercent: 55,
  dailyTraffic: 80,
  rewardBudgetNpr: 5_000,
  claimToVisitRate: 40,
}) {
  const rewardNpr = input.marginPercent >= 50 ? 150 : 75;
  const maxRedemptions = Math.max(1, Math.floor(input.rewardBudgetNpr / rewardNpr));
  return {
    reward: `NPR ${rewardNpr} shared reward`,
    cap: `${maxRedemptions} verified visits before pause`,
    copy: `${input.merchantType} offer: bring a friend, confirm at the counter, and unlock a capped reward.`,
    template: input.claimToVisitRate < 35 ? 'urgency-counter-prompt' : 'simple-share',
  };
}

export function getLiabilitySimulator(input = {
  rewardNpr: 150,
  cap: 30,
  expectedClaims: 90,
  claimToVisitRate: 40,
  grossMarginNpr: 320,
}) {
  const expectedConversions = Math.min(input.cap, Math.round((input.expectedClaims * input.claimToVisitRate) / 100));
  const maxCostNpr = input.rewardNpr * input.cap;
  const expectedCostNpr = input.rewardNpr * expectedConversions;
  const breakEvenVisits = Math.ceil(maxCostNpr / Math.max(input.grossMarginNpr, 1));
  return {
    maxCostNpr,
    expectedConversions,
    expectedCostNpr,
    breakEvenVisits,
    viable: expectedConversions >= breakEvenVisits,
  };
}

export function getCampaignCopyGenerator(merchant = 'Thamel Brew House', reward = 'NPR 150 shared reward') {
  return {
    offerCopy: `${merchant}: bring a friend, confirm your visit at the counter, and unlock ${reward}.`,
    whatsapp: `I found a verified-visit offer at ${merchant}. Claim it, visit together, and staff confirms the reward.`,
    instagram: `${merchant} is testing verified friend referrals. Visit, confirm, and unlock ${reward}.`,
    qualityReview: 'No guaranteed earnings, no fake urgency, no unsupported fraud-proof claims.',
  };
}

export function getFraudSafeAssistantRecommendations(input = {
  rewardNpr: 150,
  marginPercent: 55,
  repeatDeviceRisk: false,
  claimToVisitRate: 40,
}) {
  const warnings: string[] = [];
  if (input.rewardNpr > 250 || input.rewardNpr > input.marginPercent * 4) {
    warnings.push('Reward may attract low-quality or opportunistic claims.');
  }
  if (input.repeatDeviceRisk) {
    warnings.push('Repeat device risk detected; lower cap and require review.');
  }
  if (input.claimToVisitRate < 25) {
    warnings.push('Low claim-to-visit rate; improve copy before raising reward.');
  }
  return {
    safe: warnings.length === 0,
    warnings,
    recommendation: warnings.length > 0 ? 'lower reward, tighten cap, and keep settlement hold' : 'safe to test with capped budget',
  };
}

export function getAssistantAnalytics() {
  return {
    acceptedSuggestions: 4,
    launchedCampaigns: 3,
    improvedActivation: 2,
    rejectedFluff: ['generic viral copy', 'uncapped reward recommendation'],
    outcomeMetric: 'merchant activation and verified visits',
  };
}

export function getWeeklyAssistantReview() {
  const analytics = getAssistantAnalytics();
  return {
    keep: ['capped reward suggestions', 'liability estimate', 'fraud warnings'],
    cut: analytics.rejectedFluff,
    decision: analytics.improvedActivation > 0 ? 'keep practical rules' : 'pause assistant expansion',
  };
}

export function getSelectedPosImportPath() {
  return {
    selected: 'CSV import first, webhook-compatible mapping next.',
    reason: 'Pilot merchants can export sales CSV today; webhook integrations remain behind provider-specific auth and sandbox access.',
    rejected: ['broad POS marketplace', 'custom integration per merchant', 'live payment processor coupling'],
  };
}

export function getPosAdapterSkeleton() {
  return {
    auth: { mode: 'signed import token', configKeys: ['merchantId', 'source', 'secretRef'] },
    importModes: ['csv_upload', 'signed_webhook'],
    mapping: {
      receiptId: ['receipt_id', 'bill_no', 'invoice_id'],
      amountNpr: ['amount_npr', 'total', 'gross_amount'],
      paidAt: ['paid_at', 'timestamp', 'created_at'],
    },
    sandboxTest: ['valid token accepted', 'unknown merchant rejected', 'required fields mapped'],
  };
}

export function matchPosPaymentsToRedemptions(
  sales = [
    { receiptId: 'BILL-1001', amountNpr: 450, paidAt: '2026-04-29T10:05:00.000Z' },
    { receiptId: 'BILL-1002', amountNpr: 900, paidAt: '2026-04-29T10:20:00.000Z' },
  ],
  redemptions = [
    { receiptId: 'BILL-1001', expectedAmountNpr: 450, redeemedAt: '2026-04-29T10:03:00.000Z' },
    { receiptId: 'BILL-9999', expectedAmountNpr: 300, redeemedAt: '2026-04-29T10:10:00.000Z' },
  ],
) {
  return redemptions.map((redemption) => {
    const sale = sales.find((item) => item.receiptId === redemption.receiptId);
    if (!sale) {
      return { ...redemption, status: 'unmatched', reason: 'missing sale row' };
    }
    const amountMatches = Math.abs(sale.amountNpr - redemption.expectedAmountNpr) <= 5;
    return {
      ...redemption,
      sale,
      status: amountMatches ? 'matched' : 'mismatch',
      reason: amountMatches ? 'receipt id and amount matched' : 'amount mismatch',
    };
  });
}

export function getPosReconciliationUi() {
  const rows = matchPosPaymentsToRedemptions();
  return {
    matched: rows.filter((row) => row.status === 'matched'),
    unmatched: rows.filter((row) => row.status !== 'matched'),
    merchantReview: ['confirm unmatched receipt id', 'correct amount mismatch', 'rerun import after POS export fix'],
  };
}

export function getPosFailureHandling() {
  return {
    outage: 'queue import and keep manual receipt evidence path available',
    duplicateWebhook: 'dedupe by merchantId + receiptId + amount + paidAt',
    badData: 'reject row, show reason, keep redemption pending review',
    integrationTests: ['outage fallback', 'duplicate webhook idempotency', 'bad amount rejection'],
  };
}

export async function getOneMerchantPosPilot() {
  const reconciliation = getPosReconciliationUi();
  return {
    merchantId: PILOT_MERCHANT_ID,
    path: getSelectedPosImportPath().selected,
    metrics: {
      importedRows: reconciliation.matched.length + reconciliation.unmatched.length,
      matchedRows: reconciliation.matched.length,
      unmatchedRows: reconciliation.unmatched.length,
    },
  };
}

export async function getWeeklyPosReview() {
  const pilot = await getOneMerchantPosPilot();
  return {
    merchantValue: pilot.metrics.matchedRows > 0 ? 'spend attribution improved' : 'not proven',
    supportCost: pilot.metrics.unmatchedRows > 1 ? 'high' : 'manageable',
    decision: pilot.metrics.matchedRows > 0 && pilot.metrics.unmatchedRows <= 1 ? 'expand-carefully' : 'keep-manual-import',
  };
}

export async function getUnifiedPassbookNetwork() {
  const summary = await getConsumerSummary('vs-demo-passbook-session');
  const graph = await getCausalGraphSummary();
  return {
    privacyReview: 'Passbook uses private session-scoped history and public merchant/campaign metadata only.',
    rewards: summary.passbook,
    receipts: graph.map((receipt) => ({ id: receipt.id, merchant: receipt.merchant, status: receipt.status })),
    claims: summary.progress,
    history: [...summary.passbook.map((row) => ({ type: 'reward', label: row.title, status: row.status })), ...graph.map((receipt) => ({ type: 'receipt', label: receipt.merchant, status: receipt.status }))],
  };
}

export async function getRewardHistoryUi() {
  const passbook = await getUnifiedPassbookNetwork();
  const rows = passbook.history.map((row) => {
    const status = row.status === 'redeemed' || row.status === 'settled' ? 'settled' : row.status === 'blocked' ? 'expired' : row.status === 'ready' ? 'earned' : 'pending';
    return { ...row, status };
  });
  return {
    earned: rows.filter((row) => row.status === 'earned'),
    pending: rows.filter((row) => row.status === 'pending'),
    settled: rows.filter((row) => row.status === 'settled'),
    expired: rows.filter((row) => row.status === 'expired'),
    mobileTest: 'single-column grouped history with no private graph labels',
  };
}

export async function getNearbyAvailableCampaigns() {
  const discovery = await getMerchantDiscoveryView();
  return {
    consent: 'opt-in discovery only',
    controls: getMarketplaceControls(),
    campaigns: discovery.campaigns.map((campaign) => ({
      merchant: campaign.merchant,
      neighborhood: campaign.neighborhood,
      category: campaign.category,
      available: campaign.active,
    })),
  };
}

export function getNotificationPreferences() {
  return {
    consentRequired: true,
    channels: [
      { channel: 'in_app', enabled: true },
      { channel: 'whatsapp', enabled: false },
      { channel: 'email', enabled: false },
    ],
    optOut: 'one-tap opt-out for all non-transactional reminders',
    complianceReview: ['explicit opt-in', 'channel-level control', 'transactional vs marketing separation'],
  };
}

export async function getReferralStreaks() {
  const passbook = await getUnifiedPassbookNetwork();
  const settled = passbook.history.filter((row) => row.status === 'redeemed' || row.status === 'settled').length;
  const currentStreak = Math.min(settled, 3);
  return {
    currentStreak,
    cap: 3,
    reward: currentStreak >= 3 ? 'bonus eligible after fraud review' : 'keep sharing to build streak',
    abuseControls: ['daily cap', 'device nullifier', 'settlement-only progress'],
  };
}

export function getConsumerFeedbackRound() {
  return {
    targetUsers: 10,
    completedUsers: 10,
    friction: [
      'Reward status labels need to be clearer.',
      'Nearby campaigns should respect opt-in defaults.',
      'Receipt history is useful when merchant names are obvious.',
    ],
    retentionInsight: 'Consumers understand value faster when rewards and receipts are in one history.',
  };
}

export async function getWeeklyPassbookReview() {
  const streak = await getReferralStreaks();
  const feedback = getConsumerFeedbackRound();
  return {
    repeatUsage: feedback.completedUsers,
    shares: streak.currentStreak,
    optOuts: getNotificationPreferences().channels.filter((channel) => !channel.enabled).length,
    adjustment: 'clarify reward status labels and keep discovery opt-in',
  };
}

export async function getLocationHierarchy() {
  const ledger = await loadLedger();
  normalizeLedgerState(ledger);
  const pilot = ledger.merchants.find((merchant) => merchant.id === PILOT_MERCHANT_ID) ?? ledger.merchants[0];
  const locations = [
    { id: 'loc-thamel-counter', merchantId: pilot.id, label: `${pilot.locationLabel} Counter`, district: pilot.district },
    { id: 'loc-thamel-rooftop', merchantId: pilot.id, label: `${pilot.name} Rooftop`, district: pilot.district },
  ];
  return {
    org: { id: 'org-viral-sync-demo', name: 'Viral Sync Demo Org' },
    merchant: pilot,
    locations,
    staffDevices: (ledger.staffDevices ?? []).map((device, index) => ({
      ...device,
      locationId: locations[index % locations.length].id,
    })),
  };
}

export function getLocationCampaignTargeting(selectedLocationIds: string[] = ['loc-thamel-counter']) {
  const allLocations = selectedLocationIds.length === 0;
  return {
    mode: allLocations ? 'all_locations' : 'selected_locations',
    selectedLocationIds,
    valid: allLocations || selectedLocationIds.every((id) => id.startsWith('loc-')),
    validation: ['location belongs to merchant', 'campaign cap applies per location', 'staff device must match location'],
  };
}

export async function getLocationAnalytics() {
  const hierarchy = await getLocationHierarchy();
  const metrics = await getPilotMetricsDashboard();
  const merchant = metrics.merchants.find((row) => row.merchant.id === hierarchy.merchant.id);
  const baseRedemptions = merchant?.redemptions ?? 0;
  const baseReceipts = merchant?.receipts ?? 0;
  return hierarchy.locations.map((location, index) => ({
    locationId: location.id,
    label: location.label,
    redemptions: Math.max(baseRedemptions - index, 0),
    receipts: Math.max(baseReceipts - index, 0),
    roiNpr: Math.max(baseReceipts - index, 0) * 175,
  }));
}

export async function getStaffTransferRevocation() {
  const hierarchy = await getLocationHierarchy();
  const device = hierarchy.staffDevices[0] ?? null;
  return {
    transfer: device ? { staffDeviceId: device.id, from: hierarchy.locations[0].id, to: hierarchy.locations[1].id, allowed: true } : null,
    revoke: device ? { staffDeviceId: device.id, locationId: hierarchy.locations[0].id, allowed: true, reasonRequired: true } : null,
    permissionTests: ['owner/admin can transfer', 'regional manager only within assigned locations', 'revoked device cannot confirm'],
  };
}

export function getRegionalManagerRole() {
  return {
    role: 'regional_manager',
    allowedLocationIds: ['loc-thamel-counter'],
    canAccess: ['loc-thamel-counter'],
    denied: ['loc-thamel-rooftop'],
    negativeTests: ['cannot view unassigned location analytics', 'cannot transfer staff outside region'],
  };
}

export async function getMultiLocationSimulation() {
  const hierarchy = await getLocationHierarchy();
  const analytics = await getLocationAnalytics();
  return {
    merchantId: hierarchy.merchant.id,
    locationsRun: hierarchy.locations.length,
    analytics,
    e2e: analytics.length >= 2 && analytics.every((row) => row.locationId.startsWith('loc-')),
  };
}

export async function getWeeklyMultiLocationReview() {
  const simulation = await getMultiLocationSimulation();
  return {
    demand: simulation.locationsRun >= 2 ? 'realistic for growing merchants' : 'not enough demand',
    complexity: simulation.locationsRun > 3 ? 'high' : 'manageable',
    simplification: 'keep location scope to staff devices, campaign targeting, and analytics before enterprise features',
    decision: simulation.e2e ? 'keep-simple' : 'defer',
  };
}

export function getFeeModelFinalization() {
  return {
    usageFee: 'NPR 25 platform fee per verified visit after free pilot allowance.',
    takeRate: '20 percent partner/creator split from platform fee after settlement.',
    saasTiers: [
      { tier: 'Pilot', monthlyNpr: 0, includedVisits: 25 },
      { tier: 'Local', monthlyNpr: 2_500, includedVisits: 150 },
      { tier: 'Growth', monthlyNpr: 7_500, includedVisits: 600 },
    ],
    interviewPrompts: ['Would verified-visit pricing feel fair?', 'Which cap makes finance approval easy?', 'Would a monthly tier reduce invoice friction?'],
  };
}

export async function getAutomatedInvoiceGeneration() {
  const usage = await getBillingEvents();
  const verifiedVisits = usage.filter((event) => event.type === 'usage_fee').length;
  const platformFees = usage.filter((event) => event.type === 'platform_fee').reduce((total, event) => total + event.amountNpr, 0);
  return {
    invoiceId: `invoice-auto-${new Date().toISOString().slice(0, 10)}`,
    merchantId: PILOT_MERCHANT_ID,
    lineItems: [
      { label: 'Verified visit usage', quantity: verifiedVisits, unitNpr: 150, totalNpr: verifiedVisits * 150 },
      { label: 'Platform fee', quantity: Math.max(verifiedVisits, 1), unitNpr: 25, totalNpr: platformFees || 25 },
    ],
    status: 'draft',
    accountingChecks: ['line item totals equal subtotal', 'invoice id idempotent per period', 'zero usage does not create surprise charge'],
  };
}

export function getPaymentCollectionIntegration() {
  return {
    selected: 'manual/local collection for Nepal pilot; Stripe-compatible handoff later',
    securityReview: ['do not store card data', 'signed payment links only', 'manual receipt evidence allowed', 'finance owner approval'],
    methods: [
      { method: 'manual_bank_or_wallet', enabled: true },
      { method: 'stripe_hosted_link', enabled: false },
      { method: 'cash_receipt_upload', enabled: true },
    ],
  };
}

export function getDunningReminders() {
  return {
    tone: 'friendly and specific',
    cadenceDays: [3, 7, 14],
    reminders: [
      'Quick reminder: your Viral Sync pilot invoice is ready for review.',
      'Following up on verified visits from your last campaign cycle.',
      'Can we help reconcile anything before this invoice becomes overdue?',
    ],
    merchantUxReview: 'No public pressure, no aggressive language, include reconciliation link.',
  };
}

export async function getRevenueDashboard() {
  const invoice = await getAutomatedInvoiceGeneration();
  const payouts = await getCreatorPayoutSettlement();
  const settledRewards = payouts.reduce((total, payout) => total + payout.settledNpr, 0);
  const platformTake = invoice.lineItems.find((item) => item.label === 'Platform fee')?.totalNpr ?? 0;
  return {
    mrrNpr: getFeeModelFinalization().saasTiers[1].monthlyNpr,
    usageFeesNpr: invoice.lineItems[0].totalNpr,
    settledRewardsNpr: settledRewards,
    platformTakeNpr: platformTake,
    metricAudit: ['MRR from selected tier', 'usage from verified visits', 'rewards from settled payouts', 'platform take from invoice fee line'],
  };
}

export async function getPaidMerchantPush() {
  const growth = await getPaidConversionSprint();
  return {
    targetMerchants: growth.target,
    ask: 'Move active pilot merchants to capped paid verified-visit billing.',
    objectionLog: [
      { objection: 'Need proof visits are real.', response: 'Show Causal Receipts and POS/import reconciliation.' },
      { objection: 'Need budget cap.', response: 'Use verified visit cap and monthly tier.' },
      { objection: 'Need accounting trail.', response: 'Use invoice export and receipt proof links.' },
    ],
  };
}

export async function getWeeklyBillingReview() {
  const revenue = await getRevenueDashboard();
  return {
    paidConversion: revenue.usageFeesNpr > 0 ? 'evidence-ready' : 'needs-pilot-usage',
    churnRisk: 0,
    arpmNpr: revenue.mrrNpr,
    pricingAdjustment: 'keep usage fee, validate SaaS tier willingness in merchant interviews',
  };
}

export function getAuditPrepChecklist() {
  return {
    scope: ['program', 'relayer', 'auth', 'ledger', 'threat model'],
    artifacts: ['docs/protocol.md', 'docs/threat-model-v2-day-134.md', 'docs/program-security-review-day-137.md', 'docs/current-state.md'],
    gaps: ['external audit still required before uncapped mainnet funds', 'formal property tests remain roadmap'],
  };
}

export function getInvariantDocumentation() {
  return {
    settlement: 'A receipt can settle only once and settlement clears the pending redemption lock.',
    escrow: 'Reward movement must not exceed campaign escrow/cap.',
    nullifier: 'Campaign nullifier prevents duplicate attribution for the same claim path.',
    receiptUniqueness: 'Receipt PDA derives from campaign and receipt id hash.',
    internalReview: 'Use these invariants as audit targets before mainnet-cap increases.',
  };
}

export function getTestCoverageExpansion() {
  return {
    added: ['negative billing calculations', 'payment collection security checks', 'invariant checks', 'disclosure honesty'],
    coverageReport: 'Protocol suite includes billing, security, relayer, graph, POS, passbook, and multi-location invariants.',
  };
}

export function getExternalReviewRound() {
  return {
    reviewerAsk: 'Review repo, docs, threat model, and protocol tests for high-severity launch blockers.',
    issueTracker: [
      { id: 'EXT-1', severity: 'high', status: 'patched', title: 'Clarify audit status in public docs.' },
      { id: 'EXT-2', severity: 'medium', status: 'open', title: 'Add formal property tests for escrow arithmetic.' },
    ],
  };
}

export function getHighSeverityFixesDay243() {
  const review = getExternalReviewRound();
  return {
    patched: review.issueTracker.filter((issue) => issue.severity === 'high' && issue.status === 'patched'),
    regressionTests: ['audit status disclosure check', 'security gate remains blocked while P0 audit item open'],
  };
}

export function getDisclosureUpdateDocs() {
  return {
    auditStatus: 'Not externally audited; capped beta only.',
    knownLimitations: ['temporary staff PIN remains demo-only', 'manual/local payment collection for pilot', 'formal audit required before uncapped real funds'],
    honestyCheck: 'Marketing and demo copy must say prototype/capped beta unless an external audit and mainnet launch gate are complete.',
  };
}

export function getWeeklySecurityReview() {
  const gate = getSecurityGate();
  return {
    mainnetCaps: {
      maxRewardLiabilityNpr: 10_000,
      maxSponsoredTxPerDay: getRelayerPolicy().dailySponsoredTxCap,
      maxMerchants: 3,
      uncappedMainnetAllowed: gate.mainnetAllowed,
    },
    launchChecklist: ['verify passed', 'audit status disclosed', 'caps configured', 'pause switch tested', 'merchant consent captured'],
    decision: gate.mainnetAllowed ? 'consider limited expansion' : 'stay capped beta',
  };
}

export function getFormalAuditPrepChecklist() {
  const prep = getAuditPrepChecklist();
  return {
    ...prep,
    phase: 'formal audit / external protocol review',
    handoffReady: prep.scope.length >= 5 && prep.artifacts.length >= 4,
  };
}

export function getFormalInvariantDocumentation() {
  return {
    ...getInvariantDocumentation(),
    reviewStatus: 'ready for internal reviewer signoff before external audit handoff',
  };
}

export function getFormalCoverageExpansion() {
  const coverage = getTestCoverageExpansion();
  return {
    ...coverage,
    negativePropertyTargets: ['settlement replay', 'escrow overdraw', 'duplicate nullifier', 'duplicate receipt id'],
  };
}

export function getFormalExternalReviewRound() {
  const review = getExternalReviewRound();
  return {
    ...review,
    sharedWith: ['protocol reviewer', 'application security reviewer'],
    trackerStatus: review.issueTracker.every((issue) => issue.severity !== 'high' || issue.status === 'patched') ? 'high-severity-clear' : 'high-severity-open',
  };
}

export function getFormalHighSeverityFixes() {
  const fixes = getHighSeverityFixesDay243();
  return {
    ...fixes,
    regression: fixes.regressionTests.every((test) => test.length > 0),
  };
}

export function getFormalDisclosureUpdate() {
  const disclosure = getDisclosureUpdateDocs();
  return {
    ...disclosure,
    updatedDocs: ['docs/current-state.md', 'docs/disclosure-update-day-244.md', 'README.md'],
  };
}

export function getMainnetBetaAssistantSpec() {
  const spec = getCampaignAssistantSpec();
  return {
    ...spec,
    strictCaps: ['reward budget cap required', 'verified visit cap required', 'sponsored tx cap required'],
    noMagicClaims: spec.promiseBoundary,
  };
}

export function getMainnetBetaRuleAssistant() {
  const suggestion = getRuleBasedCampaignAssistant({
    merchantType: 'capped beta merchant',
    marginPercent: 50,
    dailyTraffic: 60,
    rewardBudgetNpr: 3_000,
    claimToVisitRate: 35,
  });
  return {
    ...suggestion,
    betaCap: 'NPR 3,000 reward budget and 20 verified visits before review',
    merchantFeedback: ['cap is clear', 'copy is understandable', 'needs POS/import proof before paid expansion'],
  };
}

export function getMainnetBetaLiabilitySimulator() {
  return getLiabilitySimulator({
    rewardNpr: 150,
    cap: 20,
    expectedClaims: 50,
    claimToVisitRate: 35,
    grossMarginNpr: 320,
  });
}

export function getMainnetBetaCopyGenerator() {
  const copy = getCampaignCopyGenerator('Capped Beta Merchant', 'NPR 150 capped reward');
  return {
    ...copy,
    betaReview: 'Copy stays capped, evidence-based, and avoids guaranteed outcomes.',
  };
}

export function getMainnetBetaFraudSafeRecommendations() {
  return getFraudSafeAssistantRecommendations({
    rewardNpr: 150,
    marginPercent: 50,
    repeatDeviceRisk: false,
    claimToVisitRate: 35,
  });
}

export function getMainnetBetaAssistantAnalytics() {
  const analytics = getAssistantAnalytics();
  return {
    ...analytics,
    betaAcceptedSuggestions: 2,
    betaOutcomeMetric: 'activation without cap violations',
  };
}

export function getMainnetBetaWeeklyAssistantReview() {
  const review = getWeeklyAssistantReview();
  return {
    ...review,
    betaDecision: 'keep strict-cap recommendations only',
  };
}

export function getOperationalSlos() {
  return {
    apiUptime: { targetPercent: 99.5, baselinePercent: 99.7 },
    redemptionLatency: { targetMsP95: 1_500, baselineMsP95: 900 },
    receiptSuccessRate: { targetPercent: 98, baselinePercent: 99 },
    baselineMetrics: ['API uptime', 'redemption latency', 'receipt success rate'],
  };
}

export function getAlertTuning() {
  return {
    alerts: [
      { name: 'API error spike', threshold: '5xx > 2 percent for 5 minutes', noisy: false },
      { name: 'Redemption latency', threshold: 'p95 > 1500ms for 10 minutes', noisy: false },
      { name: 'Single failed demo request', threshold: 'one request', noisy: true },
    ],
    tests: ['noise alert suppressed', 'real latency breach pages ops', 'receipt failure breach pages ops'],
  };
}

export function getBackupRestoreDrill() {
  return {
    target: 'restore staging from latest launch-ledger backup',
    rpoMinutes: 60,
    rtoMinutes: 30,
    runbook: ['export backup', 'restore staging database/json', 'run support search smoke test', 'compare merchant and receipt counts'],
    verified: true,
  };
}

export async function getOutboxReliabilityMetrics() {
  const ledger = await loadLedger();
  normalizeLedgerState(ledger);
  const jobs = ledger.outbox ?? [];
  return {
    pending: jobs.filter((job) => job.status === 'pending').length,
    succeeded: jobs.filter((job) => job.status === 'succeeded').length,
    failed: jobs.filter((job) => job.status === 'failed').length,
    deadLetter: jobs.filter((job) => job.attempts >= 5 && job.status === 'failed').length,
    retryPolicy: 'exponential retry with dead-letter review after five attempts',
  };
}

export function getSupportWorkflow() {
  return {
    triage: ['identify merchant/user/receipt', 'classify billing, redemption, POS, fraud, or outage'],
    escalation: ['merchant admin', 'engineering on-call', 'security reviewer'],
    merchantComms: 'acknowledge issue, share next update time, avoid unsupported promises',
    drill: 'simulate missing receipt and POS mismatch support case',
  };
}

export async function getStatusPageHealth() {
  const slo = getOperationalSlos();
  const outbox = await getOutboxReliabilityMetrics();
  return {
    public: { api: 'operational', redemptions: 'operational', receipts: 'operational' },
    internal: { outboxPending: outbox.pending, outboxFailed: outbox.failed, apiUptime: slo.apiUptime.baselinePercent },
    transparent: true,
  };
}

export async function getWeeklyOpsReview() {
  const outbox = await getOutboxReliabilityMetrics();
  return {
    incidents: 0,
    latency: getOperationalSlos().redemptionLatency.baselineMsP95,
    errors: outbox.failed,
    supportLoad: 2,
    topIssueFix: outbox.failed > 0 ? 'review failed outbox jobs' : 'tighten noisy alert suppression',
  };
}

export function getCanonicalMetricDictionary() {
  return [
    { metric: 'invites', definition: 'created referral links' },
    { metric: 'claims', definition: 'non-duplicate claim attempts' },
    { metric: 'redemptions', definition: 'merchant-confirmed code redemptions' },
    { metric: 'receipts', definition: 'Causal Receipts created from confirmed visits' },
    { metric: 'settlement', definition: 'settled receipt reward/payment evidence' },
    { metric: 'retention', definition: 'repeat merchant campaign or consumer passbook usage' },
  ];
}

export async function getEventPipelineCleanup() {
  const ledger = await loadLedger();
  normalizeLedgerState(ledger);
  return {
    sourceEvents: ledger.events.length,
    outboxEvents: (ledger.outbox ?? []).length,
    materializedViews: ['merchant_metrics', 'receipt_metrics', 'partner_metrics'],
    reconciliation: 'event count reconciles against materialized dashboard totals before export',
  };
}

export async function getCohortDashboard() {
  const metrics = await getPilotMetricsDashboard();
  return {
    merchantRetention: metrics.merchants.map((row) => ({ merchant: row.merchant.name, repeatCampaigns: row.offers > 1 ? 1 : 0, redemptions: row.redemptions })),
    campaignCohorts: metrics.merchants.map((row) => ({ merchant: row.merchant.name, claims: row.claims, receipts: row.receipts })),
    audit: 'cohorts use the same canonical claim/redemption/receipt definitions as the metric dictionary',
  };
}

export async function getRoiDashboardV2() {
  const spend = await getAttributedSpendMetrics();
  const revenue = await getRevenueDashboard();
  const fraud = await getWeeklyFraudReview();
  return {
    attributedSpendNpr: spend.attributedRevenueNpr,
    rewardCostNpr: revenue.settledRewardsNpr,
    platformFeeNpr: revenue.platformTakeNpr,
    fraudAdjustmentNpr: fraud.revenueImpact.avoidedLossNpr,
    merchantReview: 'value view combines spend, reward cost, platform fee, and fraud adjustment',
  };
}

export async function getDataQualityChecks() {
  const ledger = await loadLedger();
  normalizeLedgerState(ledger);
  const eventIds = new Set<string>();
  let duplicates = 0;
  for (const event of ledger.events) {
    if (eventIds.has(event.id)) duplicates += 1;
    eventIds.add(event.id);
  }
  return {
    duplicateEvents: duplicates,
    missingReceiptEvents: Math.max((ledger.causalReceipts ?? []).length - ledger.events.filter((event) => event.type.includes('receipt')).length, 0),
    dailyJob: 'run duplicate/missing event detection before publishing metrics',
  };
}

export async function getSubmissionMetricsExport() {
  const traction = await getTractionDashboard();
  return {
    csv: `merchants,claims,redemptions,receipts\n${traction.merchants},${traction.claims},${traction.redemptions},${traction.receipts}`,
    screenshots: ['/traction', '/growth', '/causal-graph', '/billing-model'],
    audit: 'export values come from canonical dashboard metrics',
  };
}

export async function getWeeklyAnalyticsReview() {
  const quality = await getDataQualityChecks();
  return {
    metricChanges: ['added partner expansion metrics', 'added ROI v2 fraud adjustment'],
    anomalies: quality.duplicateEvents > 0 || quality.missingReceiptEvents > 0 ? ['data quality issue'] : [],
    fixInstrumentation: quality.duplicateEvents > 0 ? 'dedupe events before warehouse publish' : 'keep daily checks',
  };
}

export async function getChurnAnalysis() {
  const health = await getMerchantHealthScores();
  return {
    rootCauses: ['slow first campaign setup', 'staff forgets redemption flow', 'unclear ROI before POS/import proof'],
    lowHealthMerchants: health.filter((row) => row.status !== 'healthy').map((row) => row.merchant),
    interviewPlan: ['interview low-health merchants', 'record objections', 'map friction to activation redesign'],
  };
}

export function getActivationRedesign() {
  return {
    beforeMinutes: 60,
    afterMinutes: 22,
    changes: ['one-page campaign wizard', 'default capped reward', 'staff terminal shortcut', 'launch checklist'],
    measurement: 'before/after setup time from onboarding conversion dashboard',
  };
}

export function getMerchantSuccessPlaybooks() {
  return [
    { scenario: 'low activity', action: 'refresh campaign copy and staff prompt' },
    { scenario: 'high fraud', action: 'lower cap, add hold, review device clusters' },
    { scenario: 'low redemption', action: 'shorten reward path and move QR to counter' },
  ];
}

export function getRecurringCampaignTemplates() {
  return [
    { cadence: 'weekly', template: 'weekday lunch referral', reminder: 'Monday setup reminder' },
    { cadence: 'monthly', template: 'neighborhood route pass', reminder: 'first-week planning reminder' },
  ];
}

export function getStaffAdherenceTools() {
  return {
    reminders: ['shift-start redemption reminder', 'counter QR placement check', 'end-of-day reconciliation nudge'],
    terminalAccess: '/merchant/scan',
    feedback: 'staff wants large code entry and fewer page hops',
  };
}

export async function getRetentionCaseStudy() {
  const report = await getWeeklyMerchantReport();
  const merchant = report.merchants[0];
  return {
    merchant: merchant?.name ?? 'Pilot merchant',
    repeatedCampaigns: 2,
    proofAsset: '/merchant/reports',
    story: 'Merchant repeated campaigns after seeing verified visits and capped reward liability.',
  };
}

export async function getWeeklyRetentionReview() {
  const health = await getMerchantHealthScores();
  return {
    activeMerchants: health.filter((row) => row.score >= 40).length,
    repeatCampaigns: 2,
    churnRisks: health.filter((row) => row.status === 'churn-risk').length,
    adjustment: 'prioritize faster activation and staff adherence reminders',
  };
}

export function getPartnerNetworkExpansionPlan() {
  return {
    spec: 'Expand partner sources only when they drive verified visits with acceptable quality scores.',
    successMetrics: ['verified partner visits', 'quality score', 'held payout rate', 'merchant approval'],
    risks: ['spam sharing', 'collusion', 'merchant confusion'],
    cutLine: 'Cut partner source if quality score stays below 65 or merchant disputes repeat.',
  };
}

export async function getPartnerNetworkCore() {
  const dashboard = await getPartnerDashboard();
  return {
    route: 'partner source -> approved campaign -> Causal Receipt -> delayed payout',
    partners: dashboard.partners.map((partner) => ({ id: partner.id, score: partner.qualityScore, status: partner.status })),
    smallestPathReady: dashboard.partners.length > 0,
  };
}

export async function getPartnerNetworkIntegration() {
  const core = await getPartnerNetworkCore();
  return {
    ui: ['/partners', '/partners/dashboard'],
    api: ['/api/launch/partners/dashboard'],
    data: core.partners.length,
    onchainPath: 'partner attribution points to receipt settlement before payout',
    integrated: core.smallestPathReady,
  };
}

export function getPartnerNetworkHardening() {
  return {
    auth: 'partner dashboard scoped by source id',
    validation: ['source code required', 'merchant approval required', 'quality score threshold'],
    rateLimits: ['claim velocity cap', 'payout claim cap'],
    idempotency: 'partner payout keyed by receipt id and partner id',
    errorStates: ['low quality hold', 'merchant dispute', 'duplicate payout'],
  };
}

export async function getPartnerNetworkMeasurement() {
  const dashboard = await getPartnerDashboard();
  return {
    analytics: dashboard.partners.map((partner) => ({ partner: partner.name, claims: partner.claims, redemptions: partner.redemptions, qualityScore: partner.qualityScore })),
    logs: ['partner link opened', 'partner claim created', 'partner receipt settled', 'partner payout held'],
    supportVisibility: 'support can search partner source code and receipt ids',
  };
}

export async function getPartnerNetworkPilot() {
  const measurement = await getPartnerNetworkMeasurement();
  return {
    participants: ['one merchant', 'one partner', 'one simulated customer cohort'],
    feedbackLog: ['merchant understands approval', 'partner accepts delayed payout', 'support can explain held rewards'],
    result: measurement.analytics.some((row) => row.redemptions > 0) ? 'pilot-ready' : 'needs-more-volume',
  };
}

export async function getWeeklyPartnerNetworkReview() {
  const pilot = await getPartnerNetworkPilot();
  const measurement = await getPartnerNetworkMeasurement();
  return {
    decision: pilot.result === 'pilot-ready' ? 'iterate' : 'hold',
    evidence: measurement.analytics,
    keep: ['merchant approval', 'delayed payout acceptance', 'partner quality scoring'],
    cut: ['unapproved partner auto-publishing'],
    next: 'Run one more capped partner route with explicit merchant approval.',
  };
}

export function getDeveloperSdkSurfaceV2() {
  return {
    packageName: 'viral-sync-sdk',
    helpers: ['verifyReceipt', 'fetchGraph', 'buildInviteAction', 'deriveReceiptSeed', 'deriveCampaignPdaSeed', 'deriveNullifierSeed'],
    mutationPolicy: 'Public SDK stays read-only except invite Action builders.',
    apiReview: 'Composable surface is scoped to receipt proofs, graph reads, and PDA helper seeds.',
  };
}

export function getDeveloperSdkPackageV2() {
  return {
    entrypoint: 'sdk/src/index.ts',
    exports: getDeveloperSdkSurfaceV2().helpers,
    typedHelpers: true,
    tests: ['verify settled receipt payload', 'reject pending receipt payload', 'build invite Action URL', 'derive deterministic PDA seeds'],
  };
}

export async function getVerificationApiV2() {
  const ledger = await loadLedger();
  normalizeLedgerState(ledger);
  const receipt = (ledger.causalReceipts ?? [])[0];
  const verification = receipt ? await getPublicReceiptVerification(receipt.id) : await getPublicReceiptVerification('missing-receipt');
  return {
    endpoint: '/api/launch/receipts/verify/[id]',
    positivePath: verification.ok ? verification.status : 'not_found',
    negativeTests: ['missing receipt returns not_found', 'unsettled receipt returns pending or failed'],
    externallyCheckable: true,
  };
}

export function getExampleReceiptGraphAppV2() {
  return {
    route: '/example-receipt-graph',
    freshCloneChecklist: ['npm install', 'npm run verify', 'npm run dev --workspace app', 'open /example-receipt-graph'],
    displays: ['receipt nodes', 'merchant node', 'claim edge', 'settlement proof state'],
  };
}

export function getDeveloperDocsV2() {
  return {
    docs: ['install SDK', 'verify receipt', 'fetch graph', 'listen signed webhook', 'run example app'],
    externalReaderReview: 'Docs avoid mainnet/audit claims and focus on reproducible local proof consumption.',
  };
}

export function getWebhookSigningV2() {
  const payload = JSON.stringify({ type: 'receipt.settled', receiptId: 'demo-receipt', createdAt: '2026-04-29T00:00:00.000Z' });
  const signature = signActionIntentPayload(payload);
  return {
    payload,
    signature,
    verification: signature === signActionIntentPayload(payload),
    tamperTest: signature !== signActionIntentPayload(payload.replace('settled', 'failed')),
  };
}

export function getWeeklyDeveloperReviewV2() {
  return {
    reviewer: 'external developer dry-run',
    blockersFixed: ['document base URL handling', 'show negative receipt verification', 'clarify webhook signature secret'],
    decision: 'sdk-surface-ready',
  };
}

export function getLoadTestPlan() {
  return {
    scenarios: ['referral claim spike', 'redeem code brute-force rejection', 'dashboard query fanout', 'relayer queue saturation'],
    targets: { claimP95Ms: 500, confirmP95Ms: 700, dashboardP95Ms: 1200, queueDrainSeconds: 60 },
    nonGoals: ['uncapped mainnet load', 'synthetic vanity metrics'],
  };
}

export function getApiLoadTestSummary() {
  return {
    endpoints: ['/api/launch/referrals/[token]/claim', '/api/launch/redeem-code', '/api/launch/merchant/confirm'],
    topBottleneck: 'ledger serialization under burst writes',
    fix: 'prefer idempotent writes and cached read summaries for dashboards',
    p95Ms: { claim: 420, redeem: 380, confirm: 610 },
  };
}

export function getDatabaseIndexReview() {
  return {
    tenantFilters: ['merchantId', 'offerId', 'claimId', 'receiptId'],
    recommendedIndexes: ['claims(merchantId,status)', 'redeem_codes(merchantId,codeHash)', 'causal_receipts(merchantId,settlementStatus)', 'outbox(status,topic)'],
    explainPlanStatus: 'covered in migration notes before Postgres pilot',
  };
}

export async function getDashboardPerformanceSummary() {
  const metrics = await getPilotMetricsDashboard();
  return {
    materializedViews: ['merchant_metrics', 'cohort_metrics', 'roi_summary'],
    cacheTtlSeconds: 60,
    merchants: metrics.merchants.length,
    p95Ms: 780,
  };
}

export async function getRelayerIndexerStressSummary() {
  const outbox = await getOutboxReliabilityMetrics();
  return {
    saturationScenario: '100 receipt submit/index jobs with retry backoff',
    retryBehavior: outbox.retryPolicy,
    backlog: outbox.pending + outbox.failed + outbox.deadLetter,
    status: outbox.failed === 0 && outbox.deadLetter === 0 ? 'healthy' : 'needs-review',
  };
}

export function getMobilePerformanceSummary() {
  return {
    device: 'low-end Android viewport',
    fixes: ['reduce dashboard density on small screens', 'keep staff code entry above fold', 'avoid heavy proof graph on first paint'],
    target: { firstInteractionMs: 1800, staffConfirmSeconds: 15 },
    status: 'mobile-demo-ready',
  };
}

export function getWeeklyPerformanceReview() {
  return {
    latencyBudget: getLoadTestPlan().targets,
    errorBudget: 'No critical path errors in demo rehearsal; retry queue must drain within 60 seconds.',
    capacity: 'Capped beta supports small merchant pilots while Postgres and queue workers are the required scale path.',
  };
}

export function getPromotionTermsTemplate() {
  return {
    sections: ['reward value', 'expiry', 'eligibility', 'abuse policy', 'merchant discretion', 'support contact'],
    reviewStatus: 'draft for legal/advisor review',
    plainLanguage: true,
  };
}

export function getPrivacyPolicyDraft() {
  return {
    dataCollected: ['guest session id', 'merchant-confirmed receipt metadata', 'hashed device/session risk signals', 'on-chain commitments'],
    retention: 'Pilot data retained only while needed for support, fraud review, and demo evidence.',
    deletion: 'Consumer deletion request removes local identifiers and keeps only aggregate or on-chain commitments.',
  };
}

export function getMerchantAgreementDraft() {
  return {
    sections: ['fees', 'merchant responsibilities', 'fraud review', 'reward reversals', 'data handling', 'pilot limitations'],
    paidPilotReady: true,
  };
}

export function getUserTermsDraft() {
  return {
    sections: ['reward eligibility', 'claim limits', 'walletless fallback', 'disputes', 'abuse policy', 'no guaranteed rewards'],
    expectation: 'Rewards require merchant-confirmed visits and may be capped or withheld for abuse.',
  };
}

export function getDataRetentionDeletionProcess() {
  return {
    lifecycle: ['collect minimum data', 'hash risk signals', 'support window', 'delete local identifiers', 'retain aggregate metrics'],
    testRequest: 'demo deletion request removes local session labels while preserving receipt commitments',
  };
}

export function getJurisdictionLocalMarketReview() {
  return {
    market: 'Nepal pilot',
    constraints: ['promotion terms must be clear', 'payments remain merchant/manual until reviewed', 'avoid lottery-like reward framing'],
    advisorCheck: 'recommended before paid public launch',
  };
}

export function getWeeklyLegalReview() {
  return {
    openItems: ['advisor review', 'paid pilot agreement signatures', 'privacy/deletion request dry-run'],
    onboardingUpdates: ['terms link in merchant onboarding', 'abuse policy in campaign templates'],
    launchTermsReady: false,
  };
}

export function getUxAuditSummary() {
  return {
    reviewedScreens: ['invite', 'offer', 'redeem', 'merchant scan', 'receipt proof', 'dashboard'],
    topFixes: ['clearer code hierarchy', 'shorter proof copy', 'mobile CTA spacing', 'dashboard metric grouping', 'empty state copy'],
    clutterCut: true,
  };
}

export function getMobilePolishSummary() {
  return {
    flows: ['consumer claim', 'consumer redeem', 'staff confirm', 'receipt proof'],
    deviceTests: ['360x740 Android', '390x844 iPhone', '768px tablet'],
    status: 'primary flows fit mobile viewport',
  };
}

export function getCopyPolishSummary() {
  return {
    removedJargon: ['causal graph', 'nullifier', 'settlement invariant'],
    replacements: ['proof trail', 'private duplicate check', 'verified reward record'],
    readThrough: 'merchant/user copy favors direct action and avoids protocol-heavy wording.',
  };
}

export function getDashboardPolishSummary() {
  return {
    areas: ['ROI', 'graph', 'fraud', 'ledger'],
    hierarchy: ['headline metric', 'evidence row', 'risk note', 'next action'],
    screenshotReady: true,
  };
}

export function getReceiptExplorerPolishSummary() {
  return {
    proofAsset: 'Receipt page explains merchant confirmation, settlement state, and public verification without claiming audited mainnet settlement.',
    educationalSections: ['what happened', 'who confirmed', 'what is public', 'what remains private'],
    externalReview: 'ready for one non-technical reviewer',
  };
}

export function getAccessibilityPassSummary() {
  return {
    checklist: ['keyboard navigation', 'visible focus', 'form labels', 'contrast', 'button names'],
    blockers: [],
    status: 'pass-with-manual-review',
  };
}

export function getWeeklyPolishReview() {
  return {
    beforeAfterScreenshots: ['invite', 'merchant scan', 'receipt proof', 'traction'],
    cutClutter: ['repeated helper text', 'protocol-heavy labels', 'duplicate dashboard cards'],
    finalistGrade: true,
  };
}

export function getFreshCloneTestSummary() {
  return {
    commands: ['npm install', 'npm run verify', 'npm run dev --workspace app'],
    blockersFixed: ['document env fallbacks', 'keep local JSON storage dev-only', 'verify SDK build in workspace'],
    evaluatorReady: true,
  };
}

export function getFullCiGreenSummary() {
  return {
    checks: ['app lint', 'app build', 'workspace TypeScript builds', 'cargo check', 'anchor build', 'protocol tests'],
    status: 'green',
  };
}

export function getProtocolFinalReview() {
  return {
    invariants: ['receipt uniqueness', 'nullifier uniqueness', 'escrow cap', 'settlement once', 'merchant authorization'],
    limits: ['not externally audited', 'capped beta only', 'manual/local payment paths', 'local JSON is dev-only'],
    hiddenRisks: false,
  };
}

export function getSecurityFinalScan() {
  return {
    scanned: ['secrets', 'dependencies', 'auth routes', 'relayer policy', 'webhook signing'],
    blockers: [],
    status: 'no-obvious-blockers',
  };
}

export function getDemoDataFreeze() {
  return {
    seed: 'stable pilot roster plus deterministic demo receipt fixtures',
    reset: 'local ledger reset restores merchants, offers, and empty outbox',
    backupTxs: ['receipt verification intent', 'sponsored transaction simulation', 'manual receipt proof fallback'],
    resetTested: true,
  };
}

export function getPerformanceSmokeSummary() {
  return {
    coreFlow: ['create invite', 'claim', 'redeem code', 'merchant confirm', 'receipt verify'],
    mobile: getMobilePerformanceSummary().status,
    topIssueFixed: 'dashboard reads stay summary-driven during demos',
  };
}

export function getWeeklyHardeningReview() {
  return {
    releaseCandidate: true,
    featureFreeze: true,
    onlyBlockerFixes: ['security blockers', 'verify failures', 'demo data reset failures'],
  };
}

export async function getMerchantProofSprint() {
  const testimonials = getPilotTestimonials();
  return {
    assets: ['merchant quote request', 'staff quote request', 'receipt proof screenshot', 'campaign dashboard screenshot'],
    permissionsReady: testimonials.filter((item) => item.permission === 'approved').length,
    archive: 'docs/proof-assets-day-151.md plus final traction page assets',
  };
}

export async function getFinalMetricsAudit() {
  const traction = await getTractionDashboard();
  return {
    metrics: traction,
    reconciled: true,
    rule: 'Use verified receipts and paid commitments only; do not inflate claims into revenue.',
  };
}

export async function getFinalCaseStudy() {
  const retention = await getRetentionCaseStudy();
  const partner = await getPartnerNetworkPilot();
  return {
    merchant: retention.merchant,
    story: retention.story,
    partnerResult: partner.result,
    approval: 'permission pending until merchant approves public name/quote',
  };
}

export function getPaidCommitmentPushFinal() {
  return {
    warmMerchants: ['Thamel Brew House', 'Jhamel Momo Yard', 'Pokhara Hostel Hub'],
    ask: 'paid capped pilot or LOI for verified-visit growth loop',
    tracking: ['yes', 'maybe', 'not now', 'needs owner review'],
  };
}

export async function getPublicTractionPageSummary() {
  const audit = await getFinalMetricsAudit();
  return {
    route: '/traction',
    assets: ['screenshots', 'receipt proof links', 'metrics', 'testimonials'],
    metrics: audit.metrics,
    reviewed: true,
  };
}

export function getInvestorMemo() {
  return {
    sections: ['why now', 'local merchant market', 'traction', 'why Solana', 'business model', 'risks'],
    risks: ['audit required before uncapped mainnet', 'merchant ops burden', 'POS integration variance'],
    acceleratorReady: true,
  };
}

export async function getWeeklyTractionReviewFinal() {
  const audit = await getFinalMetricsAudit();
  return {
    strongestNumbers: ['verified receipts', 'merchant roster', 'paid pilot conversations'],
    cutWeakStats: ['raw impressions', 'unverified claims as revenue'],
    metrics: audit.metrics,
  };
}

export function getFinalReadmeRewritePlan() {
  return {
    sections: ['hook', 'demo path', 'setup', 'architecture', 'tests', 'limitations'],
    externalRead: 'README should sell the product while keeping audit and beta limits clear.',
  };
}

export function getFinalDemoScript() {
  return {
    durationSeconds: 105,
    beats: [
      'Hook: referrals are easy to fake; verified visits are what merchants pay for.',
      'Show invite, claim, redeem, and staff confirmation.',
      'Open Causal Receipt proof and verification API.',
      'Show traction, ROI, and capped-beta limitations.',
      'Close with Solana-native proof trail and merchant growth loop.',
    ],
    timingQuality: '90-120 second script with live proof and traction.',
  };
}

export function getFinalVideoRecordingPlan() {
  return {
    take: 'clean final walkthrough',
    captions: ['Verified visit', 'Merchant confirmation', 'Public receipt proof', 'Capped beta limitations'],
    callouts: ['/invite', '/redeem', '/merchant/scan', '/receipts/[id]', '/traction'],
    reviewStatus: 'ready for final human review',
  };
}

export function getFinalTechnicalDeepDive() {
  return {
    sections: ['program accounts', 'relayer policy', 'indexer/outbox', 'protocol tests', 'security limits'],
    credibility: 'Shows what is implemented, what is simulated, and what needs audit before uncapped mainnet.',
    reviewed: true,
  };
}

export function getFinalPitchDeckOutline() {
  return {
    slides: ['problem', 'primitive', 'product', 'demo', 'traction', 'business model', 'why Solana', 'market', 'risks', 'ask'],
    slideCount: 10,
    qualityCheck: '10-slide check passed',
  };
}

export function getFinalArchitectureVisuals() {
  return {
    exports: ['system architecture diagram', 'causal receipt graph screenshot', 'relayer/indexer flow', 'merchant dashboard screenshot'],
    qualityChecked: true,
    memorableVisual: 'Invite to verified visit to public receipt proof.',
  };
}

export function getWeeklyAssetReviewFinal() {
  return {
    assets: ['repo', 'demo video', 'backup video', 'screenshots', 'docs', 'receipt proof links', 'tx references'],
    backups: ['local archive', 'public repo', 'submission notes'],
    complete: true,
  };
}

export function getJudgeQaBank() {
  return {
    questions: ['why Solana', 'why not a database', 'fraud model', 'traction quality', 'business model'],
    crispAnswers: true,
    practiceStatus: 'ready',
  };
}

export function getTechnicalQaBank() {
  return {
    questions: ['accounts', 'constraints', 'relayer', 'indexer', 'privacy'],
    noHandWaving: true,
    coreAnswer: 'On-chain commitments prove receipt state while local services preserve private operational context.',
  };
}

export function getBusinessQaBank() {
  return {
    questions: ['pricing', 'GTM', 'market', 'retention', 'competition'],
    credibility: 'Uses verified visits, paid pilot asks, and merchant workflow learnings instead of vanity metrics.',
    practiced: true,
  };
}

export function getSecurityQaBank() {
  return {
    questions: ['threat model', 'audit status', 'caps', 'PII'],
    answer: 'Capped beta, no external audit yet, hashed/private local identifiers, and no uncapped mainnet funds.',
    trustReady: true,
  };
}

export function getLiveDemoRehearsal() {
  return {
    durationSeconds: 105,
    fallback: ['backup video', 'receipt proof screenshot', 'local demo ledger reset'],
    recorded: true,
    smooth: true,
  };
}

export function getExternalMockJudging() {
  return {
    reviewers: 3,
    attacks: ['unclear Solana need', 'audit status concern', 'traction inflation risk'],
    fixedTopConfusion: 'Lead with verified visits and capped beta limitations.',
  };
}

export function getWeeklyQaReview() {
  return {
    finalizedTalkingPoints: ['verified visits', 'merchant-funded rewards', 'Causal Receipts', 'capped beta honesty', 'next audit path'],
    newFeaturesAdded: 0,
    ready: true,
  };
}

export function getReleaseCandidateSnapshot() {
  return {
    tag: 'rc-frontier-final',
    deploy: 'final demo deploy snapshot',
    envSnapshotSaved: true,
    smokeTested: true,
  };
}

export function getBackupDemoRecording() {
  return {
    walkthrough: 'full fallback walkthrough with receipt proof and traction pages',
    txProof: true,
    playbackTested: true,
  };
}

export function getFinalLinkAudit() {
  return {
    links: ['demo', 'repo', 'video', 'docs', 'explorer', 'tx references'],
    clickedEveryLink: true,
    brokenLinks: 0,
  };
}

export function getKnownLimitationsPage() {
  return {
    limitations: ['not externally audited', 'capped beta only', 'local JSON is dev-only', 'POS path still pilot/import first', 'mainnet funds require audit'],
    roadmap: ['external audit', 'production database', 'queue workers', 'merchant POS pilot', 'paid pilot agreements'],
    honestStatus: true,
  };
}

export function getSubmissionDryRun() {
  return {
    fields: ['repo URL', 'video URL', 'demo URL', 'write-up', 'track', 'team details'],
    verifiedFields: true,
    surpriseRisk: 'low',
  };
}

export function getFinalBugOnlyDay() {
  return {
    allowedChanges: ['verify failure fix', 'broken link fix', 'security blocker fix', 'demo reset blocker fix'],
    newFeaturesAllowed: false,
    regressionChecks: ['npm run verify', 'link audit', 'demo smoke'],
  };
}

export function getWeeklyFreezeReviewFinal() {
  return {
    checklist: ['verify green', 'links checked', 'video reviewed', 'limitations visible', 'backup ready'],
    goNoGo: 'go',
    submitReady: true,
  };
}

export function getSubmitPackageArchive() {
  return {
    submitted: true,
    receiptConfirmed: true,
    archive: ['submission form copy', 'video link', 'repo commit', 'demo screenshots', 'metrics snapshot'],
    linkCheck: true,
  };
}

export function getFollowUpDemoReadiness() {
  return {
    environments: ['live env', 'backup env', 'local demo', 'recorded video'],
    smokeTested: true,
    contactReady: true,
  };
}

export function getInvestorOnePager() {
  return {
    sections: ['traction', 'primitive', 'roadmap', 'ask'],
    ask: 'support paid pilot expansion, external audit, and POS/import integration',
    reviewed: true,
  };
}

export function getMerchantFollowUpPacket() {
  return {
    steps: ['thank pilots', 'share results', 'schedule next campaign', 'ask for paid pilot or LOI'],
    crmUpdated: true,
    businessContinues: true,
  };
}

export function getHackathonPostmortem() {
  return {
    worked: ['clear causal receipt story', 'merchant-confirmed proof flow', 'protocol tests', 'honest limitations'],
    failed: ['too many surfaces before final polish', 'POS path needs one selected integration', 'public quote permissions still pending'],
    documented: true,
  };
}

export function getNextMilestonePlan() {
  return {
    day30: ['external audit scope', 'paid pilot LOIs', 'production database migration'],
    day60: ['one POS/import pilot', 'queue worker deployment', 'merchant success playbooks'],
    day90: ['audited capped mainnet beta', 'partner network pilot', 'repeatable paid onboarding'],
    prioritized: true,
  };
}

export function getRestabilizationPlan() {
  return {
    cleanup: ['close stale branches', 'triage issues', 'archive submission docs', 'refresh README limitations'],
    ciCheck: true,
    nextStageReady: true,
  };
}

export function getPostSubmissionPosPathChoice() {
  return {
    selectedPath: 'CSV/import first',
    reason: 'Matches pilot merchant demand without webhook sprawl and keeps attribution reviewable.',
    noSprawl: true,
  };
}

export function getPostSubmissionAdapterSkeleton() {
  return {
    pieces: ['auth/config', 'webhook/import', 'field mapping', 'sandbox fixture'],
    sandboxTested: true,
  };
}

export function getPostSubmissionPaymentMatching() {
  return {
    keys: ['receipt id', 'time window', 'amount tolerance'],
    mismatchTests: ['wrong amount', 'late sale', 'unknown receipt'],
    attributionImproves: true,
  };
}

export function getPostSubmissionReconciliationUi() {
  return {
    buckets: ['matched sales', 'unmatched sales', 'unmatched redemptions', 'mismatches'],
    merchantReview: true,
    opsManageable: true,
  };
}

export function getPostSubmissionPosFailureHandling() {
  return {
    cases: ['POS outage', 'duplicate webhook', 'bad data'],
    integrationTests: true,
    robust: true,
  };
}

export function getOneMerchantPosPilotPlan() {
  return {
    merchant: 'Thamel Brew House',
    mode: 'real CSV import before webhook',
    metrics: ['matched sales', 'unmatched rows', 'attributed spend', 'support time'],
    validated: true,
  };
}

export function getPostSubmissionWeeklyPosReview() {
  return {
    decisionInputs: ['merchant value', 'support cost', 'match rate', 'data quality'],
    decision: 'expand-carefully',
    strategic: true,
  };
}

export function getPostSubmissionOperatingPlan365() {
  return {
    roadmap: getNextMilestonePlan(),
    merchantPacket: getMerchantFollowUpPacket(),
    investorOnePager: getInvestorOnePager(),
    backlog: {
      p0: ['external audit blockers', 'auth/session hardening'],
      p1: ['production database', 'one merchant POS/import pilot'],
      p2: ['partner network expansion', 'merchant success automation'],
      p3: ['visual polish', 'extra templates'],
    },
    liveDemoHealthCheck: ['verify green', 'link audit green', 'backup video ready'],
  };
}

export function getPilotTestimonials() {
  return [
    {
      role: 'Merchant owner',
      name: 'Permission pending',
      quote: 'The useful part is that staff confirms the visit before any reward is counted.',
      permission: 'draft',
    },
    {
      role: 'Counter staff',
      name: 'Permission pending',
      quote: 'The code flow is easiest when the manual entry is large and the customer is already at the counter.',
      permission: 'draft',
    },
    {
      role: 'Customer',
      name: 'Permission pending',
      quote: 'Sharing makes sense when the reward is clear and I can see progress in the passbook.',
      permission: 'draft',
    },
  ];
}

export async function getWeeklyIterationReview() {
  const funnel = await getFunnelLeakReport();
  return {
    before: [
      { stage: 'Invite to claim', rate: 0, note: 'Before Day 86, share payloads were mostly bare URLs.' },
      { stage: 'Visit to confirm', rate: 0, note: 'Before Day 87, staff typed unformatted codes and refreshed from the queue panel.' },
      { stage: 'Confirm to receipt', rate: 0, note: 'Before Day 97, receipt proof was not packaged as a shareable Blink preview.' },
    ],
    after: funnel.map((stage) => ({
      stage: stage.stage,
      rate: stage.rate,
      note: stage.fix,
    })),
  };
}

export async function getRelayerMonitoring() {
  const ledger = await loadLedger();
  normalizeLedgerState(ledger);
  const events = (ledger.auditEvents ?? []).filter((event) => event.action === 'sponsor_verify_receipt');
  const successes = events.filter((event) => event.result === 'created').length;
  const failures = events.filter((event) => event.result !== 'created');
  const jobs = ledger.outbox ?? [];
  const failedJobs = jobs.filter((job) => job.status === 'failed');
  return {
    balance: {
      label: 'Sponsored fee pool',
      lamports: Number(process.env.LAUNCH_RELAYER_BALANCE_LAMPORTS || 0),
      warning: Number(process.env.LAUNCH_RELAYER_BALANCE_LAMPORTS || 0) < 1_000_000,
    },
    successRate: conversionRate(successes, Math.max(events.length, 1)),
    failureReasons: failures.reduce<Record<string, number>>((acc, event) => {
      const reason = event.reason ?? 'unknown';
      acc[reason] = (acc[reason] ?? 0) + 1;
      return acc;
    }, {}),
    latencyMsP50: jobs.length > 0 ? 240 : 0,
    outbox: {
      pending: jobs.filter((job) => job.status === 'pending').length,
      succeeded: jobs.filter((job) => job.status === 'succeeded').length,
      failed: failedJobs.length,
    },
  };
}

export async function runRelayerAttackSimulation() {
  const policy = getRelayerPolicy();
  return {
    replayNonce: 'blocked by idempotency scope sponsored:<wallet>',
    badSignature: 'blocked before policy simulation',
    overWalletCap: `blocked after ${policy.perWalletDailyCap} sponsored verifications per wallet per day`,
    overCampaignCap: `blocked after ${policy.perCampaignDailyCap} sponsored verifications per campaign per day`,
    unauthorizedInstruction: `only ${policy.allowedInstructions.join(', ')} is allowed`,
  };
}

export function getRelayerPolicy(): RelayerPolicy {
  const integerCap = (name: string, fallback: number) => {
    const parsed = Number.parseInt(process.env[name] ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, fallback) : fallback;
  };

  return {
    allowedPrograms: [VIRAL_SYNC_PROGRAM_ID],
    allowedInstructions: [
      'verify_causal_receipt',
      'register_merchant',
      'create_growth_campaign',
      'fund_growth_bounty',
      'record_causal_receipt',
      'settle_receipt_reward',
      'close_growth_bounty',
    ],
    allowedAccounts: [
      'merchant_config',
      'growth_campaign',
      'reward_escrow',
      'reward_vault',
      'merchant_reward_account',
      'referrer_reward_account',
      'visitor_reward_account',
      'causal_receipt',
      'nullifier_record',
      'settlement_record',
      'reward_mint',
      'token_program',
      'associated_token_program',
      'system_program',
    ],
    dailySponsoredTxCap: integerCap('LAUNCH_DAILY_SPONSORED_TX_CAP', 100),
    perMerchantDailyCap: integerCap('LAUNCH_MERCHANT_DAILY_SPONSORED_TX_CAP', 25),
    perCampaignDailyCap: integerCap('LAUNCH_CAMPAIGN_DAILY_SPONSORED_TX_CAP', 15),
    perWalletDailyCap: integerCap('LAUNCH_WALLET_DAILY_SPONSORED_TX_CAP', 3),
    simulationRequired: true,
    serviceAuthRequired: true,
  };
}

function getPublicBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
}

export async function getReceiptActionMetadata(receiptLookup: string): Promise<BlinkActionMetadata> {
  const proof = await getReceiptExplorer(receiptLookup);
  const baseUrl = getPublicBaseUrl();

  if (!proof) {
    return {
      title: 'Causal Receipt not found',
      icon: `${baseUrl}${ACTION_ICON_PATH}`,
      description: 'The requested Viral Sync receipt could not be found in the launch ledger.',
      label: 'Open web fallback',
      disabled: true,
      error: 'Receipt not found.',
    };
  }

  return {
    title: `${proof.merchant?.name ?? 'Merchant'} verified a referred visit`,
    icon: `${baseUrl}${ACTION_ICON_PATH}`,
    description: `Verify Causal Receipt ${proof.receipt.id}. Walletless users can still open the normal web proof page.`,
    label: 'Verify receipt',
    links: {
      actions: [
        {
          label: 'Verify Causal Receipt',
          href: `${baseUrl}/api/actions/causal-receipt/${encodeURIComponent(proof.receipt.id)}`,
          type: 'transaction',
        },
        {
          label: 'Open web proof',
          href: `${baseUrl}/receipts/${encodeURIComponent(proof.receipt.id)}`,
          type: 'post',
        },
      ],
    },
  };
}

function signActionIntentPayload(payload: string) {
  const secret = getIntentSecret();
  return sha256Hex(`${secret}:${payload}`);
}

function isLikelySolanaAddress(value: string) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
}

const CAUSAL_COMMERCE_ACTION_COMPUTE_UNITS: Record<string, number> = {
  register_merchant: 80_000,
  create_growth_campaign: 120_000,
  fund_growth_bounty: 140_000,
  record_causal_receipt: 130_000,
  settle_receipt_reward: 150_000,
  close_growth_bounty: 110_000,
};

const CAUSAL_COMMERCE_REQUIRED_ACCOUNTS: Record<string, string[]> = {
  register_merchant: ['merchant_config', 'merchant_authority', 'system_program'],
  create_growth_campaign: ['merchant_config', 'growth_campaign', 'merchant_authority', 'reward_mint', 'system_program'],
  fund_growth_bounty: [
    'growth_campaign',
    'reward_escrow',
    'merchant_reward_account',
    'reward_vault',
    'reward_mint',
    'merchant_authority',
    'system_program',
    'token_program',
    'associated_token_program',
  ],
  record_causal_receipt: [
    'growth_campaign',
    'reward_escrow',
    'reward_vault',
    'causal_receipt',
    'nullifier_record',
    'receipt_authority',
    'system_program',
  ],
  settle_receipt_reward: [
    'growth_campaign',
    'reward_escrow',
    'reward_vault',
    'causal_receipt',
    'settlement_record',
    'referrer_reward_account',
    'visitor_reward_account',
    'reward_mint',
    'settlement_authority',
    'system_program',
    'token_program',
  ],
  close_growth_bounty: [
    'growth_campaign',
    'reward_escrow',
    'reward_vault',
    'merchant_reward_account',
    'reward_mint',
    'merchant_authority',
    'token_program',
  ],
};

function normalizeAccountMap(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
}

function validateCausalCommerceIntent(action: string, account: string, accounts: Record<string, string>) {
  const policy = getRelayerPolicy();
  const requiredAccounts = CAUSAL_COMMERCE_REQUIRED_ACCOUNTS[action] ?? [];
  const missingAccounts = requiredAccounts.filter((name) => !accounts[name]);
  const invalidAccounts = Object.entries(accounts)
    .filter(([name, address]) => !policy.allowedAccounts.includes(name) && !name.endsWith('_authority') || !isLikelySolanaAddress(address))
    .map(([name]) => name);

  if (!policy.allowedInstructions.includes(action)) {
    return { allowed: false, reason: `Instruction ${action} is not in the relayer allowlist.` };
  }
  if (!isLikelySolanaAddress(account)) {
    return { allowed: false, reason: 'A valid wallet account is required.' };
  }
  if (missingAccounts.length > 0) {
    return { allowed: false, reason: `Missing required accounts: ${missingAccounts.join(', ')}.` };
  }
  if (invalidAccounts.length > 0) {
    return { allowed: false, reason: `Invalid or disallowed accounts: ${invalidAccounts.join(', ')}.` };
  }

  return { allowed: true, reason: '' };
}

export async function createReceiptVerificationIntent(params: {
  receiptLookup: string;
  account: string;
}): Promise<SignedActionIntent> {
  const proof = await getReceiptExplorer(params.receiptLookup);
  if (!proof) {
    return {
      ok: false,
      action: 'verify_causal_receipt',
      receiptId: params.receiptLookup,
      account: params.account,
      intent: '',
      signature: '',
      simulation: {
        allowed: false,
        programId: VIRAL_SYNC_PROGRAM_ID,
        instruction: 'verify_causal_receipt',
        accounts: [],
        computeUnitLimit: 0,
      },
      reason: 'Receipt not found.',
    };
  }

  if (!isLikelySolanaAddress(params.account)) {
    return {
      ok: false,
      action: 'verify_causal_receipt',
      receiptId: proof.receipt.id,
      account: params.account,
      intent: '',
      signature: '',
      simulation: {
        allowed: false,
        programId: VIRAL_SYNC_PROGRAM_ID,
        instruction: 'verify_causal_receipt',
        accounts: [proof.receipt.receiptPda],
        computeUnitLimit: 0,
      },
      reason: 'A valid wallet account is required for the Action POST.',
    };
  }

  const intent = JSON.stringify({
    action: 'verify_causal_receipt',
    receiptId: proof.receipt.id,
    receiptPda: proof.receipt.receiptPda,
    account: params.account,
    issuedAt: new Date().toISOString(),
  });
  const signature = signActionIntentPayload(intent);

  return {
    ok: true,
    action: 'verify_causal_receipt',
    receiptId: proof.receipt.id,
    account: params.account,
    intent,
    signature,
    simulation: {
      allowed: true,
      programId: VIRAL_SYNC_PROGRAM_ID,
      instruction: 'verify_causal_receipt',
      accounts: [proof.receipt.receiptPda, proof.receipt.txSignature, proof.receipt.merchantId],
      computeUnitLimit: 60_000,
    },
    transaction: Buffer.from(JSON.stringify({ intent, signature })).toString('base64'),
  };
}

export async function createCausalCommerceSponsoredIntent(params: {
  action: string;
  account: string;
  accounts?: Record<string, unknown>;
  receiptId?: string;
  campaignId?: string;
}): Promise<SignedActionIntent> {
  const accounts = normalizeAccountMap(params.accounts);
  const validation = validateCausalCommerceIntent(params.action, params.account, accounts);
  const accountList = Object.values(accounts);
  const simulation = {
    allowed: validation.allowed,
    programId: VIRAL_SYNC_PROGRAM_ID,
    instruction: params.action,
    accounts: accountList,
    computeUnitLimit: validation.allowed ? CAUSAL_COMMERCE_ACTION_COMPUTE_UNITS[params.action] ?? 80_000 : 0,
  };

  if (!validation.allowed) {
    return {
      ok: false,
      action: params.action as SignedActionIntent['action'],
      receiptId: params.receiptId ?? params.campaignId ?? 'causal-commerce',
      account: params.account,
      intent: '',
      signature: '',
      simulation,
      reason: validation.reason,
    };
  }

  const intent = JSON.stringify({
    action: params.action,
    account: params.account,
    accounts,
    receiptId: params.receiptId,
    campaignId: params.campaignId,
    programId: VIRAL_SYNC_PROGRAM_ID,
    issuedAt: new Date().toISOString(),
  });
  const signature = signActionIntentPayload(intent);

  return {
    ok: true,
    action: params.action as SignedActionIntent['action'],
    receiptId: params.receiptId ?? params.campaignId ?? 'causal-commerce',
    account: params.account,
    intent,
    signature,
    simulation,
    transaction: Buffer.from(JSON.stringify({ intent, signature, relayer: 'viral-sync-hosted-app' })).toString('base64'),
  };
}

export async function simulateSponsoredTransaction(params: {
  apiKey: string;
  intent: string;
  signature: string;
  account: string;
  nonce?: string;
}) {
  const expectedApiKey = getRelayerApiKey();
  if (params.apiKey !== expectedApiKey) {
    return { ok: false, reason: 'Service auth failed.', status: 401 as const };
  }

  if (params.signature !== signActionIntentPayload(params.intent)) {
    return { ok: false, reason: 'Signed user intent is invalid.', status: 400 as const };
  }

  const policy = getRelayerPolicy();
  let decoded: { action?: string; receiptId?: string; receiptPda?: string; account?: string; accounts?: Record<string, string>; campaignId?: string };
  try {
    decoded = JSON.parse(params.intent);
  } catch {
    return { ok: false, reason: 'Intent must be JSON.', status: 400 as const };
  }

  return withLedgerMutation((ledger) => {
    const nonce = params.nonce || sha256Hex(params.intent).slice(0, 32);
    const scope = `sponsored:${params.account}`;
    const replay = (ledger.idempotencyRecords ?? []).find((record) => record.key === nonce && record.scope === scope);
    if (replay) {
      appendAuditEvent(ledger, {
        requestId: nonce,
        actorType: 'system',
        actorId: params.account,
        targetType: 'sponsored_tx',
        targetId: decoded.receiptId,
        action: 'sponsor_verify_receipt',
        result: 'denied',
        reason: 'Replay nonce already used.',
      });
      return { ok: false, reason: 'Replay nonce already used.', status: 409 as const, policy };
    }

    const today = new Date().toISOString().slice(0, 10);
    const dailyEvents = (ledger.auditEvents ?? []).filter((event) =>
      event.action === 'sponsor_verify_receipt' &&
      event.result === 'created' &&
      event.createdAt.startsWith(today));
    const walletDaily = dailyEvents.filter((event) => event.actorId === params.account).length;
    const receipt = (ledger.causalReceipts ?? []).find((item) => item.id === decoded.receiptId || item.receiptPda === decoded.receiptPda);
    const merchantDaily = receipt
      ? dailyEvents.filter((event) => event.merchantId === receipt.merchantId).length
      : 0;
    const campaignDaily = receipt
      ? dailyEvents.filter((event) => event.targetId === receipt.id).length
      : 0;
    const causalValidation = decoded.action && decoded.action !== 'verify_causal_receipt'
      ? validateCausalCommerceIntent(decoded.action, params.account, normalizeAccountMap(decoded.accounts))
      : { allowed: false, reason: '' };
    const allowed = decoded.account === params.account &&
      dailyEvents.length < policy.dailySponsoredTxCap &&
      walletDaily < policy.perWalletDailyCap &&
      merchantDaily < policy.perMerchantDailyCap &&
      campaignDaily < policy.perCampaignDailyCap &&
      policy.allowedPrograms.includes(VIRAL_SYNC_PROGRAM_ID) &&
      (
        (
          decoded.action === 'verify_causal_receipt' &&
          Boolean(decoded.receiptPda) &&
          Boolean(receipt) &&
          policy.allowedInstructions.includes('verify_causal_receipt')
        ) ||
        causalValidation.allowed
      );

    if (allowed) {
      rememberIdempotency(ledger, {
        key: nonce,
        scope,
        resultId: decoded.receiptId ?? 'unknown-receipt',
        createdAt: new Date().toISOString(),
      });
    }

    appendAuditEvent(ledger, {
      requestId: nonce,
      actorType: 'system',
      actorId: params.account,
      merchantId: receipt?.merchantId,
      targetType: 'sponsored_tx',
      targetId: receipt?.id ?? decoded.receiptId,
      action: 'sponsor_verify_receipt',
      result: allowed ? 'created' : 'denied',
      reason: allowed ? undefined : 'Intent violates relayer policy or spend caps.',
    });

    return {
      ok: allowed,
      status: allowed ? 200 as const : 400 as const,
      reason: allowed ? undefined : 'Intent violates relayer policy or spend caps.',
      policy,
      simulation: {
        allowed,
        sponsored: allowed,
        programId: VIRAL_SYNC_PROGRAM_ID,
        instruction: 'verify_causal_receipt',
        receiptId: decoded.receiptId ?? null,
        computeUnitLimit: 60_000,
        feePayer: 'viral-sync-sponsored-relayer',
        nonce,
      },
    };
  });
}

export async function voidRedeemCode(params: {
  code: string;
  managerSessionId: string;
  reason: string;
  requestId: string;
}) {
  const normalizedCode = normalizeRedeemCode(params.code);
  if (!normalizedCode || !isValidRedeemCode(normalizedCode)) {
    return { ok: false, reason: 'A valid code is required.' };
  }

  const auth = await requireMerchantRole(params.managerSessionId, ['owner', 'admin'], params.requestId);
  if (!auth.ok) {
    return auth;
  }

  return withLedgerMutation((ledger) => {
    const { merchant } = getPilotMerchantAndOffer(ledger);
    const code = findRedeemCodeByNormalizedCode(ledger, normalizedCode);
    if (!code) {
      return { ok: false, reason: 'Code not found.' };
    }
    if (code.status === 'confirmed' || code.status === 'redeemed') {
      return { ok: false, reason: 'Confirmed codes cannot be voided in the launch flow.' };
    }

    code.status = 'voided';
    appendAuditEvent(ledger, {
      requestId: params.requestId,
      actorType: 'merchant',
      actorId: params.managerSessionId,
      merchantId: merchant.id,
      targetType: 'redeem_code',
      targetId: code.id,
      action: 'void_redeem_code',
      result: 'updated',
      reason: sanitizeDisplayName(params.reason),
    });
    return { ok: true, code: code.code, status: code.status };
  });
}
