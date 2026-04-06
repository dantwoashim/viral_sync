import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import cors from 'cors';
import express, { Request, Response } from 'express';
import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    TransactionInstruction,
} from '@solana/web3.js';
import bs58 from 'bs58';
import {
    RUNTIME_ROUTE_PREFIX,
    buildOperatorChallengeMessage,
    buildSessionChallengeMessage,
    isRuntimeDisabledAction,
    type OperatorChallengeRequest,
    type OperatorChallengeResponse,
    type OperatorSessionRequest,
    type OperatorSessionResponse,
    type RedemptionChallengeCreateRequest,
    type RedemptionChallengeCreateResponse,
    type RedemptionPrepareRequest,
    type RedemptionPrepareResponse,
    type RuntimeDisabledAction,
    type RuntimeFlagState,
    type RuntimeHealthPayload,
    type SessionBootstrapRequest,
    type SessionBootstrapResponse,
    type SessionChallengeRequest,
    type SessionChallengeResponse,
} from '@viral-sync/shared';
import {
    calculateEpochFee,
    createTransferCheckedWithOptionalFeeAndHookInstruction,
    decodeToken2022Account,
    decodeToken2022Mint,
    findTransferHookValidationPda,
    getTransferFeeConfig,
    getTransferHookProgramId,
} from './token2022';

const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID || 'D9ds2V6y4GFGKbo8wF8qQiF81dzhkiznmZsHepcSN6Ta');
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
const DEFAULT_CLAIM_AMOUNT = BigInt(process.env.ACTION_DEFAULT_AMOUNT || '1000000000');
const MAX_CLAIM_AMOUNT = BigInt(process.env.ACTION_MAX_AMOUNT || '1000000000000');
const PORT = Number(process.env.PORT || 8080);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const SESSION_CHALLENGE_TTL_MS = Number(process.env.ACTION_SESSION_CHALLENGE_TTL_MS || 5 * 60_000);
const SESSION_DURATION_MS = Number(process.env.ACTION_SESSION_DURATION_MS || 24 * 60 * 60_000);
const OPERATOR_CHALLENGE_TTL_MS = Number(process.env.ACTION_OPERATOR_CHALLENGE_TTL_MS || 5 * 60_000);
const OPERATOR_SESSION_TTL_MS = Number(process.env.ACTION_OPERATOR_SESSION_TTL_MS || 8 * 60 * 60_000);
const DEFAULT_SESSION_MAX_TOKENS = BigInt(process.env.ACTION_SESSION_MAX_TOKENS || '100000000000');
const REDEMPTION_CODE_TTL_MS = Number(process.env.ACTION_REDEMPTION_CODE_TTL_MS || 2 * 60_000);
const HTTP_RATE_LIMIT_WINDOW_MS = Number(process.env.ACTION_HTTP_RATE_LIMIT_WINDOW_MS || 60_000);
const HTTP_RATE_LIMIT_MAX = Number(process.env.ACTION_HTTP_RATE_LIMIT_MAX || 60);
const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const ALLOW_ORIGINLESS_REQUESTS = process.env.ACTION_ALLOW_ORIGINLESS === 'true';
const DISABLE_SIGNATURE_VERIFY = process.env.ACTION_DISABLE_SIGNATURE_VERIFY === 'true';
const ACTION_ADMIN_TOKEN = process.env.ACTION_ADMIN_TOKEN || '';
const STATE_PATH = process.env.ACTION_STATE_PATH
    || path.join(process.cwd(), 'data', 'actions-state.json');
const RELAYER_FEE_PAYER = parseOptionalPublicKey(process.env.ACTION_RELAYER_PUBKEY);
const ATTESTATION_KEYPAIR = parseAttestationKeypair(process.env.ACTION_ATTESTATION_SECRET);

