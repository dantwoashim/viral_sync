"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RUNTIME_DISABLED_ACTIONS = exports.RELAYER_ACTIONS = exports.V1_CLUSTER_PROGRAM_IDS = exports.DEFAULT_SUPPORT_LINKS = exports.LAMPORTS_PER_SOL = exports.REPUTATION_UI_MAX = exports.REPUTATION_MAX_SCORE = exports.BPS_DENOMINATOR = exports.RUNTIME_ROUTE_PREFIX = exports.RELAYER_ROUTE_PREFIX = exports.VIRAL_SYNC_V1_TRACK = void 0;
exports.isRelayerAction = isRelayerAction;
exports.isRuntimeDisabledAction = isRuntimeDisabledAction;
exports.buildOperatorChallengeMessage = buildOperatorChallengeMessage;
exports.buildSessionChallengeMessage = buildSessionChallengeMessage;
exports.formatLamportsAsSol = formatLamportsAsSol;
exports.lamportsToSolValue = lamportsToSolValue;
exports.normalizeReputationScore = normalizeReputationScore;
exports.VIRAL_SYNC_V1_TRACK = 'v1';
exports.RELAYER_ROUTE_PREFIX = '/v1';
exports.RUNTIME_ROUTE_PREFIX = '/v1';
exports.BPS_DENOMINATOR = 10_000;
exports.REPUTATION_MAX_SCORE = 1_000;
exports.REPUTATION_UI_MAX = 100;
exports.LAMPORTS_PER_SOL = 1_000_000_000;
exports.DEFAULT_SUPPORT_LINKS = {
    repository: 'https://github.com/dantwoashim/viral_sync',
    docs: 'https://github.com/dantwoashim/viral_sync#readme',
};
exports.V1_CLUSTER_PROGRAM_IDS = {
    localnet: 'H7XwjYP6veCfhSBsjn5C1dFPrd3CUifdU8iFkw4gAapr',
    'devnet-staging': '55GiapXJB8gLabJEX95nJW3vqGbyGWefnUZHxNy9CVw3',
    mainnet: '2xeXqSQTK2FH3ocZq7pxYfQ1D1i9R9s3UXxjU1axfLBQ',
};
exports.RELAYER_ACTIONS = [
    'session-key-issue',
    'session-key-revoke',
    'inbound-finalize',
    'geo-redeem',
    'claim-commission',
    'merchant-close',
];
exports.RUNTIME_DISABLED_ACTIONS = [
    'session-bootstrap',
    'operator-auth',
    'redemption',
];
function isRelayerAction(value) {
    return exports.RELAYER_ACTIONS.includes(value);
}
function isRuntimeDisabledAction(value) {
    return exports.RUNTIME_DISABLED_ACTIONS.includes(value);
}
function buildSessionChallengeMessage(payload) {
    return [
        'Viral Sync server-mediated session approval',
        `Challenge: ${payload.challengeId}`,
        `Wallet: ${payload.wallet}`,
        `Delegate: ${payload.delegate}`,
        `Generation: ${payload.generation}`,
        `Mint: ${payload.mint}`,
        `Merchant: ${payload.merchant ?? 'unscoped'}`,
        `Origin: ${payload.origin ?? 'unknown'}`,
        `Expires At: ${new Date(payload.expiresAt).toISOString()}`,
        `Track: ${exports.VIRAL_SYNC_V1_TRACK}`,
    ].join('\n');
}
function buildOperatorChallengeMessage(payload) {
    return [
        'Viral Sync merchant operator approval',
        `Challenge: ${payload.challengeId}`,
        `Wallet: ${payload.wallet}`,
        `Merchant: ${payload.merchant}`,
        `Origin: ${payload.origin ?? 'unknown'}`,
        `Expires At: ${new Date(payload.expiresAt).toISOString()}`,
        `Track: ${exports.VIRAL_SYNC_V1_TRACK}`,
    ].join('\n');
}
function formatLamportsAsSol(lamports, fractionDigits = 4) {
    const value = lamportsToSolValue(lamports);
    return `${value.toFixed(fractionDigits)} SOL`;
}
function lamportsToSolValue(lamports) {
    const value = typeof lamports === 'bigint'
        ? Number(lamports) / exports.LAMPORTS_PER_SOL
        : lamports / exports.LAMPORTS_PER_SOL;
    return value;
}
function normalizeReputationScore(rawScore) {
    if (!Number.isFinite(rawScore) || rawScore <= 0) {
        return 0;
    }
    const clamped = Math.min(rawScore, exports.REPUTATION_MAX_SCORE);
    return Math.round((clamped / exports.REPUTATION_MAX_SCORE) * exports.REPUTATION_UI_MAX);
}
