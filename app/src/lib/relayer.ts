/**
 * Viral Sync — Relayer Client
 * Sends transactions to the gas relayer instead of directly to Solana.
 * The relayer pays the gas fee so users never need SOL.
 *
 * Flow:
 * 1. Frontend builds transaction (unsigned or partially signed by session key)
 * 2. Serializes to base64 and sends to relayer
 * 3. Relayer simulates, co-signs (adds fee payer), broadcasts
 * 4. Returns transaction signature
 */

import { Transaction, VersionedTransaction } from '@solana/web3.js';

const RELAYER_URL = process.env.NEXT_PUBLIC_RELAYER_URL || 'http://localhost:3001';

export interface RelayResult {
    success: boolean;
    signature?: string;
    error?: string;
    logs?: string[];
}

/**
 * Send a transaction through the gas relayer.
 * The relayer pays the SOL transaction fee.
 */
export async function relayTransaction(
    tx: Transaction | VersionedTransaction
): Promise<RelayResult> {
    try {
        const serialized = tx.serialize();
        const base64 = Buffer.from(serialized).toString('base64');

        const response = await fetch(`${RELAYER_URL}/relay`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactionBase64: base64 }),
        });

        const data = await response.json();

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
    } catch (error: unknown) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Network error — relayer may be offline',
        };
    }
}

/**
 * Check if the relayer is online and healthy.
 */
export async function checkRelayerHealth(): Promise<{
    online: boolean;
    relayerPubkey?: string;
    balance?: number;
}> {
    try {
        const response = await fetch(`${RELAYER_URL}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(3000),
        });

        if (!response.ok) {
            return { online: false };
        }

        const data = await response.json();
        return {
            online: true,
            relayerPubkey: data.relayerPubkey,
            balance: data.balance,
        };
    } catch {
        return { online: false };
    }
}

/**
 * Get the relayer's public key and current SOL balance.
 * Useful for displaying relayer status in merchant settings.
 */
export function getRelayerUrl(): string {
    return RELAYER_URL;
}
