import { promises as fs } from 'fs';
import path from 'path';
import { Pool, type PoolClient } from 'pg';
import {
  ClaimRecord,
  ClaimResult,
  ConsumerPassbookRow,
  ConsumerSummary,
  EventRecord,
  LaunchLedger,
  MerchantConfirmResult,
  MerchantMetric,
  MerchantRow,
  MerchantSummary,
  OfferRecord,
  OfferView,
  RedeemCodeRecord,
  RedeemCodeResult,
  ReferralCreateResult,
  ReferralDetail,
  ReferralLinkRecord,
} from '@/lib/launch/types';

const DATA_DIR = process.env.LAUNCH_LEDGER_DIR
  ? path.resolve(process.env.LAUNCH_LEDGER_DIR)
  : path.join(process.cwd(), '.local');
const LEDGER_PATH = path.join(DATA_DIR, 'launch-ledger.json');
const DATABASE_URL = process.env.LAUNCH_DATABASE_URL || process.env.DATABASE_URL;
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

export const PILOT_MERCHANT_ID = 'merchant-nyano-chiya-ghar';
export const PILOT_OFFER_ID = 'offer-thamel-four-friends';
const MAX_DISPLAY_NAME_LENGTH = 48;
const MAX_SESSION_ID_LENGTH = 96;
const MAX_DEVICE_FINGERPRINT_LENGTH = 160;
const TOKEN_PATTERN = /^[a-z0-9-]{6,64}$/i;
const SESSION_PATTERN = /^[a-z0-9:_-]{3,96}$/i;
const CODE_PATTERN = /^[a-z0-9]{3}-?[a-z0-9]{3}$/i;

function iso(date: Date) {
  return date.toISOString();
}

function randomId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function randomToken() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 10);
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

