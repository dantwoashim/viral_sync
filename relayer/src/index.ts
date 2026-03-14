import path from 'path';
import cors from 'cors';
import crypto from 'crypto';
import dotenv from 'dotenv';
import express, { type Request, type Response } from 'express';
import {
    ComputeBudgetProgram,
    Connection,
    Keypair,
    SystemProgram,
    Transaction,
    VersionedTransaction,
} from '@solana/web3.js';
import bs58 from 'bs58';
import {
    type MerchantBudgetState,
    type MerchantBudgetUpdateRequest,
    type MerchantPlan,
    type RelayerAction,
    type RelayerFlagState,
    type RelayerHealthPayload,
    type SponsoredActionRequest,
    type SponsoredActionResponse,
    isRelayerAction,
    RELAYER_ROUTE_PREFIX,
} from '@viral-sync/shared';
import {
    applyMerchantBudgetUpdate,
    createDefaultMerchantBudget,
    createInitialActionMetrics,
    debitMerchantBudget,
    getLegacyProgramIds,
    getVersionedProgramIds,
    merchantBudgetBlockReason,
    noteActionAccepted,
    noteActionFailed,
    noteActionRejected,
    validateRelayPolicy,
} from './policy';
import { createRelayPersistence, type RelayPersistence } from './storage';

dotenv.config();

const DEFAULT_PROGRAM_ID = process.env.PROGRAM_ID || 'D9ds2V6y4GFGKbo8wF8qQiF81dzhkiznmZsHepcSN6Ta';
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
const PORT = Number(process.env.PORT || 3001);
const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
const ASSOCIATED_TOKEN_PROGRAM_ID = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
const RELAYER_SECRET = process.env.RELAYER_SECRET || '';
const ALLOW_INSECURE_DEV_RELAY = process.env.ALLOW_INSECURE_DEV_RELAY === 'true';
const MAX_TX_BYTES = Number(process.env.RELAYER_MAX_TX_BYTES || 50_000);
const MAX_TX_BASE64_BYTES = Math.ceil((MAX_TX_BYTES * 4) / 3);
const MAX_INSTRUCTIONS = Number(process.env.RELAYER_MAX_INSTRUCTIONS || 8);
const REPLAY_WINDOW_MS = Number(process.env.RELAYER_REPLAY_WINDOW_MS || 5 * 60_000);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RELAYER_RATE_LIMIT_WINDOW_MS || 60_000);
const RATE_LIMIT_MAX = Number(process.env.RELAYER_RATE_LIMIT_MAX || 20);
const RELAYER_ADMIN_TOKEN = process.env.RELAYER_ADMIN_TOKEN || '';
const ALLOW_ORIGINLESS_REQUESTS =
    process.env.RELAYER_ALLOW_ORIGINLESS === 'true' || ALLOW_INSECURE_DEV_RELAY;
const STATE_PATH = process.env.RELAYER_STATE_PATH
    || path.join(process.cwd(), 'data', 'relayer-state.json');
const AUDIT_LOG_PATH = process.env.RELAYER_AUDIT_LOG_PATH
    || path.join(process.cwd(), 'data', 'relayer-audit.log');
const AUDIT_LOG_ENABLED = process.env.RELAYER_AUDIT_LOG_ENABLED !== 'false';
const DEFAULT_MERCHANT_BUDGET_LAMPORTS = Number(
    process.env.RELAYER_DEFAULT_MERCHANT_BUDGET_LAMPORTS
    || (ALLOW_INSECURE_DEV_RELAY ? 1_000_000_000 : 0)
);

