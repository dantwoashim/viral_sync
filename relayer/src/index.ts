import cors from 'cors';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import {
  Connection,
  Keypair,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js';
import bs58 from 'bs58';
import { createHash, timingSafeEqual } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
const PORT = Number(process.env.PORT || 3001);
const RELAYER_SECRET = process.env.RELAYER_SECRET || '';
const RELAYER_API_KEY = process.env.RELAYER_API_KEY || '';
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 30);
const MAX_TRANSACTION_BYTES = Number(process.env.MAX_TRANSACTION_BYTES || 2_048);
const REPLAY_CACHE_TTL_MS = Number(process.env.REPLAY_CACHE_TTL_MS || 5 * 60_000);
const REPLAY_CACHE_REST_URL = process.env.RELAYER_REPLAY_CACHE_REST_URL || '';
const REPLAY_CACHE_REST_TOKEN = process.env.RELAYER_REPLAY_CACHE_REST_TOKEN || '';
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedProgramIds = (process.env.ALLOWED_PROGRAM_IDS || '')
  .split(',')
  .map((programId) => programId.trim())
  .filter(Boolean);
const allowedInstructionPrefixes = (process.env.ALLOWED_INSTRUCTION_PREFIXES || '')
  .split(',')
  .map((prefix) => prefix.trim().toLowerCase())
  .filter(Boolean);
const allowedWritableAccounts = (process.env.ALLOWED_WRITABLE_ACCOUNTS || '')
  .split(',')
  .map((account) => account.trim())
  .filter(Boolean);
const MAX_INSTRUCTIONS = Number(process.env.MAX_INSTRUCTIONS || 6);
const MAX_WRITABLE_ACCOUNTS = Number(process.env.MAX_WRITABLE_ACCOUNTS || 12);
const MAX_SIGNER_ACCOUNTS = Number(process.env.MAX_SIGNER_ACCOUNTS || 3);
const MAX_COMPUTE_UNITS = Number(process.env.MAX_COMPUTE_UNITS || 200_000);
const allowAddressLookupTables = process.env.RELAYER_ALLOW_ADDRESS_LOOKUP_TABLES === 'true';
const allowUnauthenticated = process.env.RELAYER_ALLOW_UNAUTHENTICATED === 'true';
const COMPUTE_BUDGET_PROGRAM_ID = 'ComputeBudget111111111111111111111111111111';
const GENERIC_RELAY_ERROR = 'Relay request rejected by policy.';

if (MAX_TRANSACTION_BYTES > 2_048) {
  throw new Error('MAX_TRANSACTION_BYTES must not exceed 2048 for the production relayer.');
}

if (isProduction && !RELAYER_SECRET) {
  throw new Error('RELAYER_SECRET is required when NODE_ENV=production.');
}

if (!RELAYER_API_KEY && !allowUnauthenticated) {
  throw new Error('RELAYER_API_KEY is required. Set RELAYER_ALLOW_UNAUTHENTICATED=true only for local development.');
}

if (isProduction && allowedOrigins.length === 0) {
  throw new Error('CORS_ORIGINS must list explicit origins in production.');
}

if (isProduction && allowedProgramIds.length === 0) {
  throw new Error('ALLOWED_PROGRAM_IDS must list explicit program IDs in production.');
}

if (isProduction && allowedInstructionPrefixes.length === 0) {
  throw new Error('ALLOWED_INSTRUCTION_PREFIXES must list explicit instruction data prefixes in production.');
}

if (isProduction && allowedWritableAccounts.length === 0) {
  throw new Error('ALLOWED_WRITABLE_ACCOUNTS must list explicit writable accounts in production.');
}

if (isProduction && allowAddressLookupTables) {
  throw new Error('RELAYER_ALLOW_ADDRESS_LOOKUP_TABLES must remain false in production until loaded address validation is implemented.');
}

if (isProduction && (!REPLAY_CACHE_REST_URL || !REPLAY_CACHE_REST_TOKEN)) {
  throw new Error('RELAYER_REPLAY_CACHE_REST_URL and RELAYER_REPLAY_CACHE_REST_TOKEN are required in production.');
}