function codeFromClaimId(claimId: string) {
  const raw = claimId.replace(/[^a-z0-9]/gi, '').slice(-6).toUpperCase().padStart(6, '0');
  return `${raw.slice(0, 3)}-${raw.slice(3, 6)}`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function formatMeta(timestamp: string, label: string) {
  const date = new Date(timestamp);
  return `${date.toLocaleDateString('en-US', { phase: 'short', day: 'numeric' })} · ${label}`;
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
  const stamp = new Date(timestamp).toLocaleDateString('en-US', { phase: 'short', day: 'numeric' });
  return `${stamp} - ${label}`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function formatLedgerMeta(timestamp: string, label: string) {
  const date = new Date(timestamp);
  return `${date.toLocaleDateString('en-US', { phase: 'short', day: 'numeric' })} · ${label}`;
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

function normalizeLedgerState(ledger: LaunchLedger) {
  let changed = false;

  ledger.referralLinks = ledger.referralLinks.map((referral) => {
    const referrerDeviceFingerprint = referral.referrerDeviceFingerprint ?? referral.referrerSessionId;
    if (referrerDeviceFingerprint !== referral.referrerDeviceFingerprint) {
      changed = true;
    }

    return {
      ...referral,
      referrerDeviceFingerprint,
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

function createSeedLedger(): LaunchLedger {
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const ninetyMinutesAgo = new Date(now.getTime() - 90 * 60 * 1000);
  const sixtyMinutesAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

  const merchant = {
    id: PILOT_MERCHANT_ID,
    name: 'Nyano Chiya Ghar',
    district: 'Thamel',
    city: 'Kathmandu',
    locationLabel: 'Thamel North Lane',
  };

  const offer: OfferRecord = {
    id: PILOT_OFFER_ID,
    merchantId: merchant.id,
    slug: 'thamel-four-friends',
    title: 'Bring 3 friends. All 4 unlock a warm momo set.',
    description: 'Merchant-funded group reward for a dense district pilot. Confirmation happens at the counter.',
    reward: '1 plate buff momo + 4 masala teas',
    referralGoal: 3,
    redemptionWindowHours: 72,
    active: true,
    createdAt: iso(twoHoursAgo),
  };

  const sajinaReferral: ReferralLinkRecord = {
    token: 'sajina-thamel',
    offerId: offer.id,
    referrerSessionId: 'seed-sajina',
    referrerDisplayName: 'Sajina',
    referrerDeviceFingerprint: 'device-sajina',
    createdAt: iso(twoHoursAgo),
    openCount: 9,
  };

  const prabinReferral: ReferralLinkRecord = {
    token: 'prabin-thamel',
    offerId: offer.id,
    referrerSessionId: 'seed-prabin',
    referrerDisplayName: 'Prabin',
    referrerDeviceFingerprint: 'device-prabin',
    createdAt: iso(sixtyMinutesAgo),
    openCount: 3,
  };

  const claim1: ClaimRecord = {
    id: 'claim-ritesh-1',
    offerId: offer.id,
    referralToken: sajinaReferral.token,
    referrerSessionId: sajinaReferral.referrerSessionId,
    referrerDisplayName: sajinaReferral.referrerDisplayName,
    claimerSessionId: 'seed-ritesh',
    claimerDisplayName: 'Ritesh',
    deviceFingerprint: 'device-ritesh',
    claimedAt: iso(ninetyMinutesAgo),
    status: 'redeemed',
    redeemedAt: iso(sixtyMinutesAgo),
  };

  const claim2: ClaimRecord = {
    id: 'claim-mina-1',
    offerId: offer.id,
    referralToken: sajinaReferral.token,
    referrerSessionId: sajinaReferral.referrerSessionId,
    referrerDisplayName: sajinaReferral.referrerDisplayName,
    claimerSessionId: 'seed-mina',
    claimerDisplayName: 'Mina',
    deviceFingerprint: 'device-mina',
    claimedAt: iso(sixtyMinutesAgo),
    status: 'code-generated',
  };

  const claim3: ClaimRecord = {
    id: 'claim-ansu-1',
    offerId: offer.id,
    referralToken: prabinReferral.token,
    referrerSessionId: prabinReferral.referrerSessionId,
    referrerDisplayName: prabinReferral.referrerDisplayName,
    claimerSessionId: 'seed-ansu',
    claimerDisplayName: 'Ansu',
    deviceFingerprint: 'device-ansu',
    claimedAt: iso(thirtyMinutesAgo),
    status: 'redeemed',
    redeemedAt: iso(thirtyMinutesAgo),
  };

  const claim4: ClaimRecord = {
    id: 'claim-sajina-self',
    offerId: offer.id,
    referralToken: sajinaReferral.token,
    referrerSessionId: sajinaReferral.referrerSessionId,
    referrerDisplayName: sajinaReferral.referrerDisplayName,
    claimerSessionId: 'seed-sajina',
    claimerDisplayName: 'Sajina',
    deviceFingerprint: 'seed-sajina',
    claimedAt: iso(now),
    status: 'blocked',
    blockedReason: 'Self-referral from the same device cluster is not allowed.',
  };

  const code1: RedeemCodeRecord = {
    id: 'code-mina-1',
    claimId: claim2.id,
    merchantId: merchant.id,
    code: 'MIN-A01',
    status: 'active',
    createdAt: iso(thirtyMinutesAgo),
  };

  const code2: RedeemCodeRecord = {
    id: 'code-ritesh-1',
    claimId: claim1.id,
    merchantId: merchant.id,
    code: 'RIT-101',
    status: 'redeemed',
    createdAt: iso(sixtyMinutesAgo),
    redeemedAt: iso(sixtyMinutesAgo),
  };

  const events: EventRecord[] = [
    { id: 'evt-offer', type: 'offer_created', createdAt: offer.createdAt, merchantId: merchant.id, offerId: offer.id },
    { id: 'evt-link-sajina', type: 'referral_link_created', createdAt: sajinaReferral.createdAt, merchantId: merchant.id, offerId: offer.id, referralToken: sajinaReferral.token, actorSessionId: sajinaReferral.referrerSessionId },
    { id: 'evt-link-prabin', type: 'referral_link_created', createdAt: prabinReferral.createdAt, merchantId: merchant.id, offerId: offer.id, referralToken: prabinReferral.token, actorSessionId: prabinReferral.referrerSessionId },
    { id: 'evt-claim-1', type: 'referral_claimed', createdAt: claim1.claimedAt, merchantId: merchant.id, offerId: offer.id, referralToken: claim1.referralToken, claimId: claim1.id, actorSessionId: claim1.claimerSessionId },
    { id: 'evt-code-1', type: 'merchant_code_generated', createdAt: code2.createdAt, merchantId: merchant.id, offerId: offer.id, claimId: claim1.id, redeemCodeId: code2.id, actorSessionId: claim1.claimerSessionId },
    { id: 'evt-redeem-1', type: 'redemption_confirmed', createdAt: claim1.redeemedAt!, merchantId: merchant.id, offerId: offer.id, claimId: claim1.id, redeemCodeId: code2.id, actorSessionId: claim1.claimerSessionId },
    { id: 'evt-claim-2', type: 'referral_claimed', createdAt: claim2.claimedAt, merchantId: merchant.id, offerId: offer.id, referralToken: claim2.referralToken, claimId: claim2.id, actorSessionId: claim2.claimerSessionId },
    { id: 'evt-code-2', type: 'merchant_code_generated', createdAt: code1.createdAt, merchantId: merchant.id, offerId: offer.id, claimId: claim2.id, redeemCodeId: code1.id, actorSessionId: claim2.claimerSessionId },
    { id: 'evt-claim-3', type: 'referral_claimed', createdAt: claim3.claimedAt, merchantId: merchant.id, offerId: offer.id, referralToken: claim3.referralToken, claimId: claim3.id, actorSessionId: claim3.claimerSessionId },
    { id: 'evt-redeem-3', type: 'redemption_confirmed', createdAt: claim3.redeemedAt!, merchantId: merchant.id, offerId: offer.id, claimId: claim3.id, actorSessionId: claim3.claimerSessionId },
    { id: 'evt-blocked-self', type: 'referral_blocked', createdAt: claim4.claimedAt, merchantId: merchant.id, offerId: offer.id, referralToken: claim4.referralToken, claimId: claim4.id, actorSessionId: claim4.claimerSessionId, payload: { reason: claim4.blockedReason ?? 'blocked' } },
  ];

  return {
    merchants: [merchant],
    offers: [offer],
    referralLinks: [sajinaReferral, prabinReferral],
    claims: [claim1, claim2, claim3, claim4],
    redeemCodes: [code1, code2],
    events,
  };
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
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(LEDGER_PATH);
  } catch {
    const seed = createSeedLedger();
    await fs.writeFile(LEDGER_PATH, JSON.stringify(seed, null, 2), 'utf8');
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
    `, [LEDGER_ROW_ID, JSON.stringify(createSeedLedger())]);
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
    return createSeedLedger();
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
      const ledger = (result.rows[0]?.data as LaunchLedger | undefined) ?? createSeedLedger();
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

  if (rows.length === 0) {
    rows.push({
      id: 'welcome-passbook',
      title: 'Your passbook is ready to start',
      subtitle: 'Create a share link, bring friends in, and let the first confirmed redemption write the first line.',
      meta: formatLedgerMetaSafe(new Date().toISOString(), offerView.district),
      status: 'progress',
      createdAt: new Date().toISOString(),
    });
  }

  return rows.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function buildMerchantAlerts(ledger: LaunchLedger) {
  const today = new Date().toISOString();
  const blockedToday = ledger.claims.filter((claim) => claim.status === 'blocked' && isSameUtcDay(claim.claimedAt, today)).length;
  const waitingCodes = ledger.redeemCodes.filter((code) => code.status === 'active').length;
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

    const referral: ReferralLinkRecord = {
      token,
      offerId: offer.id,
      referrerSessionId: params.sessionId,
      referrerDisplayName: sanitizeDisplayName(params.displayName),
      referrerDeviceFingerprint: sanitizeDeviceFingerprint(params.deviceFingerprint, params.sessionId),
      createdAt: new Date().toISOString(),
      openCount: 0,
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

    if (!offer.active) {
      return { ok: false, reason: 'This offer is no longer active.' } satisfies ClaimResult;
    }

    const displayName = sanitizeDisplayName(params.claimerDisplayName);
    const deviceFingerprint = sanitizeDeviceFingerprint(params.deviceFingerprint, params.claimerSessionId);
    let blockedReason: string | null = null;
    if (params.claimerSessionId === referral.referrerSessionId || deviceFingerprint === referral.referrerDeviceFingerprint) {
      blockedReason = 'Self-referral from the same device cluster is not allowed.';
    }

    const existingClaim = ledger.claims.find((claim) =>
      claim.offerId === offer.id &&
      claim.claimerSessionId === params.claimerSessionId &&
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
      .filter((item) => item.claimId === claim.id && item.status !== 'expired')
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];

    if (existingCode) {
      return {
        ok: true,
        code: existingCode.code,
        status: existingCode.status,
      } satisfies RedeemCodeResult;
    }

    let nextCode = codeFromClaimId(claim.id);
    while (ledger.redeemCodes.some((item) => item.code === nextCode && item.status === 'active')) {
      nextCode = codeFromClaimId(randomId('claim'));
    }

    const code: RedeemCodeRecord = {
      id: randomId('redeem'),
      claimId: claim.id,
      merchantId: merchant.id,
      code: nextCode,
      status: 'active',
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

export async function confirmRedeemCode(params: { code: string; }) {
  const normalizedCode = normalizeRedeemCode(params.code);
  if (!normalizedCode || !isValidRedeemCode(normalizedCode)) {
    return { ok: false, reason: 'Enter a valid six-character code.' } satisfies MerchantConfirmResult;
  }

  return withLedgerMutation<MerchantConfirmResult>((ledger) => {
    const { merchant, offer } = getPilotMerchantAndOffer(ledger);
    const code = ledger.redeemCodes.find((item) => item.code.toUpperCase() === normalizedCode);

    if (!code) {
      return { ok: false, reason: 'This code is not recognized by the launch ledger.' } satisfies MerchantConfirmResult;
    }

    if (code.status === 'redeemed') {
      return { ok: true, code: code.code, status: code.status } satisfies MerchantConfirmResult;
    }

    if (code.status === 'expired') {
      return { ok: false, reason: 'This code has expired.' } satisfies MerchantConfirmResult;
    }

    const claim = ledger.claims.find((item) => item.id === code.claimId);
    if (!claim) {
      return { ok: false, reason: 'The linked claim is missing.' } satisfies MerchantConfirmResult;
    }

    if (!isInsideRedemptionWindow(claim.claimedAt, offer.redemptionWindowHours)) {
      code.status = 'expired';
      return { ok: false, reason: 'This reward window has expired.' } satisfies MerchantConfirmResult;
    }

    code.status = 'redeemed';
    code.redeemedAt = new Date().toISOString();
    claim.status = 'redeemed';
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

    return { ok: true, code: code.code, status: code.status } satisfies MerchantConfirmResult;
  });
}

export async function getMerchantSummary() {
  const ledger = await loadLedger();
  const { merchant, offer } = getPilotMerchantAndOffer(ledger);
  const offerView = toOfferView(offer, merchant.name, merchant.district);
  const todayIso = new Date().toISOString();

  const attributedVisitsToday = ledger.claims.filter((claim) => claim.status !== 'blocked' && isSameUtcDay(claim.claimedAt, todayIso)).length;
  const redemptionsToday = ledger.claims.filter((claim) => claim.status === 'redeemed' && claim.redeemedAt && isSameUtcDay(claim.redeemedAt, todayIso)).length;
  const activeCodes = ledger.redeemCodes.filter((code) => code.status === 'active').length;
  const heldOut = ledger.claims.filter((claim) => claim.status === 'blocked' && isSameUtcDay(claim.claimedAt, todayIso)).length;

  const metrics: MerchantMetric[] = [
    { label: 'Attributed visits', note: 'Today', value: String(attributedVisitsToday), tone: 'tone-blue' },
    { label: 'Redemptions', note: 'Today', value: String(redemptionsToday), tone: 'tone-vermilion' },
    { label: 'Live queue', note: 'Awaiting staff', value: String(activeCodes), tone: 'tone-copper' },
    { label: 'Held out', note: 'Fraud guard', value: String(heldOut), tone: 'tone-moss' },
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
      title: codeItem.status === 'active' ? `${claim.claimerDisplayName} is waiting at the counter` : `${claim.claimerDisplayName} was confirmed`,
      subtitle: `${claim.referrerDisplayName} brought this visit through ${offer.title.toLowerCase()}`,
      meta: formatLedgerMetaSafe(codeItem.createdAt, codeItem.status === 'active' ? 'Awaiting staff' : 'Settled'),
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