const allowedOrigins = (process.env.ACTION_ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
const allowedMints = new Set(
    (process.env.ACTION_ALLOWED_MINTS || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
);
const allowedMerchants = new Set(
    (process.env.ACTION_ALLOWED_MERCHANTS || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
);
const allowedGlobalOperators = new Set(
    (process.env.ACTION_ALLOWED_GLOBAL_OPERATORS || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
);

function parseOperatorAllowlist(input: string): Map<string, Set<string>> {
    const mapping = new Map<string, Set<string>>();
    input
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
        .forEach((entry) => {
            const [merchant, walletsRaw] = entry.split(':');
            if (!merchant || !walletsRaw) {
                return;
            }

            const wallets = walletsRaw
                .split('|')
                .map((wallet) => wallet.trim())
                .filter(Boolean);
            if (wallets.length === 0) {
                return;
            }

            mapping.set(merchant.trim(), new Set(wallets));
        });
    return mapping;
}

const allowedMerchantOperators = parseOperatorAllowlist(process.env.ACTION_ALLOWED_OPERATORS || '');
const envDisabledRuntimeActions = parseRuntimeDisabledActions(process.env.ACTION_DISABLED_ACTIONS || '');

if (IS_PRODUCTION && DISABLE_SIGNATURE_VERIFY) {
    throw new Error('ACTION_DISABLE_SIGNATURE_VERIFY must not be enabled in production.');
}

if (IS_PRODUCTION && ALLOW_ORIGINLESS_REQUESTS) {
    throw new Error('ACTION_ALLOW_ORIGINLESS must not be enabled in production.');
}

interface SessionChallengeRecord {
    challengeId: string;
    wallet: string;
    delegate: string;
    generation: string;
    mint: string;
    merchant?: string;
    origin?: string;
    expiresAt: number;
    message: string;
    usedAt?: number;
}

interface OperatorChallengeRecord {
    challengeId: string;
    wallet: string;
    merchant: string;
    origin?: string;
    expiresAt: number;
    message: string;
    usedAt?: number;
}

interface OperatorSessionRecord {
    token: string;
    wallet: string;
    merchant: string;
    role: 'merchant' | 'operator';
    expiresAt: number;
}

interface RedemptionChallengeRecord {
    challengeId: string;
    code: string;
    merchant: string;
    fence: string;
    mint?: string;
    amount: string;
    label?: string;
    expiresAt: number;
    preparedAt?: number;
}

interface DecodedGeoFence {
    vault: PublicKey;
    merchant: PublicKey;
    mint: PublicKey;
    isActive: boolean;
}

interface PersistedActionState {
    sessionChallenges: SessionChallengeRecord[];
    operatorChallenges: OperatorChallengeRecord[];
    operatorSessions: OperatorSessionRecord[];
    redemptionChallenges: RedemptionChallengeRecord[];
    disabledActions: RuntimeDisabledAction[];
}

const app = express();
app.use(express.json({ limit: '128kb' }));
app.use(cors({
    origin(origin, callback) {
        if (isOriginAllowed(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error('Origin not allowed by action policy.'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Content-Encoding', 'Accept-Encoding'],
}));

const connection = new Connection(RPC_URL, 'confirmed');
const persistedState = loadState();
const sessionChallenges = new Map<string, SessionChallengeRecord>(
    persistedState.sessionChallenges.map((record) => [record.challengeId, record])
);
const operatorChallenges = new Map<string, OperatorChallengeRecord>(
    persistedState.operatorChallenges.map((record) => [record.challengeId, record])
);
const operatorSessions = new Map<string, OperatorSessionRecord>(
    persistedState.operatorSessions.map((record) => [record.token, record])
);
const redemptionChallenges = new Map<string, RedemptionChallengeRecord>(
    persistedState.redemptionChallenges.map((record) => [record.code, record])
);
const mutableDisabledRuntimeActions = new Set<RuntimeDisabledAction>(persistedState.disabledActions);
const httpRateLimitMap = new Map<string, number[]>();
let persistTimer: NodeJS.Timeout | null = null;

function ensureParentDir(targetPath: string) {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
}

function loadState(): PersistedActionState {
    try {
        if (!fs.existsSync(STATE_PATH)) {
            return {
                sessionChallenges: [],
                operatorChallenges: [],
                operatorSessions: [],
                redemptionChallenges: [],
                disabledActions: [],
            };
        }

        const raw = fs.readFileSync(STATE_PATH, 'utf8');
        const parsed = JSON.parse(raw) as Partial<PersistedActionState>;
        return {
            sessionChallenges: parsed.sessionChallenges ?? [],
            operatorChallenges: parsed.operatorChallenges ?? [],
            operatorSessions: parsed.operatorSessions ?? [],
            redemptionChallenges: parsed.redemptionChallenges ?? [],
            disabledActions: parseRuntimeDisabledActions(parsed.disabledActions ?? []),
        };
    } catch {
        return {
            sessionChallenges: [],
            operatorChallenges: [],
            operatorSessions: [],
            redemptionChallenges: [],
            disabledActions: [],
        };
    }
}

function persistState() {
    ensureParentDir(STATE_PATH);
    const state: PersistedActionState = {
        sessionChallenges: Array.from(sessionChallenges.values()),
        operatorChallenges: Array.from(operatorChallenges.values()),
        operatorSessions: Array.from(operatorSessions.values()),
        redemptionChallenges: Array.from(redemptionChallenges.values()),
        disabledActions: Array.from(mutableDisabledRuntimeActions.values()),
    };
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

function schedulePersist() {
    if (persistTimer) {
        return;
    }

    persistTimer = setTimeout(() => {
        persistTimer = null;
        persistState();
    }, 250);
}

function parseRuntimeDisabledActions(input: string | string[]): RuntimeDisabledAction[] {
    const values = Array.isArray(input)
        ? input
        : input.split(',').map((value) => value.trim());
    return values.filter(isRuntimeDisabledAction);
}

function getDisabledRuntimeActions(): RuntimeDisabledAction[] {
    return Array.from(new Set<RuntimeDisabledAction>([
        ...envDisabledRuntimeActions,
        ...mutableDisabledRuntimeActions,
    ])).sort();
}

function isRuntimeActionDisabled(action: RuntimeDisabledAction): boolean {
    return envDisabledRuntimeActions.includes(action) || mutableDisabledRuntimeActions.has(action);
}

function requireRuntimeActionEnabled(
    req: Request,
    res: Response,
    action: RuntimeDisabledAction,
    message: string,
): boolean {
    if (!isRuntimeActionDisabled(action)) {
        return true;
    }

    jsonError(req, res, 503, message);
    return false;
}

function parseOptionalPublicKey(value: string | undefined): PublicKey | null {
    if (!value) {
        return null;
    }

    try {
        return new PublicKey(value);
    } catch {
        return null;
    }
}

function parseAttestationKeypair(secret: string | undefined): Keypair | null {
    if (!secret) {
        return null;
    }

    try {
        return Keypair.fromSecretKey(bs58.decode(secret));
    } catch {
        return null;
    }
}

function isOriginAllowed(origin?: string | null): boolean {
    if (!origin) {
        return ALLOW_ORIGINLESS_REQUESTS;
    }
    return allowedOrigins.includes('*') || allowedOrigins.includes(origin);
}

function setCorsHeaders(req: Request, res: Response) {
    const origin = typeof req.headers.origin === 'string' ? req.headers.origin : null;
    if (origin && isOriginAllowed(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    } else if (!origin && ALLOW_ORIGINLESS_REQUESTS) {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Encoding, Accept-Encoding');
}

function getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
        return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
}

function checkHttpRateLimit(req: Request): boolean {
    const key = `${getClientIp(req)}:${req.path}`;
    const now = Date.now();
    const recent = (httpRateLimitMap.get(key) ?? []).filter((timestamp) => now - timestamp < HTTP_RATE_LIMIT_WINDOW_MS);

    if (recent.length >= HTTP_RATE_LIMIT_MAX) {
        httpRateLimitMap.set(key, recent);
        return false;
    }

    recent.push(now);
    httpRateLimitMap.set(key, recent);
    return true;
}

function anchorDiscriminator(name: string): Buffer {
    return crypto.createHash('sha256').update(`global:${name}`).digest().subarray(0, 8);
}

function encodeU64(value: bigint): Buffer {
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64LE(value);
    return buffer;
}

function encodeI64(value: number): Buffer {
    const buffer = Buffer.alloc(8);
    buffer.writeBigInt64LE(BigInt(value));
    return buffer;
}

function encodeI32(value: number): Buffer {
    const buffer = Buffer.alloc(4);
    buffer.writeInt32LE(value);
    return buffer;
}

function encodeBool(value: boolean): Buffer {
    return Buffer.from([value ? 1 : 0]);
}

function parsePublicKey(value: string | string[] | undefined, name: string): PublicKey {
    if (!value || Array.isArray(value)) {
        throw new Error(`Missing ${name} parameter.`);
    }
    return new PublicKey(value);
}

function parseBodyPublicKey(value: string | undefined, name: string): PublicKey {
    if (!value) {
        throw new Error(`Missing ${name}.`);
    }
    return new PublicKey(value);
}

function parseAmount(value: string | string[] | undefined): bigint {
    if (!value || Array.isArray(value)) {
        return DEFAULT_CLAIM_AMOUNT;
    }

    const parsed = BigInt(value);
    if (parsed <= 0n || parsed > MAX_CLAIM_AMOUNT) {
        throw new Error(`Claim amount must be between 1 and ${MAX_CLAIM_AMOUNT.toString()}.`);
    }
    return parsed;
}

function parseRuntimeAmount(value: string | undefined, fieldName: string): bigint {
    if (!value) {
        throw new Error(`Missing ${fieldName}.`);
    }

    const parsed = BigInt(value);
    if (parsed <= 0n || parsed > MAX_CLAIM_AMOUNT) {
        throw new Error(`${fieldName} must be between 1 and ${MAX_CLAIM_AMOUNT.toString()}.`);
    }

    return parsed;
}

function assertMintAllowed(mint: PublicKey) {
    if (allowedMints.size === 0) {
        return;
    }
    if (!allowedMints.has(mint.toBase58())) {
        throw new Error('Mint is not allowlisted on this action server.');
    }
}

function assertMerchantAllowed(merchant: PublicKey) {
    if (allowedMerchants.size === 0) {
        return;
    }
    if (!allowedMerchants.has(merchant.toBase58())) {
        throw new Error('Merchant is not allowlisted on this action server.');
    }
}

function operatorRoleForWallet(wallet: PublicKey, merchant: PublicKey): 'merchant' | 'operator' | null {
    if (wallet.equals(merchant)) {
        return 'merchant';
    }
    if (allowedGlobalOperators.has(wallet.toBase58())) {
        return 'operator';
    }

    const merchantOperators = allowedMerchantOperators.get(merchant.toBase58());
    if (merchantOperators?.has(wallet.toBase58())) {
        return 'operator';
    }

    return null;
}

function getAssociatedTokenAddressSync(
    mint: PublicKey,
    owner: PublicKey,
    allowOwnerOffCurve = false,
    tokenProgramId = TOKEN_2022_PROGRAM_ID,
    associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID
): PublicKey {
    if (!allowOwnerOffCurve && !PublicKey.isOnCurve(owner.toBuffer())) {
        throw new Error('Associated token owner must be on curve.');
    }

    return PublicKey.findProgramAddressSync(
        [owner.toBuffer(), tokenProgramId.toBuffer(), mint.toBuffer()],
        associatedTokenProgramId
    )[0];
}

function createAssociatedTokenAccountIdempotentInstruction(
    payer: PublicKey,
    associatedToken: PublicKey,
    owner: PublicKey,
    mint: PublicKey,
    tokenProgramId = TOKEN_2022_PROGRAM_ID,
    associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID
) {
    return new TransactionInstruction({
        programId: associatedTokenProgramId,
        keys: [
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: associatedToken, isSigner: false, isWritable: true },
            { pubkey: owner, isSigner: false, isWritable: false },
            { pubkey: mint, isSigner: false, isWritable: false },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: tokenProgramId, isSigner: false, isWritable: false },
        ],
        data: Buffer.from([1]),
    });
}

function findTokenGenerationPda(mint: PublicKey, owner: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('gen_v4'), mint.toBuffer(), owner.toBuffer()],
        PROGRAM_ID
    )[0];
}

function findMerchantConfigPda(mint: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('merchant_v4'), mint.toBuffer()],
        PROGRAM_ID
    )[0];
}

function findVaultEntryPda(mint: PublicKey, vault: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('vault_entry'), mint.toBuffer(), vault.toBuffer()],
        PROGRAM_ID
    )[0];
}

function findGeoFencePda(mint: PublicKey, vault: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('geo_fence'), mint.toBuffer(), vault.toBuffer()],
        PROGRAM_ID
    )[0];
}