function assertPositiveInteger(value: number, name: string) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
}

assertPositiveInteger(PORT, 'PORT');
assertPositiveInteger(RATE_LIMIT_WINDOW_MS, 'RATE_LIMIT_WINDOW_MS');
assertPositiveInteger(RATE_LIMIT_MAX, 'RATE_LIMIT_MAX');
assertPositiveInteger(MAX_TRANSACTION_BYTES, 'MAX_TRANSACTION_BYTES');
assertPositiveInteger(REPLAY_CACHE_TTL_MS, 'REPLAY_CACHE_TTL_MS');
assertPositiveInteger(MAX_INSTRUCTIONS, 'MAX_INSTRUCTIONS');
assertPositiveInteger(MAX_WRITABLE_ACCOUNTS, 'MAX_WRITABLE_ACCOUNTS');
assertPositiveInteger(MAX_SIGNER_ACCOUNTS, 'MAX_SIGNER_ACCOUNTS');
assertPositiveInteger(MAX_COMPUTE_UNITS, 'MAX_COMPUTE_UNITS');

function parseSecretKey(secret: string) {
  if (!secret) {
    return Keypair.generate();
  }

  const trimmed = secret.trim();
  if (trimmed.startsWith('[')) {
    const parsed = JSON.parse(trimmed) as number[];
    return Keypair.fromSecretKey(Uint8Array.from(parsed));
  }

  return Keypair.fromSecretKey(bs58.decode(trimmed));
}

const relayerKeypair = parseSecretKey(RELAYER_SECRET);
const connection = new Connection(RPC_URL, 'confirmed');
const app = express();

function readJsonIfExists(filePath: string): unknown | null {
  const resolved = path.resolve(filePath);
  if (!existsSync(resolved)) {
    return null;
  }

  return JSON.parse(readFileSync(resolved, 'utf8'));
}

function loadPublishedReceiptProof(receiptPda: string) {
  const manifest = readJsonIfExists('app/public/proofs/devnet-causal-commerce.json') as
    | { pdas?: { causalReceipt?: string }; proofStatus?: string; cluster?: string; programId?: string; signatures?: Record<string, string>; explorerLinks?: unknown }
    | null;
  const verifier = readJsonIfExists('app/public/proofs/devnet-causal-commerce-verifier.json') as
    | { ok?: boolean; terminalVerified?: boolean; visitorVerified?: boolean; lineageVerified?: boolean; settlementVerified?: boolean; nullifierVerified?: boolean; settlementChecks?: unknown; tokenAccountChecks?: unknown }
    | null;

  if (!manifest || manifest.pdas?.causalReceipt !== receiptPda) {
    return null;
  }

  return {
    proofStatus: manifest.proofStatus ?? 'unknown',
    cluster: manifest.cluster,
    programId: manifest.programId,
    receiptPda,
    signatures: manifest.signatures,
    explorerLinks: manifest.explorerLinks,
    verifier: {
      ok: verifier?.ok === true,
      terminalVerified: verifier?.terminalVerified === true,
      visitorVerified: verifier?.visitorVerified === true,
      lineageVerified: verifier?.lineageVerified === true,
      settlementVerified: verifier?.settlementVerified === true,
      nullifierVerified: verifier?.nullifierVerified === true,
      settlementChecks: verifier?.settlementChecks,
      tokenAccountChecks: verifier?.tokenAccountChecks,
    },
  };
}

app.set('trust proxy', 1);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || (!isProduction && allowedOrigins.length === 0)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin is not allowed by relayer CORS policy.'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Relayer-Key', 'X-PAYMENT', 'X-PAYMENT-RESPONSE'],
}));
app.use(express.json({ limit: '16kb', type: 'application/json' }));

const rateLimitMap = new Map<string, number[]>();
const replayCache = new Map<string, number>();

