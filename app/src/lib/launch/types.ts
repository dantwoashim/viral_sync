export type EventType =
  | 'offer_created'
  | 'referral_link_created'
  | 'referral_link_opened'
  | 'referral_claimed'
  | 'referral_blocked'
  | 'merchant_code_generated'
  | 'visit_challenge_created'
  | 'dual_attestation_recorded'
  | 'causal_receipt_submitted'
  | 'redemption_confirmed'
  | 'reward_granted'
  | 'reward_redeemed'
  | 'audit_event_recorded'
  | 'reward_ledger_entry_recorded';

export type ClaimStatus = 'claimed' | 'code-generated' | 'redeemed' | 'blocked';
export type InviteStatus = 'active' | 'expired' | 'claimed' | 'disabled';
export type ClaimLifecycleStatus = 'created' | 'blocked' | 'redeemed';
export type RedeemCodeStatus = 'issued' | 'scanned' | 'confirmed' | 'voided' | 'expired' | 'active' | 'redeemed';
export type VisitChallengeStatus = 'issued' | 'signed' | 'confirmed' | 'consumed' | 'expired' | 'active';

export interface MerchantRecord {
  id: string;
  name: string;
  district: string;
  city: string;
  locationLabel: string;
}

export interface OfferRecord {
  id: string;
  merchantId: string;
  slug: string;
  title: string;
  description: string;
  reward: string;
  referralGoal: number;
  redemptionWindowHours: number;
  active: boolean;
  createdAt: string;
}

export interface ReferralLinkRecord {
  token: string;
  offerId: string;
  referrerSessionId: string;
  referrerDisplayName: string;
  referrerDeviceFingerprint: string;
  causalInvite?: CausalInviteRecord;
  status?: InviteStatus;
  createdAt: string;
  openCount: number;
}

export interface ClaimRecord {
  id: string;
  offerId: string;
  referralToken: string;
  referrerSessionId: string;
  referrerDisplayName: string;
  claimerSessionId: string;
  claimerDisplayName: string;
  deviceFingerprint: string;
  campaignNullifierHash?: string;
  lifecycleStatus?: ClaimLifecycleStatus;
  claimedAt: string;
  status: ClaimStatus;
  blockedReason?: string;
  redeemedAt?: string;
}

export interface RedeemCodeRecord {
  id: string;
  claimId: string;
  merchantId: string;
  code: string;
  codeHash?: string;
  status: RedeemCodeStatus;
  createdAt: string;
  redeemedAt?: string;
}

export interface CausalInviteRecord {
  version: '0.1';
  campaignId: string;
  merchantId: string;
  referrerCommitment: string;
  inviteNonce: string;
  expiresAt: number;
  signature: string;
}

export interface VisitChallengeRecord {
  id: string;
  merchantId: string;
  offerId: string;
  claimId: string;
  redeemCodeId: string;
  challengeHash: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  status: VisitChallengeStatus;
}

export interface CausalReceiptRecord {
  id: string;
  merchantId: string;
  offerId: string;
  claimId: string;
  referralToken: string;
  manualReceiptId?: string;
  evidenceLevel?: 'staff_only' | 'receipt_id' | 'csv_match' | 'solana_pay' | 'pos_webhook';
  spendNpr?: number;
  paymentReference?: string;
  receiptIdHash: string;
  campaignNullifierHash: string;
  inviteHash: string;
  visitAttestationHash: string;
  customerSignature: string;
  staffSignature: string;
  receiptPda: string;
  txSignature: string;
  status: 'submitted' | 'settled';
  createdAt: string;
  settledAt?: string;
}

export type MerchantRole = 'owner' | 'admin' | 'manager' | 'staff' | 'support' | 'auditor';

export interface MerchantSessionRecord {
  id: string;
  merchantId: string;
  role: MerchantRole;
  label: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
}

export interface StaffDeviceRecord {
  id: string;
  merchantId: string;
  locationLabel: string;
  label: string;
  publicKey: string;
  secret?: string;
  secretHash?: string;
  enrolledAt: string;
  revokedAt?: string;
}

export interface AuditEventRecord {
  id: string;
  requestId: string;
  actorType: 'consumer' | 'merchant' | 'staff' | 'system';
  actorId: string;
  merchantId?: string;
  targetType: string;
  targetId?: string;
  action: string;
  result: 'allowed' | 'denied' | 'created' | 'updated' | 'failed';
  createdAt: string;
  reason?: string;
}

export interface RewardLedgerEntryRecord {
  id: string;
  merchantId: string;
  receiptId?: string;
  actorSessionId?: string;
  entryType: 'bounty_funded' | 'reward_reserved' | 'reward_settled' | 'reward_granted';
  amount: number;
  balanceAfter: number;
  idempotencyKey: string;
  createdAt: string;
}

export interface IdempotencyRecord {
  key: string;
  scope: string;
  resultId: string;
  createdAt: string;
}

export interface OutboxRecord {
  id: string;
  topic: 'receipt.submit' | 'receipt.index' | 'notification.send';
  payload: Record<string, string | number | boolean | null>;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  attempts: number;
  nextRunAt: string;
  createdAt: string;
  updatedAt: string;
  lastError?: string;
}

export interface EventRecord {
  id: string;
  type: EventType;
  createdAt: string;
  merchantId?: string;
  offerId?: string;
  referralToken?: string;
  claimId?: string;
  redeemCodeId?: string;
  actorSessionId?: string;
  payload?: Record<string, string | number | boolean | null>;
}

