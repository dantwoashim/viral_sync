/**
 * Viral Sync — React hooks for fetching on-chain data.
 * Each hook returns { data, loading, error } and polls every POLL_INTERVAL ms.
 * When accounts don't exist on-chain (no merchant deployed), data stays null.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { PublicKey, ConfirmedSignatureInfo } from '@solana/web3.js';
import {
    getConnection,
    PROGRAM_ID,
    POLL_INTERVAL,
    findMerchantConfigPda,
    findViralOraclePda,
    findMerchantReputationPda,
    findMerchantBondPda,
    findCommissionLedgerPda,
    findTokenGenerationPda,
    shortenAddress,
} from './solana';
import type {
    MerchantConfig,
    ViralOracle,
    MerchantReputation,
    MerchantBond,
    DisputeRecord,
    DisputeStatus,
    CommissionLedger,
    TokenGeneration,
    ActivityItem,
    DataState,
    NetworkNode,
    NetworkEdge,
} from './types';

/* ── Generic Account Fetcher ── */

/**
 * Low-level function to fetch and decode an Anchor account.
 * Uses the Anchor discriminator (first 8 bytes) and borsh deserialization.
 * Falls back gracefully if account doesn't exist.
 */
async function fetchAccount<T>(
    pda: PublicKey,
    decoder: (data: Buffer) => T
): Promise<T | null> {
    try {
        const conn = getConnection();
        const info = await conn.getAccountInfo(pda);
        if (!info || !info.data || info.data.length === 0) return null;
        // Skip 8-byte Anchor discriminator
        return decoder(Buffer.from(info.data.slice(8)));
    } catch {
        return null;
    }
}

/* ── Generic Hook ── */

function useAccountData<T>(
    pdaFn: () => [PublicKey, number] | null,
    decoder: (data: Buffer) => T,
    pollInterval = POLL_INTERVAL
): DataState<T> {
    const [state, setState] = useState<DataState<T>>({
        data: null,
        loading: true,
        error: null,
    });
    const mountedRef = useRef(true);

    // Store pdaFn and decoder in refs so they don't trigger re-renders
    // Callers pass inline arrow functions which are new on every render
    const pdaFnRef = useRef(pdaFn);
    const decoderRef = useRef(decoder);

    useEffect(() => {
        pdaFnRef.current = pdaFn;
        decoderRef.current = decoder;
    }, [pdaFn, decoder]);

    // Derive a stable key from the PDA result for the useEffect dep
    const pdaResult = pdaFn();
    const pdaKey = pdaResult ? pdaResult[0].toBase58() : 'none';

    useEffect(() => {
        mountedRef.current = true;

        const doFetch = async () => {
            try {
                const result = pdaFnRef.current();
                if (!result) {
                    if (mountedRef.current) setState({ data: null, loading: false, error: null });
                    return;
                }
                const [pda] = result;
                const data = await fetchAccount<T>(pda, decoderRef.current);
                if (mountedRef.current) setState({ data, loading: false, error: null });
            } catch (e: unknown) {
                if (mountedRef.current) setState({ data: null, loading: false, error: (e as Error).message });
            }
        };

        doFetch();
        const interval = setInterval(doFetch, pollInterval);
        return () => {
            mountedRef.current = false;
            clearInterval(interval);
        };
    }, [pdaKey, pollInterval]);

    return state;
}

/* ── Buffer Decoders (Borsh-compatible manual parsing) ── */
// These read the raw account data after the 8-byte discriminator.
// They match the field order in the Rust structs exactly.

function readU8(buf: Buffer, offset: number): [number, number] {
    return [buf.readUInt8(offset), offset + 1];
}
function readU16(buf: Buffer, offset: number): [number, number] {
    return [buf.readUInt16LE(offset), offset + 2];
}
function readU32(buf: Buffer, offset: number): [number, number] {
    return [buf.readUInt32LE(offset), offset + 4];
}
function readI64(buf: Buffer, offset: number): [number, number] {
    return [Number(buf.readBigInt64LE(offset)), offset + 8];
}
function readU64(buf: Buffer, offset: number): [number, number] {
    return [Number(buf.readBigUInt64LE(offset)), offset + 8];
}
function readBool(buf: Buffer, offset: number): [boolean, number] {
    return [buf.readUInt8(offset) !== 0, offset + 1];
}
function readPubkey(buf: Buffer, offset: number): [PublicKey, number] {
    return [new PublicKey(buf.slice(offset, offset + 32)), offset + 32];
}