app.get('/.well-known/mcp.json', (_req, res) => {
  res.json({
    name: 'viral-sync-relayer',
    version: '1.0.0',
    description: 'Viral Sync sponsored transaction relay and published POC-1 receipt proof lookup.',
    tools: [
      {
        name: 'published_poc1_receipt_lookup',
        endpoint: 'GET /receipts/{receiptPda}/verify',
        payment: 'none',
        outputContract: {
          ok: 'boolean',
          proof: 'Published POC-1 receipt proof with verifier flags, settlement checks, token checks, explorer links, and proof status.',
        },
      },
      {
        name: 'relay_sponsored_transaction',
        endpoint: 'POST /relay',
        payment: 'none',
        authentication: 'X-Relayer-Key or Bearer token unless local development explicitly allows unauthenticated mode.',
      },
    ],
    proofContract: {
      finalReceiptRequires: [
        'terminalVerified',
        'visitorVerified',
        'lineageVerified',
        'settlementVerified',
        'nullifierVerified',
      ],
      replayProtection: REPLAY_CACHE_REST_URL ? 'persistent' : 'in-memory-development-only',
      addressLookupTablesAllowed: allowAddressLookupTables,
    },
  });
});

function clientKey(req: Request) {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function checkRateLimit(ip: string) {
  const now = Date.now();
  const recent = (rateLimitMap.get(ip) || []).filter((stamp) => now - stamp < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    return false;
  }

  recent.push(now);
  rateLimitMap.set(ip, recent);
  return true;
}

function requireApiKey(req: Request, res: Response, next: NextFunction) {
  if (!RELAYER_API_KEY && allowUnauthenticated) {
    next();
    return;
  }

  const supplied = req.header('x-relayer-key') || req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!supplied || !constantTimeEqual(supplied, RELAYER_API_KEY)) {
    res.status(401).json({ error: 'Invalid relayer credentials.' });
    return;
  }

  next();
}

function requireRateLimit(req: Request, res: Response, next: NextFunction) {
  if (!checkRateLimit(clientKey(req))) {
    res.status(429).json({ error: 'Rate limit exceeded. Try again shortly.' });
    return;
  }

  next();
}

function maskRpcUrl(value: string) {
  return value.replace(/\/\/([^/@]+)@/, '//***@');
}

function constantTimeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function publicErrorMessage(error: unknown, fallback = GENERIC_RELAY_ERROR) {
  if (isProduction) {
    return fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

function decodeTransactionPayload(transactionBase64: unknown) {
  if (typeof transactionBase64 !== 'string' || transactionBase64.length === 0) {
    throw new Error('Missing transactionBase64.');
  }

  if (!/^[a-zA-Z0-9+/]+={0,2}$/.test(transactionBase64)) {
    throw new Error('transactionBase64 must be valid base64.');
  }

  const txBuffer = Buffer.from(transactionBase64, 'base64');
  if (txBuffer.length === 0 || txBuffer.length > MAX_TRANSACTION_BYTES) {
    throw new Error(`Transaction must be between 1 and ${MAX_TRANSACTION_BYTES} bytes.`);
  }

  const fingerprint = createHash('sha256').update(txBuffer).digest('hex');

  try {
    return {
      kind: 'versioned' as const,
      fingerprint,
      tx: VersionedTransaction.deserialize(txBuffer),
    };
  } catch {
    return {
      kind: 'legacy' as const,
      fingerprint,
      tx: Transaction.from(txBuffer),
    };
  }
}

function assertRelayerIsFeePayer(decoded: ReturnType<typeof decodeTransactionPayload>) {
  if (decoded.kind === 'versioned') {
    const feePayer = decoded.tx.message.staticAccountKeys[0];
    if (!feePayer?.equals(relayerKeypair.publicKey)) {
      throw new Error('Versioned transaction fee payer must be the relayer public key.');
    }
    return;
  }

  if (!decoded.tx.feePayer?.equals(relayerKeypair.publicKey)) {
    throw new Error('Legacy transaction fee payer must be the relayer public key.');
  }
}

function assertAllowedPrograms(decoded: ReturnType<typeof decodeTransactionPayload>) {
  if (allowedProgramIds.length === 0 && !isProduction) {
    return;
  }

  const allowed = new Set([...allowedProgramIds, COMPUTE_BUDGET_PROGRAM_ID]);
  const programs = decoded.kind === 'versioned'
    ? decoded.tx.message.compiledInstructions.map((instruction) => decoded.tx.message.staticAccountKeys[instruction.programIdIndex]?.toBase58())
    : decoded.tx.instructions.map((instruction) => instruction.programId.toBase58());

  const denied = programs.filter((programId) => !programId || !allowed.has(programId));
  if (denied.length > 0) {
    throw new Error(`Transaction contains non-allowlisted programs: ${Array.from(new Set(denied)).join(', ')}`);
  }
}

function instructionPrefixAllowed(programId: string, data: Uint8Array | Buffer) {
  if (programId === COMPUTE_BUDGET_PROGRAM_ID) {
    return readComputeUnitLimit(data) !== null;
  }
  if (allowedInstructionPrefixes.length === 0 && !isProduction) {
    return true;
  }

  const hex = Buffer.from(data).toString('hex');
  return allowedInstructionPrefixes.some((prefix) => {
    const normalized = prefix.includes(':') ? prefix : `${programId}:${prefix}`;
    const [allowedProgram, allowedPrefix] = normalized.split(':');
    return allowedProgram === programId && hex.startsWith(allowedPrefix);
  });
}

function readComputeUnitLimit(data: Uint8Array | Buffer) {
  const buffer = Buffer.from(data);
  if (buffer.length >= 5 && buffer[0] === 2) {
    return buffer.readUInt32LE(1);
  }
  return null;
}

function assertInstructionPolicy(decoded: ReturnType<typeof decodeTransactionPayload>) {
  const writableAllowlist = new Set(allowedWritableAccounts);
  const programAllowlist = new Set(allowedProgramIds);
  const writableAccounts = new Set<string>();
  const signerAccounts = new Set<string>();
  let instructionCount = 0;

  if (decoded.kind === 'versioned') {
    const message = decoded.tx.message;
    if (!allowAddressLookupTables && message.addressTableLookups.length > 0) {
      throw new Error('Address lookup table transactions are disabled by relayer policy.');
    }
    instructionCount = message.compiledInstructions.length;
    if (instructionCount > MAX_INSTRUCTIONS) {
      throw new Error(`Transaction exceeds the ${MAX_INSTRUCTIONS} instruction limit.`);
    }

    for (let index = 0; index < message.staticAccountKeys.length; index += 1) {
      const account = message.staticAccountKeys[index]?.toBase58();
      if (!account) continue;
      if (message.isAccountWritable(index)) writableAccounts.add(account);
      if (message.isAccountSigner(index)) signerAccounts.add(account);
    }

    for (const instruction of message.compiledInstructions) {
      const programId = message.staticAccountKeys[instruction.programIdIndex]?.toBase58();
      if (!programId) {
        throw new Error('Instruction program id is outside the static account set.');
      }
      if (programAllowlist.size > 0 && !programAllowlist.has(programId)) {
        throw new Error(`Program ${programId} is not allowlisted.`);
      }
      if (!instructionPrefixAllowed(programId, instruction.data)) {
        throw new Error(`Instruction data for ${programId} is not allowlisted.`);
      }
      const computeUnitLimit = programId === COMPUTE_BUDGET_PROGRAM_ID
        ? readComputeUnitLimit(instruction.data)
        : null;
      if (computeUnitLimit !== null && computeUnitLimit > MAX_COMPUTE_UNITS) {
        throw new Error(`Compute budget ${computeUnitLimit} exceeds ${MAX_COMPUTE_UNITS}.`);
      }
    }
  } else {
    instructionCount = decoded.tx.instructions.length;
    if (instructionCount > MAX_INSTRUCTIONS) {
      throw new Error(`Transaction exceeds the ${MAX_INSTRUCTIONS} instruction limit.`);
    }
    for (const instruction of decoded.tx.instructions) {
      const programId = instruction.programId.toBase58();
      if (programAllowlist.size > 0 && !programAllowlist.has(programId)) {
        throw new Error(`Program ${programId} is not allowlisted.`);
      }
      if (!instructionPrefixAllowed(programId, instruction.data)) {
        throw new Error(`Instruction data for ${programId} is not allowlisted.`);
      }
      const computeUnitLimit = programId === COMPUTE_BUDGET_PROGRAM_ID
        ? readComputeUnitLimit(instruction.data)
        : null;
      if (computeUnitLimit !== null && computeUnitLimit > MAX_COMPUTE_UNITS) {
        throw new Error(`Compute budget ${computeUnitLimit} exceeds ${MAX_COMPUTE_UNITS}.`);
      }
      for (const key of instruction.keys) {
        const account = key.pubkey.toBase58();
        if (key.isWritable) writableAccounts.add(account);
        if (key.isSigner) signerAccounts.add(account);
      }
    }
  }

  if (writableAccounts.size > MAX_WRITABLE_ACCOUNTS) {
    throw new Error(`Transaction exceeds the ${MAX_WRITABLE_ACCOUNTS} writable account limit.`);
  }
  if (signerAccounts.size > MAX_SIGNER_ACCOUNTS) {
    throw new Error(`Transaction exceeds the ${MAX_SIGNER_ACCOUNTS} signer account limit.`);
  }
  if (writableAllowlist.size > 0) {
    const denied = Array.from(writableAccounts).filter((account) => !writableAllowlist.has(account));
    if (denied.length > 0) {
      throw new Error(`Transaction writes non-allowlisted accounts: ${denied.join(', ')}`);
    }
  }
}

async function simulateSignedTransaction(tx: VersionedTransaction | Transaction) {
  if (tx instanceof VersionedTransaction) {
    return connection.simulateTransaction(tx);
  }

  return connection.simulateTransaction(tx);
}

async function redisReplayCommand(command: unknown[]) {
  const response = await fetch(REPLAY_CACHE_REST_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REPLAY_CACHE_REST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  if (!response.ok) {
    throw new Error('Persistent replay cache request failed.');
  }
  return response.json() as Promise<{ result?: unknown }>;
}

async function reserveReplayFingerprint(fingerprint: string) {
  if (REPLAY_CACHE_REST_URL && REPLAY_CACHE_REST_TOKEN) {
    const key = `viral-sync-relayer-replay:${fingerprint}`;
    const result = await redisReplayCommand(['SET', key, Date.now().toString(), 'NX', 'PX', REPLAY_CACHE_TTL_MS]);
    if (result.result !== 'OK') {
      throw new Error('Duplicate transaction payload rejected by persistent relayer replay protection.');
    }
    return;
  }

  const now = Date.now();
  const existing = replayCache.get(fingerprint);
  if (existing && now - existing < REPLAY_CACHE_TTL_MS) {
    throw new Error('Duplicate transaction payload rejected by relayer replay protection.');
  }

  replayCache.set(fingerprint, now);
}

async function releaseReplayFingerprint(fingerprint: string) {
  if (REPLAY_CACHE_REST_URL && REPLAY_CACHE_REST_TOKEN) {
    await redisReplayCommand(['DEL', `viral-sync-relayer-replay:${fingerprint}`]);
    return;
  }
  replayCache.delete(fingerprint);
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of rateLimitMap.entries()) {
    const recent = timestamps.filter((stamp) => now - stamp < RATE_LIMIT_WINDOW_MS);
    if (recent.length === 0) {
      rateLimitMap.delete(ip);
    } else {
      rateLimitMap.set(ip, recent);
    }
  }

  for (const [fingerprint, timestamp] of replayCache.entries()) {
    if (now - timestamp >= REPLAY_CACHE_TTL_MS) {
      replayCache.delete(fingerprint);
    }
  }
}, 30_000).unref();

app.post('/campaigns/create', requireRateLimit, async (req, res) => {
  res.status(501).json({
    ok: false,
    artifactType: 'campaign_creation_not_enabled',
    error: 'This route no longer returns a paid campaign-creation intent because it does not submit create_growth_campaign on-chain yet.',
    nextStep: 'Use the Next.js campaign action metadata for the submission demo, or implement a real create_growth_campaign transaction before enabling paid campaign creation.',
  });
});

app.get('/campaigns/:campaignId', requireApiKey, requireRateLimit, async (req, res) => {
  res.status(501).json({
    ok: false,
    artifactType: 'campaign_lookup_not_enabled',
    campaignId: req.params.campaignId,
    error: 'Campaign lookup is disabled because this relayer does not create on-chain campaigns yet.',
  });
});

app.get('/receipts/:receiptPda/verify', requireRateLimit, async (req, res) => {
  const { receiptPda } = req.params;
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(receiptPda)) {
    res.status(400).json({ error: 'receiptPda must be a valid Solana public key string.' });
    return;
  }

  const publishedProof = loadPublishedReceiptProof(receiptPda);
  if (!publishedProof) {
    res.status(404).json({
      ok: false,
      artifactType: 'published_poc1_receipt_lookup',
      receiptPda,
      error: 'No published POC-1 proof artifact found for this receipt PDA.',
    });
    return;
  }

  res.json({
    ok: publishedProof.verifier.ok,
    artifactType: 'published_poc1_receipt_lookup',
    receiptPda,
    scope: 'Reads the currently published POC-1 proof packet. It is not a general on-chain receipt verifier for arbitrary receipt PDAs.',
    proof: publishedProof,
  });
});

