/**
 * Viral Sync Solana connection, program constants, and PDA helpers.
 * Shared runtime units and display normalization come from the workspace
 * package so app, relayer, and tests stay aligned.
 */

import { Connection, PublicKey } from '@solana/web3.js';
import {
    type DataMode,
    BPS_DENOMINATOR,
    DEFAULT_SUPPORT_LINKS,
    LAMPORTS_PER_SOL,
    formatLamportsAsSol as sharedFormatLamportsAsSol,
    lamportsToSolValue,
    normalizeReputationScore as sharedNormalizeReputationScore,
} from '@viral-sync/shared';

export const RPC_URL =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

export const APP_MODE: DataMode =
    process.env.NEXT_PUBLIC_APP_MODE === 'demo' ? 'demo' : 'live';

export const DEMO_MODE_ENABLED =
    APP_MODE === 'demo' || process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === 'true';

export const PROGRAM_ID = new PublicKey(
    process.env.NEXT_PUBLIC_PROGRAM_ID || 'D9ds2V6y4GFGKbo8wF8qQiF81dzhkiznmZsHepcSN6Ta'
);

export const MERCHANT_PUBKEY = process.env.NEXT_PUBLIC_MERCHANT_PUBKEY
    ? new PublicKey(process.env.NEXT_PUBLIC_MERCHANT_PUBKEY)
    : null;

export const MERCHANT_MINT = process.env.NEXT_PUBLIC_MERCHANT_MINT
    ? new PublicKey(process.env.NEXT_PUBLIC_MERCHANT_MINT)
    : null;

export const SUPPORT_LINKS = {
    repository: process.env.NEXT_PUBLIC_SUPPORT_REPOSITORY_URL || DEFAULT_SUPPORT_LINKS.repository,
    docs: process.env.NEXT_PUBLIC_SUPPORT_DOCS_URL || DEFAULT_SUPPORT_LINKS.docs,
} as const;

export const POLL_INTERVAL = 10_000;

let connection: Connection | null = null;

export function getConnection(): Connection {
    if (!connection) {
        connection = new Connection(RPC_URL, 'confirmed');
    }
    return connection;
}

export function findMerchantConfigPda(mint: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('merchant_v4'), mint.toBuffer()],
        PROGRAM_ID
    );
}

export function findViralOraclePda(merchant: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('viral_oracle'), merchant.toBuffer()],
        PROGRAM_ID
    );
}

export function findMerchantReputationPda(merchant: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('merchant_reputation'), merchant.toBuffer()],
        PROGRAM_ID
    );
}

export function findMerchantBondPda(merchant: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('merchant_bond'), merchant.toBuffer()],
        PROGRAM_ID
    );
}

export function findTokenGenerationPda(mint: PublicKey, owner: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('gen_v4'), mint.toBuffer(), owner.toBuffer()],
        PROGRAM_ID
    );
}

export function findCommissionLedgerPda(referrer: PublicKey, merchant: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('commission_ledger'), referrer.toBuffer(), merchant.toBuffer()],
        PROGRAM_ID
    );
}

export function findDisputeRecordPda(merchant: PublicKey, referral: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('dispute'), merchant.toBuffer(), referral.toBuffer()],
        PROGRAM_ID
    );
}

export function findVaultEntryPda(mint: PublicKey, vault: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('vault_entry'), mint.toBuffer(), vault.toBuffer()],
        PROGRAM_ID
    );
}

export function findGeoFencePda(mint: PublicKey, vault: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('geo_fence'), mint.toBuffer(), vault.toBuffer()],
        PROGRAM_ID
    );
}

export function findGeoNoncePda(
    fence: PublicKey,
    redeemer: PublicKey
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('geo_nonce'), fence.toBuffer(), redeemer.toBuffer()],
        PROGRAM_ID
    );
}

export function shortenAddress(address: string, chars = 4): string {
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function lamportsToSol(lamports: number): number {
    return lamports / LAMPORTS_PER_SOL;
}

export function formatSolAmount(lamports: number | bigint, fractionDigits = 4): string {
    return sharedFormatLamportsAsSol(lamports, fractionDigits);
}

export function normalizeReputationScore(score: number): number {
    return sharedNormalizeReputationScore(score);
}

export function normalizeRiskScore(score: number): number {
    return sharedNormalizeReputationScore(score);
}

export function bpsToPercent(bps: number, fractionDigits = 2): string {
    return `${(bps / BPS_DENOMINATOR * 100).toFixed(fractionDigits).replace(/\.00$/, '')}`;
}

export function fixedToDecimal(value: number, scale = 10_000): number {
    return value / scale;
}

export function formatTokenAmount(amount: number, decimals = 9): string {
    const value = amount / Math.pow(10, decimals);
    if (value >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
        return `${(value / 1_000).toFixed(1)}K`;
    }
    return value.toFixed(2);
}

export function formatSolValue(sol: number, fractionDigits = 4): string {
    return `${sol.toFixed(fractionDigits)} SOL`;
}

export function explorerUrl(address: string, type: 'address' | 'tx' = 'address'): string {
    const cluster = RPC_URL.includes('devnet')
        ? '?cluster=devnet'
        : RPC_URL.includes('mainnet')
            ? ''
            : `?cluster=custom&customUrl=${encodeURIComponent(RPC_URL)}`;
    return `https://explorer.solana.com/${type}/${address}${cluster}`;
}

export { lamportsToSolValue };
