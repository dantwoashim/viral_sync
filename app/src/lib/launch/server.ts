import { promises as fs } from 'fs';
import crypto from 'crypto';
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
  OfferUpdateInput,
  OfferUpdateResult,
  OfferView,
  RedeemCodeRecord,
  RedeemCodeResult,
  ReferralCreateResult,
  ReferralDetail,
  ReferralLinkRecord,
} from '@/lib/launch/types';

const configuredLedgerPath = process.env.VIRAL_SYNC_LEDGER_PATH;
const DATA_DIR = process.env.VIRAL_SYNC_DATA_DIR
  ? path.resolve(process.env.VIRAL_SYNC_DATA_DIR)
  : configuredLedgerPath
    ? path.dirname(path.resolve(configuredLedgerPath))
    : path.join(process.cwd(), '.local');
const LEDGER_PATH = configuredLedgerPath
  ? path.resolve(configuredLedgerPath)
  : path.join(DATA_DIR, 'launch-ledger.json');
const DATABASE_URL = process.env.VIRAL_SYNC_DATABASE_URL;
const DATABASE_SSL = process.env.VIRAL_SYNC_DATABASE_SSL === 'true';
const DATABASE_LOCK_KEY = 2886412;
const dbPool = DATABASE_URL
  ? new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
  })
  : null;
let persistChain: Promise<void> = Promise.resolve();
let schemaReadyPromise: Promise<void> | null = null;

export const PILOT_MERCHANT_ID = 'merchant-nyano-chiya-ghar';
export const PILOT_OFFER_ID = 'offer-thamel-four-friends';
const REDEEM_CODE_TTL_MS = Number(process.env.VIRAL_SYNC_REDEEM_CODE_TTL_MS || 15 * 60 * 1000);
const REDEEM_CODE_MAX_ATTEMPTS = Number(process.env.VIRAL_SYNC_REDEEM_CODE_MAX_ATTEMPTS || 5);
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

interface InternalLaunchLedger extends LaunchLedger {
  __revision?: number;
}

class LaunchLedgerRevisionConflict extends Error {}

function iso(date: Date) {
  return date.toISOString();
}

function randomId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function randomToken() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 10);
}

function buildSharePath(token: string) {
  return `/offer/${token}`;
}

function createRedeemCodeValue(existingCodes: Set<string>) {
  for (let attempt = 0; attempt < 32; attempt += 1) {
    const bytes = crypto.randomBytes(6);
    const raw = Array.from(bytes, (value) => CODE_ALPHABET[value % CODE_ALPHABET.length]).join('');
    const code = `${raw.slice(0, 3)}-${raw.slice(3, 6)}`;
    if (!existingCodes.has(code)) {
      return code;
    }
  }

  throw new Error('Could not allocate a unique redeem code.');
}

function computeCodeExpiry(createdAt: string) {
  return new Date(new Date(createdAt).getTime() + REDEEM_CODE_TTL_MS).toISOString();
}

function ensureCodeShape(code: RedeemCodeRecord): RedeemCodeRecord {
  return {
    ...code,
    expiresAt: code.expiresAt ?? computeCodeExpiry(code.createdAt),
    attemptCount: Number.isFinite(code.attemptCount) ? code.attemptCount : 0,
    maxAttempts: Number.isFinite(code.maxAttempts) && code.maxAttempts > 0
      ? code.maxAttempts
      : REDEEM_CODE_MAX_ATTEMPTS,
  };
}

function releaseClaimForNewCode(claim?: ClaimRecord | null) {
  if (claim?.status === 'code-generated') {
    claim.status = 'claimed';
  }
}

function expireCode(code: RedeemCodeRecord, claim?: ClaimRecord | null) {
  if (code.status === 'active') {
    code.status = 'expired';
  }
  releaseClaimForNewCode(claim ?? null);
}

function revokeCode(code: RedeemCodeRecord, reason: string, claim?: ClaimRecord | null) {
  code.status = 'revoked';
  code.revokedAt = new Date().toISOString();
  code.revokedReason = reason;
  releaseClaimForNewCode(claim ?? null);
}

