/**
 * Viral Sync — Mock Data for Demo
 * Realistic data for all hooks when on-chain accounts aren't available.
 */

import { PublicKey } from '@solana/web3.js';
import type {
    MerchantConfig,
    ViralOracle,
    MerchantReputation,
    MerchantBond,
    ActivityItem,
    NetworkNode,
    NetworkEdge,
    DisputeRecord,
    CommissionLedger,
    DisputeStatus,
} from './types';

const MOCK_MERCHANT = new PublicKey('8xHy7k3FnE2mPqVcASWJqd3cT9nGRj5x5Bn4V3LFUGL');
const MOCK_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

/* ── Merchant Config ── */
export const MOCK_MERCHANT_CONFIG: MerchantConfig = {
    bump: 255,
    merchant: MOCK_MERCHANT,
    mint: MOCK_MINT,
    isActive: true,
    minHoldBeforeShareSecs: 3600,
    minTokensPerReferral: 10_000_000_000,      // 10 tokens
    maxTokensPerReferral: 1_000_000_000_000,    // 1,000 tokens
    maxReferralsPerWalletPerDay: 20,
    allowSecondGenTransfer: true,
    slotsPerDay: 216000,
    tokenExpiryDays: 30,
    commissionRateBps: 500,                      // 5%
    transferFeeBps: 50,                          // 0.5%
    firstIssuanceDone: true,
    currentSupply: 2_450_000_000_000_000,        // 2.45M tokens
    tokensIssued: 5_000_000_000_000_000,         // 5M tokens
    closeInitiatedAt: 0,
    closeWindowEndsAt: 0,
};

/* ── Viral Oracle ── */
export const MOCK_VIRAL_ORACLE: ViralOracle = {
    bump: 254,
    merchant: MOCK_MERCHANT,
    mint: MOCK_MINT,
    kFactor: 147,                                // 1.47 — viral!
    medianReferralsPerUser: 3,
    p90ReferralsPerUser: 8,
    p10ReferralsPerUser: 1,
    referralConcentrationIndex: 3200,
    shareRate: 72,                               // 72%
    claimRate: 54,                               // 54%
    firstRedeemRate: 31,                         // 31%
    avgTimeShareToClaimSecs: 14400,              // 4 hours
    avgTimeClaimToRedeemSecs: 86400,             // 24 hours
    p50TimeShareToClaimSecs: 10800,              // 3 hours
    commissionPerNewCustomerTokens: 50_000_000_000, // 50 tokens
    vsGoogleAdsEfficiencyBps: 34200,             // 342% more efficient
    computedAt: Math.floor(Date.now() / 1000) - 1800,
    dataPoints: 1247,
};

/* ── Merchant Reputation ── */
export const MOCK_MERCHANT_REPUTATION: MerchantReputation = {
    bump: 253,
    merchant: MOCK_MERCHANT,
    reputationScore: 92,
    timeoutDisputes: 0,
    pctRedeemersAgedOver30Days: 67,
    uniqueAttestationServersUsed: 3,
    commissionConcentrationBps: 1150,
    pctRedemptionsInBusinessHours: 84,
    avgPoiScoreTopReferrers: 78,
    suspicionScore: 8,
    suspicionComputedAt: Math.floor(Date.now() / 1000) - 3600,
};

/* ── Merchant Bond ── */
export const MOCK_MERCHANT_BOND: MerchantBond = {
    bump: 252,
    merchant: MOCK_MERCHANT,
    bondedLamports: 5_000_000_000,               // 5 SOL
    minRequiredLamports: 2_000_000_000,           // 2 SOL
    isLocked: true,
    unlockRequestedAt: 0,
};

/* ── Commission Ledger ── */
export const MOCK_COMMISSION_LEDGER: CommissionLedger = {
    bump: 251,
    referrer: MOCK_MERCHANT,
    merchant: MOCK_MERCHANT,
    mint: MOCK_MINT,
    claimable: 125_000_000_000,                  // 125 tokens
    dustTenthsAccumulated: 7,
    frozen: false,
    frozenAmount: 0,
    totalEarned: 3_250_000_000_000,              // 3,250 tokens
    totalClaimed: 3_125_000_000_000,             // 3,125 tokens
    totalRedemptionsDriven: 47_000_000_000_000,
    highestSingleCommission: 500_000_000_000,
};

/* ── Recent Transactions ── */
const now = Math.floor(Date.now() / 1000);

export const MOCK_TRANSACTIONS: ActivityItem[] = [
    { signature: '5xK9Rq3...mP2x', slot: 284_567_890, timestamp: now - 180, type: 'commission', description: 'Commission earned from referral chain', amount: 50_000_000_000, success: true },
    { signature: '7hL2Nm4...jF8y', slot: 284_567_850, timestamp: now - 900, type: 'redemption', description: 'Token redemption at Merchant POS', amount: 200_000_000_000, success: true },
    { signature: '3pW6Ys8...kR4t', slot: 284_567_800, timestamp: now - 2400, type: 'share', description: 'Tokens shared via referral link', amount: 100_000_000_000, success: true },
    { signature: '9dN1Xv7...bQ5w', slot: 284_567_750, timestamp: now - 5200, type: 'commission', description: 'Commission from Gen-2 referral', amount: 25_000_000_000, success: true },
    { signature: '2jM4Bt6...hG9a', slot: 284_567_700, timestamp: now - 8100, type: 'share', description: 'Tokens shared to new customer', amount: 150_000_000_000, success: true },
    { signature: '6fR8Wp1...cE3v', slot: 284_567_650, timestamp: now - 14400, type: 'redemption', description: 'Token redemption at store', amount: 300_000_000_000, success: true },
    { signature: '1aS3Dk5...nH7m', slot: 284_567_600, timestamp: now - 21600, type: 'commission', description: 'Commission payout', amount: 75_000_000_000, success: true },
];

