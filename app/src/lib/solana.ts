/**
 * Viral Sync — Solana connection, program constants, and PDA derivation helpers.
 * Mirrors the on-chain seed patterns from programs/viral_sync/src/
 */

import { Connection, PublicKey } from '@solana/web3.js';

/* ── Constants ── */

export const RPC_URL =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

export const PROGRAM_ID = new PublicKey(
    process.env.NEXT_PUBLIC_PROGRAM_ID || 'D9ds2V6y4GFGKbo8wF8qQiF81dzhkiznmZsHepcSN6Ta'
);

export const MERCHANT_PUBKEY = process.env.NEXT_PUBLIC_MERCHANT_PUBKEY
    ? new PublicKey(process.env.NEXT_PUBLIC_MERCHANT_PUBKEY)
    : null;

/** Polling interval for hooks (ms) */
export const POLL_INTERVAL = 10_000;

/* ── Connection (singleton) ── */

let _connection: Connection | null = null;

export function getConnection(): Connection {
    if (!_connection) {
        _connection = new Connection(RPC_URL, 'confirmed');
    }
    return _connection;
}

/* ── PDA Derivation ── */

/**
 * Derive MerchantConfig PDA.
 * Seeds: "merchant_config", merchant.key()
 */
export function findMerchantConfigPda(merchant: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('merchant_config'), merchant.toBuffer()],
        PROGRAM_ID
    );
}

/**
 * Derive ViralOracle PDA.
 * Seeds: "viral_oracle", merchant.key()
 */
export function findViralOraclePda(merchant: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('viral_oracle'), merchant.toBuffer()],
        PROGRAM_ID
    );
}

/**
 * Derive MerchantReputation PDA.
 * Seeds: "merchant_reputation", merchant.key()
 */
export function findMerchantReputationPda(merchant: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('merchant_reputation'), merchant.toBuffer()],
        PROGRAM_ID
    );
}

/**
 * Derive MerchantBond PDA.
 * Seeds: "merchant_bond", merchant.key()
 */
export function findMerchantBondPda(merchant: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('merchant_bond'), merchant.toBuffer()],
        PROGRAM_ID
    );
}

/**
 * Derive TokenGeneration PDA.
 * Seeds: "gen_v4", mint.key(), owner.key()
 */
export function findTokenGenerationPda(mint: PublicKey, owner: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('gen_v4'), mint.toBuffer(), owner.toBuffer()],
        PROGRAM_ID
    );
}

/**
 * Derive CommissionLedger PDA.
 * Seeds: "commission_ledger", referrer.key(), merchant.key()
 */
export function findCommissionLedgerPda(referrer: PublicKey, merchant: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('commission_ledger'), referrer.toBuffer(), merchant.toBuffer()],
        PROGRAM_ID
    );
}

/**
 * Derive DisputeRecord PDA.
 * Seeds: "dispute", merchant.key(), referral.key()
 */
export function findDisputeRecordPda(merchant: PublicKey, referral: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('dispute'), merchant.toBuffer(), referral.toBuffer()],
        PROGRAM_ID
    );
}

/**
 * Derive VaultEntry PDA.
 * Seeds: "vault", merchant.key(), vault.key()
 */
export function findVaultEntryPda(merchant: PublicKey, vault: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), merchant.toBuffer(), vault.toBuffer()],
        PROGRAM_ID
    );
}

/**
 * Derive GeoFence PDA.
 * Seeds: "geofence", vault.key()
 */
export function findGeoFencePda(vault: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('geofence'), vault.toBuffer()],
        PROGRAM_ID
    );
}

/* ── Utilities ── */

/** Shorten a pubkey for display: "7xKX...AsU" */
export function shortenAddress(address: string, chars = 4): string {
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/** Convert lamports to SOL */
export function lamportsToSol(lamports: number): number {
    return lamports / 1_000_000_000;
}

/** Convert fixed-point × 10000 to percentage */
export function bpsToPercent(bps: number): number {
    return bps / 100;
}

/** Convert fixed-point × 10000 to decimal */
export function fixedToDecimal(value: number, scale = 10000): number {
    return value / scale;
}

/** Format token amount (assumes 9 decimals for Token-2022) */
export function formatTokenAmount(amount: number, decimals = 9): string {
    const value = amount / Math.pow(10, decimals);
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toFixed(2);
}

/** Get Solana explorer URL */
export function explorerUrl(address: string, type: 'address' | 'tx' = 'address'): string {
    const cluster = RPC_URL.includes('devnet') ? '?cluster=devnet'
        : RPC_URL.includes('mainnet') ? '' : '?cluster=custom&customUrl=' + encodeURIComponent(RPC_URL);
    return `https://explorer.solana.com/${type}/${address}${cluster}`;
}