function consumeFailedConfirmation(code: RedeemCodeRecord, reason: string, claim?: ClaimRecord | null) {
  code.attemptCount += 1;
  if (code.attemptCount >= code.maxAttempts) {
    revokeCode(code, 'Maximum confirmation attempts exceeded.', claim);
    return 'Maximum confirmation attempts exceeded.';
  }

  return reason;
}

function normalizeLedgerState(ledger: LaunchLedger) {
  const now = Date.now();
  let changed = false;

  ledger.redeemCodes = ledger.redeemCodes.map((code) => {
    const normalized = ensureCodeShape(code);
    if (
      normalized.expiresAt !== code.expiresAt
      || normalized.attemptCount !== code.attemptCount
      || normalized.maxAttempts !== code.maxAttempts
    ) {
      changed = true;
    }
    return normalized;
  });

  ledger.redeemCodes.forEach((code) => {
    if (code.status !== 'active') {
      return;
    }

    if (new Date(code.expiresAt).getTime() <= now) {
      const claim = ledger.claims.find((item) => item.id === code.claimId) ?? null;
      expireCode(code, claim);
      changed = true;
    }
  });

  return changed;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function formatMeta(timestamp: string, label: string) {
  const date = new Date(timestamp);
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${label}`;
}

function isSameUtcDay(left: string, right: string) {
  return left.slice(0, 10) === right.slice(0, 10);
}

function formatLedgerMetaSafe(timestamp: string, label: string) {
  const stamp = new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${stamp} - ${label}`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function formatLedgerMeta(timestamp: string, label: string) {
  const date = new Date(timestamp);
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${label}`;
}

function countRedeemedClaimsForReferral(ledger: LaunchLedger, referralToken: string) {
  return ledger.claims.filter((claim) => claim.referralToken === referralToken && claim.status === 'redeemed').length;
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
    expiresAt: iso(new Date(now.getTime() + 15 * 60 * 1000)),
    attemptCount: 0,
    maxAttempts: REDEEM_CODE_MAX_ATTEMPTS,
  };

  const code2: RedeemCodeRecord = {
    id: 'code-ritesh-1',
    claimId: claim1.id,
    merchantId: merchant.id,
    code: 'RIT-101',
    status: 'redeemed',
    createdAt: iso(sixtyMinutesAgo),
    expiresAt: computeCodeExpiry(iso(sixtyMinutesAgo)),
    attemptCount: 1,
    maxAttempts: REDEEM_CODE_MAX_ATTEMPTS,
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

async function withDatabaseClient<T>(work: (client: PoolClient) => Promise<T>) {
  if (!dbPool) {
    throw new Error('Launch database is not configured.');
  }

  const client = await dbPool.connect();
  try {
    return await work(client);
  } finally {
    client.release();
  }
}

async function ensureDatabaseSchema() {
  if (!dbPool) {
    return;
  }

  if (!schemaReadyPromise) {
    schemaReadyPromise = withDatabaseClient(async (client) => {
      await client.query(`
        create table if not exists launch_state_meta (
          id smallint primary key,
          revision bigint not null
        );
      `);
      await client.query(`
        insert into launch_state_meta (id, revision)
        values (1, 0)
        on conflict (id) do nothing;
      `);
      await client.query(`
        create table if not exists launch_merchants (
          id text primary key,
          name text not null,
          district text not null,
          city text not null,
          location_label text not null
        );
      `);
      await client.query(`
        create table if not exists launch_offers (
          id text primary key,
          merchant_id text not null,
          slug text not null,
          title text not null,
          description text not null,
          reward text not null,
          referral_goal integer not null,
          redemption_window_hours integer not null,
          active boolean not null,
          created_at text not null
        );
      `);
      await client.query(`
        create table if not exists launch_referral_links (
          token text primary key,
          offer_id text not null,
          referrer_session_id text not null,
          referrer_display_name text not null,
          referrer_device_fingerprint text not null,
          created_at text not null,
          open_count integer not null
        );
      `);
      await client.query(`
        create table if not exists launch_claims (
          id text primary key,
          offer_id text not null,
          referral_token text not null,
          referrer_session_id text not null,
          referrer_display_name text not null,
          claimer_session_id text not null,
          claimer_display_name text not null,
          device_fingerprint text not null,
          claimed_at text not null,
          status text not null,
          blocked_reason text,
          redeemed_at text
        );
      `);
      await client.query(`
        create table if not exists launch_redeem_codes (
          id text primary key,
          claim_id text not null,
          merchant_id text not null,
          code text not null unique,
          status text not null,
          created_at text not null,
          expires_at text not null,
          attempt_count integer not null,
          max_attempts integer not null,
          redeemed_at text,
          revoked_at text,
          revoked_reason text
        );
      `);
      await client.query(`
        create table if not exists launch_events (
          id text primary key,
          type text not null,
          created_at text not null,
          merchant_id text,
          offer_id text,
          referral_token text,
          claim_id text,
          redeem_code_id text,
          actor_session_id text,
          payload jsonb
        );
      `);
      await client.query('create index if not exists launch_claims_offer_id_idx on launch_claims (offer_id);');
      await client.query('create index if not exists launch_claims_claimer_session_idx on launch_claims (claimer_session_id);');
      await client.query('create index if not exists launch_referrals_offer_id_idx on launch_referral_links (offer_id);');
      await client.query('create index if not exists launch_redeem_codes_claim_idx on launch_redeem_codes (claim_id);');
    }).catch((error) => {
      schemaReadyPromise = null;
      throw error;
    });
  }

  await schemaReadyPromise;
}

async function loadLedgerFromDatabase(): Promise<InternalLaunchLedger> {
  await ensureDatabaseSchema();

  const ledger = await withDatabaseClient(async (client) => {
    const [meta, merchants, offers, referralLinks, claims, redeemCodes, events] = await Promise.all([
      client.query<{ revision: string }>('select revision from launch_state_meta where id = 1'),
      client.query('select * from launch_merchants order by id'),
      client.query('select * from launch_offers order by created_at, id'),
      client.query('select * from launch_referral_links order by created_at, token'),
      client.query('select * from launch_claims order by claimed_at, id'),
      client.query('select * from launch_redeem_codes order by created_at, id'),
      client.query('select * from launch_events order by created_at, id'),
    ]);

    return {
      merchants: merchants.rows.map((row) => ({
        id: row.id,
        name: row.name,
        district: row.district,
        city: row.city,
        locationLabel: row.location_label,
      })),
      offers: offers.rows.map((row) => ({
        id: row.id,
        merchantId: row.merchant_id,
        slug: row.slug,
        title: row.title,
        description: row.description,
        reward: row.reward,
        referralGoal: Number(row.referral_goal),
        redemptionWindowHours: Number(row.redemption_window_hours),
        active: Boolean(row.active),
        createdAt: row.created_at,
      })),
      referralLinks: referralLinks.rows.map((row) => ({
        token: row.token,
        offerId: row.offer_id,
        referrerSessionId: row.referrer_session_id,
        referrerDisplayName: row.referrer_display_name,
        referrerDeviceFingerprint: row.referrer_device_fingerprint,
        createdAt: row.created_at,
        openCount: Number(row.open_count),
      })),
      claims: claims.rows.map((row) => ({
        id: row.id,
        offerId: row.offer_id,
        referralToken: row.referral_token,
        referrerSessionId: row.referrer_session_id,
        referrerDisplayName: row.referrer_display_name,
        claimerSessionId: row.claimer_session_id,
        claimerDisplayName: row.claimer_display_name,
        deviceFingerprint: row.device_fingerprint,
        claimedAt: row.claimed_at,
        status: row.status,
        blockedReason: row.blocked_reason ?? undefined,
        redeemedAt: row.redeemed_at ?? undefined,
      })),
      redeemCodes: redeemCodes.rows.map((row) => ({
        id: row.id,
        claimId: row.claim_id,
        merchantId: row.merchant_id,
        code: row.code,
        status: row.status,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        attemptCount: Number(row.attempt_count),
        maxAttempts: Number(row.max_attempts),
        redeemedAt: row.redeemed_at ?? undefined,
        revokedAt: row.revoked_at ?? undefined,
        revokedReason: row.revoked_reason ?? undefined,
      })),
      events: events.rows.map((row) => ({
        id: row.id,
        type: row.type,
        createdAt: row.created_at,
        merchantId: row.merchant_id ?? undefined,
        offerId: row.offer_id ?? undefined,
        referralToken: row.referral_token ?? undefined,
        claimId: row.claim_id ?? undefined,
        redeemCodeId: row.redeem_code_id ?? undefined,
        actorSessionId: row.actor_session_id ?? undefined,
        payload: row.payload ?? undefined,
      })),
      __revision: Number(meta.rows[0]?.revision ?? 0),
    } satisfies InternalLaunchLedger;
  });

  if (ledger.merchants.length === 0) {
    const seed = createSeedLedger() as InternalLaunchLedger;
    seed.__revision = 0;

    try {
      await saveLedger(seed);
    } catch (error) {
      if (!(error instanceof LaunchLedgerRevisionConflict)) {
        throw error;
      }
    }

    return loadLedgerFromDatabase();
  }

  return ledger;
}

async function saveLedgerToDatabase(ledger: InternalLaunchLedger) {
  await ensureDatabaseSchema();

  await withDatabaseClient(async (client) => {
    await client.query('begin');

    try {
      await client.query('select pg_advisory_xact_lock($1)', [DATABASE_LOCK_KEY]);
      const metaResult = await client.query<{ revision: string }>(
        'select revision from launch_state_meta where id = 1 for update'
      );
      const currentRevision = Number(metaResult.rows[0]?.revision ?? 0);
      const expectedRevision = ledger.__revision ?? 0;

      if (currentRevision !== expectedRevision) {
        throw new LaunchLedgerRevisionConflict('Launch ledger changed before this save completed.');
      }

      await client.query('delete from launch_events');
      await client.query('delete from launch_redeem_codes');
      await client.query('delete from launch_claims');
      await client.query('delete from launch_referral_links');
      await client.query('delete from launch_offers');
      await client.query('delete from launch_merchants');

      for (const merchant of ledger.merchants) {
        await client.query(
          `insert into launch_merchants (id, name, district, city, location_label)
           values ($1, $2, $3, $4, $5)`,
          [merchant.id, merchant.name, merchant.district, merchant.city, merchant.locationLabel],
        );
      }

      for (const offer of ledger.offers) {
        await client.query(
          `insert into launch_offers (
            id, merchant_id, slug, title, description, reward, referral_goal, redemption_window_hours, active, created_at
          ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            offer.id,
            offer.merchantId,
            offer.slug,
            offer.title,
            offer.description,
            offer.reward,
            offer.referralGoal,
            offer.redemptionWindowHours,
            offer.active,
            offer.createdAt,
          ],
        );
      }

      for (const referral of ledger.referralLinks) {
        await client.query(
          `insert into launch_referral_links (
            token, offer_id, referrer_session_id, referrer_display_name, referrer_device_fingerprint, created_at, open_count
          ) values ($1, $2, $3, $4, $5, $6, $7)`,
          [
            referral.token,
            referral.offerId,
            referral.referrerSessionId,
            referral.referrerDisplayName,
            referral.referrerDeviceFingerprint,
            referral.createdAt,
            referral.openCount,
          ],
        );
      }

      for (const claim of ledger.claims) {
        await client.query(
          `insert into launch_claims (
            id, offer_id, referral_token, referrer_session_id, referrer_display_name, claimer_session_id,
            claimer_display_name, device_fingerprint, claimed_at, status, blocked_reason, redeemed_at
          ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            claim.id,
            claim.offerId,
            claim.referralToken,
            claim.referrerSessionId,
            claim.referrerDisplayName,
            claim.claimerSessionId,
            claim.claimerDisplayName,
            claim.deviceFingerprint,
            claim.claimedAt,
            claim.status,
            claim.blockedReason ?? null,
            claim.redeemedAt ?? null,
          ],
        );
      }

      for (const code of ledger.redeemCodes) {
        await client.query(
          `insert into launch_redeem_codes (
            id, claim_id, merchant_id, code, status, created_at, expires_at, attempt_count, max_attempts, redeemed_at, revoked_at, revoked_reason
          ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            code.id,
            code.claimId,
            code.merchantId,
            code.code,
            code.status,
            code.createdAt,
            code.expiresAt,
            code.attemptCount,
            code.maxAttempts,
            code.redeemedAt ?? null,
            code.revokedAt ?? null,
            code.revokedReason ?? null,
          ],
        );
      }

      for (const event of ledger.events) {
        await client.query(
          `insert into launch_events (
            id, type, created_at, merchant_id, offer_id, referral_token, claim_id, redeem_code_id, actor_session_id, payload
          ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
          [
            event.id,
            event.type,
            event.createdAt,
            event.merchantId ?? null,
            event.offerId ?? null,
            event.referralToken ?? null,
            event.claimId ?? null,
            event.redeemCodeId ?? null,
            event.actorSessionId ?? null,
            event.payload ? JSON.stringify(event.payload) : null,
          ],
        );
      }

      await client.query('update launch_state_meta set revision = $2 where id = $1', [1, currentRevision + 1]);
      await client.query('commit');
      ledger.__revision = currentRevision + 1;
    } catch (error) {
      await client.query('rollback');
      throw error;
    }
  });
}

async function loadLedger(): Promise<InternalLaunchLedger> {
  if (dbPool) {
    const ledger = await loadLedgerFromDatabase();
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

    if (normalizeLedgerState(ledger)) {
      changed = true;
    }

    if (changed) {
      try {
        await saveLedger(ledger);
      } catch (error) {
        if (error instanceof LaunchLedgerRevisionConflict) {
          return loadLedger();
        }
        throw error;
      }
    }

    return ledger;
  }

  await ensureLedger();
  const raw = await fs.readFile(LEDGER_PATH, 'utf8');
  const normalized = raw.trim();
  let repaired = false;
  let ledger: InternalLaunchLedger;

  try {
    ledger = JSON.parse(normalized) as InternalLaunchLedger;
  } catch (error) {
    const recovered = extractCompleteJsonDocument(normalized);
    if (!recovered) {
      throw error;
    }

    ledger = JSON.parse(recovered) as InternalLaunchLedger;
    repaired = recovered !== normalized;
  }

  let changed = repaired;
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

  if (normalizeLedgerState(ledger)) {
    changed = true;
  }

  if (changed) {
    await saveLedger(ledger);
  }

  return ledger;
}

async function saveLedger(ledger: InternalLaunchLedger) {
  if (dbPool) {
    await saveLedgerToDatabase(ledger);
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

async function withLedgerMutation<T>(mutate: (ledger: InternalLaunchLedger) => Promise<T>) {
  let lastConflict: LaunchLedgerRevisionConflict | null = null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const ledger = await loadLedger();

    try {
      const result = await mutate(ledger);
      await saveLedger(ledger);
      return result;
    } catch (error) {
      if (error instanceof LaunchLedgerRevisionConflict) {
        lastConflict = error;
        continue;
      }
      throw error;
    }
  }

  throw lastConflict ?? new Error('Could not persist launch state after multiple retries.');
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
      .filter((code) => code.claimId === activeClaim.id && (code.status === 'active' || code.status === 'redeemed'))
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
        expiresAt: activeRedeemCode.expiresAt,
        attemptCount: activeRedeemCode.attemptCount,
        maxAttempts: activeRedeemCode.maxAttempts,
      }
      : null,
    passbook: derivePassbookRows(ledger, sessionId, offerView),
  };

  return summary;
}

export async function ensureReferralLink(params: { sessionId: string; displayName: string; deviceFingerprint: string; }) {
  return withLedgerMutation(async (ledger) => {
    const { offer } = getPilotMerchantAndOffer(ledger);

    const existing = ledger.referralLinks.find((item) => item.offerId === offer.id && item.referrerSessionId === params.sessionId);
    if (existing) {
      return {
        token: existing.token,
        sharePath: buildSharePath(existing.token),
      } satisfies ReferralCreateResult;
    }

    const referral: ReferralLinkRecord = {
      token: randomToken(),
      offerId: offer.id,
      referrerSessionId: params.sessionId,
      referrerDisplayName: params.displayName,
      referrerDeviceFingerprint: params.deviceFingerprint,
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
    } satisfies ReferralCreateResult;
  });
}

export async function getReferralDetail(token: string, viewerSessionId?: string) {
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
  if (viewerSessionId && viewerSessionId === referral.referrerSessionId) {
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
  return withLedgerMutation(async (ledger) => {
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
  return withLedgerMutation(async (ledger) => {
    const referral = ledger.referralLinks.find((item) => item.token === params.token);
    const { offer } = getPilotMerchantAndOffer(ledger);

    if (!referral) {
      return { ok: false, reason: 'This referral link does not exist anymore.' } satisfies ClaimResult;
    }

    let blockedReason: string | null = null;
    if (params.claimerSessionId === referral.referrerSessionId || params.deviceFingerprint === referral.referrerDeviceFingerprint) {
      blockedReason = 'Self-referral from the same device cluster is not allowed.';
    }

    const existingClaim = ledger.claims.find((claim) =>
      claim.offerId === offer.id &&
      claim.claimerSessionId === params.claimerSessionId &&
      claim.status !== 'blocked');

    if (!blockedReason && existingClaim) {
      blockedReason = 'You already have an active reward window for this offer.';
    }

    if (blockedReason) {
      const blockedClaim: ClaimRecord = {
        id: randomId('claim'),
        offerId: offer.id,
        referralToken: referral.token,
        referrerSessionId: referral.referrerSessionId,
        referrerDisplayName: referral.referrerDisplayName,
        claimerSessionId: params.claimerSessionId,
        claimerDisplayName: params.claimerDisplayName,
        deviceFingerprint: params.deviceFingerprint,
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
      claimerDisplayName: params.claimerDisplayName,
      deviceFingerprint: params.deviceFingerprint,
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
  return withLedgerMutation(async (ledger) => {
    const { merchant, offer } = getPilotMerchantAndOffer(ledger);
    const claim = ledger.claims
      .filter((item) => item.claimerSessionId === params.sessionId && item.offerId === offer.id && item.status !== 'blocked')
      .sort((left, right) => right.claimedAt.localeCompare(left.claimedAt))[0];

    if (!claim) {
      return { ok: false, reason: 'No eligible claimed visit exists on this passbook yet.' } satisfies RedeemCodeResult;
    }

    if (claim.status === 'redeemed') {
      const redeemedCode = ledger.redeemCodes.find((item) => item.claimId === claim.id);
      return {
        ok: true,
        code: redeemedCode?.code,
        status: 'redeemed',
        expiresAt: redeemedCode?.expiresAt,
      } satisfies RedeemCodeResult;
    }

    const existingCode = ledger.redeemCodes
      .filter((item) => item.claimId === claim.id && (item.status === 'active' || item.status === 'redeemed'))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];

    if (existingCode) {
      if (existingCode.status === 'active' && new Date(existingCode.expiresAt).getTime() <= Date.now()) {
        expireCode(existingCode, claim);
      } else {
        return {
          ok: true,
          code: existingCode.code,
          status: existingCode.status,
          expiresAt: existingCode.expiresAt,
        } satisfies RedeemCodeResult;
      }
    }

    const existingCodes = new Set(ledger.redeemCodes.map((item) => item.code));
    const createdAt = new Date().toISOString();
    const code: RedeemCodeRecord = {
      id: randomId('redeem'),
      claimId: claim.id,
      merchantId: merchant.id,
      code: createRedeemCodeValue(existingCodes),
      status: 'active',
      createdAt,
      expiresAt: computeCodeExpiry(createdAt),
      attemptCount: 0,
      maxAttempts: REDEEM_CODE_MAX_ATTEMPTS,
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
      expiresAt: code.expiresAt,
    } satisfies RedeemCodeResult;
  });
}

export async function confirmRedeemCode(params: { code: string; merchantId: string; operatorLabel: string; }) {
  return withLedgerMutation(async (ledger) => {
    const { merchant, offer } = getPilotMerchantAndOffer(ledger);
    const code = ledger.redeemCodes.find((item) => item.code.toUpperCase() === params.code.toUpperCase());

    if (!code) {
      return { ok: false, reason: 'This code is not recognized by the launch ledger.' } satisfies MerchantConfirmResult;
    }

    if (code.merchantId !== params.merchantId) {
      const claim = ledger.claims.find((item) => item.id === code.claimId) ?? null;
      const reason = consumeFailedConfirmation(code, 'This code does not belong to your merchant counter.', claim);
      return { ok: false, code: code.code, status: code.status, reason, expiresAt: code.expiresAt } satisfies MerchantConfirmResult;
    }

    if (code.status === 'redeemed') {
      return { ok: false, code: code.code, status: code.status, reason: 'This code was already confirmed.', expiresAt: code.expiresAt } satisfies MerchantConfirmResult;
    }

    if (code.status === 'revoked') {
      return { ok: false, code: code.code, status: code.status, reason: code.revokedReason ?? 'This code is no longer valid.' } satisfies MerchantConfirmResult;
    }

    if (new Date(code.expiresAt).getTime() <= Date.now()) {
      const claim = ledger.claims.find((item) => item.id === code.claimId) ?? null;
      expireCode(code, claim);
      return { ok: false, code: code.code, status: code.status, reason: 'This code expired before counter confirmation.', expiresAt: code.expiresAt } satisfies MerchantConfirmResult;
    }

    const claim = ledger.claims.find((item) => item.id === code.claimId);
    if (!claim) {
      return { ok: false, reason: 'The linked claim is missing.' } satisfies MerchantConfirmResult;
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
      payload: {
        operatorLabel: params.operatorLabel,
        merchantId: params.merchantId,
      },
    });

    const redeemedForReferrer = countRedeemedClaimsForReferral(ledger, claim.referralToken);
    if (redeemedForReferrer >= offer.referralGoal) {
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

    return { ok: true, code: code.code, status: code.status, expiresAt: code.expiresAt } satisfies MerchantConfirmResult;
  });
}

export async function updatePilotOffer(params: OfferUpdateInput): Promise<OfferUpdateResult> {
  return withLedgerMutation(async (ledger) => {
    const { merchant, offer } = getPilotMerchantAndOffer(ledger);

    const title = params.title.trim();
    const description = params.description.trim();
    const reward = params.reward.trim();
    if (!title || !description || !reward) {
      return { ok: false, reason: 'Title, description, and reward are required.' };
    }

    if (!Number.isInteger(params.referralGoal) || params.referralGoal < 1 || params.referralGoal > 12) {
      return { ok: false, reason: 'referralGoal must be an integer between 1 and 12.' };
    }
    if (!Number.isInteger(params.redemptionWindowHours) || params.redemptionWindowHours < 1 || params.redemptionWindowHours > 168) {
      return { ok: false, reason: 'redemptionWindowHours must be an integer between 1 and 168.' };
    }

    offer.title = title;
    offer.description = description;
    offer.reward = reward;
    offer.referralGoal = params.referralGoal;
    offer.redemptionWindowHours = params.redemptionWindowHours;

    ledger.events.push({
      id: randomId('evt'),
      type: 'offer_updated',
      createdAt: new Date().toISOString(),
      merchantId: merchant.id,
      offerId: offer.id,
      payload: {
        updated: true,
      },
    });

    return {
      ok: true,
      offer: toOfferView(offer, merchant.name, merchant.district),
    };
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
