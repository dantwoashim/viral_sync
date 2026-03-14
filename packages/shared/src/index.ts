export const VIRAL_SYNC_V1_TRACK = 'v1';
export const RELAYER_ROUTE_PREFIX = '/v1';
export const RUNTIME_ROUTE_PREFIX = '/v1';
export const BPS_DENOMINATOR = 10_000;
export const REPUTATION_MAX_SCORE = 100;
export const REPUTATION_UI_MAX = 100;
export const LAMPORTS_PER_SOL = 1_000_000_000;
export const DEFAULT_SUPPORT_LINKS = {
  repository: 'https://github.com/dantwoashim/viral_sync',
  docs: 'https://github.com/dantwoashim/viral_sync#readme',
} as const;

export type DataMode = 'demo' | 'live';
export type ClusterName = 'localnet' | 'devnet-staging' | 'mainnet';

export const V1_CLUSTER_PROGRAM_IDS: Record<ClusterName, string> = {
  localnet: 'H7XwjYP6veCfhSBsjn5C1dFPrd3CUifdU8iFkw4gAapr',
  'devnet-staging': '55GiapXJB8gLabJEX95nJW3vqGbyGWefnUZHxNy9CVw3',
  mainnet: '2xeXqSQTK2FH3ocZq7pxYfQ1D1i9R9s3UXxjU1axfLBQ',
};

export const RELAYER_ACTIONS = [
  'session-key-issue',
  'session-key-revoke',
  'inbound-finalize',
  'geo-redeem',
  'claim-commission',
  'merchant-close',
] as const;

export const RUNTIME_DISABLED_ACTIONS = [
  'session-bootstrap',
  'operator-auth',
  'redemption',
] as const;

export type RelayerAction = (typeof RELAYER_ACTIONS)[number];
export type RuntimeDisabledAction = (typeof RUNTIME_DISABLED_ACTIONS)[number];
export type MerchantPlan = 'free' | 'growth' | 'enterprise';