function decodeMerchantConfig(buf: Buffer): MerchantConfig {
    let o = 0;
    const [bump, o1] = readU8(buf, o); o = o1;
    const [merchant, o2] = readPubkey(buf, o); o = o2;
    const [mint, o3] = readPubkey(buf, o); o = o3;
    const [isActive, o4] = readBool(buf, o); o = o4;
    const [minHoldBeforeShareSecs, o5] = readI64(buf, o); o = o5;
    const [minTokensPerReferral, o6] = readU64(buf, o); o = o6;
    const [maxTokensPerReferral, o7] = readU64(buf, o); o = o7;
    const [maxReferralsPerWalletPerDay, o8] = readU16(buf, o); o = o8;
    const [allowSecondGenTransfer, o9] = readBool(buf, o); o = o9;
    const [slotsPerDay, o10] = readU64(buf, o); o = o10;
    const [tokenExpiryDays, o11] = readU16(buf, o); o = o11;
    const [commissionRateBps, o12] = readU16(buf, o); o = o12;
    const [transferFeeBps, o13] = readU16(buf, o); o = o13;
    const [firstIssuanceDone, o14] = readBool(buf, o); o = o14;
    const [currentSupply, o15] = readU64(buf, o); o = o15;
    const [tokensIssued, o16] = readU64(buf, o); o = o16;
    const [closeInitiatedAt, o17] = readI64(buf, o); o = o17;
    const [closeWindowEndsAt, o18] = readI64(buf, o); o = o18;
    let oracleAuthority = merchant;
    if (buf.length >= o + 32) {
        const [authority] = readPubkey(buf, o);
        oracleAuthority = authority;
    }
    return {
        bump, merchant, mint, isActive, minHoldBeforeShareSecs,
        minTokensPerReferral, maxTokensPerReferral, maxReferralsPerWalletPerDay,
        allowSecondGenTransfer, slotsPerDay, tokenExpiryDays, commissionRateBps,
        transferFeeBps, firstIssuanceDone, currentSupply, tokensIssued,
        closeInitiatedAt, closeWindowEndsAt, oracleAuthority,
    };
}

function decodeViralOracle(buf: Buffer): ViralOracle {
    let o = 0;
    const [bump, o1] = readU8(buf, o); o = o1;
    const [merchant, o2] = readPubkey(buf, o); o = o2;
    const [mint, o3] = readPubkey(buf, o); o = o3;
    const [kFactor, o4] = readU64(buf, o); o = o4;
    const [medianReferralsPerUser, o5] = readU32(buf, o); o = o5;
    const [p90ReferralsPerUser, o6] = readU32(buf, o); o = o6;
    const [p10ReferralsPerUser, o7] = readU32(buf, o); o = o7;
    const [referralConcentrationIndex, o8] = readU32(buf, o); o = o8;
    const [shareRate, o9] = readU32(buf, o); o = o9;
    const [claimRate, o10] = readU32(buf, o); o = o10;
    const [firstRedeemRate, o11] = readU32(buf, o); o = o11;
    const [avgTimeShareToClaimSecs, o12] = readU32(buf, o); o = o12;
    const [avgTimeClaimToRedeemSecs, o13] = readU32(buf, o); o = o13;
    const [p50TimeShareToClaimSecs, o14] = readU32(buf, o); o = o14;
    const [commissionPerNewCustomerTokens, o15] = readU64(buf, o); o = o15;
    const [vsGoogleAdsEfficiencyBps, o16] = readU32(buf, o); o = o16;
    const [computedAt, o17] = readI64(buf, o); o = o17;
    const [dataPoints] = readU32(buf, o);
    return {
        bump, merchant, mint, kFactor, medianReferralsPerUser, p90ReferralsPerUser,
        p10ReferralsPerUser, referralConcentrationIndex, shareRate, claimRate,
        firstRedeemRate, avgTimeShareToClaimSecs, avgTimeClaimToRedeemSecs,
        p50TimeShareToClaimSecs, commissionPerNewCustomerTokens,
        vsGoogleAdsEfficiencyBps, computedAt, dataPoints,
    };
}

