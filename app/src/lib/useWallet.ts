/**
 * Viral Sync — useWallet Hook
 * Single source of truth for the current wallet address.
 * Reads from AuthProvider (connected user) → falls back to env → null.
 * 
 * Usage: call `useWallet(true)` on merchant-only views that may intentionally
 * fall back to the configured merchant public key.
 */

'use client';

import { useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useAuth } from './auth';

const ENV_MERCHANT = process.env.NEXT_PUBLIC_MERCHANT_PUBKEY;
let _envPubkey: PublicKey | null = null;
if (ENV_MERCHANT) {
    try { _envPubkey = new PublicKey(ENV_MERCHANT); } catch { }
}

/**
 * Returns the active wallet public key.
 * Priority: Auth connected wallet → optional env MERCHANT_PUBKEY fallback → null
 */
export function useWallet(useMerchantFallback = false): PublicKey | null {
    const { walletAddress } = useAuth();
    return useMemo(
        () => walletAddress ?? (useMerchantFallback ? _envPubkey : null),
        [useMerchantFallback, walletAddress]
    );
}

/**
 * Returns auth state + wallet in one call for convenience.
 */
export function useWalletAuth() {
    const auth = useAuth();
    const wallet = useWallet();
    return { ...auth, wallet };
}
