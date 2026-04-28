import cors from 'cors';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import { PublicKey } from '@solana/web3.js';

dotenv.config();

const PORT = Number(process.env.PORT || 8080);
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:8080';
const ACTION_ICON_URL = process.env.ACTION_ICON_URL || `${PUBLIC_BASE_URL}/action-hero.png`;
const ACTIONS_ENABLED = process.env.ACTIONS_ENABLED === 'true';
const ACTION_BUILDER_CONFIGURED = false;
const ACTIONS_READY = ACTIONS_ENABLED && ACTION_BUILDER_CONFIGURED;

if (!Number.isSafeInteger(PORT) || PORT <= 0) {
  throw new Error('PORT must be a positive integer.');
}

if (process.env.NODE_ENV === 'production' && /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?/i.test(PUBLIC_BASE_URL)) {
  throw new Error('PUBLIC_BASE_URL must be a public HTTPS origin when NODE_ENV=production.');
}

if (ACTIONS_ENABLED && !ACTION_BUILDER_CONFIGURED) {
  throw new Error('ACTIONS_ENABLED cannot be true until the transaction builder is configured.');
}

const ACTIONS_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Content-Encoding, Accept-Encoding',
};

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '256kb', type: 'application/json' }));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Content-Encoding', 'Accept-Encoding'],
}));

function json(res: Response, status: number, body: unknown) {
  res.set(ACTIONS_CORS_HEADERS).status(status).json(body);
}

function parsePublicKey(value: unknown, field: string) {
  if (typeof value !== 'string') {
    throw new Error(`${field} is required.`);
  }

  try {
    return new PublicKey(value);
  } catch {
    throw new Error(`${field} must be a valid Solana public key.`);
  }
}

function referralParams(req: Request) {
  const source = parsePublicKey(req.query.source, 'source');
  const mint = parsePublicKey(req.query.mint, 'mint');
  return { source, mint };
}

app.options('/actions/viral-sync', (_req, res) => {
  res.set(ACTIONS_CORS_HEADERS).status(204).end();
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    actionsEnabled: ACTIONS_READY,
    builderConfigured: ACTION_BUILDER_CONFIGURED,
    uptime: process.uptime(),
  });
});

app.get('/actions/viral-sync', (req: Request, res: Response) => {
  try {
    referralParams(req);

    json(res, 200, {
      title: 'Claim Viral Sync Referral',
      icon: ACTION_ICON_URL,
      description: 'Claim a merchant-funded referral reward through the Viral Sync mobile flow.',
      label: ACTIONS_READY ? 'Claim referral' : 'Use mobile claim flow',
      disabled: !ACTIONS_READY,
      error: ACTIONS_READY ? undefined : 'Solana Actions are disabled for this Frontier build. Use the mobile web claim flow.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid action request.';
    json(res, 400, { error: message });
  }
});

app.post('/actions/viral-sync', (req: Request, res: Response) => {
  try {
    referralParams(req);
    parsePublicKey(req.body?.account, 'account');

    json(res, 503, {
      error: 'Solana Actions are disabled for this Frontier build. Use the mobile web claim flow.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate action transaction.';
    json(res, 400, { error: message });
  }
});

app.listen(PORT, () => {
  console.log(`Viral Sync Actions server listening on port ${PORT}`);
});