function findSessionKeyPda(tokenGeneration: PublicKey, delegate: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('session'), tokenGeneration.toBuffer(), delegate.toBuffer()],
        PROGRAM_ID
    )[0];
}

function findGeoNoncePda(fence: PublicKey, redeemer: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('geo_nonce'), fence.toBuffer(), redeemer.toBuffer()],
        PROGRAM_ID
    )[0];
}

function findEscrowAuthorityPda(escrowGeneration: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('escrow_authority'), escrowGeneration.toBuffer()],
        PROGRAM_ID
    )[0];
}

function decodeGeoFenceAccount(data: Buffer): DecodedGeoFence {
    let offset = 8; // Anchor discriminator
    offset += 1; // bump
    const vault = new PublicKey(data.subarray(offset, offset + 32)); offset += 32;
    const merchant = new PublicKey(data.subarray(offset, offset + 32)); offset += 32;
    const mint = new PublicKey(data.subarray(offset, offset + 32)); offset += 32;
    offset += 4; // lat_micro
    offset += 4; // lng_micro
    offset += 4; // radius_meters
    const isActive = data.readUInt8(offset) !== 0;
    return { vault, merchant, mint, isActive };
}

async function fetchGeoFenceAccount(fence: PublicKey): Promise<DecodedGeoFence> {
    const info = await connection.getAccountInfo(fence);
    if (!info || !info.owner.equals(PROGRAM_ID)) {
        throw new Error('Geo fence account not found for this program.');
    }

    return decodeGeoFenceAccount(Buffer.from(info.data));
}

function buildInitTokenGenerationInstruction(
    tokenGeneration: PublicKey,
    payer: PublicKey,
    owner: PublicKey,
    mint: PublicKey
) {
    return new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
            { pubkey: tokenGeneration, isSigner: false, isWritable: true },
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: owner, isSigner: false, isWritable: false },
            { pubkey: mint, isSigner: false, isWritable: false },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: anchorDiscriminator('init_token_generation'),
    });
}

function buildCreateSessionKeyInstruction(
    sessionKey: PublicKey,
    tokenGeneration: PublicKey,
    delegate: PublicKey,
    authority: PublicKey,
    expiresAt: number,
    maxTokensPerSession: bigint
) {
    return new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
            { pubkey: sessionKey, isSigner: false, isWritable: true },
            { pubkey: tokenGeneration, isSigner: false, isWritable: false },
            { pubkey: delegate, isSigner: false, isWritable: false },
            { pubkey: authority, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: Buffer.concat([
            anchorDiscriminator('create_session_key'),
            encodeI64(expiresAt),
            encodeU64(maxTokensPerSession),
        ]),
    });
}

function buildRedeemWithGeoInstruction(
    fence: PublicKey,
    redeemer: PublicKey,
    attestationServer: PublicKey,
    geoNonce: PublicKey,
    latMicro: number,
    lngMicro: number,
    issuedAt: number,
    nonce: bigint,
    bypassGeo: boolean
) {
    return new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
            { pubkey: fence, isSigner: false, isWritable: false },
            { pubkey: redeemer, isSigner: true, isWritable: false },
            { pubkey: attestationServer, isSigner: true, isWritable: true },
            { pubkey: geoNonce, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: Buffer.concat([
            anchorDiscriminator('redeem_with_geo'),
            encodeI32(latMicro),
            encodeI32(lngMicro),
            encodeI64(issuedAt),
            encodeU64(nonce),
            encodeBool(bypassGeo),
        ]),
    });
}