const allowedOrigins = (process.env.RELAYER_ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
const envPausedActions = new Set<RelayerAction>(
    (process.env.RELAYER_PAUSED_ACTIONS || '')
        .split(',')
        .map((value) => value.trim())
        .filter(isRelayerAction)
);
const mutablePausedActions = new Set<RelayerAction>();

const allowedProgramIds = new Set<string>([
    DEFAULT_PROGRAM_ID,
    ComputeBudgetProgram.programId.toBase58(),
    SystemProgram.programId.toBase58(),
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    ...(process.env.RELAYER_ALLOWED_PROGRAM_IDS || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
]);

interface RelayContext {
    req: Request;
    res: Response;
    clientIp: string;
    origin: string | null;
    action?: RelayerAction;
    merchant?: string;
    idempotencyKey?: string;
}

const app = express();
app.use(cors({
    origin(origin, callback) {
        if (isOriginAllowed(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error('Origin not allowed by relayer policy.'));
    },
}));
app.use(express.json({ limit: '256kb' }));

const relayEnabled = Boolean(RELAYER_SECRET) || ALLOW_INSECURE_DEV_RELAY;
const relayerKeypair = RELAYER_SECRET
    ? Keypair.fromSecretKey(bs58.decode(RELAYER_SECRET))
    : Keypair.generate();
const connection = new Connection(RPC_URL, 'confirmed');
let persistence: RelayPersistence | null = null;
const actionMetrics = createInitialActionMetrics();

function parseMerchantPlan(value: string | undefined): MerchantPlan {
    if (value === 'growth' || value === 'enterprise') {
        return value;
    }
    return 'free';
}

const merchantBudgetDefaults = {
    defaultPlan: parseMerchantPlan(process.env.RELAYER_DEFAULT_MERCHANT_PLAN),
    defaultLamports: DEFAULT_MERCHANT_BUDGET_LAMPORTS,
};

function getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
        return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
}

function isOriginAllowed(origin?: string | null): boolean {
    if (!origin) {
        return ALLOW_ORIGINLESS_REQUESTS;
    }
    return allowedOrigins.includes('*') || allowedOrigins.includes(origin);
}

function parseRelayPayload(body: unknown): SponsoredActionRequest | null {
    if (!body || typeof body !== 'object') {
        return null;
    }

    const candidate = body as Partial<SponsoredActionRequest>;
    if (typeof candidate.transactionBase64 !== 'string') {
        return null;
    }

    return {
        action: candidate.action as RelayerAction,
        transactionBase64: candidate.transactionBase64,
        merchant: candidate.merchant,
        idempotencyKey: candidate.idempotencyKey,
        metadata: candidate.metadata,
    };
}

async function appendAuditLog(event: Record<string, unknown>) {
    await persistence?.appendAuditLog(event);
}

function extractBearerToken(req: Request): string | null {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return null;
    }
    return header.slice('Bearer '.length).trim() || null;
}

function requireAdmin(req: Request, res: Response): boolean {
    if (ALLOW_INSECURE_DEV_RELAY) {
        return true;
    }

    if (!RELAYER_ADMIN_TOKEN) {
        res.status(503).json({ status: 'error', error: 'Relayer admin access is not configured.' });
        return false;
    }

    if (extractBearerToken(req) !== RELAYER_ADMIN_TOKEN) {
        res.status(401).json({ status: 'error', error: 'Missing or invalid relayer admin token.' });
        return false;
    }

    return true;
}

async function getMerchantBudget(merchant: string): Promise<MerchantBudgetState> {
    const existing = await persistence?.getMerchantBudget(merchant);
    if (existing) {
        return existing;
    }

    const created = createDefaultMerchantBudget(merchant, merchantBudgetDefaults);
    await persistence?.setMerchantBudget(created);
    return created;
}

async function saveMerchantBudget(state: MerchantBudgetState): Promise<void> {
    await persistence?.setMerchantBudget(state);
}

function metricsPayload() {
    return {
        pausedActions: getPausedActions(),
        merchantBudgetsTracked: persistence?.merchantBudgetsTracked ?? 0,
        actionMetrics,
    };
}

function getPausedActions(): RelayerAction[] {
    return Array.from(new Set<RelayerAction>([
        ...envPausedActions,
        ...mutablePausedActions,
    ])).sort();
}

function isActionPaused(action: RelayerAction): boolean {
    return envPausedActions.has(action) || mutablePausedActions.has(action);
}

async function estimateSponsoredLamports(tx: VersionedTransaction | Transaction): Promise<number> {
    const feeForMessage = tx instanceof VersionedTransaction
        ? await connection.getFeeForMessage(tx.message, 'confirmed')
        : await connection.getFeeForMessage(tx.compileMessage(), 'confirmed');
    return feeForMessage.value ?? 0;
}

async function rejectIfBlocked(context: RelayContext): Promise<boolean> {
    const { res, clientIp, origin, action, merchant } = context;

    if (!isOriginAllowed(origin)) {
        if (action) {
            noteActionRejected(actionMetrics, action, 'Origin not allowed by relayer policy.');
        }
        await appendAuditLog({
            outcome: 'rejected',
            reason: 'origin_not_allowed',
            clientIp,
            origin,
            action,
            merchant,
        });
        res.status(403).json({ status: 'error', error: 'Origin not allowed by relayer policy.' });
        return true;
    }

    if (action && isActionPaused(action)) {
        noteActionRejected(actionMetrics, action, 'Sponsored action is paused by relayer policy.');
        await appendAuditLog({
            outcome: 'rejected',
            reason: 'action_paused',
            clientIp,
            origin,
            action,
            merchant,
        });
        res.status(503).json({ status: 'error', error: 'Sponsored action is currently paused.' });
        return true;
    }

    const rateLimited = await persistence?.checkRateLimit(clientIp, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX);
    if (rateLimited === false) {
        if (action) {
            noteActionRejected(actionMetrics, action, 'Rate limit exceeded.');
        }
        await appendAuditLog({
            outcome: 'rejected',
            reason: 'rate_limited',
            clientIp,
            origin,
            action,
            merchant,
        });
        res.status(429).json({ status: 'error', error: 'Rate limit exceeded. Try again in 60 seconds.' });
        return true;
    }

    return false;
}

function healthPayload(balance: number): RelayerHealthPayload {
    return {
        status: relayEnabled ? 'ok' : 'degraded',
        relayEnabled,
        relayerPubkey: relayerKeypair.publicKey.toBase58(),
        balance,
        balanceSOL: balance / 1e9,
        rpcUrl: RPC_URL.replace(/\/\/.*:.*@/, '//***@'),
        uptime: process.uptime(),
        allowedPrograms: Array.from(allowedProgramIds),
        replayEntries: persistence?.replayEntries ?? 0,
        rateLimitedClients: persistence?.rateLimitedClients ?? 0,
        statePath: persistence?.statePath,
        auditLogPath: persistence?.auditLogPath,
        cacheBackend: persistence?.cacheBackend,
        auditBackend: persistence?.auditBackend,
        metrics: metricsPayload(),
    };
}

async function sendHealth(_req: Request, res: Response) {
    try {
        const balance = relayEnabled
            ? await connection.getBalance(relayerKeypair.publicKey)
            : 0;

        res.json(healthPayload(balance));
    } catch (error: unknown) {
        res.status(500).json({
            ...healthPayload(0),
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown health error',
        });
    }
}

async function relayTransactionPayload(
    transactionBase64: string,
    context: RelayContext
): Promise<SponsoredActionResponse> {
    const { clientIp, origin, action, merchant, idempotencyKey } = context;

    if (transactionBase64.length > MAX_TX_BASE64_BYTES) {
        if (action) {
            noteActionRejected(actionMetrics, action, 'Transaction payload exceeds relayer limits.');
        }
        await appendAuditLog({ outcome: 'rejected', reason: 'payload_too_large', clientIp, origin, action, merchant });
        return { status: 'error', error: 'Transaction payload exceeds relayer limits.' };
    }

    const txBuffer = Buffer.from(transactionBase64, 'base64');
    if (txBuffer.length > MAX_TX_BYTES) {
        if (action) {
            noteActionRejected(actionMetrics, action, 'Transaction byte length exceeds relayer limits.');
        }
        await appendAuditLog({ outcome: 'rejected', reason: 'tx_too_large', clientIp, origin, action, merchant });
        return { status: 'error', error: 'Transaction byte length exceeds relayer limits.' };
    }

    const replaySeed = idempotencyKey
        ? `${action || 'legacy'}:${idempotencyKey}`
        : crypto.createHash('sha256').update(txBuffer).digest('hex');
    const replayHash = crypto.createHash('sha256').update(replaySeed).digest('hex');
    const registered = await persistence?.registerReplay(replayHash, REPLAY_WINDOW_MS);
    if (registered === false) {
        if (action) {
            noteActionRejected(actionMetrics, action, 'Duplicate transaction rejected by replay protection.');
        }
        await appendAuditLog({ outcome: 'rejected', reason: 'replay', clientIp, origin, action, merchant, replayHash });
        return { status: 'error', error: 'Duplicate transaction rejected by replay protection.' };
    }

    let tx: VersionedTransaction | Transaction;
    try {
        tx = VersionedTransaction.deserialize(txBuffer);
    } catch {
        tx = Transaction.from(txBuffer);
    }

    const policyFailure = validateRelayPolicy(tx, {
        relayEnabled,
        relayerPubkey: relayerKeypair.publicKey,
        allowedProgramIds,
        maxInstructions: MAX_INSTRUCTIONS,
    });
    if (policyFailure) {
        if (action) {
            noteActionRejected(actionMetrics, action, policyFailure.body.error || 'Relayer policy failure.');
        }
        await appendAuditLog({
            outcome: 'rejected',
            reason: 'policy_failure',
            clientIp,
            origin,
            action,
            merchant,
            details: policyFailure.body,
        });
            return policyFailure.body;
    }

    const programIds = tx instanceof VersionedTransaction
        ? getVersionedProgramIds(tx)
        : getLegacyProgramIds(tx);

    let sponsoredLamports = 0;
    let chargedBudget: MerchantBudgetState | null = null;
    if (action && merchant) {
        sponsoredLamports = await estimateSponsoredLamports(tx);
        const merchantBudget = await getMerchantBudget(merchant);
        chargedBudget = merchantBudget;
        const budgetBlockReason = merchantBudgetBlockReason(merchantBudget, sponsoredLamports);
        if (budgetBlockReason) {
            noteActionRejected(actionMetrics, action, budgetBlockReason);
            await appendAuditLog({
                outcome: 'rejected',
                reason: 'merchant_budget_blocked',
                clientIp,
                origin,
                action,
                merchant,
                replayHash,
                sponsoredLamports,
            });
            return { status: 'error', error: budgetBlockReason };
        }
    }

    if (tx instanceof VersionedTransaction) {
        tx.sign([relayerKeypair]);
    } else {
        tx.partialSign(relayerKeypair);
    }

    const simulation = tx instanceof VersionedTransaction
        ? await connection.simulateTransaction(tx, {
            sigVerify: true,
            commitment: 'confirmed',
        })
        : await connection.simulateTransaction(tx, undefined, true);

    if (simulation.value.err) {
        if (action) {
            noteActionRejected(actionMetrics, action, 'Transaction simulation failed.', true);
        }
        await appendAuditLog({
            outcome: 'rejected',
            reason: 'simulation_failed',
            clientIp,
            origin,
            action,
            merchant,
            replayHash,
            programIds,
            simulationError: simulation.value.err,
        });
        return {
            status: 'error',
            error: 'Transaction simulation failed.',
            logs: simulation.value.logs?.slice(-12),
        };
    }

    let signature: string;
    try {
        signature = await connection.sendRawTransaction(tx.serialize(), {
            maxRetries: 3,
            skipPreflight: true,
        });
    } catch (error: unknown) {
        if (action) {
            noteActionFailed(
                actionMetrics,
                action,
                error instanceof Error ? error.message : 'Unexpected relayer broadcast failure'
            );
        }
        await appendAuditLog({
            outcome: 'error',
            reason: 'send_failed',
            clientIp,
            origin,
            action,
            merchant,
            replayHash,
            programIds,
            error: error instanceof Error ? error.message : 'Unexpected relayer broadcast failure',
        });
        return {
            status: 'error',
            error: error instanceof Error ? error.message : 'Unexpected relayer broadcast failure',
        };
    }

    if (action) {
        noteActionAccepted(actionMetrics, action, sponsoredLamports, signature);
    }
    if (action && merchant && chargedBudget) {
        await saveMerchantBudget(debitMerchantBudget(chargedBudget, sponsoredLamports));
    }

    await appendAuditLog({
        outcome: 'accepted',
        clientIp,
        origin,
        action,
        merchant,
        replayHash,
        idempotencyKey,
        programIds,
        sponsoredLamports,
        signature,
    });

    return { status: 'success', signature };
}

app.get('/health', sendHealth);
app.get(`${RELAYER_ROUTE_PREFIX}/health`, sendHealth);

app.get(`${RELAYER_ROUTE_PREFIX}/merchants/:merchant/budget`, async (req, res) => {
    try {
        const merchant = req.params.merchant?.trim();
        if (!merchant) {
            res.status(400).json({ status: 'error', error: 'Missing merchant identifier.' });
            return;
        }

        res.json(await getMerchantBudget(merchant));
    } catch (error: unknown) {
        res.status(500).json({
            status: 'error',
            error: error instanceof Error ? error.message : 'Failed to load merchant budget',
        });
    }
});

app.get(`${RELAYER_ROUTE_PREFIX}/admin/runtime-flags`, (req, res) => {
    if (!requireAdmin(req, res)) {
        return;
    }

    const payload: RelayerFlagState = {
        pausedActions: getPausedActions(),
    };
    res.json(payload);
});

app.post(`${RELAYER_ROUTE_PREFIX}/admin/runtime-flags`, async (req, res) => {
    if (!requireAdmin(req, res)) {
        return;
    }

    const nextPausedActions: RelayerAction[] = Array.isArray(req.body?.pausedActions)
        ? req.body.pausedActions.filter((action: unknown): action is RelayerAction =>
            typeof action === 'string' && isRelayerAction(action)
        )
        : [];
    mutablePausedActions.clear();
    nextPausedActions.forEach((action) => {
        if (!envPausedActions.has(action)) {
            mutablePausedActions.add(action);
        }
    });
    await persistence?.setPausedActions(Array.from(mutablePausedActions.values()));

    const payload: RelayerFlagState = {
        pausedActions: getPausedActions(),
    };
    res.json(payload);
});

app.post(`${RELAYER_ROUTE_PREFIX}/admin/merchants/:merchant/budget`, async (req, res) => {
    if (!requireAdmin(req, res)) {
        return;
    }

    try {
        const merchant = req.params.merchant?.trim();
        if (!merchant) {
            res.status(400).json({ status: 'error', error: 'Missing merchant identifier.' });
            return;
        }

        const update = (req.body || {}) as MerchantBudgetUpdateRequest;
        const current = await persistence?.getMerchantBudget(merchant);
        const next = applyMerchantBudgetUpdate(merchant, current ?? null, update, merchantBudgetDefaults);
        await saveMerchantBudget(next);
        res.json(next);
    } catch (error: unknown) {
        res.status(500).json({
            status: 'error',
            error: error instanceof Error ? error.message : 'Failed to update merchant budget',
        });
    }
});

app.post('/relay', async (req, res) => {
    const context: RelayContext = {
        req,
        res,
        clientIp: getClientIp(req),
        origin: typeof req.headers.origin === 'string' ? req.headers.origin : null,
    };

    if (await rejectIfBlocked(context)) {
        return;
    }

    const transactionBase64 = typeof req.body?.transactionBase64 === 'string'
        ? req.body.transactionBase64
        : null;
    if (!transactionBase64) {
        res.status(400).json({ status: 'error', error: 'Missing transactionBase64 payload.' });
        return;
    }

    try {
        const result = await relayTransactionPayload(transactionBase64, context);
        res.status(result.status === 'success' ? 200 : 400).json(result);
    } catch (error: unknown) {
        await appendAuditLog({
            outcome: 'error',
            clientIp: context.clientIp,
            origin: context.origin,
            error: error instanceof Error ? error.message : 'Unexpected relayer failure',
        });
        res.status(500).json({
            status: 'error',
            error: error instanceof Error ? error.message : 'Unexpected relayer failure',
        });
    }
});

app.post(`${RELAYER_ROUTE_PREFIX}/actions/sponsor`, async (req, res) => {
    const payload = parseRelayPayload(req.body);
    const context: RelayContext = {
        req,
        res,
        clientIp: getClientIp(req),
        origin: typeof req.headers.origin === 'string' ? req.headers.origin : null,
        action: payload?.action,
        merchant: payload?.merchant,
        idempotencyKey: payload?.idempotencyKey,
    };

    if (await rejectIfBlocked(context)) {
        return;
    }

    if (!payload) {
        res.status(400).json({ status: 'error', error: 'Missing typed sponsored action payload.' });
        return;
    }

    if (!isRelayerAction(payload.action)) {
        res.status(400).json({ status: 'error', error: 'Unsupported sponsored action.' });
        return;
    }
    if (!payload.merchant) {
        noteActionRejected(actionMetrics, payload.action, 'Sponsored actions require a merchant budget owner.');
        res.status(400).json({ status: 'error', error: 'Sponsored actions require a merchant field.' });
        return;
    }

    try {
        const result = await relayTransactionPayload(payload.transactionBase64, context);
        res.status(result.status === 'success' ? 200 : 400).json(result);
    } catch (error: unknown) {
        await appendAuditLog({
            outcome: 'error',
            clientIp: context.clientIp,
            origin: context.origin,
            action: context.action,
            merchant: context.merchant,
            error: error instanceof Error ? error.message : 'Unexpected relayer failure',
        });
        res.status(500).json({
            status: 'error',
            error: error instanceof Error ? error.message : 'Unexpected relayer failure',
        });
    }
});

async function shutdown() {
    await persistence?.close();
}

async function start() {
    persistence = await createRelayPersistence({
        statePath: STATE_PATH,
        auditLogPath: AUDIT_LOG_PATH,
        auditLogEnabled: AUDIT_LOG_ENABLED,
        redisUrl: process.env.REDIS_URL,
        databaseUrl: process.env.DATABASE_URL,
    });

    const persistedPausedActions = await persistence.getPausedActions();
    mutablePausedActions.clear();
    persistedPausedActions
        .filter(isRelayerAction)
        .forEach((action) => {
            if (!envPausedActions.has(action)) {
                mutablePausedActions.add(action);
            }
        });

    setInterval(() => {
        void persistence?.cleanup();
    }, 30_000);

    process.on('SIGINT', () => {
        void shutdown().finally(() => process.exit(0));
    });
    process.on('SIGTERM', () => {
        void shutdown().finally(() => process.exit(0));
    });

    app.listen(PORT, () => {
        console.log(`Viral Sync relayer listening on ${PORT}`);
        console.log(`Relay enabled: ${relayEnabled}`);
        console.log(`Relayer pubkey: ${relayerKeypair.publicKey.toBase58()}`);
        console.log(`Cache backend: ${persistence?.cacheBackend}`);
        console.log(`Audit backend: ${persistence?.auditBackend}`);
    });
}

void start().catch((error: unknown) => {
    console.error('Failed to start relayer', error);
    process.exit(1);
});