export interface LaunchLedger {
  merchants: MerchantRecord[];
  offers: OfferRecord[];
  referralLinks: ReferralLinkRecord[];
  claims: ClaimRecord[];
  redeemCodes: RedeemCodeRecord[];
  visitChallenges?: VisitChallengeRecord[];
  causalReceipts?: CausalReceiptRecord[];
  merchantSessions?: MerchantSessionRecord[];
  staffDevices?: StaffDeviceRecord[];
  auditEvents?: AuditEventRecord[];
  rewardLedgerEntries?: RewardLedgerEntryRecord[];
  idempotencyRecords?: IdempotencyRecord[];
  outbox?: OutboxRecord[];
  events: EventRecord[];
}

export interface OfferView {
  id: string;
  slug: string;
  title: string;
  description: string;
  reward: string;
  referralGoal: number;
  redemptionWindowHours: number;
  merchantName: string;
  district: string;
}

export interface ConsumerPassbookRow {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  status: 'progress' | 'ready' | 'redeemed' | 'blocked';
  createdAt: string;
}

export interface ConsumerSummary {
  offer: OfferView;
  referral: {
    token: string | null;
    sharePath: string | null;
    openCount: number;
    redeemedCount: number;
  };
  progress: {
    current: number;
    total: number;
    remaining: number;
  };
  activeClaim: {
    id: string;
    status: ClaimStatus;
    blockedReason?: string;
  } | null;
  activeRedeemCode: {
    code: string;
    status: RedeemCodeStatus;
    createdAt: string;
  } | null;
  passbook: ConsumerPassbookRow[];
}

export interface ReferralDetail {
  offer: OfferView;
  referral: {
    token: string;
    referrerDisplayName: string;
    openCount: number;
    redeemedCount: number;
  };
  viewer: {
    canClaim: boolean;
    reason: string | null;
    existingClaimStatus: ClaimStatus | null;
  };
}

export interface MerchantMetric {
  label: string;
  note: string;
  value: string;
  tone: 'tone-blue' | 'tone-vermilion' | 'tone-copper' | 'tone-moss';
}

export interface MerchantRow {
  title: string;
  subtitle: string;
  meta: string;
  value: string;
}

export interface MerchantSummary {
  merchant: MerchantRecord;
  offer: OfferView;
  metrics: MerchantMetric[];
  queue: MerchantRow[];
  customers: MerchantRow[];
  ledger: MerchantRow[];
  alerts: string[];
}

export interface FraudReviewReport {
  replayedAttacks: {
    label: string;
    count: number;
    status: 'blocked' | 'needs-review' | 'clean';
    note: string;
  }[];
  thresholds: {
    duplicateNullifier: string;
    challengeTtlSeconds: number;
    suspiciousBlockRatePercent: number;
    sameDevicePolicy: string;
  };
  falsePositiveNotes: string[];
}

export interface SupportSearchResult {
  type: 'code' | 'invite' | 'receipt' | 'merchant' | 'claim';
  label: string;
  value: string;
  status: string;
  meta: string;
  href?: string;
}

export interface CampaignPublishResult {
  ok: boolean;
  offer?: OfferView;
  reason?: string;
}

export interface BlinkActionMetadata {
  title: string;
  icon: string;
  description: string;
  label: string;
  disabled?: boolean;
  links?: {
    actions: {
      label: string;
      href: string;
      type?: 'transaction' | 'message' | 'post';
    }[];
  };
  error?: string;
}

export interface SignedActionIntent {
  ok: boolean;
  action: 'verify_causal_receipt' | 'register_merchant' | 'create_growth_campaign' | 'fund_growth_bounty' | 'record_causal_receipt' | 'settle_receipt_reward' | 'close_growth_bounty';
  receiptId: string;
  account: string;
  intent: string;
  signature: string;
  simulation: {
    allowed: boolean;
    programId: string;
    instruction: string;
    accounts: string[];
    computeUnitLimit: number;
  };
  transaction?: string;
  reason?: string;
}

export interface RelayerPolicy {
  allowedPrograms: string[];
  allowedInstructions: string[];
  allowedAccounts: string[];
  dailySponsoredTxCap: number;
  perMerchantDailyCap: number;
  perCampaignDailyCap: number;
  perWalletDailyCap: number;
  simulationRequired: boolean;
  serviceAuthRequired: boolean;
}

export type ReceiptReconciliationStatus = 'pending' | 'submitted' | 'confirmed' | 'failed' | 'indexed';

export interface CausalGraphNode {
  id: string;
  label: string;
  kind: 'invite' | 'visitor' | 'merchant' | 'receipt' | 'settlement';
  privateLabel: boolean;
}

export interface CausalGraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  receiptId?: string;
}

export type BillingEventType = 'usage_fee' | 'platform_fee' | 'invoice_created' | 'invoice_paid';
export type BillingStatus = 'draft' | 'issued' | 'paid' | 'overdue';

export interface BillingEvent {
  id: string;
  type: BillingEventType;
  merchantId: string;
  receiptId?: string;
  amountNpr: number;
  status: BillingStatus;
  createdAt: string;
}

export interface PartnerAccount {
  id: string;
  type: 'creator' | 'hostel' | 'guide' | 'merchant';
  name: string;
  sourceCode: string;
  payoutWallet?: string;
  qualityScore: number;
  status: 'active' | 'held' | 'pending';
}

export interface ReferralCreateResult {
  token: string;
  sharePath: string;
}

export interface ClaimResult {
  ok: boolean;
  claimId?: string;
  status?: ClaimStatus;
  reason?: string;
}

export interface RedeemCodeResult {
  ok: boolean;
  code?: string;
  status?: RedeemCodeStatus;
  reason?: string;
}

export interface MerchantConfirmResult {
  ok: boolean;
  status?: RedeemCodeStatus;
  code?: string;
  receiptId?: string;
  receiptPda?: string;
  txSignature?: string;
  reason?: string;
}