function buildClaimEscrowInstruction(
    escrowGeneration: PublicKey,
    destGeneration: PublicKey,
    escrowAta: PublicKey,
    destAta: PublicKey,
    escrowAuthority: PublicKey,
    mint: PublicKey,
    amount: bigint
) {
    return new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
            { pubkey: escrowGeneration, isSigner: false, isWritable: true },
            { pubkey: destGeneration, isSigner: false, isWritable: true },
            { pubkey: escrowAta, isSigner: false, isWritable: true },
            { pubkey: destAta, isSigner: false, isWritable: true },
            { pubkey: escrowAuthority, isSigner: false, isWritable: false },
            { pubkey: mint, isSigner: false, isWritable: false },
            { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        data: Buffer.concat([anchorDiscriminator('claim_escrow'), encodeU64(amount)]),
    });
}

async function fetchRequiredAccounts(mint: PublicKey, userPubkey: PublicKey, escrowGeneration: PublicKey) {
    const destGeneration = findTokenGenerationPda(mint, userPubkey);
    const escrowAuthority = findEscrowAuthorityPda(escrowGeneration);
    const escrowAta = getAssociatedTokenAddressSync(mint, escrowAuthority, true, TOKEN_2022_PROGRAM_ID);
    const destAta = getAssociatedTokenAddressSync(mint, userPubkey, false, TOKEN_2022_PROGRAM_ID);

    const [destGenerationInfo, destAtaInfo, escrowGenerationInfo, escrowAtaInfo] = await Promise.all([
        connection.getAccountInfo(destGeneration),
        connection.getAccountInfo(destAta),
        connection.getAccountInfo(escrowGeneration),
        connection.getAccountInfo(escrowAta),
    ]);

    return {
        destGeneration,
        escrowAuthority,
        escrowAta,
        destAta,
        destGenerationInfo,
        destAtaInfo,
        escrowGenerationInfo,
        escrowAtaInfo,
    };
}

function cleanupChallengeMaps() {
    const now = Date.now();
    for (const [key, challenge] of sessionChallenges.entries()) {
        if (challenge.expiresAt <= now || challenge.usedAt) {
            sessionChallenges.delete(key);
        }
    }
    for (const [key, challenge] of operatorChallenges.entries()) {
        if (challenge.expiresAt <= now || challenge.usedAt) {
            operatorChallenges.delete(key);
        }
    }
    for (const [key, session] of operatorSessions.entries()) {
        if (session.expiresAt <= now) {
            operatorSessions.delete(key);
        }
    }
    for (const [key, challenge] of redemptionChallenges.entries()) {
        if (challenge.expiresAt <= now || challenge.preparedAt) {
            redemptionChallenges.delete(key);
        }
    }
    schedulePersist();
}

setInterval(cleanupChallengeMaps, 30_000);
process.on('SIGINT', () => {
    persistState();
    process.exit(0);
});
process.on('SIGTERM', () => {
    persistState();
    process.exit(0);
});

function createCode(length = 8): string {
    return crypto.randomBytes(length).toString('hex').slice(0, length).toUpperCase();
}

function serializeTransaction(tx: Transaction): string {
    return tx.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
    }).toString('base64');
}

async function verifyWalletSignature(wallet: PublicKey, message: string, signatureBase64: string): Promise<boolean> {
    if (DISABLE_SIGNATURE_VERIFY) {
        return true;
    }
    const key = await crypto.webcrypto.subtle.importKey(
        'raw',
        wallet.toBytes(),
        { name: 'Ed25519' },
        false,
        ['verify']
    );
    return crypto.webcrypto.subtle.verify(
        'Ed25519',
        key,
        Buffer.from(signatureBase64, 'base64'),
        new TextEncoder().encode(message)
    );
}

function jsonError(req: Request, res: Response, status: number, message: string) {
    setCorsHeaders(req, res);
    res.status(status).json({ error: message });
}

app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        next();
        return;
    }

    if (checkHttpRateLimit(req)) {
        next();
        return;
    }

    jsonError(req, res, 429, 'Too many requests. Slow down and try again.');
});

function readBearerToken(req: Request): string | null {
    const authorization = typeof req.headers.authorization === 'string'
        ? req.headers.authorization
        : '';
    if (authorization.startsWith('Bearer ')) {
        return authorization.slice('Bearer '.length).trim();
    }
    const fallback = req.headers['x-operator-token'];
    return typeof fallback === 'string' && fallback.trim().length > 0 ? fallback.trim() : null;
}

function requireAdmin(req: Request, res: Response): boolean {
    if (!ACTION_ADMIN_TOKEN) {
        setCorsHeaders(req, res);
        res.status(503).json({ error: 'Action admin access is not configured.' });
        return false;
    }

    if (readBearerToken(req) !== ACTION_ADMIN_TOKEN) {
        setCorsHeaders(req, res);
        res.status(401).json({ error: 'Missing or invalid action admin token.' });
        return false;
    }

    return true;
}

function requireOperatorSession(req: Request, merchant: string): OperatorSessionRecord {
    const token = readBearerToken(req);
    if (!token) {
        throw new Error('Missing merchant operator session token.');
    }

    const session = operatorSessions.get(token);
    if (!session || session.expiresAt <= Date.now()) {
        operatorSessions.delete(token);
        schedulePersist();
        throw new Error('Merchant operator session expired or invalid.');
    }
    if (session.merchant !== merchant) {
        throw new Error('Merchant operator session is not valid for this merchant.');
    }
    const currentRole = operatorRoleForWallet(new PublicKey(session.wallet), new PublicKey(merchant));
    if (!currentRole) {
        operatorSessions.delete(token);
        schedulePersist();
        throw new Error('Merchant operator session is no longer allowlisted.');
    }
    if (currentRole !== session.role) {
        session.role = currentRole;
        operatorSessions.set(token, session);
        schedulePersist();
    }

    return session;
}

function readOnlyExposeRuntimeDetails(): boolean {
    return process.env.ACTION_EXPOSE_RUNTIME_DETAILS === 'true';
}

function createHealthPayload(latestBlockhash?: string): RuntimeHealthPayload {
    const exposeOperationalDetails = !IS_PRODUCTION || readOnlyExposeRuntimeDetails();
    return {
        status: 'ok',
        rpcUrl: RPC_URL,
        programId: PROGRAM_ID.toBase58(),
        relayerFeePayer: exposeOperationalDetails ? RELAYER_FEE_PAYER?.toBase58() : undefined,
        attestationPubkey: exposeOperationalDetails ? ATTESTATION_KEYPAIR?.publicKey.toBase58() : undefined,
        allowedOrigins,
        disabledActions: getDisabledRuntimeActions(),
        latestBlockhash,
        actionStatePath: exposeOperationalDetails ? STATE_PATH : undefined,
        sessionCounts: exposeOperationalDetails
            ? {
                sessionChallenges: sessionChallenges.size,
                operatorChallenges: operatorChallenges.size,
                operatorSessions: operatorSessions.size,
                redemptionChallenges: redemptionChallenges.size,
            }
            : undefined,
    };
}

