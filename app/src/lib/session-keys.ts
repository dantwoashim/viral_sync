/**
 * Viral Sync — Session Key Manager
 * Creates temporary keypairs that can sign transactions without user popups.
 * Session keys are:
 * - Time-scoped (expire after configurable duration, default 24h)
 * - Instruction-scoped (only certain operations allowed)
 * - Stored in sessionStorage (cleared on tab close)
 *
 * In production, session keys are registered on-chain via initSessionKey instruction.
 * This module handles the client-side key management.
 */

'use client';

import { Keypair, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';

export interface SessionKeyInfo {
    /** The session keypair (stored in memory / sessionStorage) */
    publicKey: PublicKey;
    /** When this session key was created */
    createdAt: number;
    /** When this session key expires */
    expiresAt: number;
    /** Which program instructions this key can sign */
    allowedInstructions: string[];
    /** Whether this session key has been registered on-chain */
    registeredOnChain: boolean;
}

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const SESSION_STORAGE_KEY = 'vs-session-key';

let currentKeypair: Keypair | null = null;
let currentInfo: SessionKeyInfo | null = null;

/**
 * Creates or retrieves the current session key.
 * Keys persist in sessionStorage for the current tab session.
 */
export function getOrCreateSessionKey(): { keypair: Keypair; info: SessionKeyInfo } {
    // Check if we have a valid session key in memory
    if (currentKeypair && currentInfo && currentInfo.expiresAt > Date.now()) {
        return { keypair: currentKeypair, info: currentInfo };
    }

    // Try to restore from sessionStorage
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem(SESSION_STORAGE_KEY) : null;
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (parsed.expiresAt > Date.now() && parsed.secretKey) {
                currentKeypair = Keypair.fromSecretKey(new Uint8Array(parsed.secretKey));
                currentInfo = {
                    publicKey: currentKeypair.publicKey,
                    createdAt: parsed.createdAt,
                    expiresAt: parsed.expiresAt,
                    allowedInstructions: parsed.allowedInstructions || [],
                    registeredOnChain: parsed.registeredOnChain || false,
                };
                return { keypair: currentKeypair, info: currentInfo };
            }
        } catch {
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
        }
    }

    // Create fresh session key
    currentKeypair = Keypair.generate();
    const now = Date.now();
    currentInfo = {
        publicKey: currentKeypair.publicKey,
        createdAt: now,
        expiresAt: now + SESSION_DURATION_MS,
        allowedInstructions: [
            'claim_reward',
            'share_token',
            'redeem_token',
        ],
        registeredOnChain: false,
    };

    // Store in sessionStorage (survives page refresh within same tab)
    if (typeof window !== 'undefined') {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
            secretKey: Array.from(currentKeypair.secretKey),
            createdAt: currentInfo.createdAt,
            expiresAt: currentInfo.expiresAt,
            allowedInstructions: currentInfo.allowedInstructions,
            registeredOnChain: false,
        }));
    }

    return { keypair: currentKeypair, info: currentInfo };
}

/**
 * Sign a transaction using the session key.
 * This happens silently — no user popup.
 */
export function signWithSessionKey(tx: Transaction | VersionedTransaction): Transaction | VersionedTransaction {
    const { keypair, info } = getOrCreateSessionKey();

    if (info.expiresAt <= Date.now()) {
        throw new Error('Session key expired. Please re-authenticate.');
    }

    if (tx instanceof VersionedTransaction) {
        tx.sign([keypair]);
    } else {
        tx.partialSign(keypair);
    }

    return tx;
}

/**
 * Mark the session key as registered on-chain.
 * Called after the initSessionKey instruction succeeds.
 */
export function markSessionKeyRegistered(): void {
    if (currentInfo) {
        currentInfo.registeredOnChain = true;
        // Update storage
        const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            parsed.registeredOnChain = true;
            sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(parsed));
        }
    }
}

/**
 * Get current session key info without creating one.
 * Returns null if no active session key.
 */
export function getSessionKeyInfo(): SessionKeyInfo | null {
    if (currentInfo && currentInfo.expiresAt > Date.now()) {
        return currentInfo;
    }
    return null;
}

/**
 * Destroy the current session key.
 * Called on logout.
 */
export function destroySessionKey(): void {
    currentKeypair = null;
    currentInfo = null;
    if (typeof window !== 'undefined') {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
}

/**
 * Check if the session key is still valid.
 */
export function isSessionKeyValid(): boolean {
    return currentInfo !== null && currentInfo.expiresAt > Date.now();
}

/**
 * Time remaining on the session key in milliseconds.
 */
export function sessionKeyTimeRemaining(): number {
    if (!currentInfo) return 0;
    return Math.max(0, currentInfo.expiresAt - Date.now());
}
