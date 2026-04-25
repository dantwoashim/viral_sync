import cors from 'cors';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import { PublicKey } from '@solana/web3.js';

dotenv.config();

const PORT = Number(process.env.PORT || 8080);
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:8080';
const ACTION_ICON_URL = process.env.ACTION_ICON_URL || `${PUBLIC_BASE_URL}/action-hero.png`;
const ACTIONS_ENABLED = process.env.ACTIONS_ENABLED === 'true';

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
    actionsEnabled: ACTIONS_ENABLED,
    uptime: process.uptime(),
  });
});

app.get('/actions/viral-sync', (req: Request, res: Response) => {
  try {
    referralParams(req);

    json(res, 200, {
      title: 'Claim Viral Sync Referral',
      icon: ACTION_ICON_URL,
      description: 'Claim a merchant-funded referral reward after the on-chain action builder is enabled.',
      label: ACTIONS_ENABLED ? 'Claim referral' : 'Action unavailable',
      disabled: !ACTIONS_ENABLED,
      error: ACTIONS_ENABLED ? undefined : 'The on-chain Solana Actions builder is not configured on this deployment.',
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

    if (!ACTIONS_ENABLED) {
      json(res, 501, {
        error: 'The on-chain Solana Actions builder is not configured. Refusing to return an empty transaction.',
      });
      return;
    }

    json(res, 501, {
      error: 'No production instruction builder is registered for create_escrow_share yet.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate action transaction.';
    json(res, 400, { error: message });
  }
});

app.listen(PORT, () => {
  console.log(`Viral Sync Actions server listening on port ${PORT}`);
});