function decodeMerchantReputation(buf: Buffer): MerchantReputation {
    let o = 0;
    const [bump, o1] = readU8(buf, o); o = o1;
    const [merchant, o2] = readPubkey(buf, o); o = o2;
    const [reputationScore, o3] = readU32(buf, o); o = o3;
    const [timeoutDisputes, o4] = readU32(buf, o); o = o4;
    const [pctRedeemersAgedOver30Days, o5] = readU16(buf, o); o = o5;
    const [uniqueAttestationServersUsed, o6] = readU8(buf, o); o = o6;
    const [commissionConcentrationBps, o7] = readU16(buf, o); o = o7;
    const [pctRedemptionsInBusinessHours, o8] = readU16(buf, o); o = o8;
    const [avgPoiScoreTopReferrers, o9] = readU32(buf, o); o = o9;
    const [suspicionScore, o10] = readU32(buf, o); o = o10;
    const [suspicionComputedAt] = readI64(buf, o);
    return {
        bump, merchant, reputationScore, timeoutDisputes, pctRedeemersAgedOver30Days,
        uniqueAttestationServersUsed, commissionConcentrationBps,
        pctRedemptionsInBusinessHours, avgPoiScoreTopReferrers,
        suspicionScore, suspicionComputedAt,
    };
}

function decodeMerchantBond(buf: Buffer): MerchantBond {
    let o = 0;
    const [bump, o1] = readU8(buf, o); o = o1;
    const [merchant, o2] = readPubkey(buf, o); o = o2;
    const [bondedLamports, o3] = readU64(buf, o); o = o3;
    const [minRequiredLamports, o4] = readU64(buf, o); o = o4;
    const [isLocked, o5] = readBool(buf, o); o = o5;
    const [unlockRequestedAt] = readI64(buf, o);
    return { bump, merchant, bondedLamports, minRequiredLamports, isLocked, unlockRequestedAt };
}

function decodeCommissionLedger(buf: Buffer): CommissionLedger {
    let o = 0;
    const [bump, o1] = readU8(buf, o); o = o1;
    const [referrer, o2] = readPubkey(buf, o); o = o2;
    const [merchant, o3] = readPubkey(buf, o); o = o3;
    const [mint, o4] = readPubkey(buf, o); o = o4;
    const [claimable, o5] = readU64(buf, o); o = o5;
    const [dustTenthsAccumulated, o6] = readU32(buf, o); o = o6;
    const [frozen, o7] = readBool(buf, o); o = o7;
    const [frozenAmount, o8] = readU64(buf, o); o = o8;
    const [totalEarned, o9] = readU64(buf, o); o = o9;
    const [totalClaimed, o10] = readU64(buf, o); o = o10;
    const [totalRedemptionsDriven, o11] = readU64(buf, o); o = o11;
    const [highestSingleCommission] = readU64(buf, o);
    return {
        bump, referrer, merchant, mint, claimable, dustTenthsAccumulated,
        frozen, frozenAmount, totalEarned, totalClaimed,
        totalRedemptionsDriven, highestSingleCommission,
    };
}

/* ── Exported Hooks ── */

export function useMerchantConfig(mint: PublicKey | null): DataState<MerchantConfig> {
    return useAccountData(
        () => mint ? findMerchantConfigPda(mint) : null,
        decodeMerchantConfig
    );
}

export function useViralOracle(merchant: PublicKey | null): DataState<ViralOracle> {
    return useAccountData(
        () => merchant ? findViralOraclePda(merchant) : null,
        decodeViralOracle
    );
}

export function useMerchantReputation(merchant: PublicKey | null): DataState<MerchantReputation> {
    return useAccountData(
        () => merchant ? findMerchantReputationPda(merchant) : null,
        decodeMerchantReputation
    );
}

export function useMerchantBond(merchant: PublicKey | null): DataState<MerchantBond> {
    return useAccountData(
        () => merchant ? findMerchantBondPda(merchant) : null,
        decodeMerchantBond
    );
}

export function useCommissionLedger(
    referrer: PublicKey | null,
    merchant: PublicKey | null
): DataState<CommissionLedger> {
    return useAccountData(
        () => (referrer && merchant) ? findCommissionLedgerPda(referrer, merchant) : null,
        decodeCommissionLedger
    );
}

