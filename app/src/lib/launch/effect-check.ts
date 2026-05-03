// Viral Sync-specific Causal Receipt Intent Validator.
// This is intentionally not a generic Solana transaction firewall: it validates
// constrained receipt-settlement intent fields before sponsorship/settlement.

import { sha256Hex, stableJson } from '@/lib/launch/causal';

export type CausalReceiptIntentManifest = {
  version: 'viral-sync-intent-v1';
  action: 'record_causal_receipt_and_settle_reward';
  chain: string;
  programId: string;
  merchantId?: string;
  offerId?: string;
  claimId?: string;
  redeemCodeId?: string;
  receiptIdHash: string;
  campaignNullifierHash?: string;
  claimerNullifierHash?: string;
  inviteHash: string;
  visitAttestationHash: string;
  rewardAmount: number;
  referrerBeneficiary: string;
  visitorBeneficiary: string;
  allowedInstructions: string[];
  allowedPrograms: string[];
  forbiddenEffects: string[];
  issuedAt?: string;
  expiresAt: string;
  nonce?: string;
};

export function createIntentManifestHash(manifest: CausalReceiptIntentManifest) {
  return sha256Hex(stableJson(manifest as unknown as Record<string, unknown>));
}

export function validateCausalReceiptEffect(params: {
  manifest: CausalReceiptIntentManifest;
  action: string;
  accounts: Record<string, string>;
  rewardAmount: number;
  referrerBeneficiary: string;
  visitorBeneficiary: string;
  now?: Date;
}) {
  const now = params.now ?? new Date();

  if (params.manifest.version !== 'viral-sync-intent-v1') {
    return { ok: false as const, reason: 'Unsupported manifest version.' };
  }

  if (params.manifest.action !== 'record_causal_receipt_and_settle_reward') {
    return { ok: false as const, reason: 'Unsupported manifest action.' };
  }

  if (!params.manifest.allowedInstructions.includes(params.action)) {
    return { ok: false as const, reason: 'Instruction is not allowed by manifest.' };
  }

  if (new Date(params.manifest.expiresAt).getTime() <= now.getTime()) {
    return { ok: false as const, reason: 'Intent manifest expired.' };
  }

  if (params.rewardAmount > params.manifest.rewardAmount) {
    return { ok: false as const, reason: 'Reward amount exceeds manifest maximum.' };
  }

  if (params.referrerBeneficiary !== params.manifest.referrerBeneficiary) {
    return { ok: false as const, reason: 'Referrer beneficiary does not match manifest.' };
  }

  if (params.visitorBeneficiary !== params.manifest.visitorBeneficiary) {
    return { ok: false as const, reason: 'Visitor beneficiary does not match manifest.' };
  }

  for (const account of ['growthCampaign', 'rewardEscrow', 'causalReceipt', 'nullifierRecord']) {
    if (!params.accounts[account]) {
      return { ok: false as const, reason: `Missing required account: ${account}.` };
    }
  }

  return {
    ok: true as const,
    reason: 'Effect matches Viral Sync causal receipt intent.',
    manifestHash: createIntentManifestHash(params.manifest),
  };
}