app.options(`${RUNTIME_ROUTE_PREFIX}/session/challenge`, (req, res) => {
    if (!isOriginAllowed(typeof req.headers.origin === 'string' ? req.headers.origin : null)) {
        res.status(403).end();
        return;
    }
    setCorsHeaders(req, res);
    res.status(200).end();
});

app.get('/health', async (_req, res) => {
    try {
        const latestBlockhash = await connection.getLatestBlockhash();
        res.json({
            ...createHealthPayload(latestBlockhash.blockhash),
            maxClaimAmount: MAX_CLAIM_AMOUNT.toString(),
        });
    } catch (error: unknown) {
        res.status(500).json({
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown health failure',
        });
    }
});

app.get(`${RUNTIME_ROUTE_PREFIX}/health`, async (req, res) => {
    try {
        if (!isOriginAllowed(typeof req.headers.origin === 'string' ? req.headers.origin : null)) {
            jsonError(req, res, 403, 'Origin not allowed by action policy.');
            return;
        }

        const latestBlockhash = await connection.getLatestBlockhash();
        setCorsHeaders(req, res);
        res.json(createHealthPayload(latestBlockhash.blockhash));
    } catch (error: unknown) {
        jsonError(req, res, 500, error instanceof Error ? error.message : 'Unknown health failure');
    }
});

app.get(`${RUNTIME_ROUTE_PREFIX}/admin/runtime-flags`, (req, res) => {
    if (!requireAdmin(req, res)) {
        return;
    }

    setCorsHeaders(req, res);
    const payload: RuntimeFlagState = {
        disabledActions: getDisabledRuntimeActions(),
    };
    res.json(payload);
});

app.post(`${RUNTIME_ROUTE_PREFIX}/admin/runtime-flags`, (req, res) => {
    if (!requireAdmin(req, res)) {
        return;
    }

    const nextDisabledActions = parseRuntimeDisabledActions(
        Array.isArray(req.body?.disabledActions) ? req.body.disabledActions : []
    );
    mutableDisabledRuntimeActions.clear();
    nextDisabledActions.forEach((action) => {
        if (!envDisabledRuntimeActions.includes(action)) {
            mutableDisabledRuntimeActions.add(action);
        }
    });
    schedulePersist();

    setCorsHeaders(req, res);
    const payload: RuntimeFlagState = {
        disabledActions: getDisabledRuntimeActions(),
    };
    res.json(payload);
});

app.post(`${RUNTIME_ROUTE_PREFIX}/session/challenge`, async (req, res) => {
    try {
        if (!isOriginAllowed(typeof req.headers.origin === 'string' ? req.headers.origin : null)) {
            jsonError(req, res, 403, 'Origin not allowed by action policy.');
            return;
        }
        if (!requireRuntimeActionEnabled(req, res, 'session-bootstrap', 'Session issuance is temporarily disabled.')) {
            return;
        }

        const body = req.body as SessionChallengeRequest;
        const wallet = parseBodyPublicKey(body.wallet, 'wallet');
        const delegate = parseBodyPublicKey(body.delegate, 'delegate');
        const generation = parseBodyPublicKey(body.generation, 'generation');
        const mint = parseBodyPublicKey(body.mint, 'mint');
        assertMintAllowed(mint);
        const expectedGeneration = findTokenGenerationPda(mint, wallet);
        if (!generation.equals(expectedGeneration)) {
            jsonError(req, res, 400, 'Token generation PDA does not match the wallet + mint seeds.');
            return;
        }

        const merchant = body.merchant ? parseBodyPublicKey(body.merchant, 'merchant') : null;
        if (merchant) {
            assertMerchantAllowed(merchant);
        }

        const challengeId = crypto.randomUUID();
        const expiresAt = Date.now() + SESSION_CHALLENGE_TTL_MS;
        const challengeMessage = buildSessionChallengeMessage({
            challengeId,
            wallet: wallet.toBase58(),
            delegate: delegate.toBase58(),
            generation: generation.toBase58(),
            mint: mint.toBase58(),
            merchant: merchant?.toBase58(),
            origin: body.origin ?? (typeof req.headers.origin === 'string' ? req.headers.origin : undefined),
            expiresAt,
        });

        const payload: SessionChallengeResponse = {
            challengeId,
            challengeMessage,
            wallet: wallet.toBase58(),
            delegate: delegate.toBase58(),
            generation: generation.toBase58(),
            mint: mint.toBase58(),
            merchant: merchant?.toBase58(),
            expiresAt,
        };

        sessionChallenges.set(challengeId, {
            ...payload,
            origin: body.origin,
            message: challengeMessage,
        });
        schedulePersist();

        setCorsHeaders(req, res);
        res.json(payload);
    } catch (error: unknown) {
        jsonError(req, res, 400, error instanceof Error ? error.message : 'Invalid session challenge request');
    }
});

app.post(`${RUNTIME_ROUTE_PREFIX}/session/bootstrap`, async (req, res) => {
    try {
        if (!isOriginAllowed(typeof req.headers.origin === 'string' ? req.headers.origin : null)) {
            jsonError(req, res, 403, 'Origin not allowed by action policy.');
            return;
        }
        if (!requireRuntimeActionEnabled(req, res, 'session-bootstrap', 'Session issuance is temporarily disabled.')) {
            return;
        }

        const body = req.body as SessionBootstrapRequest;
        const challenge = sessionChallenges.get(body.challengeId);
        if (!challenge) {
            jsonError(req, res, 404, 'Session challenge not found or expired.');
            return;
        }
        if (challenge.usedAt) {
            jsonError(req, res, 409, 'Session challenge has already been used.');
            return;
        }
        if (challenge.expiresAt <= Date.now()) {
            sessionChallenges.delete(body.challengeId);
            schedulePersist();
            jsonError(req, res, 410, 'Session challenge expired.');
            return;
        }

        const wallet = new PublicKey(challenge.wallet);
        const delegate = new PublicKey(challenge.delegate);
        const generation = new PublicKey(challenge.generation);
        const mint = new PublicKey(challenge.mint);

        const verified = await verifyWalletSignature(wallet, challenge.message, body.signatureBase64);
        if (!verified) {
            jsonError(req, res, 401, 'Invalid wallet signature for session bootstrap.');
            return;
        }

        const generationInfo = await connection.getAccountInfo(generation);
        if (generationInfo && !generationInfo.owner.equals(PROGRAM_ID)) {
            jsonError(req, res, 400, 'Token generation PDA exists but is not owned by the Viral Sync program.');
            return;
        }

        const expiresAt = Math.min(
            Date.now() + SESSION_DURATION_MS,
            typeof body.requestedSessionExpiry === 'number'
                ? body.requestedSessionExpiry
                : Date.now() + SESSION_DURATION_MS
        );
        const maxTokensPerSession = body.maxTokensPerSession
            ? BigInt(body.maxTokensPerSession)
            : DEFAULT_SESSION_MAX_TOKENS;
        const sessionPda = findSessionKeyPda(generation, delegate);
        const latestBlockhash = await connection.getLatestBlockhash();

        const tx = new Transaction({
            feePayer: RELAYER_FEE_PAYER ?? wallet,
            recentBlockhash: latestBlockhash.blockhash,
        });

        if (!generationInfo) {
            tx.add(buildInitTokenGenerationInstruction(generation, wallet, wallet, mint));
        }

        tx.add(buildCreateSessionKeyInstruction(
            sessionPda,
            generation,
            delegate,
            wallet,
            Math.floor(expiresAt / 1000),
            maxTokensPerSession
        ));

        challenge.usedAt = Date.now();
        schedulePersist();

        const response: SessionBootstrapResponse = {
            transactionBase64: serializeTransaction(tx),
            sessionPda: sessionPda.toBase58(),
            delegate: delegate.toBase58(),
            generation: generation.toBase58(),
            mint: mint.toBase58(),
            expiresAt,
            merchant: challenge.merchant,
        };

        setCorsHeaders(req, res);
        res.json(response);
    } catch (error: unknown) {
        jsonError(req, res, 500, error instanceof Error ? error.message : 'Failed to bootstrap session');
    }
});

