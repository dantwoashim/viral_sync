'use client';

import { PublicKey, Transaction } from '@solana/web3.js';
import {
    RUNTIME_ROUTE_PREFIX,
    type OperatorChallengeRequest,
    type OperatorChallengeResponse,
    type OperatorSessionRequest,
    type OperatorSessionResponse,
    type RedemptionChallengeCreateRequest,
    type RedemptionChallengeCreateResponse,
    type RedemptionPrepareRequest,
    type RedemptionPrepareResponse,
    type RuntimeHealthPayload,
    type SessionBootstrapRequest,
    type SessionBootstrapResponse,
    type SessionChallengeRequest,
    type SessionChallengeResponse,
} from '@viral-sync/shared';
import { getConnection } from './solana';
import { type RelayResult, sponsorActionTransaction } from './relayer';

const ACTIONS_URL = process.env.NEXT_PUBLIC_ACTIONS_URL || 'http://localhost:8080';
const DEVICE_ID_KEY = 'vs-runtime-device-id';
const OPERATOR_SESSION_KEY = 'vs-operator-session';

type PersistedOperatorSession = OperatorSessionResponse;

async function parseJsonResponse<T>(response: Response): Promise<T> {
    return response.json() as Promise<T>;
}

async function postJson<TResponse>(path: string, body: object, headers?: Record<string, string>): Promise<TResponse> {
    const response = await fetch(`${ACTIONS_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(headers || {}) },
        body: JSON.stringify(body),
    });

    const data = await parseJsonResponse<TResponse & { error?: string }>(response);
    if (!response.ok) {
        throw new Error(data.error || `Runtime request failed with status ${response.status}`);
    }
    return data as TResponse;
}

export async function getRuntimeHealth(): Promise<RuntimeHealthPayload> {
    const response = await fetch(`${ACTIONS_URL}${RUNTIME_ROUTE_PREFIX}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
        throw new Error(`Runtime health failed with status ${response.status}`);
    }

    return parseJsonResponse<RuntimeHealthPayload>(response);
}

export async function requestSessionChallenge(
    request: SessionChallengeRequest
): Promise<SessionChallengeResponse> {
    return postJson<SessionChallengeResponse>(
        `${RUNTIME_ROUTE_PREFIX}/session/challenge`,
        request
    );
}

export async function bootstrapSession(
    request: SessionBootstrapRequest
): Promise<SessionBootstrapResponse> {
    return postJson<SessionBootstrapResponse>(
        `${RUNTIME_ROUTE_PREFIX}/session/bootstrap`,
        request
    );
}

export async function createRedemptionChallenge(
    request: RedemptionChallengeCreateRequest,
    operatorToken: string
): Promise<RedemptionChallengeCreateResponse> {
    return postJson<RedemptionChallengeCreateResponse>(
        `${RUNTIME_ROUTE_PREFIX}/redemptions/challenge`,
        request,
        { Authorization: `Bearer ${operatorToken}` }
    );
}

export async function prepareRedemption(
    request: RedemptionPrepareRequest
): Promise<RedemptionPrepareResponse> {
    return postJson<RedemptionPrepareResponse>(
        `${RUNTIME_ROUTE_PREFIX}/redemptions/prepare`,
        request
    );
}

export function decodeTransaction(transactionBase64: string): Transaction {
    return Transaction.from(Buffer.from(transactionBase64, 'base64'));
}

export async function submitPreparedTransaction(
    action: 'session-key-issue' | 'geo-redeem',
    tx: Transaction,
    wallet: PublicKey,
    merchant?: string,
    idempotencyKey?: string
): Promise<RelayResult> {
    if (tx.feePayer && tx.feePayer.equals(wallet)) {
        try {
            const signature = await getConnection().sendRawTransaction(tx.serialize(), {
                maxRetries: 3,
                skipPreflight: false,
            });
            return { success: true, signature };
        } catch (error: unknown) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Direct transaction submission failed',
            };
        }
    }

    return sponsorActionTransaction(action, tx, {
        merchant,
        idempotencyKey,
        metadata: {
            userWallet: wallet.toBase58(),
            deviceId: getOrCreateDeviceId(),
        },
    });
}

export function getActionsUrl(): string {
    return ACTIONS_URL;
}

export async function requestOperatorChallenge(
    request: OperatorChallengeRequest
): Promise<OperatorChallengeResponse> {
    return postJson<OperatorChallengeResponse>(
        `${RUNTIME_ROUTE_PREFIX}/operators/challenge`,
        request
    );
}

export async function createOperatorSession(
    request: OperatorSessionRequest
): Promise<OperatorSessionResponse> {
    return postJson<OperatorSessionResponse>(
        `${RUNTIME_ROUTE_PREFIX}/operators/session`,
        request
    );
}

export function getStoredOperatorSession(): PersistedOperatorSession | null {
    if (typeof window === 'undefined') {
        return null;
    }

    const raw = window.localStorage.getItem(OPERATOR_SESSION_KEY);
    if (!raw) {
        return null;
    }

    try {
        const parsed = JSON.parse(raw) as PersistedOperatorSession;
        if (!parsed.token || !parsed.merchant || !parsed.wallet || !parsed.role || parsed.expiresAt <= Date.now()) {
            window.localStorage.removeItem(OPERATOR_SESSION_KEY);
            return null;
        }
        return parsed;
    } catch {
        window.localStorage.removeItem(OPERATOR_SESSION_KEY);
        return null;
    }
}

export function persistOperatorSession(session: PersistedOperatorSession): void {
    if (typeof window === 'undefined') {
        return;
    }
    window.localStorage.setItem(OPERATOR_SESSION_KEY, JSON.stringify(session));
}

export function clearStoredOperatorSession(): void {
    if (typeof window === 'undefined') {
        return;
    }
    window.localStorage.removeItem(OPERATOR_SESSION_KEY);
}

export function getOrCreateDeviceId(): string {
    if (typeof window === 'undefined') {
        return 'server-render';
    }

    const existing = window.localStorage.getItem(DEVICE_ID_KEY);
    if (existing) {
        return existing;
    }

    const created = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_ID_KEY, created);
    return created;
}