export interface SponsoredActionRequest {
  action: RelayerAction;
  transactionBase64: string;
  merchant?: string;
  idempotencyKey?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface SponsoredActionResponse {
  status: 'success' | 'error';
  signature?: string;
  error?: string;
  logs?: string[];
}

export interface RelayerHealthPayload {
  status: 'ok' | 'degraded' | 'error';
  relayEnabled: boolean;
  relayerPubkey: string;
  balance: number;
  balanceSOL: number;
  rpcUrl: string;
  uptime: number;
  allowedPrograms: string[];
  replayEntries: number;
  rateLimitedClients: number;
  statePath?: string;
  auditLogPath?: string;
  cacheBackend?: string;
  auditBackend?: string;
  metrics?: RelayerMetricsPayload;
}

export function isRelayerAction(value: string): value is RelayerAction {
  return (RELAYER_ACTIONS as readonly string[]).includes(value);
}

export function isRuntimeDisabledAction(value: string): value is RuntimeDisabledAction {
  return (RUNTIME_DISABLED_ACTIONS as readonly string[]).includes(value);
}

export interface MerchantBudgetState {
  merchant: string;
  plan: MerchantPlan;
  sponsoredLamportsRemaining: number;
  lifetimeSponsoredLamports: number;
  lifetimeTransactions: number;
  lastActionAt: number;
  disabled: boolean;
}

export interface MerchantBudgetUpdateRequest {
  lamportsDelta?: number;
  setLamportsRemaining?: number;
  disabled?: boolean;
  plan?: MerchantPlan;
}

export interface RelayerActionMetric {
  accepted: number;
  rejected: number;
  failed: number;
  simulatedFailures: number;
  sponsoredLamports: number;
  lastSignature?: string;
  lastError?: string;
}

export interface RelayerMetricsPayload {
  pausedActions: RelayerAction[];
  merchantBudgetsTracked: number;
  actionMetrics: Record<RelayerAction, RelayerActionMetric>;
}

export interface RelayerFlagState {
  pausedActions: RelayerAction[];
}

export interface RuntimeHealthPayload {
  status: 'ok' | 'degraded' | 'error';
  rpcUrl: string;
  programId: string;
  relayerFeePayer?: string;
  attestationPubkey?: string;
  allowedOrigins: string[];
  disabledActions?: RuntimeDisabledAction[];
  latestBlockhash?: string;
  actionStatePath?: string;
  sessionCounts?: {
    sessionChallenges: number;
    operatorChallenges: number;
    operatorSessions: number;
    redemptionChallenges: number;
  };
}

export interface RuntimeFlagState {
  disabledActions: RuntimeDisabledAction[];
}

export interface SessionChallengeRequest {
  wallet: string;
  delegate: string;
  generation: string;
  mint: string;
  merchant?: string;
  origin?: string;
}

export interface SessionChallengeResponse {
  challengeId: string;
  challengeMessage: string;
  wallet: string;
  delegate: string;
  generation: string;
  mint: string;
  merchant?: string;
  expiresAt: number;
}

export interface SessionBootstrapRequest {
  challengeId: string;
  signatureBase64: string;
  requestedSessionExpiry?: number;
  maxTokensPerSession?: string;
}

export interface SessionBootstrapResponse {
  transactionBase64: string;
  sessionPda: string;
  delegate: string;
  generation: string;
  mint: string;
  expiresAt: number;
  merchant?: string;
}

export interface OperatorChallengeRequest {
  wallet: string;
  merchant: string;
  origin?: string;
}

export interface OperatorChallengeResponse {
  challengeId: string;
  challengeMessage: string;
  wallet: string;
  merchant: string;
  expiresAt: number;
}

export interface OperatorSessionRequest {
  challengeId: string;
  signatureBase64: string;
}

export interface OperatorSessionResponse {
  token: string;
  wallet: string;
  merchant: string;
  role: 'merchant' | 'operator';
  expiresAt: number;
}

export interface RedemptionChallengeCreateRequest {
  merchant: string;
  fence: string;
  mint?: string;
  amount: string;
  label?: string;
  expiresInSeconds?: number;
}

export interface RedemptionChallengeCreateResponse {
  challengeId: string;
  code: string;
  merchant: string;
  fence: string;
  mint?: string;
  amount: string;
  label?: string;
  expiresAt: number;
}

export interface RedemptionPrepareRequest {
  code: string;
  wallet: string;
  latMicro: number;
  lngMicro: number;
  deviceId?: string;
  bypassGeo?: boolean;
}

export interface RedemptionPrepareResponse {
  transactionBase64: string;
  challengeId: string;
  merchant: string;
  fence: string;
  code: string;
  amount: string;
  expiresAt: number;
}

export function buildSessionChallengeMessage(payload: {
  challengeId: string;
  wallet: string;
  delegate: string;
  generation: string;
  mint: string;
  origin?: string;
  merchant?: string;
  expiresAt: number;
}): string {
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

export function buildOperatorChallengeMessage(payload: {
  challengeId: string;
  wallet: string;
  merchant: string;
  origin?: string;
  expiresAt: number;
}): string {
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

export function formatLamportsAsSol(
  lamports: bigint | number,
  fractionDigits = 4
): string {
  const value = lamportsToSolValue(lamports);
  return `${value.toFixed(fractionDigits)} SOL`;
}

export function lamportsToSolValue(
  lamports: bigint | number
): number {
  const value = typeof lamports === 'bigint'
    ? Number(lamports) / LAMPORTS_PER_SOL
    : lamports / LAMPORTS_PER_SOL;
  return value;
}

export function normalizeReputationScore(rawScore: number): number {
  if (!Number.isFinite(rawScore) || rawScore <= 0) {
    return 0;
  }
  const clamped = Math.min(rawScore, REPUTATION_MAX_SCORE);
  return Math.round((clamped / REPUTATION_MAX_SCORE) * REPUTATION_UI_MAX);
}
