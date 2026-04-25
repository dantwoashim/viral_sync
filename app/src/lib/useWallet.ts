/**
 * Viral Sync — useWallet Hook
 * Single source of truth for the current wallet address.
 * Reads from AuthProvider (connected user) → falls back to env → null.
 * 
 * Usage: replace `MERCHANT_PUBKEY` with `useWallet()` in any page.
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
 * Priority: Auth connected wallet → env MERCHANT_PUBKEY → null
 */
export function useWallet(): PublicKey | null {
    const { walletAddress } = useAuth();
    return useMemo(() => walletAddress ?? _envPubkey, [walletAddress]);
}

/**
 * Returns auth state + wallet in one call for convenience.
 */
export function useWalletAuth() {
    const auth = useAuth();
    const wallet = useWallet();
    return { ...auth, wallet };
}