export function useTokenGeneration(
    mint: PublicKey | null,
    owner: PublicKey | null
): DataState<TokenGeneration> {
    // TokenGeneration decoding is complex due to arrays; simplified for key fields
    return useAccountData(
        () => (mint && owner) ? findTokenGenerationPda(mint, owner) : null,
        (buf) => {
            let o = 0;
            const [bump, o1] = readU8(buf, o); o = o1;
            const [version, o2] = readU8(buf, o); o = o2;
            const [mintPk, o3] = readPubkey(buf, o); o = o3;
            const [owner, o4] = readPubkey(buf, o); o = o4;
            const [gen1Balance, o5] = readU64(buf, o); o = o5;
            const [gen2Balance, o6] = readU64(buf, o); o = o6;
            const [deadBalance, o7] = readU64(buf, o); o = o7;
            const [totalLifetime, o8] = readU64(buf, o); o = o8;
            // Skip complex nested fields for now, return core balances
            return {
                bump, version, mint: mintPk, owner,
                gen1Balance, gen2Balance, deadBalance, totalLifetime,
                isIntermediary: false, originalSender: PublicKey.default,
                inboundBuffer: [], bufferHead: 0, bufferPending: 0,
                referrerSlots: [], activeReferrerSlots: 0,
                firstReceivedAt: 0, lastReceivedAt: 0,
                shareLimitDay: 0, sharesToday: 0,
                processingNonce: 0, redemptionPending: false, redemptionSlot: 0,
                isTreasury: false, isDexPool: false,
                poiScore: 0, poiUpdatedAt: 0,
            } as TokenGeneration;
        }
    );
}

/* ── Transaction History Hook ── */

export function useRecentTransactions(
    address: PublicKey | null,
    limit = 10
): DataState<ActivityItem[]> {
    const [state, setState] = useState<DataState<ActivityItem[]>>({
        data: null, loading: true, error: null,
    });

    useEffect(() => {
        if (!address) {
            return;
        }
        let mounted = true;
        const fetch = async () => {
            try {
                const conn = getConnection();
                const sigs = await conn.getSignaturesForAddress(address, { limit });
                const items: ActivityItem[] = sigs.map((sig: ConfirmedSignatureInfo) => ({
                    signature: sig.signature,
                    slot: sig.slot,
                    timestamp: sig.blockTime ?? null,
                    type: 'unknown' as const,
                    description: `Transaction ${shortenAddress(sig.signature, 6)}`,
                    success: sig.err === null,
                }));
                if (mounted) setState({ data: items, loading: false, error: null });
            } catch (e: unknown) {
                if (mounted) setState({ data: null, loading: false, error: (e as Error).message });
            }
        };
        fetch();
        const interval = setInterval(fetch, POLL_INTERVAL);
        return () => { mounted = false; clearInterval(interval); };
    }, [address, limit]);

    if (!address) {
        return { data: null, loading: false, error: null };
    }

    return state;
}

/* ── Dispute Records Hook (uses getProgramAccounts filter) ── */

export function useDisputeRecords(merchant: PublicKey | null): DataState<DisputeRecord[]> {
    const [state, setState] = useState<DataState<DisputeRecord[]>>({
        data: null, loading: true, error: null,
    });

    useEffect(() => {
        if (!merchant) {
            return;
        }
        let mounted = true;
        const fetch = async () => {
            try {
                const conn = getConnection();
                // Filter by merchant pubkey at offset 9 (after 8-byte discriminator + 1 bump)
                const accounts = await conn.getProgramAccounts(PROGRAM_ID, {
                    filters: [
                        { dataSize: 138 }, // Approximate size of DisputeRecord
                        { memcmp: { offset: 9, bytes: merchant.toBase58() } },
                    ],
                });
                const disputes: DisputeRecord[] = accounts.map(({ account }) => {
                    const buf = Buffer.from(account.data.slice(8));
                    let o = 0;
                    const [bump, o1] = readU8(buf, o); o = o1;
                    const [merchPk, o2] = readPubkey(buf, o); o = o2;
                    const [referral, o3] = readPubkey(buf, o); o = o3;
                    const [watchdog, o4] = readPubkey(buf, o); o = o4;
                    const [statusByte, o5] = readU8(buf, o); o = o5;
                    const statusMap: Record<number, DisputeStatus> = {
                        0: 'Pending' as DisputeStatus,
                        1: 'Dismissed' as DisputeStatus,
                        2: 'UpheldByTimeout' as DisputeStatus,
                        3: 'UpheldByVote' as DisputeStatus,
                    };
                    const [stakeLamports, o6] = readU64(buf, o); o = o6;
                    const [raisedAt, o7] = readI64(buf, o); o = o7;
                    const [hasResolved, o8] = readBool(buf, o); o = o8;
                    const resolvedAt = hasResolved ? readI64(buf, o)[0] : null;
                    return {
                        bump, merchant: merchPk, referral, watchdog,
                        status: statusMap[statusByte] || ('Pending' as DisputeStatus),
                        stakeLamports, raisedAt, resolvedAt,
                    };
                });
                if (mounted) setState({ data: disputes, loading: false, error: null });
            } catch (e: unknown) {
                if (mounted) setState({ data: null, loading: false, error: (e as Error).message });
            }
        };
        fetch();
        const interval = setInterval(fetch, POLL_INTERVAL);
        return () => { mounted = false; clearInterval(interval); };
    }, [merchant]);

    if (!merchant) {
        return { data: null, loading: false, error: null };
    }

    return state;
}

