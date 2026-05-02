import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import bs58 from 'bs58';
import dotenv from 'dotenv';
import { createHash } from 'crypto';

dotenv.config();

const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID || 'AeKT1B58Qi9rBtrtnMe11o4eXbVwHweKxGFNS5X3Vv46');
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
const CRANK_SECRET = process.env.CRANK_SECRET || '';
const DRY_RUN = process.env.CRANK_DRY_RUN !== 'false';
const SWEEP_INTERVAL_MS = Number(process.env.SWEEP_INTERVAL_MS || 5 * 60 * 1000);
const BATCH_SIZE = Number(process.env.BATCH_SIZE || 6);
const RUN_ONCE = process.env.CRANK_RUN_ONCE === 'true';
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !CRANK_SECRET) {
  throw new Error('CRANK_SECRET is required when NODE_ENV=production.');
}

if (!DRY_RUN && !CRANK_SECRET) {
  throw new Error('CRANK_SECRET is required when CRANK_DRY_RUN=false.');
}

function assertPositiveInteger(value: number, name: string) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
}

assertPositiveInteger(SWEEP_INTERVAL_MS, 'SWEEP_INTERVAL_MS');
assertPositiveInteger(BATCH_SIZE, 'BATCH_SIZE');

function parseSecretKey(secret: string) {
  if (!secret) {
    return Keypair.generate();
  }

  const trimmed = secret.trim();
  if (trimmed.startsWith('[')) {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(trimmed) as number[]));
  }

  return Keypair.fromSecretKey(bs58.decode(trimmed));
}

function anchorDiscriminator(namespace: 'account' | 'global', name: string) {
  return createHash('sha256').update(`${namespace}:${name}`).digest().subarray(0, 8);
}

interface ReferralRecordView {
  address: PublicKey;
  referrer: PublicKey;
  referred: PublicKey;
  expiresAt: bigint;
  commissionEarned: bigint;
  commissionSettled: bigint;
  isActive: boolean;
}

function readPubkey(data: Buffer, offset: number) {
  return new PublicKey(data.subarray(offset, offset + 32));
}

function parseReferralRecord(address: PublicKey, data: Buffer): ReferralRecordView | null {
  const discriminator = anchorDiscriminator('account', 'ReferralRecord');
  if (data.length < 180 || !data.subarray(0, 8).equals(discriminator)) {
    return null;
  }

  let offset = 8;
  offset += 1; // bump
  offset += 32; // merchant
  offset += 32; // mint
  const referrer = readPubkey(data, offset);
  offset += 32;
  const referred = readPubkey(data, offset);
  offset += 32;
  offset += 8; // created_at
  const expiresAt = data.readBigInt64LE(offset);
  offset += 8;
  offset += 2; // committed_commission_bps
  offset += 8; // max_commission_cap
  const commissionEarned = data.readBigUInt64LE(offset);
  offset += 8;
  const commissionSettled = data.readBigUInt64LE(offset);
  offset += 8;
  const isActive = data.readUInt8(offset) !== 0;

  return {
    address,
    referrer,
    referred,
    expiresAt,
    commissionEarned,
    commissionSettled,
    isActive,
  };
}

function closeExpiredReferralIx(record: ReferralRecordView, caller: PublicKey) {
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: record.address, isSigner: false, isWritable: true },
      { pubkey: caller, isSigner: true, isWritable: true },
    ],
    data: anchorDiscriminator('global', 'close_expired_referral'),
  });
}

const connection = new Connection(RPC_URL, 'confirmed');
const crankKeypair = parseSecretKey(CRANK_SECRET);

async function findClosableReferralRecords() {
  const discriminator = anchorDiscriminator('account', 'ReferralRecord');
  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [{
      memcmp: {
        offset: 0,
        bytes: bs58.encode(discriminator),
      },
    }],
  });
  const now = BigInt(Math.floor(Date.now() / 1000));

  return accounts
    .map((account) => parseReferralRecord(account.pubkey, Buffer.from(account.account.data)))
    .filter((record): record is ReferralRecordView => Boolean(record))
    .filter((record) =>
      record.isActive &&
      record.expiresAt > 0n &&
      now > record.expiresAt &&
      record.commissionEarned === record.commissionSettled);
}

async function runHarvestingCycle() {
  const startedAt = new Date().toISOString();
  console.log(`[${startedAt}] Referral cleanup sweep started. dryRun=${DRY_RUN}`);

  const closable = await findClosableReferralRecords();
  console.log(`Found ${closable.length} closable ReferralRecord account(s).`);

  if (DRY_RUN || closable.length === 0) {
    for (const record of closable.slice(0, 10)) {
      console.log(`Dry-run close candidate ${record.address.toBase58()} referrer=${record.referrer.toBase58()} referred=${record.referred.toBase58()}`);
    }
    return;
  }

  for (let index = 0; index < closable.length; index += BATCH_SIZE) {
    const batch = closable.slice(index, index + BATCH_SIZE);
    const tx = new Transaction();
    for (const record of batch) {
      tx.add(closeExpiredReferralIx(record, crankKeypair.publicKey));
    }

    const signature = await sendAndConfirmTransaction(connection, tx, [crankKeypair], {
      commitment: 'confirmed',
      maxRetries: 3,
    });
    console.log(`Closed ${batch.length} ReferralRecord account(s): ${signature}`);
  }
}

async function main() {
  console.log(`Viral Sync referral cleanup crank online for ${PROGRAM_ID.toBase58()}`);
  console.log(`Crank authority: ${crankKeypair.publicKey.toBase58()}`);
  await runHarvestingCycle();

  if (!RUN_ONCE) {
    setInterval(() => {
      void runHarvestingCycle().catch((error) => {
        const message = error instanceof Error ? error.message : 'Unknown crank error.';
        console.error(`Referral cleanup sweep failed: ${message}`);
      });
    }, SWEEP_INTERVAL_MS);
  }
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : 'Fatal crank error.';
  console.error(message);
  process.exitCode = 1;
});
