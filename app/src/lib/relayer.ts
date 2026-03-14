/**
 * Viral Sync v1 relayer client.
 * Live mode should use typed sponsored-action endpoints instead of the legacy
 * generic relay API so the backend can enforce action-specific policy.
 */

import { Transaction, VersionedTransaction } from '@solana/web3.js';
import {
    type RelayerAction,
    type RelayerHealthPayload,
    type SponsoredActionRequest,
    type SponsoredActionResponse,
    RELAYER_ROUTE_PREFIX,
} from '@viral-sync/shared';

const RELAYER_URL = process.env.NEXT_PUBLIC_RELAYER_URL || 'http://localhost:3001';

export interface RelayResult {
    success: boolean;
    signature?: string;
    error?: string;
    logs?: string[];
}

export interface RelayHealthResult {
    online: boolean;
    relayEnabled?: boolean;
    relayerPubkey?: string;
    balance?: number;
    apiVersion?: string;
}

function serializeTransaction(tx: Transaction | VersionedTransaction): string {
    if (tx instanceof VersionedTransaction) {
        return Buffer.from(tx.serialize()).toString('base64');
    }

    return Buffer.from(tx.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
    })).toString('base64');
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
    return response.json() as Promise<T>;
}

async function postLegacyRelay(
    transactionBase64: string
): Promise<RelayResult> {
    const response = await fetch(`${RELAYER_URL}/relay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionBase64 }),
    });

    const data = await parseJsonResponse<RelayResult & SponsoredActionResponse>(response);
    if (!response.ok) {
        return {
            success: false,
            error: data.error || 'Relay failed',
            logs: data.logs,
        };
    }

    return {
        success: true,
        signature: data.signature,
    };
}

export async function sponsorActionTransaction(
    action: RelayerAction,
    tx: Transaction | VersionedTransaction,
    options: Omit<SponsoredActionRequest, 'action' | 'transactionBase64'> = {}
): Promise<RelayResult> {
    const transactionBase64 = serializeTransaction(tx);

    try {
        const response = await fetch(`${RELAYER_URL}${RELAYER_ROUTE_PREFIX}/actions/sponsor`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action,
                transactionBase64,
                merchant: options.merchant,
                idempotencyKey: options.idempotencyKey,
                metadata: options.metadata,
            } satisfies SponsoredActionRequest),
        });

        if (response.status === 404) {
            return postLegacyRelay(transactionBase64);
        }

        const data = await parseJsonResponse<SponsoredActionResponse>(response);
        if (!response.ok || data.status !== 'success') {
            return {
                success: false,
                error: data.error || 'Sponsored action failed',
                logs: data.logs,
            };
        }

        return {
            success: true,
            signature: data.signature,
            logs: data.logs,
        };
    } catch (error: unknown) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Network error: relayer may be offline',
        };
    }
}

/**
 * Legacy compatibility wrapper.
 * New live flows should call sponsorActionTransaction with an explicit action.
 */
export async function relayTransaction(
    tx: Transaction | VersionedTransaction,
    action: RelayerAction = 'claim-commission'
): Promise<RelayResult> {
    return sponsorActionTransaction(action, tx);
}

export async function checkRelayerHealth(): Promise<RelayHealthResult> {
    try {
        const v1Response = await fetch(`${RELAYER_URL}${RELAYER_ROUTE_PREFIX}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(3000),
        });

        if (v1Response.ok) {
            const data = await parseJsonResponse<RelayerHealthPayload>(v1Response);
            return {
                online: true,
                relayEnabled: data.relayEnabled,
                relayerPubkey: data.relayerPubkey,
                balance: data.balance,
                apiVersion: RELAYER_ROUTE_PREFIX,
            };
        }

        const legacyResponse = await fetch(`${RELAYER_URL}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(3000),
        });

        if (!legacyResponse.ok) {
            return { online: false };
        }

        const legacyData = await parseJsonResponse<RelayerHealthPayload>(legacyResponse);
        return {
            online: true,
            relayEnabled: legacyData.relayEnabled,
            relayerPubkey: legacyData.relayerPubkey,
            balance: legacyData.balance,
            apiVersion: 'legacy',
        };
    } catch {
        return { online: false };
    }
}

export function getRelayerUrl(): string {
    return RELAYER_URL;
}
