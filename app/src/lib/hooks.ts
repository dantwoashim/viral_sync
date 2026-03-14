/**
 * Viral Sync — React hooks for fetching on-chain data.
 * Each hook returns { data, loading, error } and polls every POLL_INTERVAL ms.
 * Falls back to mock data for demo when on-chain accounts aren't available.
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { PublicKey, ConfirmedSignatureInfo, GetProgramAccountsFilter } from '@solana/web3.js';
import {
    APP_MODE,
    getConnection,
    PROGRAM_ID,
    POLL_INTERVAL,
    MERCHANT_MINT,
    MERCHANT_PUBKEY,
    findMerchantConfigPda,
    findViralOraclePda,
    findMerchantReputationPda,
    findMerchantBondPda,
    findCommissionLedgerPda,
    findTokenGenerationPda,
    lamportsToSol,
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
    DataSource,
    NetworkNode,
    NetworkEdge,
} from './types';
import { GenSource } from './types';
import {
    MOCK_MERCHANT_CONFIG,
    MOCK_VIRAL_ORACLE,
    MOCK_MERCHANT_REPUTATION,
    MOCK_MERCHANT_BOND,
    MOCK_TRANSACTIONS,
    MOCK_NETWORK_NODES,
    MOCK_NETWORK_EDGES,
    MOCK_DISPUTE_RECORDS,
    MOCK_COMMISSION_LEDGER,
    MOCK_CONSUMER_LEDGER,
    MOCK_CONSUMER_TRANSACTIONS,
} from './mockData';
import { useAuth } from './auth';

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

async function fetchFirstProgramAccount<T>(
    filters: GetProgramAccountsFilter[],
    decoder: (data: Buffer) => T
): Promise<T | null> {
    try {
        const conn = getConnection();
        const accounts = await conn.getProgramAccounts(PROGRAM_ID, { filters });
        const account = accounts[0];
        if (!account) {
            return null;
        }
        return decoder(Buffer.from(account.account.data.slice(8)));
    } catch {
        return null;
    }
}

function createState<T>(
    data: T | null,
    loading: boolean,
    error: string | null,
    source: DataSource
): DataState<T> {
    return { data, loading, error, source };
}

function readError(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
}

const ALLOW_DEMO_DATA = APP_MODE === 'demo';

/* ── Generic Hook ── */