/* ── Network Graph Hook (TokenGeneration accounts by mint) ── */

export function useNetworkGraph(mint: PublicKey | null): DataState<{ nodes: NetworkNode[]; edges: NetworkEdge[] }> {
    const [state, setState] = useState<DataState<{ nodes: NetworkNode[]; edges: NetworkEdge[] }>>({
        data: null, loading: true, error: null,
    });

    useEffect(() => {
        if (!mint) {
            return;
        }
        let mounted = true;
        const fetch = async () => {
            try {
                const conn = getConnection();
                // Fetch all TokenGeneration accounts for this mint
                // Filter by mint pubkey at offset 10 (8 discriminator + 1 bump + 1 version)
                const accounts = await conn.getProgramAccounts(PROGRAM_ID, {
                    filters: [
                        { memcmp: { offset: 10, bytes: mint.toBase58() } },
                    ],
                });

                const nodes: NetworkNode[] = [];
                const edges: NetworkEdge[] = [];

                accounts.forEach(({ account }, i) => {
                    const buf = Buffer.from(account.data.slice(8));
                    let o = 0;
                    const [, o1] = readU8(buf, o); o = o1; // bump
                    const [, o2] = readU8(buf, o); o = o2; // version
                    const [, o3] = readPubkey(buf, o); o = o3; // mint
                    const [owner, o4] = readPubkey(buf, o); o = o4;
                    const [gen1Balance, o5] = readU64(buf, o); o = o5;
                    const [gen2Balance, o6] = readU64(buf, o); o = o6;
                    const [deadBalance, o7] = readU64(buf, o); o = o7;
                    const [totalLifetime] = readU64(buf, o);

                    const addr = owner.toBase58();
                    const angle = (2 * Math.PI * i) / Math.max(accounts.length, 1);
                    const radius = 200 + Math.random() * 100;

                    nodes.push({
                        id: addr,
                        address: addr,
                        gen1Balance, gen2Balance, deadBalance, totalLifetime,
                        referrerCount: 0, // Would need deeper parsing
                        poiScore: 0,
                        x: 400 + radius * Math.cos(angle),
                        y: 300 + radius * Math.sin(angle),
                    });
                });

                if (mounted) setState({ data: { nodes, edges }, loading: false, error: null });
            } catch (e: unknown) {
                if (mounted) setState({ data: null, loading: false, error: (e as Error).message });
            }
        };
        fetch();
        const interval = setInterval(fetch, 30_000); // Less frequent for heavy call
        return () => { mounted = false; clearInterval(interval); };
    }, [mint]);

    if (!mint) {
        return { data: null, loading: false, error: null };
    }

    return state;
}

/* ── SOL Balance Hook ── */

export function useSolBalance(address: PublicKey | null): DataState<number> {
    const [state, setState] = useState<DataState<number>>({
        data: null, loading: true, error: null,
    });

    useEffect(() => {
        if (!address) {
            return;
        }
        let mounted = true;
        const fetch = async () => {
            try {
                const conn = getConnection();
                const balance = await conn.getBalance(address);
                if (mounted) setState({ data: balance, loading: false, error: null });
            } catch (e: unknown) {
                if (mounted) setState({ data: null, loading: false, error: (e as Error).message });
            }
        };
        fetch();
        const interval = setInterval(fetch, POLL_INTERVAL);
        return () => { mounted = false; clearInterval(interval); };
    }, [address]);

    if (!address) {
        return { data: null, loading: false, error: null };
    }

    return state;
}
