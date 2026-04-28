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
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (isProduction && !RELAYER_SECRET) {
  throw new Error('RELAYER_SECRET is required when NODE_ENV=production.');
}

if (isProduction && !RELAYER_API_KEY) {
  throw new Error('RELAYER_API_KEY is required when NODE_ENV=production.');
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

app.set('trust proxy', 1);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin is not allowed by relayer CORS policy.'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Relayer-Key'],
}));
app.use(express.json({ limit: '16kb', type: 'application/json' }));

const rateLimitMap = new Map<string, number[]>();
const replayCache = new Map<string, number>();

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
  if (!RELAYER_API_KEY) {
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

async function simulateSignedTransaction(tx: VersionedTransaction | Transaction) {
  if (tx instanceof VersionedTransaction) {
    return connection.simulateTransaction(tx);
  }

  return connection.simulateTransaction(tx);
}

function reserveReplayFingerprint(fingerprint: string) {
  const now = Date.now();
  const existing = replayCache.get(fingerprint);
  if (existing && now - existing < REPLAY_CACHE_TTL_MS) {
    throw new Error('Duplicate transaction payload rejected by relayer replay protection.');
  }

  replayCache.set(fingerprint, now);
}

function releaseReplayFingerprint(fingerprint: string) {
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
    reserveReplayFingerprint(decoded.fingerprint);

    try {
      if (decoded.kind === 'versioned') {
        decoded.tx.sign([relayerKeypair]);
      } else {
        decoded.tx.partialSign(relayerKeypair);
      }

      const simulation = await simulateSignedTransaction(decoded.tx);
      if (simulation.value.err) {
        releaseReplayFingerprint(decoded.fingerprint);
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

      res.json({ signature, status: 'success' });
    } catch (error) {
      releaseReplayFingerprint(decoded.fingerprint);
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Relay failed.';
    res.status(400).json({ error: message });
  }
});

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(400).json({ error: error.message });
});

app.listen(PORT, () => {
  console.log(`Viral Sync relayer listening on port ${PORT}`);
  console.log(`RPC: ${maskRpcUrl(RPC_URL)}`);
  console.log(`Pubkey: ${relayerKeypair.publicKey.toBase58()}`);
  console.log(`Mode: ${isProduction ? 'production' : 'development'}`);
});