function useAccountData<T>(
    pdaFn: () => [PublicKey, number] | null,
    decoder: (data: Buffer) => T,
    pollInterval = POLL_INTERVAL
): DataState<T> {
    const [state, setState] = useState<DataState<T>>(createState<T>(null, true, null, 'empty'));

    // Derive a stable key from the PDA result for the useEffect dep
    const pdaResult = pdaFn();
    const pdaKey = pdaResult ? pdaResult[0].toBase58() : 'none';

    useEffect(() => {
        let mounted = true;

        const doFetch = async () => {
            try {
                if (!pdaResult) {
                    if (mounted) {
                        setState(createState<T>(null, false, null, 'empty'));
                    }
                    return;
                }
                const [pda] = pdaResult;
                const data = await fetchAccount<T>(pda, decoder);
                if (mounted) {
                    setState(createState(data, false, null, data ? 'live' : 'empty'));
                }
            } catch (e: unknown) {
                if (mounted) {
                    setState(createState<T>(null, false, readError(e), 'empty'));
                }
            }
        };

        doFetch();
        const interval = setInterval(doFetch, pollInterval);
        return () => {
            mounted = false;
            clearInterval(interval);
        };
        // pdaKey changes when the underlying PDA changes (e.g. different merchant)
    }, [decoder, pdaKey, pdaResult, pollInterval]);

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
function readBytes(buf: Buffer, offset: number, length: number): [Uint8Array, number] {
    return [buf.subarray(offset, offset + length), offset + length];
}

function readOptionFixedBytes32(buf: Buffer, offset: number): [Uint8Array | null, number] {
    const [flag, nextOffset] = readU8(buf, offset);
    if (flag === 0) {
        return [null, nextOffset];
    }

    const [value, endOffset] = readBytes(buf, nextOffset, 32);
    return [value, endOffset];
}

function decodeInboundEntry(buf: Buffer, offset: number): [TokenGeneration['inboundBuffer'][number], number] {
    let o = offset;
    const [referrer, o1] = readPubkey(buf, o); o = o1;
    const [amount, o2] = readU64(buf, o); o = o2;
    const [generationSourceByte, o3] = readU8(buf, o); o = o3;
    const [slot, o4] = readU64(buf, o); o = o4;
    const [processed, o5] = readBool(buf, o); o = o5;
    o += 7; // Rust padding

    const generationSourceMap: Record<number, GenSource> = {
        0: GenSource.DeadPass,
        1: GenSource.ViralShare,
        2: GenSource.Issuance,
    };

    return [{
        referrer,
        amount,
        generationSource: generationSourceMap[generationSourceByte as 0 | 1 | 2] ?? 'DeadPass',
        slot,
        processed,
    }, o];
}

function decodeReferrerSlot(buf: Buffer, offset: number): [TokenGeneration['referrerSlots'][number], number] {
    let o = offset;
    const [referrer, o1] = readPubkey(buf, o); o = o1;
    const [referralRecord, o2] = readPubkey(buf, o); o = o2;
    const [tokensAttributed, o3] = readU64(buf, o); o = o3;
    const [tokensRedeemedSoFar, o4] = readU64(buf, o); o = o4;
    const [isActive, o5] = readBool(buf, o); o = o5;

    return [{
        referrer,
        referralRecord,
        tokensAttributed,
        tokensRedeemedSoFar,
        isActive,
    }, o];
}

function decodeTokenGeneration(buf: Buffer): TokenGeneration {
    let o = 0;
    const [bump, o1] = readU8(buf, o); o = o1;
    const [version, o2] = readU8(buf, o); o = o2;
    const [mint, o3] = readPubkey(buf, o); o = o3;
    const [owner, o4] = readPubkey(buf, o); o = o4;
    const [gen1Balance, o5] = readU64(buf, o); o = o5;
    const [gen2Balance, o6] = readU64(buf, o); o = o6;
    const [deadBalance, o7] = readU64(buf, o); o = o7;
    const [totalLifetime, o8] = readU64(buf, o); o = o8;
    const [isIntermediary, o9] = readBool(buf, o); o = o9;
    const [originalSender, o10] = readPubkey(buf, o); o = o10;

    const inboundBuffer: TokenGeneration['inboundBuffer'] = [];
    for (let i = 0; i < 16; i += 1) {
        const [entry, nextOffset] = decodeInboundEntry(buf, o);
        inboundBuffer.push(entry);
        o = nextOffset;
    }

    const [bufferHead, o11] = readU8(buf, o); o = o11;
    const [bufferPending, o12] = readU8(buf, o); o = o12;

    const referrerSlots: TokenGeneration['referrerSlots'] = [];
    for (let i = 0; i < 4; i += 1) {
        const [slot, nextOffset] = decodeReferrerSlot(buf, o);
        referrerSlots.push(slot);
        o = nextOffset;
    }

    const [activeReferrerSlots, o13] = readU8(buf, o); o = o13;
    const [firstReceivedAt, o14] = readI64(buf, o); o = o14;
    const [lastReceivedAt, o15] = readI64(buf, o); o = o15;
    const [shareLimitDay, o16] = readU64(buf, o); o = o16;
    const [sharesToday, o17] = readU16(buf, o); o = o17;
    const [processingNonce, o18] = readU64(buf, o); o = o18;
    const [redemptionPending, o19] = readBool(buf, o); o = o19;
    const [redemptionSlot, o20] = readU64(buf, o); o = o20;
    const [redemptionGen2Consumed, o21] = readU64(buf, o); o = o21;

    const redemptionSlotConsumed: number[] = [];
    for (let i = 0; i < 4; i += 1) {
        const [value, nextOffset] = readU64(buf, o);
        redemptionSlotConsumed.push(value);
        o = nextOffset;
    }

    const [redemptionSlotsSettled, o22] = readU8(buf, o); o = o22;
    const [isTreasury, o23] = readBool(buf, o); o = o23;
    const [isDexPool, o24] = readBool(buf, o); o = o24;
    const [poiScore, o25] = readU32(buf, o); o = o25;
    const [poiUpdatedAt, o26] = readI64(buf, o); o = o26;
    const [identityCommitment, o27] = readOptionFixedBytes32(buf, o); o = o27;
    const [identityProvider, o28] = readU16(buf, o); o = o28;
    const redemptionRequiredMask = o < buf.length ? readU8(buf, o)[0] : 0;

    return {
        bump,
        version,
        mint,
        owner,
        gen1Balance,
        gen2Balance,
        deadBalance,
        totalLifetime,
        isIntermediary,
        originalSender,
        inboundBuffer,
        bufferHead,
        bufferPending,
        referrerSlots,
        activeReferrerSlots,
        firstReceivedAt,
        lastReceivedAt,
        shareLimitDay,
        sharesToday,
        processingNonce,
        redemptionPending,
        redemptionSlot,
        redemptionGen2Consumed,
        redemptionSlotConsumed,
        redemptionSlotsSettled,
        isTreasury,
        isDexPool,
        poiScore,
        poiUpdatedAt,
        identityCommitment,
        identityProvider,
        redemptionRequiredMask,
    };
}

function decodeReferralRecord(buf: Buffer) {
    let o = 0;
    const [bump, o1] = readU8(buf, o); o = o1;
    const [merchant, o2] = readPubkey(buf, o); o = o2;
    const [mint, o3] = readPubkey(buf, o); o = o3;
    const [referrer, o4] = readPubkey(buf, o); o = o4;
    const [referred, o5] = readPubkey(buf, o); o = o5;
    const [createdAt, o6] = readI64(buf, o); o = o6;
    const [expiresAt, o7] = readI64(buf, o); o = o7;
    const [committedCommissionBps, o8] = readU16(buf, o); o = o8;
    const [maxCommissionCap, o9] = readU64(buf, o); o = o9;
    const [commissionEarned, o10] = readU64(buf, o); o = o10;
    const [commissionSettled, o11] = readU64(buf, o); o = o11;
    const [isActive] = readBool(buf, o11);

    return {
        bump,
        merchant,
        mint,
        referrer,
        referred,
        createdAt,
        expiresAt,
        committedCommissionBps,
        maxCommissionCap,
        commissionEarned,
        commissionSettled,
        isActive,
    };
}

function stableNodePosition(address: string, count: number, index: number): Pick<NetworkNode, 'x' | 'y'> {
    const seed = Array.from(address.slice(0, 12)).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const angle = (2 * Math.PI * index) / Math.max(count, 1);
    const radius = 220 + (seed % 90);

    return {
        x: 400 + radius * Math.cos(angle),
        y: 300 + radius * Math.sin(angle),
    };
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
    const [closeWindowEndsAt] = readI64(buf, o);
    return {
        bump, merchant, mint, isActive, minHoldBeforeShareSecs,
        minTokensPerReferral, maxTokensPerReferral, maxReferralsPerWalletPerDay,
        allowSecondGenTransfer, slotsPerDay, tokenExpiryDays, commissionRateBps,
        transferFeeBps, firstIssuanceDone, currentSupply, tokensIssued,
        closeInitiatedAt, closeWindowEndsAt,
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

/* ── Exported Hooks (with mock data fallback) ── */

function useMockFallback<T>(state: DataState<T>, mockData: T): DataState<T> {
    if (!ALLOW_DEMO_DATA || state.source === 'live') {
        return state;
    }

    if (!state.loading && !state.data) {
        return createState(mockData, false, state.error, 'demo');
    }
    return state;
}

export function useMerchantConfig(merchant: PublicKey | null): DataState<MerchantConfig> {
    const effectiveMerchant = merchant ?? MERCHANT_PUBKEY;
    const [state, setState] = useState<DataState<MerchantConfig>>(createState<MerchantConfig>(null, true, null, 'empty'));
    const lookupKey = `${MERCHANT_MINT?.toBase58() ?? 'no-mint'}:${effectiveMerchant?.toBase58() ?? 'no-merchant'}`;

    useEffect(() => {
        let mounted = true;

        const doFetch = async () => {
            try {
                let data: MerchantConfig | null = null;
                if (MERCHANT_MINT) {
                    const [pda] = findMerchantConfigPda(MERCHANT_MINT);
                    data = await fetchAccount(pda, decodeMerchantConfig);
                }

                if (!data && effectiveMerchant) {
                    data = await fetchFirstProgramAccount<MerchantConfig>(
                        [{ memcmp: { offset: 9, bytes: effectiveMerchant.toBase58() } }],
                        decodeMerchantConfig
                    );
                }

                if (mounted) {
                    setState(createState(data, false, null, data ? 'live' : 'empty'));
                }
            } catch (error: unknown) {
                if (mounted) {
                    setState(createState<MerchantConfig>(null, false, readError(error), 'empty'));
                }
            }
        };

        void doFetch();
        const interval = setInterval(doFetch, POLL_INTERVAL);
        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, [lookupKey, effectiveMerchant]);

    return useMockFallback(state, MOCK_MERCHANT_CONFIG);
}

export function useViralOracle(merchant: PublicKey | null): DataState<ViralOracle> {
    const effectiveMerchant = merchant ?? MERCHANT_PUBKEY;
    const state = useAccountData(
        () => effectiveMerchant ? findViralOraclePda(effectiveMerchant) : null,
        decodeViralOracle
    );
    return useMockFallback(state, MOCK_VIRAL_ORACLE);
}

export function useMerchantReputation(merchant: PublicKey | null): DataState<MerchantReputation> {
    const effectiveMerchant = merchant ?? MERCHANT_PUBKEY;
    const state = useAccountData(
        () => effectiveMerchant ? findMerchantReputationPda(effectiveMerchant) : null,
        decodeMerchantReputation
    );
    return useMockFallback(state, MOCK_MERCHANT_REPUTATION);
}

export function useMerchantBond(merchant: PublicKey | null): DataState<MerchantBond> {
    const effectiveMerchant = merchant ?? MERCHANT_PUBKEY;
    const state = useAccountData(
        () => effectiveMerchant ? findMerchantBondPda(effectiveMerchant) : null,
        decodeMerchantBond
    );
    return useMockFallback(state, MOCK_MERCHANT_BOND);
}

export function useCommissionLedger(
    referrer: PublicKey | null,
    merchant: PublicKey | null
): DataState<CommissionLedger> {
    const { role } = useAuth();
    const effectiveMerchant = merchant ?? MERCHANT_PUBKEY;
    const state = useAccountData(
        () => (referrer && effectiveMerchant) ? findCommissionLedgerPda(referrer, effectiveMerchant) : null,
        decodeCommissionLedger
    );
    const fallback = role === 'consumer' ? MOCK_CONSUMER_LEDGER : MOCK_COMMISSION_LEDGER;
    return useMockFallback(state, fallback);
}

export function useTokenGeneration(
    mint: PublicKey | null,
    owner: PublicKey | null
): DataState<TokenGeneration> {
    return useAccountData(
        () => (mint && owner) ? findTokenGenerationPda(mint, owner) : null,
        decodeTokenGeneration
    );
}

/* ── Transaction History Hook ── */

export function useRecentTransactions(
    address: PublicKey | null,
    limit = 10
): DataState<ActivityItem[]> {
    const [state, setState] = useState<DataState<ActivityItem[]>>(createState<ActivityItem[]>(null, true, null, 'empty'));

    const { role } = useAuth();
    const mockTxs = role === 'consumer' ? MOCK_CONSUMER_TRANSACTIONS : MOCK_TRANSACTIONS;
    const immediateState = useMemo(() => {
        if (address) {
            return null;
        }
        return ALLOW_DEMO_DATA
            ? createState(mockTxs.slice(0, limit), false, null, 'demo')
            : createState([] as ActivityItem[], false, null, 'empty');
    }, [address, limit, mockTxs]);

    useEffect(() => {
        if (!address) {
            return;
        }
        let mounted = true;
        const doFetch = async () => {
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
                if (mounted) {
                    setState(createState(items, false, null, items.length > 0 ? 'live' : 'empty'));
                }
            } catch (error: unknown) {
                if (mounted) {
                    setState(ALLOW_DEMO_DATA
                        ? createState(mockTxs.slice(0, limit), false, readError(error), 'demo')
                        : createState([], false, readError(error), 'empty'));
                }
            }
        };
        void doFetch();
        const interval = setInterval(doFetch, POLL_INTERVAL);
        return () => { mounted = false; clearInterval(interval); };
    }, [address, limit, mockTxs]);

    return immediateState ?? state;
}

/* ── Dispute Records Hook (uses getProgramAccounts filter) ── */

export function useDisputeRecords(merchant: PublicKey | null): DataState<DisputeRecord[]> {
    const [state, setState] = useState<DataState<DisputeRecord[]>>(createState<DisputeRecord[]>(null, true, null, 'empty'));
    const effectiveMerchant = merchant ?? MERCHANT_PUBKEY;
    const immediateState = useMemo(() => {
        if (effectiveMerchant) {
            return null;
        }
        return ALLOW_DEMO_DATA
            ? createState(MOCK_DISPUTE_RECORDS, false, null, 'demo')
            : createState([] as DisputeRecord[], false, null, 'empty');
    }, [effectiveMerchant]);

    useEffect(() => {
        if (!effectiveMerchant) {
            return;
        }
        let mounted = true;
        const doFetch = async () => {
            try {
                const conn = getConnection();
                const accounts = await conn.getProgramAccounts(PROGRAM_ID, {
                    filters: [
                        { dataSize: 138 },
                        { memcmp: { offset: 9, bytes: effectiveMerchant.toBase58() } },
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
                if (mounted) {
                    setState(createState(disputes, false, null, disputes.length > 0 ? 'live' : 'empty'));
                }
            } catch (error: unknown) {
                if (mounted) {
                    setState(ALLOW_DEMO_DATA
                        ? createState(MOCK_DISPUTE_RECORDS, false, readError(error), 'demo')
                        : createState([], false, readError(error), 'empty'));
                }
            }
        };
        void doFetch();
        const interval = setInterval(doFetch, POLL_INTERVAL);
        return () => { mounted = false; clearInterval(interval); };
    }, [effectiveMerchant]);

    return immediateState ?? state;
}

/* ── Network Graph Hook (TokenGeneration accounts by mint) ── */

export function useNetworkGraph(mint: PublicKey | null): DataState<{ nodes: NetworkNode[]; edges: NetworkEdge[] }> {
    const [state, setState] = useState<DataState<{ nodes: NetworkNode[]; edges: NetworkEdge[] }>>(
        createState<{ nodes: NetworkNode[]; edges: NetworkEdge[] }>(null, true, null, 'empty')
    );

    const mockData = useMemo(
        () => ({ nodes: MOCK_NETWORK_NODES, edges: MOCK_NETWORK_EDGES }),
        []
    );
    const immediateState = useMemo(() => {
        if (mint) {
            return null;
        }
        return ALLOW_DEMO_DATA
            ? createState(mockData, false, null, 'demo')
            : createState({ nodes: [], edges: [] }, false, null, 'empty');
    }, [mint, mockData]);

    useEffect(() => {
        if (!mint) {
            return;
        }
        let mounted = true;
        const doFetch = async () => {
            try {
                const conn = getConnection();
                const [generationAccounts, referralAccounts] = await Promise.all([
                    conn.getProgramAccounts(PROGRAM_ID, {
                        filters: [
                            { dataSize: 1708 },
                            { memcmp: { offset: 10, bytes: mint.toBase58() } },
                        ],
                    }),
                    conn.getProgramAccounts(PROGRAM_ID, {
                        filters: [
                            { dataSize: 180 },
                            { memcmp: { offset: 41, bytes: mint.toBase58() } },
                        ],
                    }),
                ]);

                const generationRows = generationAccounts.flatMap(({ account }) => {
                    try {
                        return [decodeTokenGeneration(Buffer.from(account.data.slice(8)))];
                    } catch {
                        return [];
                    }
                });

                const referralRows = referralAccounts.flatMap(({ account }) => {
                    try {
                        return [decodeReferralRecord(Buffer.from(account.data.slice(8)))];
                    } catch {
                        return [];
                    }
                });

                const edgeMap = new Map<string, NetworkEdge>();
                referralRows.forEach((record) => {
                    if (!record.isActive) {
                        return;
                    }

                    const from = record.referrer.toBase58();
                    const to = record.referred.toBase58();
                    const key = `${from}:${to}`;
                    const existing = edgeMap.get(key);
                    if (existing) {
                        existing.tokensAttributed += record.maxCommissionCap;
                        return;
                    }

                    edgeMap.set(key, {
                        from,
                        to,
                        tokensAttributed: record.maxCommissionCap,
                    });
                });

                const refCountMap = new Map<string, number>();
                edgeMap.forEach((edge) => {
                    refCountMap.set(edge.from, (refCountMap.get(edge.from) ?? 0) + 1);
                });

                const nodes: NetworkNode[] = generationRows
                    .filter((row) => !row.isTreasury && !row.isIntermediary)
                    .sort((a, b) => a.owner.toBase58().localeCompare(b.owner.toBase58()))
                    .map((row, index, rows) => {
                        const address = row.owner.toBase58();
                        const position = stableNodePosition(address, rows.length, index);
                        return {
                            id: address,
                            address,
                            gen1Balance: row.gen1Balance,
                            gen2Balance: row.gen2Balance,
                            deadBalance: row.deadBalance,
                            totalLifetime: row.totalLifetime,
                            referrerCount: refCountMap.get(address) ?? 0,
                            poiScore: row.poiScore,
                            ...position,
                        };
                    });

                const nodeSet = new Set(nodes.map((node) => node.id));
                const edges = Array.from(edgeMap.values()).filter((edge) => (
                    nodeSet.has(edge.from) && nodeSet.has(edge.to)
                ));

                if (mounted) {
                    setState(createState({ nodes, edges }, false, null, nodes.length > 0 ? 'live' : 'empty'));
                }
            } catch (error: unknown) {
                if (mounted) {
                    setState(ALLOW_DEMO_DATA
                        ? createState(mockData, false, readError(error), 'demo')
                        : createState({ nodes: [], edges: [] }, false, readError(error), 'empty'));
                }
            }
        };
        void doFetch();
        const interval = setInterval(doFetch, 30_000);
        return () => { mounted = false; clearInterval(interval); };
    }, [mint, mockData]);

    return immediateState ?? state;
}

/* ── SOL Balance Hook ── */

export function useSolBalance(address: PublicKey | null): DataState<number> {
    const [state, setState] = useState<DataState<number>>(createState<number>(null, true, null, 'empty'));
    const immediateState = useMemo(
        () => address ? null : createState<number>(null, false, null, 'empty'),
        [address]
    );

    useEffect(() => {
        if (!address) {
            return;
        }
        let mounted = true;
        const fetch = async () => {
            try {
                const conn = getConnection();
                const lamports = await conn.getBalance(address);
                if (mounted) setState(createState(lamportsToSol(lamports), false, null, 'live'));
            } catch (e: unknown) {
                if (mounted) setState(createState<number>(null, false, readError(e), 'empty'));
            }
        };
        void fetch();
        const interval = setInterval(fetch, POLL_INTERVAL);
        return () => { mounted = false; clearInterval(interval); };
    }, [address]);

    return immediateState ?? state;
}
