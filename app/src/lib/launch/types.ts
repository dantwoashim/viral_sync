export type EventType =
  | 'offer_created'
  | 'referral_link_created'
  | 'referral_link_opened'
  | 'referral_claimed'
  | 'referral_blocked'
  | 'merchant_code_generated'
  | 'redemption_confirmed'
  | 'reward_granted'
  | 'reward_redeemed';

export type ClaimStatus = 'claimed' | 'code-generated' | 'redeemed' | 'blocked';
export type RedeemCodeStatus = 'active' | 'redeemed' | 'expired';

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
  status: RedeemCodeStatus;
  createdAt: string;
  redeemedAt?: string;
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
  reason?: string;
}