app.get('/health', async (_req, res) => {
  try {
    const balance = await connection.getBalance(relayerKeypair.publicKey);
    res.json({
      status: 'ok',
      mode: isProduction ? 'production' : 'development',
      relayerPubkey: relayerKeypair.publicKey.toBase58(),
      balance,
      balanceSOL: balance / 1e9,
      rpcUrl: maskRpcUrl(RPC_URL),
      addressLookupTablesAllowed: allowAddressLookupTables,
      uptime: process.uptime(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Health check failed.';
    res.status(500).json({ status: 'error', error: message });
  }
});

app.post('/relay', requireApiKey, requireRateLimit, async (req, res) => {
  try {
    const decoded = decodeTransactionPayload(req.body?.transactionBase64);
    assertRelayerIsFeePayer(decoded);
    assertAllowedPrograms(decoded);
    assertInstructionPolicy(decoded);
    await reserveReplayFingerprint(decoded.fingerprint);

    try {
      if (decoded.kind === 'versioned') {
        decoded.tx.sign([relayerKeypair]);
      } else {
        decoded.tx.partialSign(relayerKeypair);
      }

      const simulation = await simulateSignedTransaction(decoded.tx);
      if (simulation.value.err) {
        await releaseReplayFingerprint(decoded.fingerprint);
        res.status(400).json({
          error: 'Transaction simulation failed.',
          logs: simulation.value.logs?.slice(-10),
        });
        return;
      }

      const signature = await connection.sendRawTransaction(decoded.tx.serialize(), {
        skipPreflight: true,
        maxRetries: 3,
      });
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');
      if (confirmation.value.err) {
        await releaseReplayFingerprint(decoded.fingerprint);
        res.status(400).json({
          error: 'Transaction confirmation failed.',
          signature,
          confirmationError: confirmation.value.err,
        });
        return;
      }

      res.json({ signature, status: 'confirmed' });
    } catch (error) {
      await releaseReplayFingerprint(decoded.fingerprint);
      throw error;
    }
  } catch (error) {
    res.status(400).json({ error: publicErrorMessage(error) });
  }
});

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(400).json({ error: publicErrorMessage(error) });
});

app.listen(PORT, () => {
  console.log(`Viral Sync relayer listening on port ${PORT}`);
  console.log(`RPC: ${maskRpcUrl(RPC_URL)}`);
  console.log(`Pubkey: ${relayerKeypair.publicKey.toBase58()}`);
  console.log(`Mode: ${isProduction ? 'production' : 'development'}`);
});