app.post(`${RUNTIME_ROUTE_PREFIX}/operators/challenge`, async (req, res) => {
    try {
        if (!isOriginAllowed(typeof req.headers.origin === 'string' ? req.headers.origin : null)) {
            jsonError(req, res, 403, 'Origin not allowed by action policy.');
            return;
        }
        if (!requireRuntimeActionEnabled(req, res, 'operator-auth', 'Merchant operator authentication is temporarily disabled.')) {
            return;
        }

        const body = req.body as OperatorChallengeRequest;
        const wallet = parseBodyPublicKey(body.wallet, 'wallet');
        const merchant = parseBodyPublicKey(body.merchant, 'merchant');
        assertMerchantAllowed(merchant);
        const operatorRole = operatorRoleForWallet(wallet, merchant);
        if (!operatorRole) {
            jsonError(req, res, 403, 'Wallet is not allowlisted for merchant operator access.');
            return;
        }

        const challengeId = crypto.randomUUID();
        const expiresAt = Date.now() + OPERATOR_CHALLENGE_TTL_MS;
        const challengeMessage = buildOperatorChallengeMessage({
            challengeId,
            wallet: wallet.toBase58(),
            merchant: merchant.toBase58(),
            origin: body.origin ?? (typeof req.headers.origin === 'string' ? req.headers.origin : undefined),
            expiresAt,
        });

        const payload: OperatorChallengeResponse = {
            challengeId,
            challengeMessage,
            wallet: wallet.toBase58(),
            merchant: merchant.toBase58(),
            expiresAt,
        };

        operatorChallenges.set(challengeId, {
            ...payload,
            origin: body.origin,
            message: challengeMessage,
        });
        schedulePersist();

        setCorsHeaders(req, res);
        res.json(payload);
    } catch (error: unknown) {
        jsonError(req, res, 400, error instanceof Error ? error.message : 'Invalid operator challenge request');
    }
});

app.post(`${RUNTIME_ROUTE_PREFIX}/operators/session`, async (req, res) => {
    try {
        if (!isOriginAllowed(typeof req.headers.origin === 'string' ? req.headers.origin : null)) {
            jsonError(req, res, 403, 'Origin not allowed by action policy.');
            return;
        }
        if (!requireRuntimeActionEnabled(req, res, 'operator-auth', 'Merchant operator authentication is temporarily disabled.')) {
            return;
        }

        const body = req.body as OperatorSessionRequest;
        const challenge = operatorChallenges.get(body.challengeId);
        if (!challenge) {
            jsonError(req, res, 404, 'Operator challenge not found or expired.');
            return;
        }
        if (challenge.usedAt) {
            jsonError(req, res, 409, 'Operator challenge has already been used.');
            return;
        }
        if (challenge.expiresAt <= Date.now()) {
            operatorChallenges.delete(body.challengeId);
            schedulePersist();
            jsonError(req, res, 410, 'Operator challenge expired.');
            return;
        }

        const wallet = new PublicKey(challenge.wallet);
        const verified = await verifyWalletSignature(wallet, challenge.message, body.signatureBase64);
        if (!verified) {
            jsonError(req, res, 401, 'Invalid wallet signature for merchant operator session.');
            return;
        }

        challenge.usedAt = Date.now();
        const token = crypto.randomUUID();
        const expiresAt = Date.now() + OPERATOR_SESSION_TTL_MS;
        const role = operatorRoleForWallet(wallet, new PublicKey(challenge.merchant));
        if (!role) {
            jsonError(req, res, 403, 'Wallet is no longer allowlisted for merchant operator access.');
            return;
        }
        const payload: OperatorSessionResponse = {
            token,
            wallet: challenge.wallet,
            merchant: challenge.merchant,
            role,
            expiresAt,
        };
        operatorSessions.set(token, payload);
        schedulePersist();

        setCorsHeaders(req, res);
        res.json(payload);
    } catch (error: unknown) {
        jsonError(req, res, 500, error instanceof Error ? error.message : 'Failed to create operator session');
    }
});

app.post(`${RUNTIME_ROUTE_PREFIX}/redemptions/challenge`, async (req, res) => {
    try {
        if (!isOriginAllowed(typeof req.headers.origin === 'string' ? req.headers.origin : null)) {
            jsonError(req, res, 403, 'Origin not allowed by action policy.');
            return;
        }
        if (!requireRuntimeActionEnabled(req, res, 'redemption', 'Redemption flows are temporarily disabled.')) {
            return;
        }

        const body = req.body as RedemptionChallengeCreateRequest;
        const merchant = parseBodyPublicKey(body.merchant, 'merchant');
        requireOperatorSession(req, merchant.toBase58());
        const fence = parseBodyPublicKey(body.fence, 'fence');
        assertMerchantAllowed(merchant);
        const mint = body.mint ? parseBodyPublicKey(body.mint, 'mint') : null;
        const amount = parseRuntimeAmount(body.amount, 'amount');
        if (mint) {
            assertMintAllowed(mint);
        }

        const challengeId = crypto.randomUUID();
        const code = createCode();
        const expiresAt = Date.now() + Math.min(
            REDEMPTION_CODE_TTL_MS,
            Math.max(15_000, (body.expiresInSeconds ?? REDEMPTION_CODE_TTL_MS / 1000) * 1000)
        );

        const payload: RedemptionChallengeCreateResponse = {
            challengeId,
            code,
            merchant: merchant.toBase58(),
            fence: fence.toBase58(),
            mint: mint?.toBase58(),
            amount: amount.toString(),
            label: body.label?.trim() || undefined,
            expiresAt,
        };

        redemptionChallenges.set(code, payload);
        schedulePersist();

        setCorsHeaders(req, res);
        res.json(payload);
    } catch (error: unknown) {
        jsonError(req, res, 400, error instanceof Error ? error.message : 'Invalid redemption challenge request');
    }
});