/* ── Network Graph ── */
const mockAddresses = [
    '8xHy7k3F', 'Bq4mN9pL', 'Cf7rW2kD', 'Dh3sX6nG', 'Ej5tY8mH',
    'Fk2uZ1pJ', 'Gm9vA4qK', 'Hn6wB7rL', 'Jp8xC3sM', 'Kq1yD5tN',
    'Lr4zA8uP', 'Ms7aE2vQ', 'Nt3bF6wR', 'Pu9cG1xS', 'Qv5dH4yT',
];

export const MOCK_NETWORK_NODES: NetworkNode[] = mockAddresses.map((addr, i) => ({
    id: addr + 'nE2mPqVcASWJqd3cT9nGRj5x',
    address: addr + 'nE2mPqVcASWJqd3cT9nGRj5x',
    gen1Balance: Math.floor(Math.random() * 500_000_000_000) + 50_000_000_000,
    gen2Balance: Math.floor(Math.random() * 300_000_000_000) + 20_000_000_000,
    deadBalance: Math.floor(Math.random() * 50_000_000_000),
    totalLifetime: Math.floor(Math.random() * 800_000_000_000) + 100_000_000_000,
    referrerCount: Math.floor(Math.random() * 8) + 1,
    poiScore: Math.floor(Math.random() * 40) + 60,
    x: 400 + 200 * Math.cos((2 * Math.PI * i) / mockAddresses.length),
    y: 300 + 200 * Math.sin((2 * Math.PI * i) / mockAddresses.length),
}));

export const MOCK_NETWORK_EDGES: NetworkEdge[] = [
    { from: MOCK_NETWORK_NODES[0].id, to: MOCK_NETWORK_NODES[1].id, tokensAttributed: 150_000_000_000 },
    { from: MOCK_NETWORK_NODES[0].id, to: MOCK_NETWORK_NODES[2].id, tokensAttributed: 90_000_000_000 },
    { from: MOCK_NETWORK_NODES[1].id, to: MOCK_NETWORK_NODES[3].id, tokensAttributed: 120_000_000_000 },
    { from: MOCK_NETWORK_NODES[1].id, to: MOCK_NETWORK_NODES[4].id, tokensAttributed: 75_000_000_000 },
    { from: MOCK_NETWORK_NODES[2].id, to: MOCK_NETWORK_NODES[5].id, tokensAttributed: 200_000_000_000 },
    { from: MOCK_NETWORK_NODES[3].id, to: MOCK_NETWORK_NODES[6].id, tokensAttributed: 60_000_000_000 },
    { from: MOCK_NETWORK_NODES[4].id, to: MOCK_NETWORK_NODES[7].id, tokensAttributed: 110_000_000_000 },
    { from: MOCK_NETWORK_NODES[5].id, to: MOCK_NETWORK_NODES[8].id, tokensAttributed: 85_000_000_000 },
    { from: MOCK_NETWORK_NODES[6].id, to: MOCK_NETWORK_NODES[9].id, tokensAttributed: 45_000_000_000 },
    { from: MOCK_NETWORK_NODES[7].id, to: MOCK_NETWORK_NODES[10].id, tokensAttributed: 130_000_000_000 },
    { from: MOCK_NETWORK_NODES[8].id, to: MOCK_NETWORK_NODES[11].id, tokensAttributed: 95_000_000_000 },
    { from: MOCK_NETWORK_NODES[9].id, to: MOCK_NETWORK_NODES[12].id, tokensAttributed: 70_000_000_000 },
    { from: MOCK_NETWORK_NODES[10].id, to: MOCK_NETWORK_NODES[13].id, tokensAttributed: 55_000_000_000 },
    { from: MOCK_NETWORK_NODES[11].id, to: MOCK_NETWORK_NODES[14].id, tokensAttributed: 40_000_000_000 },
];

/* ── Dispute Records ── */
export const MOCK_DISPUTE_RECORDS: DisputeRecord[] = [
    {
        bump: 250,
        merchant: MOCK_MERCHANT,
        referral: new PublicKey('Bq4mN9pLnE2mPqVcASWJqd3cT9nGRj5x5Bn4V3LFUGL'),
        watchdog: new PublicKey('Cf7rW2kDnE2mPqVcASWJqd3cT9nGRj5x5Bn4V3LFUGL'),
        status: 'Dismissed' as DisputeStatus,
        stakeLamports: 100_000_000,
        raisedAt: now - 86400 * 14,
        resolvedAt: now - 86400 * 7,
    },
    {
        bump: 249,
        merchant: MOCK_MERCHANT,
        referral: new PublicKey('Dh3sX6nGnE2mPqVcASWJqd3cT9nGRj5x5Bn4V3LFUGL'),
        watchdog: new PublicKey('Ej5tY8mHnE2mPqVcASWJqd3cT9nGRj5x5Bn4V3LFUGL'),
        status: 'Pending' as DisputeStatus,
        stakeLamports: 250_000_000,
        raisedAt: now - 86400 * 3,
        resolvedAt: null,
    },
];
