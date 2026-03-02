/**
 * Viral Sync — TypeScript types mirroring on-chain state accounts.
 * Every interface exactly matches the Rust structs in programs/viral_sync/src/state/
 */

import { PublicKey } from '@solana/web3.js';

/* ── Enums ── */

export enum DisputeStatus {
    Pending = 'Pending',
    Dismissed = 'Dismissed',
    UpheldByTimeout = 'UpheldByTimeout',
    UpheldByVote = 'UpheldByVote',
}

export enum GenSource {
    DeadPass = 'DeadPass',
    ViralShare = 'ViralShare',
    Issuance = 'Issuance',
}

/* ── On-Chain Account Types ── */

export interface MerchantConfig {
    bump: number;
    merchant: PublicKey;
    mint: PublicKey;
    isActive: boolean;
    minHoldBeforeShareSecs: number;
    minTokensPerReferral: number;
    maxTokensPerReferral: number;
    maxReferralsPerWalletPerDay: number;
    allowSecondGenTransfer: boolean;
    slotsPerDay: number;
    tokenExpiryDays: number;
    commissionRateBps: number;
    transferFeeBps: number;
    firstIssuanceDone: boolean;
    currentSupply: number;
    tokensIssued: number;
    closeInitiatedAt: number;
    closeWindowEndsAt: number;
}

export interface ViralOracle {
    bump: number;
    merchant: PublicKey;
    mint: PublicKey;
    kFactor: number;
    medianReferralsPerUser: number;
    p90ReferralsPerUser: number;
    p10ReferralsPerUser: number;
    referralConcentrationIndex: number;
    shareRate: number;
    claimRate: number;
    firstRedeemRate: number;
    avgTimeShareToClaimSecs: number;
    avgTimeClaimToRedeemSecs: number;
    p50TimeShareToClaimSecs: number;
    commissionPerNewCustomerTokens: number;
    vsGoogleAdsEfficiencyBps: number;
    computedAt: number;
    dataPoints: number;
}

export interface MerchantReputation {
    bump: number;
    merchant: PublicKey;
    reputationScore: number;
    timeoutDisputes: number;
    pctRedeemersAgedOver30Days: number;
    uniqueAttestationServersUsed: number;
    commissionConcentrationBps: number;
    pctRedemptionsInBusinessHours: number;
    avgPoiScoreTopReferrers: number;
    suspicionScore: number;
    suspicionComputedAt: number;
}

export interface MerchantBond {
    bump: number;
    merchant: PublicKey;
    bondedLamports: number;
    minRequiredLamports: number;
    isLocked: boolean;
    unlockRequestedAt: number;
}

export interface DisputeRecord {
    bump: number;
    merchant: PublicKey;
    referral: PublicKey;
    watchdog: PublicKey;
    status: DisputeStatus;
    stakeLamports: number;
    raisedAt: number;
    resolvedAt: number | null;
}

export interface CommissionLedger {
    bump: number;
    referrer: PublicKey;
    merchant: PublicKey;
    mint: PublicKey;
    claimable: number;
    dustTenthsAccumulated: number;
    frozen: boolean;
    frozenAmount: number;
    totalEarned: number;
    totalClaimed: number;
    totalRedemptionsDriven: number;
    highestSingleCommission: number;
}

export interface InboundEntry {
    referrer: PublicKey;
    amount: number;
    generationSource: GenSource;
    slot: number;
    processed: boolean;
}

export interface ReferrerSlot {
    referrer: PublicKey;
    referralRecord: PublicKey;
    tokensAttributed: number;
    tokensRedeemedSoFar: number;
    isActive: boolean;
}

export interface TokenGeneration {
    bump: number;
    version: number;
    mint: PublicKey;
    owner: PublicKey;
    gen1Balance: number;
    gen2Balance: number;
    deadBalance: number;
    totalLifetime: number;
    isIntermediary: boolean;
    originalSender: PublicKey;
    inboundBuffer: InboundEntry[];
    bufferHead: number;
    bufferPending: number;
    referrerSlots: ReferrerSlot[];
    activeReferrerSlots: number;
    firstReceivedAt: number;
    lastReceivedAt: number;
    shareLimitDay: number;
    sharesToday: number;
    processingNonce: number;
    redemptionPending: boolean;
    redemptionSlot: number;
    isTreasury: boolean;
    isDexPool: boolean;
    poiScore: number;
    poiUpdatedAt: number;
}

export interface VaultEntry {
    bump: number;
    vault: PublicKey;
    merchant: PublicKey;
    isActive: boolean;
    isDex: boolean;
}

export interface GeoFence {
    bump: number;
    vault: PublicKey;
    merchant: PublicKey;
    latMicro: number;
    lngMicro: number;
    radiusMeters: number;
    isActive: boolean;
    attestationServerCount: number;
    attestationServers: PublicKey[];
    allowNonGeoRedemption: boolean;
    nonGeoCommissionPenaltyBps: number;
}

/* ── UI-Derived Types ── */

export interface ActivityItem {
    signature: string;
    slot: number;
    timestamp: number | null;
    type: 'commission' | 'redemption' | 'share' | 'dispute' | 'unknown';
    description: string;
    amount?: number;
    success: boolean;
}

export interface NetworkNode {
    id: string;
    address: string;
    gen1Balance: number;
    gen2Balance: number;
    deadBalance: number;
    totalLifetime: number;
    referrerCount: number;
    poiScore: number;
    x: number;
    y: number;
}

export interface NetworkEdge {
    from: string;
    to: string;
    tokensAttributed: number;
}

/** Hook return type with loading/error states */
export interface DataState<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
}