app.post(`${RUNTIME_ROUTE_PREFIX}/redemptions/prepare`, async (req, res) => {
    try {
        if (!isOriginAllowed(typeof req.headers.origin === 'string' ? req.headers.origin : null)) {
            jsonError(req, res, 403, 'Origin not allowed by action policy.');
            return;
        }
        if (!requireRuntimeActionEnabled(req, res, 'redemption', 'Redemption flows are temporarily disabled.')) {
            return;
        }

        const body = req.body as RedemptionPrepareRequest;
        if (!Number.isInteger(body.latMicro) || Math.abs(body.latMicro) > 90_000_000) {
            jsonError(req, res, 400, 'Latitude must be an integer microdegree value within valid bounds.');
            return;
        }
        if (!Number.isInteger(body.lngMicro) || Math.abs(body.lngMicro) > 180_000_000) {
            jsonError(req, res, 400, 'Longitude must be an integer microdegree value within valid bounds.');
            return;
        }
        const challenge = redemptionChallenges.get(body.code?.trim().toUpperCase());
        if (!challenge) {
            jsonError(req, res, 404, 'Redemption code not found or expired.');
            return;
        }
        if (challenge.preparedAt) {
            jsonError(req, res, 409, 'Redemption code has already been used.');
            return;
        }
        if (challenge.expiresAt <= Date.now()) {
            redemptionChallenges.delete(challenge.code);
            schedulePersist();
            jsonError(req, res, 410, 'Redemption code expired.');
            return;
        }
        if (!ATTESTATION_KEYPAIR) {
            jsonError(req, res, 503, 'Geo attestation signing is not configured on this server.');
            return;
        }

        const wallet = parseBodyPublicKey(body.wallet, 'wallet');
        const fence = new PublicKey(challenge.fence);
        const fenceAccount = await fetchGeoFenceAccount(fence);
        if (!fenceAccount.isActive) {
            jsonError(req, res, 409, 'Merchant geofence is inactive.');
            return;
        }
        if (fenceAccount.merchant.toBase58() !== challenge.merchant) {
            jsonError(req, res, 400, 'Redemption challenge merchant does not match the configured geofence.');
            return;
        }

        const mint = challenge.mint ? new PublicKey(challenge.mint) : fenceAccount.mint;
        assertMintAllowed(mint);
        if (!mint.equals(fenceAccount.mint)) {
            jsonError(req, res, 400, 'Redemption challenge mint does not match the configured geofence.');
            return;
        }

        const amount = parseRuntimeAmount(challenge.amount, 'amount');
        const sourceAta = getAssociatedTokenAddressSync(mint, wallet, false, TOKEN_2022_PROGRAM_ID);
        const destinationAta = fenceAccount.vault;
        const [tokenInfos, epochInfo] = await Promise.all([
            connection.getMultipleAccountsInfo([mint, sourceAta, destinationAta], 'confirmed'),
            connection.getEpochInfo('confirmed'),
        ]);
        const [mintRaw, sourceRaw, destinationRaw] = tokenInfos;
        const mintInfo = decodeToken2022Mint(mint, mintRaw, TOKEN_2022_PROGRAM_ID);
        const sourceAccount = decodeToken2022Account(sourceAta, sourceRaw, TOKEN_2022_PROGRAM_ID);
        const destinationAccount = decodeToken2022Account(destinationAta, destinationRaw, TOKEN_2022_PROGRAM_ID);
        if (!sourceAccount.owner.equals(wallet)) {
            jsonError(req, res, 403, 'Source token account is not owned by the redeeming wallet.');
            return;
        }
        if (!sourceAccount.mint.equals(mint)) {
            jsonError(req, res, 400, 'Source token account mint does not match the redemption mint.');
            return;
        }
        if (!destinationAccount.mint.equals(mint)) {
            jsonError(req, res, 400, 'Destination vault account mint does not match the redemption mint.');
            return;
        }
        if (sourceAccount.amount < amount) {
            jsonError(req, res, 400, 'Insufficient token balance for this redemption.');
            return;
        }

        const transferHookProgramId = getTransferHookProgramId(mintInfo);
        if (!transferHookProgramId) {
            jsonError(req, res, 400, 'Mint is missing the Viral Sync transfer-hook configuration.');
            return;
        }
        if (!transferHookProgramId.equals(PROGRAM_ID)) {
            jsonError(req, res, 400, 'Mint transfer hook does not point at the Viral Sync program.');
            return;
        }

        const merchantConfig = findMerchantConfigPda(mint);
        const vaultEntry = findVaultEntryPda(mint, destinationAta);
        const expectedFence = findGeoFencePda(mint, destinationAta);
        if (!fence.equals(expectedFence)) {
            jsonError(req, res, 400, 'Redemption challenge fence does not match the canonical merchant geofence PDA.');
            return;
        }

        const sourceGeneration = findTokenGenerationPda(mint, sourceAccount.owner);
        const destGeneration = findTokenGenerationPda(mint, destinationAccount.owner);
        const validationState = findTransferHookValidationPda(mint, transferHookProgramId);
        const requiredInfos = await connection.getMultipleAccountsInfo(
            [merchantConfig, vaultEntry, sourceGeneration, destGeneration, validationState],
            'confirmed'
        );
        const [merchantConfigInfo, vaultEntryInfo, sourceGenerationInfo, destGenerationInfo, validationStateInfo] = requiredInfos;
        if (!merchantConfigInfo || !merchantConfigInfo.owner.equals(PROGRAM_ID)) {
            jsonError(req, res, 404, 'Merchant config PDA is not initialized for this mint.');
            return;
        }
        if (!vaultEntryInfo || !vaultEntryInfo.owner.equals(PROGRAM_ID)) {
            jsonError(req, res, 404, 'Merchant vault entry PDA is not initialized for this redemption vault.');
            return;
        }
        if (!sourceGenerationInfo || !sourceGenerationInfo.owner.equals(PROGRAM_ID)) {
            jsonError(req, res, 404, 'Redeemer token-generation PDA is not initialized.');
            return;
        }
        if (!destGenerationInfo || !destGenerationInfo.owner.equals(PROGRAM_ID)) {
            jsonError(req, res, 404, 'Merchant vault owner token-generation PDA is not initialized.');
            return;
        }
        if (!validationStateInfo || !validationStateInfo.owner.equals(PROGRAM_ID)) {
            jsonError(req, res, 404, 'Transfer-hook validation PDA is not initialized for this mint.');
            return;
        }

        const geoNonce = findGeoNoncePda(fence, wallet);
        const latestBlockhash = await connection.getLatestBlockhash();
        const issuedAt = Math.floor(Date.now() / 1000);
        const nonce = BigInt(`0x${crypto.randomBytes(8).toString('hex')}`);

        const tx = new Transaction({
            feePayer: RELAYER_FEE_PAYER ?? wallet,
            recentBlockhash: latestBlockhash.blockhash,
        });
        tx.add(buildRedeemWithGeoInstruction(
            fence,
            wallet,
            ATTESTATION_KEYPAIR.publicKey,
            geoNonce,
            body.latMicro,
            body.lngMicro,
            issuedAt,
            nonce,
            Boolean(body.bypassGeo)
        ));
        const transferFeeConfig = getTransferFeeConfig(mintInfo);
        const transferInstruction = createTransferCheckedWithOptionalFeeAndHookInstruction({
            source: sourceAta,
            mint,
            destination: destinationAta,
            owner: wallet,
            amount,
            decimals: mintInfo.decimals,
            tokenProgramId: TOKEN_2022_PROGRAM_ID,
            fee: transferFeeConfig
                ? calculateEpochFee(transferFeeConfig, BigInt(epochInfo.epoch), amount)
                : null,
            hookAccounts: {
                transferHookProgramId,
                validationState,
                merchantConfig,
                vaultEntry,
                geoFence: fence,
                sourceGeneration,
                destGeneration,
                geoNonce,
            },
        });
        tx.add(transferInstruction);
        tx.partialSign(ATTESTATION_KEYPAIR);

        challenge.preparedAt = Date.now();
        schedulePersist();

        const payload: RedemptionPrepareResponse = {
            transactionBase64: serializeTransaction(tx),
            challengeId: challenge.challengeId,
            merchant: challenge.merchant,
            fence: challenge.fence,
            code: challenge.code,
            amount: challenge.amount,
            expiresAt: challenge.expiresAt,
        };

        setCorsHeaders(req, res);
        res.json(payload);
    } catch (error: unknown) {
        jsonError(req, res, 500, error instanceof Error ? error.message : 'Failed to prepare redemption');
    }
});

