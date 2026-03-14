'use strict';

const VIRAL_SYNC_V1_TRACK = 'v1';
const RELAYER_ROUTE_PREFIX = '/v1';
const RUNTIME_ROUTE_PREFIX = '/v1';
const BPS_DENOMINATOR = 10_000;
const REPUTATION_MAX_SCORE = 100;
const REPUTATION_UI_MAX = 100;
const LAMPORTS_PER_SOL = 1_000_000_000;

const V1_CLUSTER_PROGRAM_IDS = {
  localnet: 'H7XwjYP6veCfhSBsjn5C1dFPrd3CUifdU8iFkw4gAapr',
  'devnet-staging': '55GiapXJB8gLabJEX95nJW3vqGbyGWefnUZHxNy9CVw3',
  mainnet: '2xeXqSQTK2FH3ocZq7pxYfQ1D1i9R9s3UXxjU1axfLBQ',
};

const RELAYER_ACTIONS = [
  'session-key-issue',
  'session-key-revoke',
  'inbound-finalize',
  'geo-redeem',
  'claim-commission',
  'merchant-close',
];
const RUNTIME_DISABLED_ACTIONS = [
  'session-bootstrap',
  'operator-auth',
  'redemption',
];

function isRelayerAction(value) {
  return RELAYER_ACTIONS.includes(value);
}

function isRuntimeDisabledAction(value) {
  return RUNTIME_DISABLED_ACTIONS.includes(value);
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
    `Track: ${VIRAL_SYNC_V1_TRACK}`,
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
    `Track: ${VIRAL_SYNC_V1_TRACK}`,
  ].join('\n');
}

function formatLamportsAsSol(lamports, fractionDigits = 4) {
  const value = typeof lamports === 'bigint'
    ? Number(lamports) / LAMPORTS_PER_SOL
    : lamports / LAMPORTS_PER_SOL;
  return `${value.toFixed(fractionDigits)} SOL`;
}

function normalizeReputationScore(rawScore) {
  if (!Number.isFinite(rawScore) || rawScore <= 0) {
    return 0;
  }

  const clamped = Math.min(rawScore, REPUTATION_MAX_SCORE);
  return Math.round((clamped / REPUTATION_MAX_SCORE) * REPUTATION_UI_MAX);
}

module.exports = {
  VIRAL_SYNC_V1_TRACK,
  RELAYER_ROUTE_PREFIX,
  RUNTIME_ROUTE_PREFIX,
  BPS_DENOMINATOR,
  REPUTATION_MAX_SCORE,
  REPUTATION_UI_MAX,
  LAMPORTS_PER_SOL,
  V1_CLUSTER_PROGRAM_IDS,
  RELAYER_ACTIONS,
  RUNTIME_DISABLED_ACTIONS,
  isRelayerAction,
  isRuntimeDisabledAction,
  buildSessionChallengeMessage,
  buildOperatorChallengeMessage,
  formatLamportsAsSol,
  normalizeReputationScore,
};