app.options('/actions/viral-sync', (req, res) => {
    if (!isOriginAllowed(typeof req.headers.origin === 'string' ? req.headers.origin : null)) {
        res.status(403).end();
        return;
    }
    setCorsHeaders(req, res);
    res.status(200).end();
});

app.get('/actions/viral-sync', async (req: Request, res: Response) => {
    try {
        if (!isOriginAllowed(typeof req.headers.origin === 'string' ? req.headers.origin : null)) {
            setCorsHeaders(req, res);
            res.status(403).json({ error: 'Origin not allowed by action policy.' });
            return;
        }

        const mint = parsePublicKey(req.query.mint as string, 'mint');
        assertMintAllowed(mint);
        parsePublicKey((req.query.escrow || req.query.source) as string, 'escrow');

        setCorsHeaders(req, res);
        res.json({
            title: 'Claim Viral Sync referral reward',
            icon: process.env.ACTION_ICON_URL || 'https://viralsync.io/assets/action-hero.png',
            description: 'Claim a pre-minted escrow reward into your own wallet. The action initializes missing state accounts before settlement.',
            label: 'Claim Reward',
        });
    } catch (error: unknown) {
        setCorsHeaders(req, res);
        res.status(400).json({
            error: error instanceof Error ? error.message : 'Invalid action parameters',
        });
    }
});

app.post('/actions/viral-sync', async (req: Request, res: Response) => {
    try {
        if (!isOriginAllowed(typeof req.headers.origin === 'string' ? req.headers.origin : null)) {
            setCorsHeaders(req, res);
            res.status(403).json({ error: 'Origin not allowed by action policy.' });
            return;
        }

        const { account } = req.body as { account?: string };
        if (!account) {
            setCorsHeaders(req, res);
            res.status(400).json({ error: 'Missing user account.' });
            return;
        }

        const userPubkey = new PublicKey(account);
        const mint = parsePublicKey(req.query.mint as string, 'mint');
        assertMintAllowed(mint);
        const escrowGeneration = parsePublicKey((req.query.escrow || req.query.source) as string, 'escrow');
        const amount = parseAmount(req.query.amount as string | string[] | undefined);

        const {
            destGeneration,
            escrowAuthority,
            escrowAta,
            destAta,
            destGenerationInfo,
            destAtaInfo,
            escrowGenerationInfo,
            escrowAtaInfo,
        } = await fetchRequiredAccounts(mint, userPubkey, escrowGeneration);

        if (!escrowGenerationInfo || !escrowGenerationInfo.owner.equals(PROGRAM_ID)) {
            setCorsHeaders(req, res);
            res.status(404).json({ error: 'Escrow generation account not found for this program.' });
            return;
        }

        if (!escrowAtaInfo || !escrowAtaInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
            setCorsHeaders(req, res);
            res.status(404).json({ error: 'Escrow token account not found for this reward.' });
            return;
        }

        if (destGenerationInfo && !destGenerationInfo.owner.equals(PROGRAM_ID)) {
            setCorsHeaders(req, res);
            res.status(400).json({ error: 'Destination generation PDA exists but is not owned by the Viral Sync program.' });
            return;
        }

        const tx = new Transaction();

        if (!destGenerationInfo) {
            tx.add(buildInitTokenGenerationInstruction(destGeneration, userPubkey, userPubkey, mint));
        }

        if (!destAtaInfo) {
            tx.add(createAssociatedTokenAccountIdempotentInstruction(
                userPubkey,
                destAta,
                userPubkey,
                mint,
                TOKEN_2022_PROGRAM_ID
            ));
        }

        tx.add(buildClaimEscrowInstruction(
            escrowGeneration,
            destGeneration,
            escrowAta,
            destAta,
            escrowAuthority,
            mint,
            amount,
        ));

        const blockhash = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash.blockhash;
        tx.feePayer = userPubkey;

        setCorsHeaders(req, res);
        res.status(200).json({
            transaction: serializeTransaction(tx),
            message: 'Escrow reward is ready to claim.',
        });
    } catch (error: unknown) {
        setCorsHeaders(req, res);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to generate action transaction',
        });
    }
});

app.listen(PORT, () => {
    console.log(`Viral Sync action server listening on ${PORT}`);
});
